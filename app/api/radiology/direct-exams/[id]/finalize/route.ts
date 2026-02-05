// app/api/radiology/direct-exams/[id]/finalize/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { RadiologyExam } from "@/lib/models/RadiologyExam";
import { authenticateRequest } from "@/lib/auth";
import mongoose from "mongoose";

// POST: Finalize a direct radiology exam
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

    // Only radiology staff and admin can finalize exams
    const allowedRoles = [
      "radiology_technician",
      "radiologist",
      "doctor",
      "admin",
    ];
    if (!auth.userRole || !allowedRoles.includes(auth.userRole)) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden. Only radiology staff can finalize exams.",
        },
        { status: 403 },
      );
    }

    // Unwrap the params promise
    const { id: examId } = await params;

    // Find the radiology exam
    const radiologyExam = await RadiologyExam.findById(examId);
    if (!radiologyExam) {
      return NextResponse.json(
        { success: false, error: "Radiology exam not found" },
        { status: 404 },
      );
    }

    // Debug logging
    console.log(`[DEBUG] Finalize attempt for exam ${radiologyExam.examId}:`, {
      isDirectExam: radiologyExam.isDirectExam,
      paymentVerified: radiologyExam.paymentVerified,
      finalized: radiologyExam.finalized,
      status: radiologyExam.status,
      hasResults: !!(
        radiologyExam.results &&
        radiologyExam.results.findings &&
        radiologyExam.results.findings.length > 0
      ),
      resultsCount: radiologyExam.results?.findings?.length || 0,
      paymentStatus: radiologyExam.charges.paymentStatus,
      paid: radiologyExam.charges.paid,
      due: radiologyExam.charges.due,
      totalAmount: radiologyExam.charges.totalAmount,
    });

    // Verify this is a direct exam
    if (!radiologyExam.isDirectExam) {
      console.log(`[DEBUG] Finalization failed: Not a direct exam`);
      return NextResponse.json(
        { success: false, error: "This is not a direct radiology exam" },
        { status: 400 },
      );
    }

    // Check if payment is verified
    if (!radiologyExam.paymentVerified) {
      console.log(
        `[DEBUG] Finalization failed: Payment not verified. Payment status: ${radiologyExam.charges.paymentStatus}, Paid: ${radiologyExam.charges.paid}, Due: ${radiologyExam.charges.due}`,
      );
      return NextResponse.json(
        {
          success: false,
          error: "Cannot finalize exam. Payment has not been verified.",
        },
        { status: 400 },
      );
    }

    // Check if exam is already finalized
    if (radiologyExam.finalized) {
      console.log(`[DEBUG] Finalization failed: Exam already finalized`);
      return NextResponse.json(
        { success: false, error: "Exam has already been finalized" },
        { status: 400 },
      );
    }

    // Finalize the exam - simplified flow: just verify payment and finalize
    radiologyExam.finalized = true;
    radiologyExam.finalizedAt = new Date();
    radiologyExam.finalizedBy = new mongoose.Types.ObjectId(auth.userId!);
    radiologyExam.readyForPrint = true;
    radiologyExam.status = "completed";

    await radiologyExam.save();

    // Populate the response
    const populatedExam = await RadiologyExam.findById(radiologyExam._id)
      .populate("patient", "name patientId phone")
      .populate("createdBy", "name")
      .populate("finalizedBy", "name")
      .populate("results.reportedBy", "name")
      .populate("results.verifiedBy", "name")
      .lean();

    console.log(
      `Direct radiology exam ${radiologyExam.examId} finalized by ${auth.userName}`,
    );

    return NextResponse.json({
      success: true,
      data: populatedExam,
      message: "Direct radiology exam finalized successfully",
    });
  } catch (error: any) {
    console.error("Error finalizing direct radiology exam:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to finalize direct radiology exam",
      },
      { status: 500 },
    );
  }
}
