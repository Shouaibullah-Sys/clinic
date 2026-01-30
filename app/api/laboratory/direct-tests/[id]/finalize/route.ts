// app/api/laboratory/direct-tests/[id]/finalize/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { LabTest } from "@/lib/models/LabTest";
import { authenticateRequest } from "@/lib/auth";
import mongoose from "mongoose";

// POST: Finalize a direct lab test
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

    // Only laboratory staff and admin can finalize tests
    const allowedRoles = ["lab_technician", "admin"];
    if (!auth.userRole || !allowedRoles.includes(auth.userRole)) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden. Only laboratory staff can finalize tests.",
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
    console.log(`[DEBUG] Finalize attempt for test ${labTest.testId}:`, {
      isDirectTest: labTest.isDirectTest,
      paymentVerified: labTest.paymentVerified,
      finalized: labTest.finalized,
      status: labTest.status,
      hasResults: !!(
        labTest.results &&
        labTest.results.parameters &&
        labTest.results.parameters.length > 0
      ),
      resultsCount: labTest.results?.parameters?.length || 0,
      paymentStatus: labTest.charges.paymentStatus,
      paid: labTest.charges.paid,
      due: labTest.charges.due,
      totalAmount: labTest.charges.totalAmount,
    });

    // Verify this is a direct test
    if (!labTest.isDirectTest) {
      console.log(`[DEBUG] Finalization failed: Not a direct test`);
      return NextResponse.json(
        { success: false, error: "This is not a direct lab test" },
        { status: 400 },
      );
    }

    // Check if payment is verified
    if (!labTest.paymentVerified) {
      console.log(
        `[DEBUG] Finalization failed: Payment not verified. Payment status: ${labTest.charges.paymentStatus}, Paid: ${labTest.charges.paid}, Due: ${labTest.charges.due}`,
      );
      return NextResponse.json(
        {
          success: false,
          error: "Cannot finalize test. Payment has not been verified.",
        },
        { status: 400 },
      );
    }

    // Check if test is already finalized
    if (labTest.finalized) {
      console.log(`[DEBUG] Finalization failed: Test already finalized`);
      return NextResponse.json(
        { success: false, error: "Test has already been finalized" },
        { status: 400 },
      );
    }

    // Check if test status allows finalization
    const allowedStatuses = ["completed", "reported"];
    if (!allowedStatuses.includes(labTest.status)) {
      console.log(
        `[DEBUG] Finalization failed: Invalid status. Current: ${labTest.status}, Required: ${allowedStatuses.join(" or ")}`,
      );
      return NextResponse.json(
        {
          success: false,
          error: `Cannot finalize test. Test status must be 'completed' or 'reported'. Current status: ${labTest.status}`,
        },
        { status: 400 },
      );
    }

    // Check if results exist
    if (
      !labTest.results ||
      !labTest.results.parameters ||
      labTest.results.parameters.length === 0
    ) {
      console.log(
        `[DEBUG] Finalization failed: No results added. Results: ${JSON.stringify(labTest.results)}`,
      );
      return NextResponse.json(
        {
          success: false,
          error: "Cannot finalize test. Test results have not been added.",
        },
        { status: 400 },
      );
    }

    // Finalize the test
    labTest.finalized = true;
    labTest.finalizedAt = new Date();
    labTest.finalizedBy = new mongoose.Types.ObjectId(auth.userId!);
    labTest.readyForPrint = true;

    await labTest.save();

    // Populate the response
    const populatedTest = await LabTest.findById(labTest._id)
      .populate("patient", "name patientId phone")
      .populate("createdBy", "name")
      .populate("finalizedBy", "name")
      .populate("results.reportedBy", "name")
      .populate("results.verifiedBy", "name")
      .lean();

    console.log(
      `Direct lab test ${labTest.testId} finalized by ${auth.userName}`,
    );

    return NextResponse.json({
      success: true,
      data: populatedTest,
      message: "Direct lab test finalized successfully",
    });
  } catch (error: any) {
    console.error("Error finalizing direct lab test:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to finalize direct lab test",
      },
      { status: 500 },
    );
  }
}
