// app/api/laboratory/direct-tests/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { LabTest } from "@/lib/models/LabTest";
import { LabTestTemplate } from "@/lib/models/LabTestTemplate";
import { Patient } from "@/lib/models/Patient";
import { authenticateRequest } from "@/lib/auth";
import mongoose from "mongoose";

// GET: List all direct tests with optional filtering
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    // Authenticate the request
    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 },
      );
    }

    // Check if user has access to laboratory
    const allowedRoles = [
      "laboratory",
      "lab_technician",
      "technician",
      "admin",
      "receptionist",
      "doctor",
    ];
    if (!auth.userRole || !allowedRoles.includes(auth.userRole)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Forbidden. You don't have permission to access direct lab tests.",
        },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const paymentStatus = searchParams.get("paymentStatus");
    const finalized = searchParams.get("finalized");
    const readyForPrint = searchParams.get("readyForPrint");
    const limit = parseInt(searchParams.get("limit") || "100");
    const sort = searchParams.get("sort") || "-createdAtDirect";

    // Build query for direct tests only
    const query: any = { isDirectTest: true };

    // Add optional filters
    if (status && status !== "all") {
      query.status = status;
    }

    if (paymentStatus && paymentStatus !== "all") {
      query["charges.paymentStatus"] = paymentStatus;
    }

    if (finalized !== null && finalized !== undefined) {
      query.finalized = finalized === "true";
    }

    if (readyForPrint !== null && readyForPrint !== undefined) {
      query.readyForPrint = readyForPrint === "true";
    }

    // Convert sort string to MongoDB sort object
    const sortObj: any = {};
    if (sort.startsWith("-")) {
      sortObj[sort.substring(1)] = -1;
    } else {
      sortObj[sort] = 1;
    }

    // Fetch direct tests with proper population
    const tests = await LabTest.find(query)
      .populate("patient", "name patientId phone email dateOfBirth gender")
      .populate("createdBy", "name")
      .populate("finalizedBy", "name")
      .populate("printedBy", "name")
      .sort(sortObj)
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      data: tests,
      count: tests.length,
      userRole: auth.userRole,
    });
  } catch (error: any) {
    console.error("Error fetching direct lab tests:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch direct lab tests",
      },
      { status: 500 },
    );
  }
}

// POST: Create a new direct lab test
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    // Authenticate the request
    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 },
      );
    }

    // Only laboratory staff and admin can create direct tests
    const allowedRoles = [
      "laboratory",
      "lab_technician",
      "technician",
      "admin",
    ];
    if (!auth.userRole || !allowedRoles.includes(auth.userRole)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Forbidden. Only laboratory staff can create direct lab tests.",
        },
        { status: 403 },
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.patientId) {
      return NextResponse.json(
        { success: false, error: "Patient ID is required" },
        { status: 400 },
      );
    }

    if (!body.testTemplateId) {
      return NextResponse.json(
        { success: false, error: "Test template ID is required" },
        { status: 400 },
      );
    }

    // Verify patient exists
    const patient = await Patient.findById(body.patientId);
    if (!patient) {
      return NextResponse.json(
        { success: false, error: "Patient not found" },
        { status: 404 },
      );
    }

    // Verify test template exists
    const testTemplate = await LabTestTemplate.findById(body.testTemplateId);
    if (!testTemplate) {
      return NextResponse.json(
        { success: false, error: "Test template not found" },
        { status: 404 },
      );
    }

    if (!testTemplate.active) {
      return NextResponse.json(
        { success: false, error: "Test template is not active" },
        { status: 400 },
      );
    }

    // Create the direct lab test
    const labTestData = {
      testName: testTemplate.testName,
      category: testTemplate.category,
      description: testTemplate.description,
      price: testTemplate.basePrice,
      patient: new mongoose.Types.ObjectId(body.patientId),
      orderedBy: new mongoose.Types.ObjectId(auth.userId!),
      orderedAt: new Date(),
      status: "ordered",
      collectionStatus: "pending",
      processingStatus: "pending",
      verificationStatus: "pending",
      priority: body.priority || "routine",
      paymentVerified: false,
      specimen: {
        type: testTemplate.specimenType?.[0] || "blood",
      },
      // Direct lab test specific fields
      isDirectTest: true,
      createdBy: new mongoose.Types.ObjectId(auth.userId!),
      createdAtDirect: new Date(),
      finalized: false,
      readyForPrint: false,
      // Initialize charges
      charges: {
        basePrice: testTemplate.basePrice,
        tax: 0,
        discount: 0,
        otherCharges: 0,
        totalAmount: testTemplate.basePrice,
        paid: 0,
        due: testTemplate.basePrice,
        paymentStatus: "pending",
      },
      // Optional notes
      notes: body.notes,
    };

    const labTest = new LabTest(labTestData);
    await labTest.save();

    // Populate the response
    const populatedTest = await LabTest.findById(labTest._id)
      .populate("patient", "name patientId phone")
      .populate("createdBy", "name")
      .lean();

    console.log(
      `Direct lab test created: ${labTest.testId} by ${auth.userName}`,
    );

    return NextResponse.json(
      {
        success: true,
        data: populatedTest,
        message: "Direct lab test created successfully",
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Error creating direct lab test:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create direct lab test",
      },
      { status: 500 },
    );
  }
}
