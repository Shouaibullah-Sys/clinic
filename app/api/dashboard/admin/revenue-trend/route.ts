// app/api/dashboard/admin/revenue-trend/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";

// Simple aggregation helper for SQLite
function aggregateByDate<T extends { date: Date; amount?: number }>(
  items: T[],
  valueKey?: keyof T,
): { date: string; total: number }[] {
  const grouped = new Map<string, number>();
  for (const item of items) {
    const dateStr = item.date.toISOString().split("T")[0];
    const value = valueKey && item[valueKey] ? Number(item[valueKey]) : 1;
    grouped.set(dateStr, (grouped.get(dateStr) || 0) + value);
  }
  return Array.from(grouped.entries())
    .map(([date, total]) => ({ date, total }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth.success || auth.userRole !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // DailyRecord trend
    const dailyRecords = await prisma.dailyRecord.findMany({
      where: {
        date: {
          gte: thirtyDaysAgo,
        },
      },
    });

    const revenueTrend = aggregateByDate(
      dailyRecords.map((r) => ({ date: r.date, amount: r.totalRevenue })),
      "amount",
    );

    // Invoice trend
    const invoices = await prisma.invoice.findMany({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        createdAt: true,
        total: true,
      },
    });

    const invoiceTrend = aggregateByDate(
      invoices.map((i) => ({ date: i.createdAt, amount: i.total })),
      "amount",
    );

    // Expense trend
    const expenses = await prisma.adminExpense.findMany({
      where: {
        date: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        date: true,
        amount: true,
      },
    });

    const expenseTrend = aggregateByDate(
      expenses.map((e) => ({ date: e.date, amount: e.amount })),
      "amount",
    );

    return NextResponse.json({
      revenueTrend,
      invoiceTrend,
      expenseTrend,
    });
  } catch (error) {
    console.error("Revenue trend error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}