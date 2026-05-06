// app/api/appointments/count/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenPayload } from "@/lib/auth/jwt";
import { startOfDay, endOfDay } from "date-fns";

export async function GET(request: NextRequest) {
  try {
    const user = await getTokenPayload(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get("doctorId");
    const date = searchParams.get("date");

    if (!doctorId || !date) {
      return NextResponse.json(
        { success: false, error: "doctorId and date are required" },
        { status: 400 }
      );
    }

    const appointmentDate = new Date(date);
    const startOfTargetDay = startOfDay(appointmentDate);
    const endOfTargetDay = endOfDay(appointmentDate);

    const count = await prisma.appointment.count({
      where: {
        doctorId,
        startTime: {
          gte: startOfTargetDay,
          lte: endOfTargetDay,
        },
        status: {
          notIn: ["cancelled", "no-show"],
        },
      },
    });

    return NextResponse.json({
      success: true,
      count,
      doctorId,
      date,
    });

  } catch (error) {
    console.error("Error counting appointments:", error);
    return NextResponse.json(
      { success: false, error: "Failed to count appointments" },
      { status: 500 }
    );
  }
}