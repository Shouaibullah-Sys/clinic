// app/api/laboratory/direct-tests/[id]/print/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { LabTest } from "@/lib/models/LabTest";
import { authenticateRequest } from "@/lib/auth";
import mongoose from "mongoose";

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

    // Verify this is a direct test
    if (!labTest.isDirectTest) {
      return NextResponse.json(
        { success: false, error: "This is not a direct lab test" },
        { status: 400 },
      );
    }

    // Check if test is finalized
    if (!labTest.finalized) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot mark test as printed. Test has not been finalized.",
        },
        { status: 400 },
      );
    }

    // Check if test is ready for print
    if (!labTest.readyForPrint) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot mark test as printed. Test is not ready for print.",
        },
        { status: 400 },
      );
    }

    // Check if test has already been printed
    if (labTest.printedAt) {
      return NextResponse.json(
        { success: false, error: "Test has already been printed" },
        { status: 400 },
      );
    }

    // Mark the test as printed
    labTest.printedAt = new Date();
    labTest.printedBy = new mongoose.Types.ObjectId(auth.userId!);

    await labTest.save();

    // Populate the response
    const populatedTest = await LabTest.findById(labTest._id)
      .populate("patient", "name patientId phone")
      .populate("createdBy", "name")
      .populate("finalizedBy", "name")
      .populate("printedBy", "name")
      .populate("results.reportedBy", "name")
      .populate("results.verifiedBy", "name")
      .lean();

    console.log(
      `Direct lab test ${labTest.testId} marked as printed by ${auth.userName}`,
    );

    return NextResponse.json({
      success: true,
      data: populatedTest,
      message: "Direct lab test marked as printed successfully",
    });
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
