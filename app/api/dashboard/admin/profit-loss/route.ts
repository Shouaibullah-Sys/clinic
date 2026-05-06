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

    // Get consultation revenue
    const consultationPayments = await prisma.payment.findMany({
      where: {
        paymentDate: { gte: startDate, lt: endDate },
        status: "completed",
        department: "consultation",
      },
    });

    const consultationRevenue = consultationPayments.reduce(
      (acc, p) => ({
        totalRevenue: acc.totalRevenue + p.amount,
        totalDiscount: acc.totalDiscount + (p.discountAmount || 0),
      }),
      { totalRevenue: 0, totalDiscount: 0 }
    );

    // Get lab revenue
    const labTests = await prisma.labTest.findMany({
      where: {
        createdAt: { gte: startDate, lt: endDate },
        status: { not: "cancelled" },
      },
    });

    const labRevenue = labTests.reduce((acc, test) => {
      const charges = typeof test.charges === "string" ? JSON.parse(test.charges) : test.charges;
      if (charges?.paymentStatus === "paid") {
        return {
          totalRevenue: acc.totalRevenue + (charges?.totalAmount || test.totalAmount || 0),
          totalDiscount: acc.totalDiscount + (charges?.discount || test.discount || 0),
        };
      }
      return acc;
    }, { totalRevenue: 0, totalDiscount: 0 });

    // Get radiology revenue
    const radiologyExams = await prisma.radiologyExam.findMany({
      where: {
        createdAt: { gte: startDate, lt: endDate },
        status: { not: "cancelled" },
      },
    });

    const radiologyRevenue = radiologyExams.reduce((acc, exam) => {
      const charges = typeof exam.charges === "string" ? JSON.parse(exam.charges) : exam.charges;
      if (charges?.paymentStatus === "paid") {
        return {
          totalRevenue: acc.totalRevenue + (charges?.totalAmount || exam.totalAmount || 0),
          totalDiscount: acc.totalDiscount + (charges?.discount || exam.discount || 0),
        };
      }
      return acc;
    }, { totalRevenue: 0, totalDiscount: 0 });

    // Get pharmacy revenue
    const prescriptions = await prisma.prescription.findMany({
      where: {
        dispensingStatus: "full",
        createdAt: { gte: startDate, lt: endDate },
      },
    });

    const pharmacyRevenue = prescriptions.reduce((acc, p) => {
      const charges = typeof p.charges === "string" ? JSON.parse(p.charges) : p.charges;
      return {
        totalRevenue: acc.totalRevenue + (charges?.totalAmount || 0),
      };
    }, { totalRevenue: 0 });

    // Get admissions revenue
    const admissionPayments = await prisma.payment.findMany({
      where: {
        paymentDate: { gte: startDate, lt: endDate },
        status: "completed",
        department: "admission",
      },
    });

    const admissionsRevenue = admissionPayments.reduce(
      (acc, p) => ({
        totalRevenue: acc.totalRevenue + p.amount,
        totalDiscount: acc.totalDiscount + (p.discountAmount || 0),
      }),
      { totalRevenue: 0, totalDiscount: 0 }
    );

    // Get discharge revenue
    const dischargeCards = await prisma.dischargeCard.findMany({
      where: {
        createdAt: { gte: startDate, lt: endDate },
        status: { not: "cancelled" },
      },
    });

    const dischargeRevenue = dischargeCards.reduce((acc, card) => {
      const billing = typeof card.billing === "string" ? JSON.parse(card.billing) : card.billing;
      if (billing?.paymentStatus === "paid") {
        return {
          totalRevenue: acc.totalRevenue + (billing?.totalAmount || 0),
          totalDiscount: acc.totalDiscount + (billing?.discountAmount || 0),
        };
      }
      return acc;
    }, { totalRevenue: 0, totalDiscount: 0 });

    // Get approved discounts
    const approvedDiscounts = await prisma.discountRequest.findMany({
      where: {
        status: "approved",
        approvedAt: { gte: startDate, lt: endDate },
      },
    });

    const totalApprovedDiscounts = approvedDiscounts.reduce(
      (sum, d) => sum + (d.approvedAmount || 0),
      0
    );

    // Get expenses by category
    const adminExpenses = await prisma.adminExpense.findMany({
      where: {
        date: { gte: startDate, lt: endDate },
      },
    });

    const expensesByCategoryMap = new Map<string, number>();
    adminExpenses.forEach((e) => {
      const category = e.category || "other";
      expensesByCategoryMap.set(category, (expensesByCategoryMap.get(category) || 0) + e.amount);
    });

    const expensesByCategory = Array.from(expensesByCategoryMap.entries()).map(
      ([category, totalAmount]) => ({ _id: category, totalAmount })
    );

    // Calculate totals
    const totalRevenue =
      consultationRevenue.totalRevenue +
      labRevenue.totalRevenue +
      radiologyRevenue.totalRevenue +
      pharmacyRevenue.totalRevenue +
      admissionsRevenue.totalRevenue +
      dischargeRevenue.totalRevenue;

    const totalDiscounts =
      consultationRevenue.totalDiscount +
      labRevenue.totalDiscount +
      radiologyRevenue.totalDiscount +
      admissionsRevenue.totalDiscount +
      dischargeRevenue.totalDiscount +
      totalApprovedDiscounts;

    const netRevenue = totalRevenue - totalDiscounts;
    const totalExpenses = expensesByCategory.reduce((sum, item) => sum + item.totalAmount, 0);
    const netProfit = netRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Build P&L statement
    const profitLossStatement = {
      revenue: {
        consultation: consultationRevenue.totalRevenue,
        laboratory: labRevenue.totalRevenue,
        radiology: radiologyRevenue.totalRevenue,
        pharmacy: pharmacyRevenue.totalRevenue,
        admissions: admissionsRevenue.totalRevenue,
        discharge: dischargeRevenue.totalRevenue,
        total: totalRevenue,
      },
      discounts: {
        consultation: consultationRevenue.totalDiscount,
        laboratory: labRevenue.totalDiscount,
        radiology: radiologyRevenue.totalDiscount,
        admissions: admissionsRevenue.totalDiscount,
        discharge: dischargeRevenue.totalDiscount,
        approved: totalApprovedDiscounts,
        total: totalDiscounts,
      },
      netRevenue,
      expenses: {
        supplies: expensesByCategory.find((e) => e._id === "supplies")?.totalAmount || 0,
        maintenance: expensesByCategory.find((e) => e._id === "maintenance")?.totalAmount || 0,
        utilities: expensesByCategory.find((e) => e._id === "utilities")?.totalAmount || 0,
        miscellaneous: expensesByCategory.find((e) => e._id === "miscellaneous")?.totalAmount || 0,
        food: expensesByCategory.find((e) => e._id === "food")?.totalAmount || 0,
        transport: expensesByCategory.find((e) => e._id === "transport")?.totalAmount || 0,
        total: totalExpenses,
      },
      netProfit,
      profitMargin,
    };

    // Calculate profit by department
    const profitByDepartment = [
      {
        department: "Consultation",
        revenue: consultationRevenue.totalRevenue,
        expenses: 0,
        discounts: consultationRevenue.totalDiscount,
        profit: consultationRevenue.totalRevenue - consultationRevenue.totalDiscount,
        profitMargin:
          consultationRevenue.totalRevenue > 0
            ? ((consultationRevenue.totalRevenue - consultationRevenue.totalDiscount) /
                consultationRevenue.totalRevenue) *
              100
            : 0,
      },
      {
        department: "Laboratory",
        revenue: labRevenue.totalRevenue,
        expenses: 0,
        discounts: labRevenue.totalDiscount,
        profit: labRevenue.totalRevenue - labRevenue.totalDiscount,
        profitMargin:
          labRevenue.totalRevenue > 0
            ? ((labRevenue.totalRevenue - labRevenue.totalDiscount) / labRevenue.totalRevenue) *
              100
            : 0,
      },
      {
        department: "Radiology",
        revenue: radiologyRevenue.totalRevenue,
        expenses: 0,
        discounts: radiologyRevenue.totalDiscount,
        profit: radiologyRevenue.totalRevenue - radiologyRevenue.totalDiscount,
        profitMargin:
          radiologyRevenue.totalRevenue > 0
            ? ((radiologyRevenue.totalRevenue - radiologyRevenue.totalDiscount) /
                radiologyRevenue.totalRevenue) *
              100
            : 0,
      },
      {
        department: "Pharmacy",
        revenue: pharmacyRevenue.totalRevenue,
        expenses: 0,
        discounts: 0,
        profit: pharmacyRevenue.totalRevenue,
        profitMargin: 100,
      },
      {
        department: "Admissions",
        revenue: admissionsRevenue.totalRevenue,
        expenses: 0,
        discounts: admissionsRevenue.totalDiscount,
        profit: admissionsRevenue.totalRevenue - admissionsRevenue.totalDiscount,
        profitMargin:
          admissionsRevenue.totalRevenue > 0
            ? ((admissionsRevenue.totalRevenue - admissionsRevenue.totalDiscount) /
                admissionsRevenue.totalRevenue) *
              100
            : 0,
      },
      {
        department: "Discharge/Operations",
        revenue: dischargeRevenue.totalRevenue,
        expenses: 0,
        discounts: dischargeRevenue.totalDiscount,
        profit: dischargeRevenue.totalRevenue - dischargeRevenue.totalDiscount,
        profitMargin:
          dischargeRevenue.totalRevenue > 0
            ? ((dischargeRevenue.totalRevenue - dischargeRevenue.totalDiscount) /
                dischargeRevenue.totalRevenue) *
              100
            : 0,
      },
    ];

    // Get daily profit trend
    const allPayments = await prisma.payment.findMany({
      where: {
        paymentDate: { gte: startDate, lt: endDate },
        status: "completed",
      },
    });

    const dailyRevenueMap = new Map<string, { revenue: number; discounts: number }>();
    allPayments.forEach((p) => {
      const dateStr = p.paymentDate.toISOString().split("T")[0];
      const existing = dailyRevenueMap.get(dateStr) || { revenue: 0, discounts: 0 };
      dailyRevenueMap.set(dateStr, {
        revenue: existing.revenue + p.amount,
        discounts: existing.discounts + (p.discountAmount || 0),
      });
    });

    const dailyExpenseMap = new Map<string, number>();
    adminExpenses.forEach((e) => {
      const dateStr = e.date.toISOString().split("T")[0];
      dailyExpenseMap.set(dateStr, (dailyExpenseMap.get(dateStr) || 0) + e.amount);
    });

    const dailyTrend = Array.from(dailyRevenueMap.entries())
      .map(([date, data]) => ({
        date,
        revenue: data.revenue,
        discounts: data.discounts,
        expenses: dailyExpenseMap.get(date) || 0,
        profit: data.revenue - data.discounts - (dailyExpenseMap.get(date) || 0),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Get previous period data
    let previousPeriodProfit = 0;
    let previousPeriodRevenue = 0;
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

      const yesterdayExpenses = await prisma.adminExpense.findMany({
        where: { date: { gte: yesterdayStart, lt: yesterdayEnd } },
      });

      previousPeriodRevenue = yesterdayPayments.reduce((sum, p) => sum + p.amount, 0);
      const yesterdayDiscounts = yesterdayPayments.reduce((sum, p) => sum + (p.discountAmount || 0), 0);
      const yesterdayExpensesTotal = yesterdayExpenses.reduce((sum, e) => sum + e.amount, 0);
      previousPeriodProfit = previousPeriodRevenue - yesterdayDiscounts - yesterdayExpensesTotal;
    }

    const profitGrowth =
      previousPeriodProfit !== 0
        ? ((netProfit - previousPeriodProfit) / Math.abs(previousPeriodProfit)) * 100
        : 0;

    return NextResponse.json({
      success: true,
      data: {
        period,
        dateRange: { startDate, endDate },
        profitLossStatement,
        profitByDepartment,
        dailyTrend,
        summary: {
          totalRevenue,
          totalDiscounts,
          netRevenue,
          totalExpenses,
          netProfit,
          profitMargin,
          previousPeriodProfit,
          profitGrowth,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching profit/loss data:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}