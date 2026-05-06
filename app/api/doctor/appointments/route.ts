import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenPayload } from "@/lib/auth/jwt";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isAfter,
  isBefore,
} from "date-fns";

export async function GET(request: NextRequest) {
  try {
    const user = await getTokenPayload(request);
    if (!user || user.role !== "doctor") {
      return NextResponse.json(
        { success: false, error: "Doctor access required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const dateFilter = searchParams.get("date") || "all";
    const statusFilter = searchParams.get("status") || "all";

    const today = new Date();
    let startTimeFilter: Date | undefined;
    let endTimeFilter: Date | undefined;

    switch (dateFilter) {
      case "today":
        startTimeFilter = startOfDay(today);
        endTimeFilter = endOfDay(today);
        break;
      case "week":
        startTimeFilter = startOfWeek(today);
        endTimeFilter = endOfWeek(today);
        break;
      case "month":
        startTimeFilter = startOfMonth(today);
        endTimeFilter = endOfMonth(today);
        break;
      case "past":
        startTimeFilter = undefined;
        endTimeFilter = startOfDay(today);
        break;
      case "future":
        startTimeFilter = endOfDay(today);
        endTimeFilter = undefined;
        break;
      default:
        break;
    }

    const where: any = {
      doctorId: user.id,
      status: { notIn: ["cancelled", "no-show"] },
    };

    if (startTimeFilter && endTimeFilter) {
      where.startTime = { gte: startTimeFilter, lte: endTimeFilter };
    } else if (endTimeFilter) {
      where.startTime = { lt: endTimeFilter };
    } else if (startTimeFilter) {
      where.startTime = { gte: startTimeFilter };
    }

    if (statusFilter !== "all") {
      where.status = statusFilter;
    }

    const appointments = await prisma.appointment.findMany({
      where,
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