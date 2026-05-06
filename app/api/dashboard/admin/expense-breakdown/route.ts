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

    // Get total expenses from both models
    const adminExpenses = await prisma.adminExpense.findMany({
      where: {
        date: { gte: startDate, lt: endDate },
      },
    });

    const receptionExpenses = await prisma.receptionExpense.findMany({
      where: {
        date: { gte: startDate, lt: endDate },
      },
    });

    const adminTotalData = adminExpenses.reduce(
      (acc, e) => ({ totalAmount: acc.totalAmount + e.amount, count: acc.count + 1 }),
      { totalAmount: 0, count: 0 }
    );

    const receptionTotalData = receptionExpenses.reduce(
      (acc, e) => ({ totalAmount: acc.totalAmount + e.amount, count: acc.count + 1 }),
      { totalAmount: 0, count: 0 }
    );

    const totalData = {
      totalAmount: adminTotalData.totalAmount + receptionTotalData.totalAmount,
      count: adminTotalData.count + receptionTotalData.count,
    };

    // Get expenses by category from both models
    const categoryMap = new Map<string, { totalAmount: number; count: number }>();

    [...adminExpenses, ...receptionExpenses].forEach((expense) => {
      const category = expense.category || "other";
      const existing = categoryMap.get(category) || { totalAmount: 0, count: 0 };
      categoryMap.set(category, {
        totalAmount: existing.totalAmount + expense.amount,
        count: existing.count + 1,
      });
    });

    const expensesByCategory = Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        _id: category,
        totalAmount: data.totalAmount,
        count: data.count,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    // Get expenses by status (only from ReceptionExpense)
    const statusMap = new Map<string, { totalAmount: number; count: number }>();

    receptionExpenses.forEach((expense) => {
      const status = expense.status || "pending";
      const existing = statusMap.get(status) || { totalAmount: 0, count: 0 };
      statusMap.set(status, {
        totalAmount: existing.totalAmount + expense.amount,
        count: existing.count + 1,
      });
    });

    const expensesByStatus = Array.from(statusMap.entries())
      .map(([status, data]) => ({
        _id: status,
        totalAmount: data.totalAmount,
        count: data.count,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    // Add admin expenses as "approved" status
    if (adminTotalData.count > 0) {
      const approvedEntry = expensesByStatus.find((item) => item._id === "approved");
      if (approvedEntry) {
        approvedEntry.totalAmount += adminTotalData.totalAmount;
        approvedEntry.count += adminTotalData.count;
      } else {
        expensesByStatus.push({
          _id: "approved",
          totalAmount: adminTotalData.totalAmount,
          count: adminTotalData.count,
        });
      }
    }

    // Get daily expense trend
    const dailyTrendMap = new Map<string, { totalAmount: number; count: number }>();

    [...adminExpenses, ...receptionExpenses].forEach((expense) => {
      const dateStr = expense.date.toISOString().split("T")[0];
      const existing = dailyTrendMap.get(dateStr) || { totalAmount: 0, count: 0 };
      dailyTrendMap.set(dateStr, {
        totalAmount: existing.totalAmount + expense.amount,
        count: existing.count + 1,
      });
    });

    const dailyExpenseTrend = Array.from(dailyTrendMap.entries())
      .map(([date, data]) => ({
        _id: date,
        totalAmount: data.totalAmount,
        count: data.count,
      }))
      .sort((a, b) => a._id.localeCompare(b._id));

    // Get pending expenses (only from ReceptionExpense)
    const pendingExpenses = await prisma.receptionExpense.findMany({
      where: {
        status: "pending",
      },
      orderBy: { date: "desc" },
      take: 20,
    });

    // Get recent expenses from both models
    const recentAdminExpenses = await prisma.adminExpense.findMany({
      where: {
        date: { gte: startDate, lt: endDate },
      },
      orderBy: { date: "desc" },
      take: 10,
    });

    const recentReceptionExpenses = await prisma.receptionExpense.findMany({
      where: {
        date: { gte: startDate, lt: endDate },
      },
      orderBy: { date: "desc" },
      take: 10,
    });

    const recentExpenses = [...recentAdminExpenses, ...recentReceptionExpenses]
      .map((expense) => ({
        id: expense.id,
        expenseId: expense.expenseId,
        date: expense.date,
        category: expense.category,
        description: expense.description,
        amount: expense.amount,
        receiptNumber: expense.receiptNumber,
        status: expense.status || "approved",
        notes: expense.notes,
        createdAt: expense.createdAt,
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 20);

    // Calculate category breakdown with percentages
    const categoryBreakdown = expensesByCategory.map((item) => ({
      category: item._id,
      totalAmount: item.totalAmount,
      count: item.count,
      percentage:
        totalData.totalAmount > 0 ? (item.totalAmount / totalData.totalAmount) * 100 : 0,
    }));

    // Get previous period data for comparison
    let previousPeriodExpenses = 0;
    if (period === "today") {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const yesterdayStart = new Date(
        yesterday.getFullYear(),
        yesterday.getMonth(),
        yesterday.getDate()
      );
      const yesterdayEnd = new Date(
        yesterday.getFullYear(),
        yesterday.getMonth(),
        yesterday.getDate() + 1
      );

      const yesterdayAdmin = await prisma.adminExpense.findMany({
        where: { date: { gte: yesterdayStart, lt: yesterdayEnd } },
      });

      const yesterdayReception = await prisma.receptionExpense.findMany({
        where: { date: { gte: yesterdayStart, lt: yesterdayEnd } },
      });

      previousPeriodExpenses =
        yesterdayAdmin.reduce((sum, e) => sum + e.amount, 0) +
        yesterdayReception.reduce((sum, e) => sum + e.amount, 0);
    }

    // Calculate growth percentage
    const expenseGrowth =
      previousPeriodExpenses > 0
        ? ((totalData.totalAmount - previousPeriodExpenses) / previousPeriodExpenses) * 100
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
          totalExpenses: totalData.totalAmount,
          totalCount: totalData.count,
          previousPeriodExpenses,
          expenseGrowth,
        },
        byCategory: categoryBreakdown,
        byStatus: expensesByStatus,
        dailyTrend: dailyExpenseTrend,
        pendingExpenses: pendingExpenses.map((expense) => ({
          id: expense.id,
          expenseId: expense.expenseId,
          date: expense.date,
          category: expense.category,
          description: expense.description,
          amount: expense.amount,
          receiptNumber: expense.receiptNumber,
          status: expense.status,
          notes: expense.notes,
          createdAt: expense.createdAt,
        })),
        recentExpenses: recentExpenses,
      },
    });
  } catch (error) {
    console.error("Error fetching expense breakdown:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}