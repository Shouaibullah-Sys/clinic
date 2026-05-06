import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(req);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
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

    const payments = await prisma.payment.findMany({
      where: {
        paymentDate: { gte: startDate, lt: endDate },
        status: "completed",
      },
    });

    const paymentData = payments.reduce(
      (acc, p) => ({
        totalRevenue: acc.totalRevenue + p.amount,
        totalNetAmount: acc.totalNetAmount + (p.netAmount || 0),
        totalDiscount: acc.totalDiscount + (p.discountAmount || 0),
        totalTax: acc.totalTax + (p.taxAmount || 0),
        count: acc.count + 1,
      }),
      { totalRevenue: 0, totalNetAmount: 0, totalDiscount: 0, totalTax: 0, count: 0 }
    );

    const revenueByDepartmentMap: Record<string, any> = {};
    payments.forEach((p) => {
      const dept = p.department || "uncategorized";
      if (!revenueByDepartmentMap[dept]) {
        revenueByDepartmentMap[dept] = {
          department: dept,
          totalRevenue: 0,
          totalNetAmount: 0,
          totalDiscount: 0,
          count: 0,
        };
      }
      revenueByDepartmentMap[dept].totalRevenue += p.amount;
      revenueByDepartmentMap[dept].totalNetAmount += p.netAmount || 0;
      revenueByDepartmentMap[dept].totalDiscount += p.discountAmount || 0;
      revenueByDepartmentMap[dept].count += 1;
    });

    const revenueByDepartment = Object.values(revenueByDepartmentMap).sort(
      (a: any, b: any) => b.totalRevenue - a.totalRevenue
    );

    const revenueByPaymentMethodMap: Record<string, any> = {};
    payments.forEach((p) => {
      const method = p.paymentMethod || "unknown";
      if (!revenueByPaymentMethodMap[method]) {
        revenueByPaymentMethodMap[method] = { paymentMethod: method, totalRevenue: 0, count: 0 };
      }
      revenueByPaymentMethodMap[method].totalRevenue += p.amount;
      revenueByPaymentMethodMap[method].count += 1;
    });

    const revenueByPaymentMethod = Object.values(revenueByPaymentMethodMap).sort(
      (a: any, b: any) => b.totalRevenue - a.totalRevenue
    );

    const adminExpenses = await prisma.adminExpense.findMany({
      where: { date: { gte: startDate, lt: endDate } },
    });

    const totalExpenses = adminExpenses.reduce((sum, e) => sum + e.amount, 0);
    const expensesByCategory = adminExpenses.reduce((acc: Record<string, number>, e) => {
      acc[e.category || "uncategorized"] = (acc[e.category || "uncategorized"] || 0) + e.amount;
      return acc;
    }, {});

    const approvedDiscounts = await prisma.discountRequest.findMany({
      where: {
        status: "approved",
        approvedAt: { gte: startDate, lt: endDate },
      },
    });

    const totalDiscountAmount = approvedDiscounts.reduce((sum, d) => sum + (d.approvedAmount || 0), 0);
    const discountCount = approvedDiscounts.length;

    const pendingDiscounts = await prisma.discountRequest.count({
      where: { status: "pending" },
    });

    const labTests = await prisma.labTest.findMany({
      where: {
        createdAt: { gte: startDate, lt: endDate },
        status: { not: "cancelled" },
      },
    });

    const labRevenue = labTests.reduce((sum, t) => {
      const charges = typeof t.charges === "string" ? JSON.parse(t.charges) : t.charges;
      return sum + (charges?.paid || t.paid || 0);
    }, 0);

    const radiologyExams = await prisma.radiologyExam.findMany({
      where: {
        createdAt: { gte: startDate, lt: endDate },
        status: { not: "cancelled" },
      },
    });

    const radiologyRevenue = radiologyExams.reduce((sum, t) => sum + t.paid, 0);

    const dischargeCards = await prisma.dischargeCard.findMany({
      where: {
        createdAt: { gte: startDate, lt: endDate },
      },
    });

    const dischargeRevenue = dischargeCards.reduce((sum, t) => {
      const billing = typeof t.billing === "string" ? JSON.parse(t.billing) : t.billing;
      return sum + (billing?.paidAmount || 0);
    }, 0);

    const prescriptions = await prisma.prescription.findMany({
      where: {
        createdAt: { gte: startDate, lt: endDate },
        dispensingStatus: "full",
      },
    });

    const pharmacyRevenue = prescriptions.reduce((sum, p) => sum + p.amountPaid, 0);

    const totalRevenue =
      paymentData.totalRevenue + labRevenue + radiologyRevenue + dischargeRevenue + pharmacyRevenue;
    const totalDiscounts = paymentData.totalDiscount + totalDiscountAmount;
    const netRevenue = totalRevenue - totalDiscounts;
    const netProfit = netRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    let previousPeriodRevenue = 0;
    let previousPeriodExpenses = 0;
    let previousPeriodProfit = 0;

    if (period === "today") {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const yesterdayStart = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
      const yesterdayEnd = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() + 1);

      const yesterdayPayments = await prisma.payment.findMany({
        where: {
          paymentDate: { gte: yesterdayStart, lt: yesterdayEnd },
          status: "completed",
        },
      });
      previousPeriodRevenue = yesterdayPayments.reduce((sum, p) => sum + p.amount, 0);

      const yesterdayExpenses = await prisma.adminExpense.findMany({
        where: { date: { gte: yesterdayStart, lt: yesterdayEnd } },
      });
      previousPeriodExpenses = yesterdayExpenses.reduce((sum, e) => sum + e.amount, 0);
      previousPeriodProfit = previousPeriodRevenue - previousPeriodExpenses;
    }

    const revenueGrowth = previousPeriodRevenue > 0 ? ((totalRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100 : 0;
    const profitGrowth = previousPeriodProfit > 0 ? ((netProfit - previousPeriodProfit) / Math.abs(previousPeriodProfit)) * 100 : 0;

    return NextResponse.json({
      success: true,
      data: {
        period,
        dateRange: { startDate, endDate },
        summary: {
          totalRevenue,
          totalExpenses,
          totalDiscounts,
          netRevenue,
          netProfit,
          profitMargin,
          totalTransactions: paymentData.count + labTests.length + radiologyExams.length + dischargeCards.length + prescriptions.length,
        },
        revenue: {
          byDepartment: revenueByDepartment,
          byPaymentMethod: revenueByPaymentMethod,
          laboratory: labRevenue,
          radiology: radiologyRevenue,
          pharmacy: pharmacyRevenue,
          admissions: (revenueByDepartment as any[]).find((d: any) => d.department === "admission")?.totalRevenue || 0,
          discharge: dischargeRevenue,
        },
        expenses: {
          total: totalExpenses,
          byCategory: expensesByCategory,
          count: adminExpenses.length,
        },
        discounts: {
          totalApproved: totalDiscountAmount,
          approvedCount: discountCount,
          pendingCount: pendingDiscounts,
        },
        comparison: {
          previousPeriodRevenue,
          previousPeriodExpenses,
          previousPeriodProfit,
          revenueGrowth,
          profitGrowth,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching financial summary:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}