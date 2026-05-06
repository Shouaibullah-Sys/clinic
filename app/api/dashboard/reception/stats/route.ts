import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId || !userRole) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    if (!["admin", "receptionist"].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dailyVisitors = await (prisma as any).patient.count({
      where: { updatedAt: { gte: today, lt: tomorrow } },
    });

    const appointments = await (prisma as any).appointment.count({
      where: { date: { gte: today, lt: tomorrow } },
    });

    const pendingAppointments = await (prisma as any).appointment.count({
      where: { date: { gte: today, lt: tomorrow }, status: "pending" },
    });

    const waitingPatients = await (prisma as any).appointment.count({
      where: { date: { gte: today, lt: tomorrow }, status: "checked-in" },
    });

    const checkIns = await (prisma as any).appointment.count({
      where: {
        checkInTime: { gte: today, lt: tomorrow },
        status: { in: ["checked-in", "completed"] },
      },
    });

    const todayPayments = await (prisma as any).payment.groupBy({
      by: [],
      where: {
        paymentDate: { gte: today, lt: tomorrow },
        status: "completed",
      },
      _sum: { amount: true },
    });

    const todayRevenue = todayPayments[0]?._sum?.amount || 0;

    const todayExpenses = await (prisma as any).receptionExpense.groupBy({
      by: [],
      where: { date: { gte: today, lt: tomorrow } },
      _sum: { amount: true },
    });

    const totalExpensesToday = todayExpenses[0]?._sum?.amount || 0;

    const todayAppointmentsAmount = await (prisma as any).appointment.findMany({
      where: { date: { gte: today, lt: tomorrow } },
      include: { doctor: { select: { consultationFee: true } } },
    });

    const totalAppointmentsToday = todayAppointmentsAmount.reduce(
      (sum: number, apt: any) => sum + (apt.consultationFee || apt.doctor?.consultationFee || 0),
      0,
    );

    const todayLabPayments = await (prisma as any).labTest.findMany({
      where: {
        createdAt: { gte: today, lt: tomorrow },
        status: { not: "cancelled" },
      },
    });

    const labCharges = todayLabPayments.map((t: any) => JSON.parse(t.charges || "{}"));
    const totalLabPaymentsToday = labCharges.reduce((s: number, c: any) => s + (c.paid || 0), 0);
    const totalLabDiscountsToday = labCharges.reduce((s: number, c: any) => s + (c.discount || 0), 0);

    const todayRadiologyExamPayments = await (prisma as any).radiologyExam.findMany({
      where: {
        createdAt: { gte: today, lt: tomorrow },
        status: { not: "cancelled" },
      },
    });

    const todayRadiologyServicePayments = await (prisma as any).radiologyService.findMany({
      where: {
        createdAt: { gte: today, lt: tomorrow },
      },
    });

    const radiologyExamCharges = todayRadiologyExamPayments.map((t: any) => JSON.parse(t.charges || "{}"));
    const totalRadiologyPaymentsToday = radiologyExamCharges.reduce((s: number, c: any) => s + (c.paid || 0), 0);
    const totalRadiologyDiscountsToday = radiologyExamCharges.reduce((s: number, c: any) => s + (c.discount || 0), 0);

    const todayPrescriptionPayments = await (prisma as any).prescription.findMany({
      where: {
        createdAt: { gte: today, lt: tomorrow },
        status: { not: "cancelled" },
      },
    });

    const prescriptionCharges = todayPrescriptionPayments.map((t: any) => JSON.parse(t.charges || "{}"));
    const totalPrescriptionDiscountsToday = prescriptionCharges.reduce((s: number, c: any) => s + (c.discount || 0), 0);

    const todayDischargePayments = await (prisma as any).dischargeCard.findMany({
      where: {
        createdAt: { gte: today, lt: tomorrow },
      },
    });

    const dischargeBillings = todayDischargePayments.map((t: any) => JSON.parse(t.billing || "{}"));
    const totalDischargePaymentsToday = dischargeBillings.reduce((s: number, c: any) => s + (c.paidAmount || 0), 0);
    const totalDischargeDiscountsToday = dischargeBillings.reduce((s: number, c: any) => s + (c.discountAmount || 0), 0);

    const todayPharmacyPayments = await (prisma as any).payment.groupBy({
      by: [],
      where: {
        paymentDate: { gte: today, lt: tomorrow },
        department: "pharmacy",
        status: "completed",
        paymentMethod: "cash",
      },
      _sum: { amount: true },
    });

    const totalPharmacyPaymentsToday = todayPharmacyPayments[0]?._sum?.amount || 0;

    const todayPharmacySaleDiscounts = await (prisma as any).payment.groupBy({
      by: [],
      where: {
        paymentDate: { gte: today, lt: tomorrow },
        department: "pharmacy",
        serviceType: "pharmacy_sale",
        status: "completed",
      },
      _sum: { discountAmount: true },
    });

    const totalPharmacyDiscountsToday = todayPharmacySaleDiscounts[0]?._sum?.discountAmount || 0;

    const totalConsultationDiscountsToday = 0;

    const totalApprovedDiscountsToday =
      totalLabDiscountsToday +
      totalRadiologyDiscountsToday +
      totalPrescriptionDiscountsToday +
      totalDischargeDiscountsToday +
      totalPharmacyDiscountsToday +
      totalConsultationDiscountsToday;

    const pendingDiscounts = await (prisma as any).discountRequest.count({
      where: { status: "pending" },
    });

    const systemCashTotal = await (prisma as any).payment.groupBy({
      by: [],
      where: {
        paymentDate: { gte: today, lt: tomorrow },
        status: "completed",
        paymentMethod: "cash",
      },
      _sum: { amount: true },
    });

    const dailyCashBalance = systemCashTotal[0]?._sum?.amount || 0;

    const stats = {
      dailyVisitors,
      appointments,
      waitingPatients,
      checkIns,
      pendingAppointments,
      todayRevenue,
      pendingDiscounts,
      dailyCashBalance,
      systemCashTotal: systemCashTotal[0]?._sum?.amount || 0,

      // New performance metrics
      avgWaitTime: Math.floor(Math.random() * 20) + 5, // Mock data - in real app calculate from actual data
      completedAppointments: Math.floor(appointments * 0.8), // Mock completion rate
      cancelledAppointments: Math.floor(appointments * 0.1),

      // Financial metrics
      totalCollections: todayRevenue,
      totalDiscounts: totalApprovedDiscountsToday,
      netRevenue: todayRevenue - totalApprovedDiscountsToday,
      pendingPayments: Math.floor(Math.random() * 5) + 1, // Mock pending payments
    };

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching reception stats:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch reception statistics" },
      { status: 500 },
    );
  }
}