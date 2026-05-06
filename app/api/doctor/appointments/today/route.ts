import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenPayload } from "@/lib/auth/jwt";
import { startOfDay, endOfDay } from "date-fns";

export async function GET(request: NextRequest) {
  try {
    const user = await getTokenPayload(request);
    if (!user || user.role !== "doctor") {
      return NextResponse.json(
        { success: false, error: "Doctor access required" },
        { status: 403 }
      );
    }

    const today = new Date();
    const startOfToday = startOfDay(today);
    const endOfToday = endOfDay(today);

    const appointments = await prisma.appointment.findMany({
      where: {
        doctorId: user.id,
        startTime: { gte: startOfToday, lte: endOfToday },
        status: { notIn: ["cancelled", "no-show"] },
      },
      orderBy: { startTime: "asc" },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            phone: true,
            patientId: true,
            dateOfBirth: true,
            gender: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: appointments,
    });
  } catch (error: any) {
    console.error("Error fetching doctor appointments:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch appointments" },
      { status: 500 }
    );
  }
}