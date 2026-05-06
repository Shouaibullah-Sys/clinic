// app/api/appointments/[id]/checkin/route.ts

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

    if (!["admin", "receptionist"].includes(payload.role)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Forbidden. Only receptionists and admins can check in patients.",
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

    if (!["scheduled", "confirmed"].includes(appointment.status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot check in appointment with status: ${appointment.status}`,
        },
        { status: 400 },
      );
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: {
        status: "checked_in",
        checkInTime: new Date(),
      },
      include: {
        patient: { select: { name: true, phone: true } },
        doctor: { select: { name: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedAppointment,
      message: "Patient checked in successfully",
    });
  } catch (error: any) {
    console.error("Error checking in patient:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to check in patient" },
      { status: 500 },
    );
  }
}