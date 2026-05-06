import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenPayload } from "@/lib/auth/jwt";

export async function GET(req: NextRequest) {
  try {
    const payload = await getTokenPayload(req);

    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "all";
    const limit = parseInt(searchParams.get("limit") || "50");
    const page = parseInt(searchParams.get("page") || "1");

    const skip = (page - 1) * limit;

    let invoiceWhere: any = {
      status: { in: ["pending", "partially_paid"] },
      due: { gt: 0 },
    };

    if (status === "overdue") {
      invoiceWhere.dueDate = { lt: new Date() };
    }

    const [pendingInvoices, totalInvoices] = await Promise.all([
      prisma.invoice.findMany({
        where: invoiceWhere,
        skip,
        take: limit,
        orderBy: { dueDate: "asc" },
        include: { patient: { select: { name: true, patientId: true, phone: true } } },
      }),
      prisma.invoice.count({ where: invoiceWhere }),
    ]);

    const billingWhere: any = {
      paymentStatus: { in: ["pending", "partial"] },
      due: { gt: 0 },
    };

    const [pendingBillings, totalBillings] = await Promise.all([
      prisma.billing.findMany({
        where: billingWhere,
        skip,
        take: limit,
        orderBy: { dueDate: "asc" },
        include: { patient: { select: { name: true, patientId: true, phone: true } } },
      }),
      prisma.billing.count({ where: billingWhere }),
    ]);

    const labWhere: any = {
      status: { not: "cancelled" },
    };

    const [pendingLabTests, totalLabTests] = await Promise.all([
      prisma.labTest.findMany({
        where: labWhere,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { patient: { select: { name: true, patientId: true, phone: true } } },
      }),
      prisma.labTest.count({ where: labWhere }),
    ]);

    const [pendingRadiologyExams, totalRadiologyExams] = await Promise.all([
      prisma.radiologyExam.findMany({
        where: { status: { not: "cancelled" } },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { patient: { select: { name: true, patientId: true, phone: true } } },
      }),
      prisma.radiologyExam.count({ where: { status: { not: "cancelled" } } }),
    ]);

    const [pendingDischargeCards, totalDischargeCards] = await Promise.all([
      prisma.dischargeCard.findMany({
        where: { status: { not: "cancelled" } },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          patient: { select: { name: true, patientId: true, phone: true } },
          doctor: { select: { name: true } },
        },
      }),
      prisma.dischargeCard.count({ where: { status: { not: "cancelled" } } }),
    ]);

    const now = new Date();
    const agingBuckets = { current: 0, days31to60: 0, days61to90: 0, over90: 0 };

    pendingInvoices.forEach((inv) => {
      const daysOverdue = Math.floor((now.getTime() - new Date(inv.dueDate || 0).getTime()) / (1000 * 60 * 60 * 24));
      if (daysOverdue <= 30) agingBuckets.current += inv.due;
      else if (daysOverdue <= 60) agingBuckets.days31to60 += inv.due;
      else if (daysOverdue <= 90) agingBuckets.days61to90 += inv.due;
      else agingBuckets.over90 += inv.due;
    });

    const totalPendingAmount =
      pendingInvoices.reduce((sum, inv) => sum + (inv.due || 0), 0) +
      pendingBillings.reduce((sum, bill) => sum + (bill.due || 0), 0) +
      pendingLabTests.reduce((sum, lab) => {
        const charges = typeof lab.charges === "string" ? JSON.parse(lab.charges) : lab.charges;
        return sum + ((charges?.totalAmount || 0) - (charges?.paid || 0));
      }, 0) +
      pendingRadiologyExams.reduce((sum, rad) => {
        const charges = typeof rad.charges === "string" ? JSON.parse(rad.charges) : rad.charges;
        return sum + ((charges?.totalAmount || 0) - (charges?.paid || 0));
      }, 0) +
      pendingDischargeCards.reduce((sum, dc) => {
        const billing = typeof dc.billing === "string" ? JSON.parse(dc.billing) : dc.billing;
        return sum + ((billing?.totalAmount || 0) - (billing?.paidAmount || 0));
      }, 0);

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalPendingAmount,
          totalPendingInvoices: totalInvoices,
          totalPendingBillings: totalBillings,
          totalPendingLabTests: totalLabTests,
          totalPendingRadiologyExams: totalRadiologyExams,
          totalPendingDischargeCards: totalDischargeCards,
          agingBuckets,
        },
        invoices: pendingInvoices.map((inv) => ({
          id: inv.id,
          invoiceId: inv.invoiceId,
          patient: inv.patient,
          patientName: inv.patient?.name,
          patientId: inv.patient?.patientId,
          totalAmount: inv.total,
          paidAmount: inv.paid,
          balance: inv.due,
          status: inv.status,
          dueDate: inv.dueDate,
          issueDate: inv.invoiceDate,
          createdAt: inv.createdAt,
        })),
        billings: pendingBillings.map((bill) => ({
          id: bill.id,
          invoiceId: bill.billId,
          patient: bill.patient,
          patientName: bill.patient?.name,
          patientId: bill.patient?.patientId,
          totalAmount: bill.totalAmount,
          paidAmount: bill.paid,
          balance: bill.due,
          paymentStatus: bill.paymentStatus,
          dueDate: bill.dueDate,
          createdAt: bill.createdAt,
        })),
        labTests: pendingLabTests.map((lab) => {
          const charges = typeof lab.charges === "string" ? JSON.parse(lab.charges) : lab.charges;
          return {
            id: lab.id,
            testId: lab.testId,
            patient: lab.patient,
            patientName: lab.patient?.name,
            patientId: lab.patient?.patientId,
            testName: lab.testName,
            totalAmount: charges?.totalAmount || 0,
            paidAmount: charges?.paid || 0,
            balance: (charges?.totalAmount || 0) - (charges?.paid || 0),
            paymentStatus: charges?.paymentStatus,
            createdAt: lab.createdAt,
          };
        }),
        radiologyExams: pendingRadiologyExams.map((rad) => {
          const charges = typeof rad.charges === "string" ? JSON.parse(rad.charges) : rad.charges;
          return {
            id: rad.id,
            examId: rad.examId,
            patient: rad.patient,
            patientName: rad.patient?.name,
            patientId: rad.patient?.patientId,
            totalAmount: charges?.totalAmount || 0,
            paidAmount: charges?.paid || 0,
            balance: (charges?.totalAmount || 0) - (charges?.paid || 0),
            paymentStatus: charges?.paymentStatus,
            createdAt: rad.createdAt,
          };
        }),
        dischargeCards: pendingDischargeCards.map((dc) => {
          const billing = typeof dc.billing === "string" ? JSON.parse(dc.billing) : dc.billing;
          return {
            id: dc.id,
            dischargeId: dc.dischargeId,
            patient: dc.patient,
            patientName: dc.patient?.name,
            patientId: dc.patient?.patientId,
            doctor: dc.doctor,
            doctorName: dc.doctor?.name,
            operationName: dc.operationName,
            totalAmount: billing?.totalAmount || 0,
            paidAmount: billing?.paidAmount || 0,
            balance: billing?.balance || 0,
            paymentStatus: billing?.paymentStatus,
            dischargeDate: dc.dischargeDate,
            createdAt: dc.createdAt,
          };
        }),
        pagination: {
          page,
          limit,
          total: totalInvoices + totalBillings + totalLabTests + totalRadiologyExams + totalDischargeCards,
        },
      },
    });
  } catch (error: any) {
    console.error("Error fetching pending payments:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}