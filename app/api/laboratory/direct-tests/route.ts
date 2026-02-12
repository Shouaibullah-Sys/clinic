// app/api/laboratory/direct-tests/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { LabTest } from "@/lib/models/LabTest";
import { LabTestTemplate } from "@/lib/models/LabTestTemplate";
import { Patient } from "@/lib/models/Patient";
import { authenticateRequest } from "@/lib/auth";
import mongoose from "mongoose";

const normalizeDirectTestWorkflow = (test: any) => {
  const isCollected = test.collectionStatus === "collected";
  const hasResults = (test.results?.parameters?.length || 0) > 0;

  if (!isCollected) return test;

  return {
    ...test,
    status:
      test.status === "pending" ||
      test.status === "ordered" ||
      test.status === "processing"
        ? "completed"
        : test.status,
    processingStatus: "completed",
    readyForPrint: hasResults ? true : test.readyForPrint,
  };
};

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
    const allowedRoles = ["lab_technician", "admin", "receptionist", "doctor"];
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
    const normalizedTests = tests.map(normalizeDirectTestWorkflow);

    return NextResponse.json({
      success: true,
      data: normalizedTests,
      count: normalizedTests.length,
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

    // Only laboratory staff, receptionists, and admin can create direct tests
    const allowedRoles = ["lab_technician", "admin", "receptionist"];
    if (!auth.userRole || !allowedRoles.includes(auth.userRole)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Forbidden. Only laboratory staff and receptionists can create direct lab tests.",
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

    // Support both template-based and custom test creation
    let testTemplate = null;
    if (body.testTemplateId) {
      // Verify test template exists
      testTemplate = await LabTestTemplate.findById(body.testTemplateId);
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
    } else if (!body.testName) {
      // If no template, test name is required
      return NextResponse.json(
        { success: false, error: "Test name is required" },
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

    // Determine test details from template or custom input
    const testName = testTemplate?.testName || body.testName;
    const category = testTemplate?.category || body.category || "general";
    const description = testTemplate?.description || body.description;
    const basePrice = testTemplate?.basePrice || body.price;
    const specimenType =
      testTemplate?.specimenType?.[0] || body.specimenType || "blood";
    const turnaroundTime =
      testTemplate?.turnaroundTime || body.turnaroundTime || 24;

    // Validate price
    if (!basePrice || isNaN(basePrice) || basePrice <= 0) {
      return NextResponse.json(
        { success: false, error: "Valid test price is required" },
        { status: 400 },
      );
    }

    // Validate priority
    const validPriorities = ["routine", "urgent", "emergency"];
    const priority = body.priority || "routine";
    if (!validPriorities.includes(priority)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid priority. Must be routine, urgent, or emergency",
        },
        { status: 400 },
      );
    }

    // Prepare test parameters
    let testParameters = [];
    let resultsParameters = [];
    if (testTemplate && testTemplate.parameters) {
      // Use template parameters
      testParameters = testTemplate.parameters.map((param: any) => ({
        parameterName: param.name || param.parameterName,
        unit: param.unit || "",
        normalRange: param.normalRange || "",
        description: param.description || "",
      }));
    } else if (body.parameters && Array.isArray(body.parameters)) {
      // Use custom parameters from request
      testParameters = body.parameters.map((param: any) => ({
        parameterName: param.parameterName || param.name,
        unit: param.unit || "",
        normalRange: param.normalRange || "",
        description: param.description || "",
      }));
    }

    // Handle results parameters (for direct tests with pre-entered results)
    if (
      body.results &&
      body.results.parameters &&
      Array.isArray(body.results.parameters)
    ) {
      // Store the results parameters with values
      resultsParameters = body.results.parameters.map((param: any) => ({
        name: param.name || param.parameterName,
        value: param.value || "",
        unit: param.unit || "",
        normalRange: param.normalRange || "",
        remarks: param.remarks || "",
        flag: param.flag || "normal",
      }));
    }

    // Create the direct lab test
    const labTestData: any = {
      testName,
      category,
      description,
      price: basePrice,
      patient: new mongoose.Types.ObjectId(body.patientId),
      orderedBy: new mongoose.Types.ObjectId(auth.userId!),
      orderedAt: new Date(),
      status: "ordered",
      collectionStatus: "pending",
      processingStatus: "pending",
      verificationStatus: "pending",
      priority: priority,
      paymentVerified: false,
      specimen: {
        type: specimenType,
      },
      // Direct lab test specific fields
      isDirectTest: true,
      createdBy: new mongoose.Types.ObjectId(auth.userId!),
      createdAtDirect: new Date(),
      finalized: false,
      readyForPrint: false,
      // Store test parameters for custom tests
      ...(testParameters.length > 0 && {
        testParameters: testParameters,
      }),
      // Store results parameters if provided (for direct tests with pre-entered results)
      ...(resultsParameters.length > 0 && {
        results: {
          parameters: resultsParameters,
          interpretation: body.results.interpretation || "",
        },
      }),
      // Initialize charges
      charges: {
        basePrice,
        tax: 0,
        discount: 0,
        otherCharges: 0,
        totalAmount: basePrice,
        paid: 0,
        due: basePrice,
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
