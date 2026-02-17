// app/api/laboratory/direct-tests/[id]/print/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { LabTest } from "@/lib/models/LabTest";
import { authenticateRequest, canAccessLaboratory } from "@/lib/auth";
import mongoose from "mongoose";

/**
 * GET /api/laboratory/direct-tests/[id]/print
 *
 * Fetches direct test data for PDF generation/printing.
 * Returns the complete test object with all necessary data for generating a PDF report.
 *
 * This endpoint is used by the LabTestPDFGenerator component to retrieve test data
 * before generating the PDF on the client side.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    // Check if user can access laboratory
    if (!canAccessLaboratory(auth.userRole)) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden. You don't have permission to access lab tests.",
        },
        { status: 403 },
      );
    }

    // Unwrap the params promise
    const { id: testId } = await params;

    console.log(
      `Direct lab test print requested by ${auth.userRole} ${auth.userName}: ${testId}`,
    );

    // Find the test by ID with all necessary populated fields
    const test = await LabTest.findById(testId)
      .populate(
        "patient",
        "name patientId phone guardian dateOfBirth gender address refPerson passTskNo registrationNo",
      )
      .populate("doctor", "name specialization department licenseNumber")
      .populate("orderedBy", "name")
      .populate("charges.collectedBy", "name")
      .populate("collectionDetails.collectedBy", "name")
      .populate("processingDetails.processedBy", "name")
      .populate("verificationDetails.verifiedBy", "name")
      .populate("paymentVerifiedBy", "name")
      .populate("results.reportedBy", "name")
      .populate("results.verifiedBy", "name")
      .lean();

    if (!test) {
      return NextResponse.json(
        { success: false, error: "Lab test not found" },
        { status: 404 },
      );
    }

    // If user is doctor, check if they can access this test
    if (auth.userRole === "doctor" && test.doctor?.toString() !== auth.userId) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden. You can only access your own lab tests.",
        },
        { status: 403 },
      );
    }

    // Check if test has results (required for printing)
    if (
      !test.results ||
      !test.results.parameters ||
      test.results.parameters.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Test results are not available yet. Cannot print report.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      data: test,
      userRole: auth.userRole,
    });
  } catch (error: any) {
    console.error("Error fetching direct lab test for print:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch direct lab test for printing",
      },
      { status: 500 },
    );
  }
}

// POST: Mark a direct lab test as printed
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    // Only laboratory staff and admin can mark tests as printed
    const allowedRoles = ["lab_technician", "admin"];
    if (!auth.userRole || !allowedRoles.includes(auth.userRole)) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden. Only laboratory staff can mark tests as printed.",
        },
        { status: 403 },
      );
    }

    // Unwrap the params promise
    const { id: testId } = await params;

    // Find the lab test
    const labTest = await LabTest.findById(testId);
    if (!labTest) {
      return NextResponse.json(
        { success: false, error: "Lab test not found" },
        { status: 404 },
      );
    }

    // Debug logging
    console.log(`[DEBUG] Print attempt for test ${labTest.testId}:`, {
      isDirectTest: labTest.isDirectTest,
      collectionStatus: labTest.collectionStatus,
      readyForPrint: labTest.readyForPrint,
      printedAt: labTest.printedAt,
      status: labTest.status,
    });

    // Build detailed validation report
    const validationReport = {
      isDirectTest: labTest.isDirectTest,
      collectionStatus: labTest.collectionStatus,
      readyForPrint: labTest.readyForPrint,
      printedAt: labTest.printedAt
        ? new Date(labTest.printedAt).toISOString()
        : null,
      status: labTest.status,
    };

    console.log(`[DEBUG] Validation report:`, validationReport);

    // Check which validation is failing
    if (!labTest.isDirectTest) {
      console.log(`[DEBUG] Print failed: Not a direct test`);
      return NextResponse.json(
        {
          success: false,
          error: "This is not a direct lab test",
          validation: validationReport,
        },
        { status: 400 },
      );
    }

    if (labTest.collectionStatus !== "collected") {
      console.log(`[DEBUG] Print failed: Sample not collected`);
      return NextResponse.json(
        {
          success: false,
          error:
            "Cannot mark test as printed. Sample has not been collected yet.",
          validation: validationReport,
        },
        { status: 400 },
      );
    }

    if (
      !labTest.results ||
      !labTest.results.parameters ||
      labTest.results.parameters.length === 0
    ) {
      console.log(`[DEBUG] Print failed: Results are missing`);
      return NextResponse.json(
        {
          success: false,
          error: "Cannot mark test as printed. Results are missing.",
          validation: validationReport,
        },
        { status: 400 },
      );
    }

    if (labTest.printedAt) {
      console.log(
        `[DEBUG] Print failed: Already printed at ${labTest.printedAt}`,
      );
      return NextResponse.json(
        {
          success: false,
          error: "Test has already been printed",
          validation: validationReport,
        },
        { status: 400 },
      );
    }

    // Mark the test as printed
    labTest.printedAt = new Date();
    labTest.printedBy = new mongoose.Types.ObjectId(auth.userId!);

    await labTest.save();

    // Populate the response
    try {
      const populatedTest = await LabTest.findById(labTest._id)
        .populate("patient", "name patientId phone")
        .populate("createdBy", "name")
        .populate("finalizedBy", "name")
        .populate("printedBy", "name")
        .populate("results.reportedBy", "name")
        .populate("results.verifiedBy", "name")
        .lean();

      console.log(`[DEBUG] Print successful for test ${labTest.testId}`);

      return NextResponse.json({
        success: true,
        data: populatedTest,
        message: "Direct lab test marked as printed successfully",
      });
    } catch (populateError: any) {
      console.error("[DEBUG] Populate error:", populateError);
      // If populate fails, still return success without populated fields
      return NextResponse.json({
        success: true,
        data: labTest.toObject(),
        message: "Direct lab test marked as printed (populate failed)",
      });
    }
  } catch (error: any) {
    console.error("Error marking direct lab test as printed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to mark direct lab test as printed",
      },
      { status: 500 },
    );
  }
}
