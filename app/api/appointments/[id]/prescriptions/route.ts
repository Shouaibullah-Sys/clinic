// app/api/appointments/[id]/prescriptions/route.ts
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

    const prescriptions = await prisma.prescription.findMany({
      where: { appointmentId },
      select: {
        id: true,
        prescriptionId: true,
        date: true,
        diagnosis: true,
        medications: true,
        instructions: true,
        notes: true,
        status: true,
        expiryDate: true,
        charges: true,
        paymentStatus: true,
        paymentVerified: true,
        patient: { select: { name: true, patientId: true } },
        doctor: { select: { name: true, specialization: true } },
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: prescriptions,
    });
  } catch (error: any) {
    console.error("Error fetching appointment prescriptions:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch prescriptions",
      },
      { status: 500 },
    );
  }
}