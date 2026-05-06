import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 },
      );
    }

    const allowedRoles = ["receptionist", "admin"];
    if (!auth.userRole || !allowedRoles.includes(auth.userRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. Access denied." },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");
    const appointmentId = searchParams.get("appointmentId");
    const status = searchParams.get("status");
    const paymentStatus = searchParams.get("paymentStatus");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    let where: any = {};

    if (patientId) {
      where.patientId = patientId;
    }

    if (appointmentId) {
      where.appointmentId = appointmentId;
    }

    if (status) {
      where.status = status;
    }

    if (paymentStatus) {
      where.paymentStatus = paymentStatus;
    }

    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo);
    }

    const [prescriptions, total] = await Promise.all([
      prisma.prescription.findMany({
        where,
        include: {
          patient: { select: { name: true, patientId: true, phone: true } },
          appointment: { select: { appointmentId: true, date: true } },
          doctor: { select: { name: true, specialization: true } },
        },
        orderBy: { date: "desc" },
        skip,
        take: limit,
      }),
      prisma.prescription.count({ where }),
    ]);

    const unpaidPrescriptions = await prisma.prescription.count({
      where: { ...where, paymentStatus: { in: ["unpaid", "partial"] } },
    });

    const paidPrescriptions = await prisma.prescription.aggregate({
      where: { ...where, paymentStatus: "paid" },
      _sum: { amountPaid: true },
    });

    const pendingPrescriptions = await prisma.prescription.aggregate({
      where: { ...where, paymentStatus: { in: ["unpaid", "partial"] } },
      _sum: { amountPaid: true },
    });

    return NextResponse.json({
      success: true,
      data: prescriptions,
      summary: {
        totalPrescriptions: total,
        unpaidPrescriptions,
        totalRevenue: paidPrescriptions._sum.amountPaid || 0,
        pendingCollection: pendingPrescriptions._sum.amountPaid || 0,
      },
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Error fetching prescriptions:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch prescriptions",
      },
      { status: 500 },
    );
  }
}
