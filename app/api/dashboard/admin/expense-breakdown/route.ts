// app/api/dashboard/admin/expense-breakdown/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import dbConnect from "@/lib/dbConnect";
import { DailyExpense } from "@/lib/models/DailyExpense";

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

    // Get total expenses
    const totalExpenses = await DailyExpense.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lt: endDate },
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const totalData = totalExpenses[0] || {
      totalAmount: 0,
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

    // Get expenses by status
    const expensesByStatus = await DailyExpense.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lt: endDate },
        },
      },
      {
        $group: {
          _id: "$status",
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Get daily expense trend
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
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // Get pending expenses
    const pendingExpenses = await DailyExpense.find({
      status: "pending",
    })
      .sort({ date: -1 })
      .limit(20)
      .populate("staff", "name email")
      .lean();

    // Get recent expenses
    const recentExpenses = await DailyExpense.find({
      date: { $gte: startDate, $lt: endDate },
    })
      .sort({ date: -1 })
      .limit(20)
      .populate("staff", "name email")
      .lean();

    // Get expenses by staff
    const expensesByStaff = await DailyExpense.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lt: endDate },
        },
      },
      {
        $group: {
          _id: "$staff",
          staffName: { $first: "$staffName" },
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { totalAmount: -1 },
      },
      {
        $limit: 10,
      },
    ]);

    // Calculate category breakdown with percentages
    const categoryBreakdown = expensesByCategory.map((item: any) => ({
      category: item._id,
      totalAmount: item.totalAmount,
      count: item.count,
      percentage:
        totalData.totalAmount > 0
          ? (item.totalAmount / totalData.totalAmount) * 100
          : 0,
    }));

    // Get previous period data for comparison
    let previousPeriodExpenses = 0;
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

      previousPeriodExpenses = yesterdayExpenses[0]?.totalAmount || 0;
    }

    // Calculate growth percentage
    const expenseGrowth =
      previousPeriodExpenses > 0
        ? ((totalData.totalAmount - previousPeriodExpenses) /
            previousPeriodExpenses) *
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
          totalExpenses: totalData.totalAmount,
          totalCount: totalData.count,
          previousPeriodExpenses,
          expenseGrowth,
        },
        byCategory: categoryBreakdown,
        byStatus: expensesByStatus,
        dailyTrend: dailyExpenseTrend,
        byStaff: expensesByStaff,
        pendingExpenses: pendingExpenses.map((expense: any) => ({
          id: expense._id.toString(),
          expenseId: expense.expenseId,
          staff: expense.staff,
          staffName: expense.staffName,
          date: expense.date,
          category: expense.category,
          description: expense.description,
          amount: expense.amount,
          receiptNumber: expense.receiptNumber,
          status: expense.status,
          notes: expense.notes,
          createdAt: expense.createdAt,
        })),
        recentExpenses: recentExpenses.map((expense: any) => ({
          id: expense._id.toString(),
          expenseId: expense.expenseId,
          staff: expense.staff,
          staffName: expense.staffName,
          date: expense.date,
          category: expense.category,
          description: expense.description,
          amount: expense.amount,
          receiptNumber: expense.receiptNumber,
          status: expense.status,
          notes: expense.notes,
          createdAt: expense.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching expense breakdown:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
