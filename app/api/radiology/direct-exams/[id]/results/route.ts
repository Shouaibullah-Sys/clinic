// app/api/radiology/direct-exams/[id]/results/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { RadiologyExam } from "@/lib/models/RadiologyExam";
import { authenticateRequest } from "@/lib/auth";
import mongoose from "mongoose";

// PUT: Add findings to a direct radiology exam
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await dbConnect();

    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 },
      );
    }

    // Only radiology technicians, radiologists, and doctors can add findings
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
          error: "Only radiology staff can add exam findings",
        },
        { status: 403 },
      );
    }

    const { id: examId } = await params;
    const body = await request.json();
    const { findings, impression } = body;

    // Find exam
    const exam = await RadiologyExam.findById(examId);

    if (!exam) {
      return NextResponse.json(
        { success: false, error: "Radiology exam not found" },
        { status: 404 },
      );
    }

    // Verify this is a direct exam
    if (!exam.isDirectExam) {
      return NextResponse.json(
        { success: false, error: "This is not a direct radiology exam" },
        { status: 400 },
      );
    }

    // Check if exam is already completed
    if (exam.status === "completed" || exam.status === "reported") {
      return NextResponse.json(
        { success: false, error: "Exam findings have already been entered" },
        { status: 400 },
      );
    }

    // Check payment verification
    if (!exam.paymentVerified) {
      return NextResponse.json(
        {
          success: false,
          error: "Payment must be verified before adding findings",
        },
        { status: 400 },
      );
    }

    // Validate findings
    if (!findings || !Array.isArray(findings) || findings.length === 0) {
      return NextResponse.json(
        { success: false, error: "Exam findings are required" },
        { status: 400 },
      );
    }

    // Update exam with findings
    exam.results = {
      findings: findings.map((f: any) => ({
        name: f.name,
        value: f.value,
        unit: f.unit || "",
        normalRange: f.normalRange || "",
        flag: f.flag || "normal",
        remarks: f.remarks || "",
      })),
      impression: impression || "",
      reportedBy: new mongoose.Types.ObjectId(auth.userId),
      reportedAt: new Date(),
    };

    // For direct exams, set status to "completed" when findings are added
    exam.status = "completed";
    exam.processingStatus = "completed";
    exam.completedAt = new Date();

    await exam.save();

    // Return updated exam
    const updatedExam = await RadiologyExam.findById(examId)
      .populate("patient", "name patientId phone")
      .populate("createdBy", "name")
      .populate("results.reportedBy", "name")
      .lean();

    console.log(
      `Findings added for direct radiology exam ${exam.examId} by ${auth.userName}`,
    );

    return NextResponse.json({
      success: true,
      data: updatedExam,
      message: "Exam findings added successfully",
    });
  } catch (error: any) {
    console.error("Error adding exam findings:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to save exam findings",
      },
      { status: 500 },
    );
  }
}
