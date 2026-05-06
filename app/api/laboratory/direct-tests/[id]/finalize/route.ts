// app/api/laboratory/direct-tests/[id]/finalize/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenPayload } from "@/lib/auth/jwt";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const payload = await getTokenPayload(request);

    if (!payload || !["lab_technician", "admin"].includes(payload.role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. Only laboratory staff can finalize tests." },
        { status: 403 },
      );
    }

    const { id: testId } = await params;

    const labTest = await (prisma as any).labTest.findUnique({
      where: { id: testId },
    });

    if (!labTest) {
      return NextResponse.json(
        { success: false, error: "Lab test not found" },
        { status: 404 },
      );
    }

    console.log(`[DEBUG] Finalize attempt for test ${labTest.testId}:`, {
      isDirectTest: labTest.isDirectTest,
      paymentVerified: labTest.paymentVerified,
      finalized: labTest.finalized,
      status: labTest.status,
    });

    if (!labTest.isDirectTest) {
      console.log("[DEBUG] Finalization failed: Not a direct test");
      return NextResponse.json(
        { success: false, error: "This is not a direct lab test" },
        { status: 400 },
      );
    }

    if (!labTest.paymentVerified) {
      console.log(
        `[DEBUG] Finalization failed: Payment not verified.`,
      );
      return NextResponse.json(
        {
          success: false,
          error: "Cannot finalize test. Payment has not been verified.",
        },
        { status: 400 },
      );
    }

    if (labTest.finalized) {
      console.log("[DEBUG] Finalization failed: Test already finalized");
      return NextResponse.json(
        { success: false, error: "Test has already been finalized" },
        { status: 400 },
      );
    }

    const updatedTest = await (prisma as any).labTest.update({
      where: { id: testId },
      data: {
        finalized: true,
        finalizedAt: new Date(),
        finalizedById: payload.id,
        readyForPrint: true,
        status: "completed",
      },
      include: {
        patient: { select: { name: true, patientId: true, phone: true } },
        createdBy: { select: { name: true } },
        finalizedBy: { select: { name: true } },
      },
    });

    console.log(`Direct lab test ${labTest.testId} finalized by ${payload.name}`);

    return NextResponse.json({
      success: true,
      data: updatedTest,
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