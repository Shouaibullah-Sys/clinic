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

    const cashInflows = await prisma.payment.groupBy({
      by: ["paymentDate"],
      where: {
        paymentDate: { gte: startDate, lt: endDate },
        status: "completed",
        paymentMethod: "cash",
      },
      _sum: { amount: true },
      _count: { _all: true },
      orderBy: { paymentDate: "asc" },
    });

    const cashOutflows = await prisma.adminExpense.groupBy({
      by: ["date"],
      where: {
        date: { gte: startDate, lt: endDate },
      },
      _sum: { amount: true },
      _count: { _all: true },
      orderBy: { date: "asc" },
    });

    const cashAtHandTransactions = await prisma.cashAtHand.findMany({
      where: {
        date: { gte: startDate, lt: endDate },
        verificationStatus: "active",
      },
      orderBy: { date: "desc" },
      take: 50,
    });

    const dailyCashCollections = await prisma.dailyCashCollection.findMany({
      where: {
        date: { gte: startDate, lt: endDate },
      },
      orderBy: { date: "desc" },
      take: 30,
    });

    const totalCashInflows = cashInflows.reduce((sum, item) => sum + (item._sum?.amount || 0), 0);
    const totalCashOutflows = cashOutflows.reduce((sum, item) => sum + (item._sum?.amount || 0), 0);
    const netCashFlow = totalCashInflows - totalCashOutflows;

    let openingBalance = 0;
    if (period === "today") {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const yesterdayClosing = await prisma.cashAtHand.findFirst({
        where: {
          date: { gte: yesterday, lt: now },
          verificationStatus: "active",
        },
        orderBy: { date: "desc" },
      });
      openingBalance = yesterdayClosing?.balance || 0;
    }

    const closingBalance = openingBalance + netCashFlow;

    const dailyCashFlow = cashInflows.map((item) => ({
      date: item.paymentDate?.toISOString().split("T")[0] || "",
      inflow: item._sum?.amount || 0,
      outflow: 0,
      netFlow: item._sum?.amount || 0,
    }));

    const cashCollectionSummary = dailyCashCollections.reduce(
      (acc, collection) => ({
        totalCollected: acc.totalCollected + collection.collectedAmount,
        totalExpected: acc.totalExpected + collection.totalExpectedAmount,
        totalDeclared: acc.totalDeclared + collection.totalDeclaredAmount,
        totalDiscrepancy: acc.totalDiscrepancy + collection.discrepancy,
        totalDiscounts: acc.totalDiscounts + collection.totalDiscounts,
        totalExpenses: acc.totalExpenses + collection.totalExpenses,
        count: acc.count + 1,
      }),
      { totalCollected: 0, totalExpected: 0, totalDeclared: 0, totalDiscrepancy: 0, totalDiscounts: 0, totalExpenses: 0, count: 0 },
    );

    const cashCollectionByShift = dailyCashCollections.reduce((acc: any, collection) => {
      const key = collection.shift || "unknown";
      if (!acc[key]) acc[key] = { shift: key, totalCollected: 0, totalExpected: 0, totalDiscrepancy: 0, count: 0 };
      acc[key].totalCollected += collection.collectedAmount;
      acc[key].totalExpected += collection.totalExpectedAmount;
      acc[key].totalDiscrepancy += collection.discrepancy;
      acc[key].count += 1;
      return acc;
    }, {});

    const discrepancies = dailyCashCollections.filter(c => c.discrepancy !== 0);

    const cashAtHandSummary = cashAtHandTransactions.reduce((acc: any, tx) => {
      const particular = tx.particular || "other";
      if (!acc[particular]) acc[particular] = { particular, total: 0, count: 0 };
      acc[particular].total += tx.credit - tx.debit;
      acc[particular].count += 1;
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      data: {
        period,
        dateRange: { startDate, endDate },
        summary: {
          openingBalance,
          totalCashInflows,
          totalCashOutflows,
          netCashFlow,
          closingBalance,
        },
        dailyCashFlow,
        cashAtHand: {
          transactions: cashAtHandTransactions,
          summary: Object.values(cashAtHandSummary),
        },
        cashCollection: {
          summary: cashCollectionSummary,
          byShift: Object.values(cashCollectionByShift),
          collections: dailyCashCollections,
        },
        discrepancies,
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