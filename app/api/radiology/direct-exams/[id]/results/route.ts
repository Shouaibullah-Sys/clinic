// app/api/radiology/direct-exams/[id]/results/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 },
      );
    }

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

    const exam = await prisma.radiologyExam.findUnique({
      where: { id: examId },
    });

    if (!exam) {
      return NextResponse.json(
        { success: false, error: "Radiology exam not found" },
        { status: 404 },
      );
    }

    if (!exam.isDirectExam) {
      return NextResponse.json(
        { success: false, error: "This is not a direct radiology exam" },
        { status: 400 },
      );
    }

    if (exam.status === "completed" || exam.status === "reported") {
      return NextResponse.json(
        { success: false, error: "Exam findings have already been entered" },
        { status: 400 },
      );
    }

    if (!exam.paymentVerified) {
      return NextResponse.json(
        {
          success: false,
          error: "Payment must be verified before adding findings",
        },
        { status: 400 },
      );
    }

    if (!findings || !Array.isArray(findings) || findings.length === 0) {
      return NextResponse.json(
        { success: false, error: "Exam findings are required" },
        { status: 400 },
      );
    }

    const updatedExam = await prisma.radiologyExam.update({
      where: { id: examId },
      data: {
        results: JSON.stringify({
          findings: findings.map((f: any) => ({
            name: f.name,
            value: f.value,
            unit: f.unit || "",
            normalRange: f.normalRange || "",
            flag: f.flag || "normal",
            remarks: f.remarks || "",
          })),
          impression: impression || "",
        }),
        status: "completed",
        completedAt: new Date(),
        reportedById: auth.userId!,
        reportedAt: new Date(),
      },
    });

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