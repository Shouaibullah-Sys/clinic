// app/api/appointments/[id]/checkout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenPayload } from "@/lib/auth/jwt";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const payload = await getTokenPayload(request);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. No token provided." },
        { status: 401 },
      );
    }

    if (!["admin", "receptionist", "doctor"].includes(payload.role)) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden. You don't have permission to check out patients.",
        },
        { status: 403 },
      );
    }

    const { id } = await params;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: { select: { name: true, phone: true } },
        doctor: { select: { name: true } },
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { success: false, error: "Appointment not found" },
        { status: 404 },
      );
    }

    if (appointment.status !== "checked_in") {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot check out appointment with status: ${appointment.status}. Patient must be checked in first.`,
        },
        { status: 400 },
      );
    }

    if (payload.role === "doctor" && appointment.doctorId !== payload.id) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Forbidden. Only the assigned doctor can check out this patient.",
        },
        { status: 403 },
      );
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: {
        status: "completed",
        checkOutTime: new Date(),
      },
      include: {
        patient: { select: { name: true, phone: true } },
        doctor: { select: { name: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedAppointment,
      message: "Patient checked out successfully",
    });
  } catch (error: any) {
    console.error("Error checking out patient:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to check out patient" },
      { status: 500 },
    );
  }
}