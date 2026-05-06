// app/api/radiology/direct-exams/[id]/print/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";

export async function POST(
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
          error: "Forbidden. Only radiology staff can mark exams as printed.",
        },
        { status: 403 },
      );
    }

    const { id: examId } = await params;

    const radiologyExam = await prisma.radiologyExam.findUnique({
      where: { id: examId },
    });

    if (!radiologyExam) {
      return NextResponse.json(
        { success: false, error: "Radiology exam not found" },
        { status: 404 },
      );
    }

    if (!radiologyExam.isDirectExam) {
      return NextResponse.json(
        { success: false, error: "This is not a direct radiology exam" },
        { status: 400 },
      );
    }

    if (!radiologyExam.finalized) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot mark exam as printed. Exam has not been finalized.",
        },
        { status: 400 },
      );
    }

    if (!radiologyExam.readyForPrint) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot mark exam as printed. Exam is not ready for print.",
        },
        { status: 400 },
      );
    }

    if (radiologyExam.printedAt) {
      return NextResponse.json(
        { success: false, error: "Exam has already been printed" },
        { status: 400 },
      );
    }

    const updatedExam = await prisma.radiologyExam.update({
      where: { id: examId },
      data: {
        printedAt: new Date(),
        printedById: auth.userId!,
      },
    });

    console.log(
      `Direct radiology exam ${radiologyExam.examId} marked as printed by ${auth.userName}`,
    );

    return NextResponse.json({
      success: true,
      data: updatedExam,
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