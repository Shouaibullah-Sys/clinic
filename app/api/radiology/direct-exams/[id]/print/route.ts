// app/api/radiology/direct-exams/[id]/print/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { RadiologyExam } from "@/lib/models/RadiologyExam";
import { authenticateRequest } from "@/lib/auth";
import mongoose from "mongoose";

// POST: Mark a direct radiology exam as printed
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

    // Only radiology staff, radiologists, and admin can mark exams as printed
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
          error: "Forbidden. Only radiology staff can mark exams as printed.",
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

    // Verify this is a direct exam
    if (!radiologyExam.isDirectExam) {
      return NextResponse.json(
        { success: false, error: "This is not a direct radiology exam" },
        { status: 400 },
      );
    }

    // Check if exam is finalized
    if (!radiologyExam.finalized) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot mark exam as printed. Exam has not been finalized.",
        },
        { status: 400 },
      );
    }

    // Check if exam is ready for print
    if (!radiologyExam.readyForPrint) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot mark exam as printed. Exam is not ready for print.",
        },
        { status: 400 },
      );
    }

    // Check if exam has already been printed
    if (radiologyExam.printedAt) {
      return NextResponse.json(
        { success: false, error: "Exam has already been printed" },
        { status: 400 },
      );
    }

    // Mark the exam as printed
    radiologyExam.printedAt = new Date();
    radiologyExam.printedBy = new mongoose.Types.ObjectId(auth.userId!);

    await radiologyExam.save();

    // Populate the response
    const populatedExam = await RadiologyExam.findById(radiologyExam._id)
      .populate("patient", "name patientId phone")
      .populate("createdBy", "name")
      .populate("finalizedBy", "name")
      .populate("printedBy", "name")
      .populate("results.reportedBy", "name")
      .populate("results.verifiedBy", "name")
      .lean();

    console.log(
      `Direct radiology exam ${radiologyExam.examId} marked as printed by ${auth.userName}`,
    );

    return NextResponse.json({
      success: true,
      data: populatedExam,
      message: "Direct radiology exam marked as printed successfully",
    });
  } catch (error: any) {
    console.error("Error marking direct radiology exam as printed:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error.message || "Failed to mark direct radiology exam as printed",
      },
      { status: 500 },
    );
  }
}
