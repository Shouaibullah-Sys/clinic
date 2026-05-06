// app/api/appointments/[id]/lab-tests/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenPayload } from "@/lib/auth/jwt";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: appointmentId } = await params;

    const payload = await getTokenPayload(request);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. No token provided." },
        { status: 401 },
      );
    }

    if (!["receptionist", "doctor", "admin"].includes(payload.role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. Insufficient permissions." },
        { status: 403 },
      );
    }

    const labTests = await prisma.labTest.findMany({
      where: { appointmentId },
      select: {
        id: true,
        testId: true,
        testName: true,
        category: true,
        description: true,
        price: true,
        discountedPrice: true,
        status: true,
        priority: true,
        testParameters: true,
        charges: true,
        createdAt: true,
        patient: { select: { name: true, patientId: true } },
        doctor: { select: { name: true, specialization: true } },
        orderedBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: labTests,
    });
  } catch (error: any) {
    console.error("Error fetching appointment lab tests:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch lab tests" },
      { status: 500 },
    );
  }
}