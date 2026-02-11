// app/api/dashboard/admin/cash-flow/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import dbConnect from "@/lib/dbConnect";
import { Payment } from "@/lib/models/Payment";
import { AdminExpense } from "@/lib/models/AdminExpense";
import { CashAtHand } from "@/lib/models/CashAtHand";
import { DailyCashCollection } from "@/lib/models/DailyCashCollection";

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

    // Get cash inflows (payments)
    const cashInflows = await Payment.aggregate([
      {
        $match: {
          paymentDate: { $gte: startDate, $lt: endDate },
          status: "completed",
          paymentMethod: "cash",
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$paymentDate" },
          },
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // Get cash outflows (expenses)
    const cashOutflows = await AdminExpense.aggregate([
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
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // Get cash at hand transactions
    const cashAtHandTransactions = await CashAtHand.find({
      date: { $gte: startDate, $lt: endDate },
      status: "active",
    })
      .sort({ date: -1 })
      .limit(50)
      .populate("staff", "name email")
      .lean();

    // Get daily cash collections
    const dailyCashCollections = await DailyCashCollection.find({
      date: { $gte: startDate, $lt: endDate },
    })
      .sort({ date: -1 })
      .limit(30)
      .populate("staff", "name email")
      .populate("reviewedBy", "name email")
      .lean();

    // Calculate total cash inflows and outflows
    const totalCashInflows = cashInflows.reduce(
      (sum: number, item: any) => sum + item.totalAmount,
      0,
    );
    const totalCashOutflows = cashOutflows.reduce(
      (sum: number, item: any) => sum + item.totalAmount,
      0,
    );
    const netCashFlow = totalCashInflows - totalCashOutflows;

    // Get opening balance (from previous day's closing)
    let openingBalance = 0;
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

      const yesterdayClosing = await CashAtHand.findOne({
        date: { $gte: yesterdayStart, $lt: yesterdayEnd },
        transactionType: "closing",
        status: "active",
      }).sort({ date: -1 });

      openingBalance = yesterdayClosing?.declaredAmount || 0;
    }

    // Calculate closing balance
    const closingBalance = openingBalance + netCashFlow;

    // Build daily cash flow statement
    const cashFlowMap = new Map();

    cashInflows.forEach((item: any) => {
      cashFlowMap.set(item._id, {
        date: item._id,
        inflow: item.totalAmount,
        outflow: 0,
        netFlow: item.totalAmount,
      });
    });

    cashOutflows.forEach((item: any) => {
      if (cashFlowMap.has(item._id)) {
        const existing = cashFlowMap.get(item._id);
        existing.outflow = item.totalAmount;
        existing.netFlow = existing.inflow - item.totalAmount;
      } else {
        cashFlowMap.set(item._id, {
          date: item._id,
          inflow: 0,
          outflow: item.totalAmount,
          netFlow: -item.totalAmount,
        });
      }
    });

    const dailyCashFlow = Array.from(cashFlowMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );

    // Get cash collection summary
    const cashCollectionSummary = await DailyCashCollection.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lt: endDate },
        },
      },
      {
        $group: {
          _id: null,
          totalCollected: { $sum: "$collectedAmount" },
          totalExpected: { $sum: "$totalExpectedAmount" },
          totalDeclared: { $sum: "$totalDeclaredAmount" },
          totalDiscrepancy: { $sum: "$discrepancy" },
          totalDiscounts: { $sum: "$totalDiscounts" },
          totalExpenses: { $sum: "$totalExpenses" },
          count: { $sum: 1 },
        },
      },
    ]);

    const collectionData = cashCollectionSummary[0] || {
      totalCollected: 0,
      totalExpected: 0,
      totalDeclared: 0,
      totalDiscrepancy: 0,
      totalDiscounts: 0,
      totalExpenses: 0,
      count: 0,
    };

    // Get cash collection by shift
    const cashCollectionByShift = await DailyCashCollection.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lt: endDate },
        },
      },
      {
        $group: {
          _id: "$shift",
          totalCollected: { $sum: "$collectedAmount" },
          totalExpected: { $sum: "$totalExpectedAmount" },
          totalDiscrepancy: { $sum: "$discrepancy" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Get discrepancy tracking
    const discrepancies = await DailyCashCollection.find({
      date: { $gte: startDate, $lt: endDate },
      discrepancy: { $ne: 0 },
    })
      .sort({ date: -1 })
      .limit(20)
      .populate("staff", "name email")
      .lean();

    // Get cash at hand summary
    const cashAtHandSummary = await CashAtHand.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lt: endDate },
          status: "active",
        },
      },
      {
        $group: {
          _id: "$transactionType",
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    return NextResponse.json({
      success: true,
      data: {
        period,
        dateRange: {
          startDate,
          endDate,
        },
        summary: {
          openingBalance,
          totalCashInflows,
          totalCashOutflows,
          netCashFlow,
          closingBalance,
        },
        dailyCashFlow,
        cashAtHand: {
          transactions: cashAtHandTransactions.map((tx: any) => ({
            id: tx._id.toString(),
            transactionId: tx.transactionId,
            transactionType: tx.transactionType,
            amount: tx.amount,
            declaredAmount: tx.declaredAmount,
            calculatedTotal: tx.calculatedTotal,
            variance: tx.variance,
            shift: tx.shift,
            cashierName: tx.cashierName,
            source: tx.source,
            destination: tx.destination,
            verificationStatus: tx.verificationStatus,
            date: tx.date,
            createdAt: tx.createdAt,
          })),
          summary: cashAtHandSummary,
        },
        cashCollection: {
          summary: collectionData,
          byShift: cashCollectionByShift,
          collections: dailyCashCollections.map((collection: any) => ({
            id: collection._id.toString(),
            collectionId: collection.collectionId,
            staff: collection.staff,
            staffName: collection.staffName,
            shift: collection.shift,
            date: collection.date,
            totalExpectedAmount: collection.totalExpectedAmount,
            totalDeclaredAmount: collection.totalDeclaredAmount,
            discrepancy: collection.discrepancy,
            discrepancyPercentage: collection.discrepancyPercentage,
            collectedAmount: collection.collectedAmount,
            totalDiscounts: collection.totalDiscounts,
            totalExpenses: collection.totalExpenses,
            status: collection.status,
            submittedAt: collection.submittedAt,
            reviewedBy: collection.reviewedBy,
            reviewedAt: collection.reviewedAt,
          })),
        },
        discrepancies: discrepancies.map((d: any) => ({
          id: d._id.toString(),
          collectionId: d.collectionId,
          staff: d.staff,
          staffName: d.staffName,
          shift: d.shift,
          date: d.date,
          totalExpectedAmount: d.totalExpectedAmount,
          totalDeclaredAmount: d.totalDeclaredAmount,
          discrepancy: d.discrepancy,
          discrepancyPercentage: d.discrepancyPercentage,
          status: d.status,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching cash flow data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
