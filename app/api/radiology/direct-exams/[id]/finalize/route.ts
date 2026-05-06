import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenPayload } from "@/lib/auth/jwt";

const allowedRoles = ["radiology_technician", "radiologist", "doctor", "admin"];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const payload = await getTokenPayload(request);
    if (!payload || !allowedRoles.includes(payload.role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. Only radiology staff can finalize exams." },
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

    const charges = JSON.parse(radiologyExam.charges || "{}");

    console.log(`[DEBUG] Finalize attempt for exam ${radiologyExam.examId}:`, {
      isDirectExam: radiologyExam.isDirectExam,
      paymentVerified: radiologyExam.paymentVerified,
      finalized: radiologyExam.finalized,
      status: radiologyExam.status,
    });

    if (!radiologyExam.isDirectExam) {
      console.log(`[DEBUG] Finalization failed: Not a direct exam`);
      return NextResponse.json(
        { success: false, error: "This is not a direct radiology exam" },
        { status: 400 },
      );
    }

    if (!radiologyExam.paymentVerified) {
      console.log(
        `[DEBUG] Finalization failed: Payment not verified. Payment status: ${charges.paymentStatus}, Paid: ${charges.paid}, Due: ${charges.due}`,
      );
      return NextResponse.json(
        {
          success: false,
          error: "Cannot finalize exam. Payment has not been verified.",
        },
        { status: 400 },
      );
    }

    if (radiologyExam.finalized) {
      console.log(`[DEBUG] Finalization failed: Exam already finalized`);
      return NextResponse.json(
        { success: false, error: "Exam has already been finalized" },
        { status: 400 },
      );
    }

    const updatedExam = await prisma.radiologyExam.update({
      where: { id: examId },
      data: {
        finalized: true,
        readyForPrint: true,
        status: "completed",
      },
      include: {
        patient: { select: { name: true, patientId: true, phone: true } },
        createdBy: { select: { name: true } },
        printedBy: { select: { name: true } },
        reportedBy: { select: { name: true } },
      },
    });

    console.log(
      `Direct radiology exam ${radiologyExam.examId} finalized by ${payload.name}`,
    );

    return NextResponse.json({
      success: true,
      data: updatedExam,
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