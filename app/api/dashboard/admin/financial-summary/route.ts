// app/api/dashboard/admin/financial-summary/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import dbConnect from "@/lib/dbConnect";
import { Payment } from "@/lib/models/Payment";
import { DailyExpense } from "@/lib/models/DailyExpense";
import { DiscountRequest } from "@/lib/models/DiscountRequest";
import { Invoice } from "@/lib/models/Invoice";
import { Billing } from "@/lib/models/Billing";
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

    // Get total revenue from all sources
    const payments = await Payment.aggregate([
      {
        $match: {
          paymentDate: { $gte: startDate, $lt: endDate },
          status: "completed",
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$amount" },
          totalNetAmount: { $sum: "$netAmount" },
          totalDiscount: { $sum: { $ifNull: ["$discountAmount", 0] } },
          totalTax: { $sum: { $ifNull: ["$taxAmount", 0] } },
          count: { $sum: 1 },
        },
      },
    ]);

    const paymentData = payments[0] || {
      totalRevenue: 0,
      totalNetAmount: 0,
      totalDiscount: 0,
      totalTax: 0,
      count: 0,
    };

    // Get revenue by department
    const revenueByDepartment = await Payment.aggregate([
      {
        $match: {
          paymentDate: { $gte: startDate, $lt: endDate },
          status: "completed",
        },
      },
      {
        $group: {
          _id: "$department",
          totalRevenue: { $sum: "$amount" },
          totalNetAmount: { $sum: "$netAmount" },
          totalDiscount: { $sum: { $ifNull: ["$discountAmount", 0] } },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { totalRevenue: -1 },
      },
    ]);

    // Get revenue by payment method
    const revenueByPaymentMethod = await Payment.aggregate([
      {
        $match: {
          paymentDate: { $gte: startDate, $lt: endDate },
          status: "completed",
        },
      },
      {
        $group: {
          _id: "$paymentMethod",
          totalRevenue: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { totalRevenue: -1 },
      },
    ]);

    // Get total expenses
    const expenses = await DailyExpense.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lt: endDate },
        },
      },
      {
        $group: {
          _id: null,
          totalExpenses: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const expenseData = expenses[0] || {
      totalExpenses: 0,
      count: 0,
    };

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
          count: { $sum: 1 },
        },
      },
      {
        $sort: { totalAmount: -1 },
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
          count: { $sum: 1 },
        },
      },
    ]);

    const discountData = approvedDiscounts[0] || {
      totalDiscountAmount: 0,
      count: 0,
    };

    // Get pending discounts
    const pendingDiscounts = await DiscountRequest.countDocuments({
      status: "pending",
    });

    // Get pending payments (unpaid invoices)
    const pendingPayments = await Invoice.aggregate([
      {
        $match: {
          status: { $in: ["pending", "partially_paid"] },
          balance: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: null,
          totalPendingAmount: { $sum: "$balance" },
          count: { $sum: 1 },
        },
      },
    ]);

    const pendingPaymentsData = pendingPayments[0] || {
      totalPendingAmount: 0,
      count: 0,
    };

    // Get overdue payments
    const overduePayments = await Invoice.aggregate([
      {
        $match: {
          status: { $in: ["pending", "partially_paid"] },
          balance: { $gt: 0 },
          dueDate: { $lt: new Date() },
        },
      },
      {
        $group: {
          _id: null,
          totalOverdueAmount: { $sum: "$balance" },
          count: { $sum: 1 },
        },
      },
    ]);

    const overduePaymentsData = overduePayments[0] || {
      totalOverdueAmount: 0,
      count: 0,
    };

    // Get lab revenue
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
          totalPaid: { $sum: "$charges.paid" },
          totalDiscount: { $sum: "$charges.discount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const labData = labRevenue[0] || {
      totalRevenue: 0,
      totalPaid: 0,
      totalDiscount: 0,
      count: 0,
    };

    // Get radiology revenue
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
          totalPaid: { $sum: "$charges.paid" },
          totalDiscount: { $sum: "$charges.discount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const radiologyData = radiologyRevenue[0] || {
      totalRevenue: 0,
      totalPaid: 0,
      totalDiscount: 0,
      count: 0,
    };

    // Get discharge card revenue
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
          totalPaid: { $sum: "$billing.paidAmount" },
          totalDiscount: { $sum: "$billing.discountAmount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const dischargeData = dischargeRevenue[0] || {
      totalRevenue: 0,
      totalPaid: 0,
      totalDiscount: 0,
      count: 0,
    };

    // Get pharmacy revenue
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
          count: { $sum: 1 },
        },
      },
    ]);

    const pharmacyData = pharmacyRevenue[0] || {
      totalRevenue: 0,
      count: 0,
    };

    // Calculate totals
    const totalRevenue =
      paymentData.totalRevenue +
      labData.totalRevenue +
      radiologyData.totalRevenue +
      dischargeData.totalRevenue +
      pharmacyData.totalRevenue;
    const totalExpenses = expenseData.totalExpenses;
    const totalDiscounts =
      paymentData.totalDiscount +
      labData.totalDiscount +
      radiologyData.totalDiscount +
      dischargeData.totalDiscount +
      discountData.totalDiscountAmount;
    const netRevenue = totalRevenue - totalDiscounts;
    const netProfit = netRevenue - totalExpenses;
    const profitMargin =
      totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Get previous period data for comparison
    let previousPeriodRevenue = 0;
    let previousPeriodExpenses = 0;
    let previousPeriodProfit = 0;

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
            totalExpenses: { $sum: "$amount" },
          },
        },
      ]);

      previousPeriodRevenue = yesterdayPayments[0]?.totalRevenue || 0;
      previousPeriodExpenses = yesterdayExpenses[0]?.totalExpenses || 0;
      previousPeriodProfit = previousPeriodRevenue - previousPeriodExpenses;
    }

    // Calculate growth percentages
    const revenueGrowth =
      previousPeriodRevenue > 0
        ? ((totalRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100
        : 0;
    const profitGrowth =
      previousPeriodProfit > 0
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
        summary: {
          totalRevenue,
          totalExpenses,
          totalDiscounts,
          netRevenue,
          netProfit,
          profitMargin,
          totalTransactions:
            paymentData.count +
            labData.count +
            radiologyData.count +
            dischargeData.count +
            pharmacyData.count,
        },
        revenue: {
          byDepartment: revenueByDepartment,
          byPaymentMethod: revenueByPaymentMethod,
          consultation:
            revenueByDepartment.find((d: any) => d._id === "consultation")
              ?.totalRevenue || 0,
          laboratory: labData.totalRevenue,
          radiology: radiologyData.totalRevenue,
          pharmacy: pharmacyData.totalRevenue,
          admissions:
            revenueByDepartment.find((d: any) => d._id === "admission")
              ?.totalRevenue || 0,
          discharge: dischargeData.totalRevenue,
        },
        expenses: {
          total: expenseData.totalExpenses,
          byCategory: expensesByCategory,
          count: expenseData.count,
        },
        discounts: {
          totalApproved: discountData.totalDiscountAmount,
          approvedCount: discountData.count,
          pendingCount: pendingDiscounts,
        },
        payments: {
          pending: {
            totalAmount: pendingPaymentsData.totalPendingAmount,
            count: pendingPaymentsData.count,
          },
          overdue: {
            totalAmount: overduePaymentsData.totalOverdueAmount,
            count: overduePaymentsData.count,
          },
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
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
