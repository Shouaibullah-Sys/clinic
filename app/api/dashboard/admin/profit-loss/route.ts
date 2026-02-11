// app/api/dashboard/admin/profit-loss/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import dbConnect from "@/lib/dbConnect";
import { Payment } from "@/lib/models/Payment";
import { DailyExpense } from "@/lib/models/DailyExpense";
import { DiscountRequest } from "@/lib/models/DiscountRequest";
import { LabTest } from "@/lib/models/LabTest";
import { RadiologyExam } from "@/lib/models/RadiologyExam";
import { DischargeCard } from "@/lib/models/DischargeCard";
import { Prescription } from "@/lib/models/Prescription";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(req);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "today";

    // Calculate date ranges
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (period) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() + 1,
        );
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
        endDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() + 1,
        );
    }

    // Get revenue from all sources
    const consultationRevenue = await Payment.aggregate([
      {
        $match: {
          paymentDate: { $gte: startDate, $lt: endDate },
          status: "completed",
          department: "consultation",
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$amount" },
          totalDiscount: { $sum: { $ifNull: ["$discountAmount", 0] } },
        },
      },
    ]);

    const labRevenue = await LabTest.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lt: endDate },
          "charges.paymentStatus": "paid",
          status: { $ne: "cancelled" },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$charges.totalAmount" },
          totalDiscount: { $sum: "$charges.discount" },
        },
      },
    ]);

    const radiologyRevenue = await RadiologyExam.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lt: endDate },
          "charges.paymentStatus": "paid",
          status: { $ne: "cancelled" },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$charges.totalAmount" },
          totalDiscount: { $sum: "$charges.discount" },
        },
      },
    ]);

    const pharmacyRevenue = await Prescription.aggregate([
      {
        $match: {
          dispensingStatus: "full",
          dispensedDate: { $gte: startDate, $lt: endDate },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalAmount" },
        },
      },
    ]);

    const admissionsRevenue = await Payment.aggregate([
      {
        $match: {
          paymentDate: { $gte: startDate, $lt: endDate },
          status: "completed",
          department: "admission",
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$amount" },
          totalDiscount: { $sum: { $ifNull: ["$discountAmount", 0] } },
        },
      },
    ]);

    const dischargeRevenue = await DischargeCard.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lt: endDate },
          "billing.paymentStatus": "paid",
          status: { $ne: "cancelled" },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$billing.totalAmount" },
          totalDiscount: { $sum: "$billing.discountAmount" },
        },
      },
    ]);

    // Get approved discounts
    const approvedDiscounts = await DiscountRequest.aggregate([
      {
        $match: {
          status: "approved",
          approvedAt: { $gte: startDate, $lt: endDate },
        },
      },
      {
        $group: {
          _id: null,
          totalDiscountAmount: { $sum: "$approvedAmount" },
        },
      },
    ]);

    // Get expenses by category
    const expensesByCategory = await DailyExpense.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lt: endDate },
        },
      },
      {
        $group: {
          _id: "$category",
          totalAmount: { $sum: "$amount" },
        },
      },
    ]);

    // Calculate totals
    const totalRevenue =
      (consultationRevenue[0]?.totalRevenue || 0) +
      (labRevenue[0]?.totalRevenue || 0) +
      (radiologyRevenue[0]?.totalRevenue || 0) +
      (pharmacyRevenue[0]?.totalRevenue || 0) +
      (admissionsRevenue[0]?.totalRevenue || 0) +
      (dischargeRevenue[0]?.totalRevenue || 0);

    const totalDiscounts =
      (consultationRevenue[0]?.totalDiscount || 0) +
      (labRevenue[0]?.totalDiscount || 0) +
      (radiologyRevenue[0]?.totalDiscount || 0) +
      (admissionsRevenue[0]?.totalDiscount || 0) +
      (dischargeRevenue[0]?.totalDiscount || 0) +
      (approvedDiscounts[0]?.totalDiscountAmount || 0);

    const netRevenue = totalRevenue - totalDiscounts;

    const totalExpenses = expensesByCategory.reduce(
      (sum: number, item: any) => sum + item.totalAmount,
      0,
    );

    const netProfit = netRevenue - totalExpenses;
    const profitMargin =
      totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Build P&L statement
    const profitLossStatement = {
      revenue: {
        consultation: consultationRevenue[0]?.totalRevenue || 0,
        laboratory: labRevenue[0]?.totalRevenue || 0,
        radiology: radiologyRevenue[0]?.totalRevenue || 0,
        pharmacy: pharmacyRevenue[0]?.totalRevenue || 0,
        admissions: admissionsRevenue[0]?.totalRevenue || 0,
        discharge: dischargeRevenue[0]?.totalRevenue || 0,
        total: totalRevenue,
      },
      discounts: {
        consultation: consultationRevenue[0]?.totalDiscount || 0,
        laboratory: labRevenue[0]?.totalDiscount || 0,
        radiology: radiologyRevenue[0]?.totalDiscount || 0,
        admissions: admissionsRevenue[0]?.totalDiscount || 0,
        discharge: dischargeRevenue[0]?.totalDiscount || 0,
        approved: approvedDiscounts[0]?.totalDiscountAmount || 0,
        total: totalDiscounts,
      },
      netRevenue,
      expenses: {
        supplies:
          expensesByCategory.find((e: any) => e._id === "supplies")
            ?.totalAmount || 0,
        maintenance:
          expensesByCategory.find((e: any) => e._id === "maintenance")
            ?.totalAmount || 0,
        utilities:
          expensesByCategory.find((e: any) => e._id === "utilities")
            ?.totalAmount || 0,
        miscellaneous:
          expensesByCategory.find((e: any) => e._id === "miscellaneous")
            ?.totalAmount || 0,
        food:
          expensesByCategory.find((e: any) => e._id === "food")?.totalAmount ||
          0,
        transport:
          expensesByCategory.find((e: any) => e._id === "transport")
            ?.totalAmount || 0,
        total: totalExpenses,
      },
      netProfit,
      profitMargin,
    };

    // Calculate profit by department
    const profitByDepartment = [
      {
        department: "Consultation",
        revenue: consultationRevenue[0]?.totalRevenue || 0,
        expenses: 0, // Consultation has no direct expenses
        discounts: consultationRevenue[0]?.totalDiscount || 0,
        profit:
          (consultationRevenue[0]?.totalRevenue || 0) -
          (consultationRevenue[0]?.totalDiscount || 0),
        profitMargin:
          consultationRevenue[0]?.totalRevenue > 0
            ? (((consultationRevenue[0]?.totalRevenue || 0) -
                (consultationRevenue[0]?.totalDiscount || 0)) /
                (consultationRevenue[0]?.totalRevenue || 1)) *
              100
            : 0,
      },
      {
        department: "Laboratory",
        revenue: labRevenue[0]?.totalRevenue || 0,
        expenses: 0, // Lab expenses would be tracked separately
        discounts: labRevenue[0]?.totalDiscount || 0,
        profit:
          (labRevenue[0]?.totalRevenue || 0) -
          (labRevenue[0]?.totalDiscount || 0),
        profitMargin:
          labRevenue[0]?.totalRevenue > 0
            ? (((labRevenue[0]?.totalRevenue || 0) -
                (labRevenue[0]?.totalDiscount || 0)) /
                (labRevenue[0]?.totalRevenue || 1)) *
              100
            : 0,
      },
      {
        department: "Radiology",
        revenue: radiologyRevenue[0]?.totalRevenue || 0,
        expenses: 0,
        discounts: radiologyRevenue[0]?.totalDiscount || 0,
        profit:
          (radiologyRevenue[0]?.totalRevenue || 0) -
          (radiologyRevenue[0]?.totalDiscount || 0),
        profitMargin:
          radiologyRevenue[0]?.totalRevenue > 0
            ? (((radiologyRevenue[0]?.totalRevenue || 0) -
                (radiologyRevenue[0]?.totalDiscount || 0)) /
                (radiologyRevenue[0]?.totalRevenue || 1)) *
              100
            : 0,
      },
      {
        department: "Pharmacy",
        revenue: pharmacyRevenue[0]?.totalRevenue || 0,
        expenses: 0, // Medicine costs would be tracked separately
        discounts: 0,
        profit: pharmacyRevenue[0]?.totalRevenue || 0,
        profitMargin: 100, // Pharmacy revenue is typically profit
      },
      {
        department: "Admissions",
        revenue: admissionsRevenue[0]?.totalRevenue || 0,
        expenses: 0,
        discounts: admissionsRevenue[0]?.totalDiscount || 0,
        profit:
          (admissionsRevenue[0]?.totalRevenue || 0) -
          (admissionsRevenue[0]?.totalDiscount || 0),
        profitMargin:
          admissionsRevenue[0]?.totalRevenue > 0
            ? (((admissionsRevenue[0]?.totalRevenue || 0) -
                (admissionsRevenue[0]?.totalDiscount || 0)) /
                (admissionsRevenue[0]?.totalRevenue || 1)) *
              100
            : 0,
      },
      {
        department: "Discharge/Operations",
        revenue: dischargeRevenue[0]?.totalRevenue || 0,
        expenses: 0,
        discounts: dischargeRevenue[0]?.totalDiscount || 0,
        profit:
          (dischargeRevenue[0]?.totalRevenue || 0) -
          (dischargeRevenue[0]?.totalDiscount || 0),
        profitMargin:
          dischargeRevenue[0]?.totalRevenue > 0
            ? (((dischargeRevenue[0]?.totalRevenue || 0) -
                (dischargeRevenue[0]?.totalDiscount || 0)) /
                (dischargeRevenue[0]?.totalRevenue || 1)) *
              100
            : 0,
      },
    ];

    // Get daily profit trend
    const dailyProfitTrend = await Payment.aggregate([
      {
        $match: {
          paymentDate: { $gte: startDate, $lt: endDate },
          status: "completed",
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$paymentDate" },
          },
          revenue: { $sum: "$amount" },
          discounts: { $sum: { $ifNull: ["$discountAmount", 0] } },
        },
      },
    ]);

    // Get daily expenses for trend
    const dailyExpenseTrend = await DailyExpense.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lt: endDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$date" },
          },
          expenses: { $sum: "$amount" },
        },
      },
    ]);

    // Merge daily trends
    const dailyTrend = [];
    const trendMap = new Map();

    dailyProfitTrend.forEach((item: any) => {
      trendMap.set(item._id, {
        date: item._id,
        revenue: item.revenue,
        discounts: item.discounts,
        expenses: 0,
        profit: item.revenue - item.discounts,
      });
    });

    dailyExpenseTrend.forEach((item: any) => {
      if (trendMap.has(item._id)) {
        const existing = trendMap.get(item._id);
        existing.expenses = item.expenses;
        existing.profit = existing.revenue - existing.discounts - item.expenses;
      } else {
        trendMap.set(item._id, {
          date: item._id,
          revenue: 0,
          discounts: 0,
          expenses: item.expenses,
          profit: -item.expenses,
        });
      }
    });

    dailyTrend.push(
      ...Array.from(trendMap.values()).sort((a, b) =>
        a.date.localeCompare(b.date),
      ),
    );

    // Get previous period data for comparison
    let previousPeriodProfit = 0;
    let previousPeriodRevenue = 0;
    if (period === "today") {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const yesterdayStart = new Date(
        yesterday.getFullYear(),
        yesterday.getMonth(),
        yesterday.getDate(),
      );
      const yesterdayEnd = new Date(
        yesterday.getFullYear(),
        yesterday.getMonth(),
        yesterday.getDate() + 1,
      );

      const yesterdayPayments = await Payment.aggregate([
        {
          $match: {
            paymentDate: { $gte: yesterdayStart, $lt: yesterdayEnd },
            status: "completed",
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$amount" },
            totalDiscount: { $sum: { $ifNull: ["$discountAmount", 0] } },
          },
        },
      ]);

      const yesterdayExpenses = await DailyExpense.aggregate([
        {
          $match: {
            date: { $gte: yesterdayStart, $lt: yesterdayEnd },
          },
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$amount" },
          },
        },
      ]);

      previousPeriodRevenue = yesterdayPayments[0]?.totalRevenue || 0;
      const yesterdayDiscounts = yesterdayPayments[0]?.totalDiscount || 0;
      const yesterdayExpensesTotal = yesterdayExpenses[0]?.totalAmount || 0;
      previousPeriodProfit =
        previousPeriodRevenue - yesterdayDiscounts - yesterdayExpensesTotal;
    }

    // Calculate growth percentage
    const profitGrowth =
      previousPeriodProfit !== 0
        ? ((netProfit - previousPeriodProfit) /
            Math.abs(previousPeriodProfit)) *
          100
        : 0;

    return NextResponse.json({
      success: true,
      data: {
        period,
        dateRange: {
          startDate,
          endDate,
        },
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
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
