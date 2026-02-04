// app/api/radiology/direct-exams/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { RadiologyExam } from "@/lib/models/RadiologyExam";
import { Patient } from "@/lib/models/Patient";
import { authenticateRequest } from "@/lib/auth";
import mongoose from "mongoose";

// GET: List all direct exams with optional filtering
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

    // Check if user has access to radiology
    const allowedRoles = [
      "radiology_technician",
      "admin",
      "receptionist",
      "doctor",
    ];
    if (!auth.userRole || !allowedRoles.includes(auth.userRole)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Forbidden. You don't have permission to access direct radiology exams.",
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

    // Build query for direct exams only
    const query: any = { isDirectExam: true };

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

    // Fetch direct exams with proper population
    const exams = await RadiologyExam.find(query)
      .populate("patient", "name patientId phone email dateOfBirth gender")
      .populate("createdBy", "name")
      .populate("finalizedBy", "name")
      .populate("printedBy", "name")
      .sort(sortObj)
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      data: exams,
      count: exams.length,
      userRole: auth.userRole,
    });
  } catch (error: any) {
    console.error("Error fetching direct radiology exams:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch direct radiology exams",
      },
      { status: 500 },
    );
  }
}

// POST: Create a new direct radiology exam
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

    // Only radiology staff, receptionists, and admin can create direct exams
    const allowedRoles = [
      "radiology_technician",
      "radiologist",
      "admin",
      "receptionist",
    ];
    if (!auth.userRole || !allowedRoles.includes(auth.userRole)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Forbidden. Only radiology staff and receptionists can create direct radiology exams.",
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

    // Validate modality
    const validModalities = [
      "xray",
      "ct",
      "mri",
      "ultrasound",
      "mammography",
      "fluoroscopy",
      "nuclear_medicine",
      "other",
    ];
    if (body.category && !validModalities.includes(body.category)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid modality. Must be xray, ct, mri, ultrasound, mammography, fluoroscopy, nuclear_medicine, or other",
        },
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

    // Determine exam details
    const examName = body.examName;
    const category = body.category || "xray";
    const description = body.description;
    const basePrice = body.price;
    const bodyPart = body.bodyPart || body.examName;
    const view = body.view;

    // Validate price
    if (!basePrice || isNaN(basePrice) || basePrice <= 0) {
      return NextResponse.json(
        { success: false, error: "Valid exam price is required" },
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

    // Prepare exam findings
    let examFindings: any[] = [];
    let resultsFindings: any[] = [];
    if (body.findings && Array.isArray(body.findings)) {
      examFindings = body.findings.map((finding: any) => ({
        name: finding.name || finding.parameterName,
        value: finding.value || "",
        unit: finding.unit || "",
        remarks: finding.remarks || "",
      }));
    }

    // Handle results findings (for direct exams with pre-entered results)
    if (
      body.results &&
      body.results.findings &&
      Array.isArray(body.results.findings)
    ) {
      resultsFindings = body.results.findings.map((finding: any) => ({
        name: finding.name || finding.parameterName,
        value: finding.value || "",
        unit: finding.unit || "",
        normalRange: finding.normalRange || "",
        remarks: finding.remarks || "",
        flag: finding.flag || "normal",
      }));
    }

    // Create the direct radiology exam
    const radiologyExamData: any = {
      examName,
      category,
      description,
      price: basePrice,
      patient: new mongoose.Types.ObjectId(body.patientId),
      orderedBy: new mongoose.Types.ObjectId(auth.userId!),
      orderedAt: new Date(),
      status: "ordered",
      examStatus: "pending",
      processingStatus: "pending",
      verificationStatus: "pending",
      priority: priority,
      paymentVerified: false,
      // Direct radiology exam specific fields
      isDirectExam: true,
      createdBy: new mongoose.Types.ObjectId(auth.userId!),
      createdAtDirect: new Date(),
      finalized: false,
      readyForPrint: false,
      // Store findings for custom exams
      ...(examFindings.length > 0 && {
        modality: {
          type: category,
          bodyPart,
          view,
          findings: examFindings,
          contrastUsed: body.contrastUsed || false,
          contrastType: body.contrastType,
          remarks: body.modalityRemarks,
        },
      }),
      // Store results findings if provided (for direct exams with pre-entered results)
      ...(resultsFindings.length > 0 && {
        results: {
          findings: resultsFindings,
          impression: body.results.impression || "",
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

    const radiologyExam = new RadiologyExam(radiologyExamData);
    await radiologyExam.save();

    // Populate the response
    const populatedExam = await RadiologyExam.findById(radiologyExam._id)
      .populate("patient", "name patientId phone")
      .populate("createdBy", "name")
      .lean();

    console.log(
      `Direct radiology exam created: ${radiologyExam.examId} by ${auth.userName}`,
    );

    return NextResponse.json(
      {
        success: true,
        data: populatedExam,
        message: "Direct radiology exam created successfully",
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Error creating direct radiology exam:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create direct radiology exam",
      },
      { status: 500 },
    );
  }
}
