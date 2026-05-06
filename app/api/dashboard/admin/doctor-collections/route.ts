import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenPayload } from "@/lib/auth/jwt";

function getDateRange(period: string, startDate?: string, endDate?: string) {
  const now = new Date();
  let start: Date;
  let end: Date;

  if (startDate && endDate) {
    start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    return { start, end, type: "custom" };
  }

  switch (period) {
    case "today":
      start = new Date(now);
      start.setHours(0, 0, 0, 0);
      end = new Date(now);
      end.setHours(23, 59, 59, 999);
      break;
    case "week":
      const dayOfWeek = now.getDay();
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      start = new Date(now);
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
      end = new Date(now);
      end.setHours(23, 59, 59, 999);
      break;
    case "month":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      start.setHours(0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case "year":
      start = new Date(now.getFullYear(), 0, 1);
      start.setHours(0, 0, 0, 0);
      end = new Date(now.getFullYear(), 11, 31);
      end.setHours(23, 59, 59, 999);
      break;
    default:
      start = new Date(now);
      start.setHours(0, 0, 0, 0);
      end = new Date(now);
      end.setHours(23, 59, 59, 999);
  }

  return { start, end, type: period };
}

export async function GET(request: NextRequest) {
  try {
    const payload = await getTokenPayload(request);

    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const userRole = payload.role as string;

    if (userRole !== "admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden. Admin access required." },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "today";
    const department = searchParams.get("department");
    const doctorId = searchParams.get("doctorId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const dateRange = getDateRange(period, startDate || undefined, endDate || undefined);

    let where: any = { role: "doctor", active: true };
    if (department && department !== "all") {
      where.department = department;
    }
    if (doctorId) {
      where.id = doctorId;
    }

    const doctors = await prisma.user.findMany({
      where,
      select: { id: true, name: true, department: true, specialization: true, consultationFee: true },
    });

    const doctorMap = new Map<string, any>();
    doctors.forEach((doc) => {
      doctorMap.set(doc.id, {
        doctorId: doc.id,
        doctorName: doc.name,
        department: doc.department || "N/A",
        specialization: doc.specialization || "N/A",
        consultationFee: doc.consultationFee || 0,
        appointmentCount: 0,
        appointmentRevenue: 0,
        operationCount: 0,
        operationRevenue: 0,
        totalCollection: 0,
      });
    });

    const appointmentWhere: any = {
      status: { in: ["completed", "checked-in", "in-progress", "scheduled", "confirmed"] },
      startTime: { gte: dateRange.start, lte: dateRange.end },
    };
    if (doctorId) {
      appointmentWhere.doctorId = doctorId;
    }

    const appointments = await prisma.appointment.findMany({
      where: appointmentWhere,
      select: { doctorId: true, consultationFee: true, doctorFee: true },
    });

    const apptAgg = new Map<string, { count: number; revenue: number }>();
    appointments.forEach((apt) => {
      const docId = apt.doctorId;
      if (!apptAgg.has(docId)) {
        apptAgg.set(docId, { count: 0, revenue: 0 });
      }
      const data = apptAgg.get(docId)!;
      data.count += 1;
      data.revenue += apt.consultationFee || apt.doctorFee || 0;
    });

    apptAgg.forEach((data, docId) => {
      if (doctorMap.has(docId)) {
        const doc = doctorMap.get(docId);
        doc.appointmentCount = data.count;
        doc.appointmentRevenue = data.revenue;
      }
    });

    const dischargeWhere: any = {
      status: { in: ["paid", "completed"] },
      dischargeDate: { gte: dateRange.start, lte: dateRange.end },
    };
    if (doctorId) {
      dischargeWhere.doctorId = doctorId;
    }

    const dischargeCards = await prisma.dischargeCard.findMany({
      where: dischargeWhere,
    });

    const disAgg = new Map<string, { count: number; revenue: number }>();
    dischargeCards.forEach((card) => {
      const billing = typeof card.billing === "string" ? JSON.parse(card.billing) : card.billing;
      const docId = card.doctorId;
      if (docId && !disAgg.has(docId)) {
        disAgg.set(docId, { count: 0, revenue: 0 });
      }
      if (docId) {
        const data = disAgg.get(docId)!;
        data.count += 1;
        data.revenue += billing?.paidAmount || 0;
      }
    });

    disAgg.forEach((data, docId) => {
      if (doctorMap.has(docId)) {
        const doc = doctorMap.get(docId);
        doc.operationCount = data.count;
        doc.operationRevenue = data.revenue;
      }
    });

    const byDoctor = Array.from(doctorMap.values())
      .map((doc) => {
        doc.totalCollection = doc.appointmentRevenue + doc.operationRevenue;
        return doc;
      })
      .sort((a, b) => b.totalCollection - a.totalCollection);

    const summary = {
      totalAppointments: byDoctor.reduce((sum, doc) => sum + doc.appointmentCount, 0),
      totalAppointmentRevenue: byDoctor.reduce((sum, doc) => sum + doc.appointmentRevenue, 0),
      totalOperations: byDoctor.reduce((sum, doc) => sum + doc.operationCount, 0),
      totalOperationRevenue: byDoctor.reduce((sum, doc) => sum + doc.operationRevenue, 0),
      grandTotal: byDoctor.reduce((sum, doc) => sum + doc.totalCollection, 0),
    };

    return NextResponse.json({
      success: true,
      data: {
        summary,
        byDoctor,
        period: {
          type: dateRange.type,
          startDate: dateRange.start,
          endDate: dateRange.end,
        },
      },
    });
  } catch (error: any) {
    console.error("Error fetching doctor collections:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch doctor collections",
      },
      { status: 500 },
    );
  }
}