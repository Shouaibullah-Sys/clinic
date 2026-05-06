import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(req);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "service";
    const limit = parseInt(searchParams.get("limit") || "10");
    const period = searchParams.get("period") || "today";

    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (period) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        break;
      case "week":
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        endDate.setHours(23, 59, 59, 999);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    }

    let result: any = {
      type,
      period,
      dateRange: { startDate, endDate },
      data: [],
    };

    switch (type) {
      case "service":
        const serviceMap = new Map<string, { totalRevenue: number; totalDiscounts: number; count: number }>();

        const payments = await prisma.payment.findMany({
          where: {
            paymentDate: { gte: startDate, lt: endDate },
            status: "completed",
            serviceType: { not: null },
          },
        });

        payments.forEach((p) => {
          const key = p.serviceType || "unknown";
          const existing = serviceMap.get(key) || { totalRevenue: 0, totalDiscounts: 0, count: 0 };
          existing.totalRevenue += p.amount;
          existing.totalDiscounts += p.discountAmount || 0;
          existing.count += 1;
          serviceMap.set(key, existing);
        });

        const labTests = await prisma.labTest.findMany({
          where: {
            createdAt: { gte: startDate, lt: endDate },
            status: { not: "cancelled" },
          },
        });

        labTests.forEach((t) => {
          const charges = typeof t.charges === "string" ? JSON.parse(t.charges) : t.charges;
          if (charges?.paymentStatus === "paid") {
            const key = t.testName || "Unknown";
            const existing = serviceMap.get(key) || { totalRevenue: 0, totalDiscounts: 0, count: 0 };
            existing.totalRevenue += charges.totalAmount || 0;
            existing.totalDiscounts += charges.discount || 0;
            existing.count += 1;
            serviceMap.set(key, existing);
          }
        });

        const radiologyExams = await prisma.radiologyExam.findMany({
          where: {
            createdAt: { gte: startDate, lt: endDate },
            status: { not: "cancelled" },
          },
        });

        radiologyExams.forEach((e) => {
          const charges = typeof e.charges === "string" ? JSON.parse(e.charges) : e.charges;
          if (charges?.paymentStatus === "paid") {
            const key = "Radiology";
            const existing = serviceMap.get(key) || { totalRevenue: 0, totalDiscounts: 0, count: 0 };
            existing.totalRevenue += charges.totalAmount || 0;
            existing.totalDiscounts += charges.discount || 0;
            existing.count += 1;
            serviceMap.set(key, existing);
          }
        });

        const dischargeCards = await prisma.dischargeCard.findMany({
          where: {
            createdAt: { gte: startDate, lt: endDate },
            status: { not: "cancelled" },
          },
        });

        dischargeCards.forEach((dc) => {
          const billing = typeof dc.billing === "string" ? JSON.parse(dc.billing) : dc.billing;
          if (billing?.paymentStatus === "paid") {
            const key = dc.operationName || "Operation";
            const existing = serviceMap.get(key) || { totalRevenue: 0, totalDiscounts: 0, count: 0 };
            existing.totalRevenue += billing.totalAmount || 0;
            existing.totalDiscounts += billing.discountAmount || 0;
            existing.count += 1;
            serviceMap.set(key, existing);
          }
        });

        result.data = {
          services: Array.from(serviceMap.entries())
            .map(([name, data]) => ({
              name,
              totalRevenue: data.totalRevenue,
              netRevenue: data.totalRevenue - data.totalDiscounts,
              count: data.count,
            }))
            .sort((a, b) => b.totalRevenue - a.totalRevenue)
            .slice(0, limit),
        };
        break;

      case "doctor":
        const doctorAppointmentMap = new Map<string, { totalRevenue: number; totalDiscounts: number; count: number }>();

        const appointments = await prisma.appointment.findMany({
          where: {
            startTime: { gte: startDate, lte: endDate },
            status: { in: ["completed", "checked-in", "in-progress", "scheduled", "confirmed"] },
          },
          include: { doctor: { select: { id: true, name: true, specialization: true, consultationFee: true } } },
        });

        appointments.forEach((apt) => {
          if (apt.doctorId && apt.doctor) {
            const existing = doctorAppointmentMap.get(apt.doctorId) || {
              totalRevenue: 0,
              totalDiscounts: 0,
              count: 0,
            };
            existing.totalRevenue += apt.consultationFee || apt.doctorFee || 0;
            existing.count += 1;
            doctorAppointmentMap.set(apt.doctorId, existing);
          }
        });

        result.data = {
          consultations: Array.from(doctorAppointmentMap.entries())
            .map(([doctorId, data]) => {
              const doc = appointments.find((a) => a.doctorId === doctorId)?.doctor;
              return {
                doctorId,
                doctorName: doc?.name || "Unknown",
                specialization: doc?.specialization || "N/A",
                consultationFee: doc?.consultationFee || 0,
                totalRevenue: data.totalRevenue,
                netRevenue: data.totalRevenue - data.totalDiscounts,
                count: data.count,
              };
            })
            .sort((a, b) => b.totalRevenue - a.totalRevenue)
            .slice(0, limit),
        };
        break;

      default:
        return NextResponse.json(
          { error: "Invalid type. Use 'service' or 'doctor'" },
          { status: 400 },
        );
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error fetching top revenue sources:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}