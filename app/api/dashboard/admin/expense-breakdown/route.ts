// app/api/dashboard/admin/expense-breakdown/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import dbConnect from "@/lib/dbConnect";
import { AdminExpense } from "@/lib/models/AdminExpense";
import { ReceptionExpense } from "@/lib/models/ReceptionExpense";

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

    // Get total expenses from both models
    const adminTotalExpenses = await AdminExpense.aggregate([
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

    const receptionTotalExpenses = await ReceptionExpense.aggregate([
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

    const adminTotalData = adminTotalExpenses[0] || {
      totalAmount: 0,
      count: 0,
    };
    const receptionTotalData = receptionTotalExpenses[0] || {
      totalAmount: 0,
      count: 0,
    };

    const totalData = {
      totalAmount: adminTotalData.totalAmount + receptionTotalData.totalAmount,
      count: adminTotalData.count + receptionTotalData.count,
    };

    // Get expenses by category from both models
    const adminExpensesByCategory = await AdminExpense.aggregate([
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
    ]);

    const receptionExpensesByCategory = await ReceptionExpense.aggregate([
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
    ]);

    // Combine category expenses
    const categoryMap = new Map();
    [...adminExpensesByCategory, ...receptionExpensesByCategory].forEach(
      (item: any) => {
        const existing = categoryMap.get(item._id) || {
          totalAmount: 0,
          count: 0,
        };
        categoryMap.set(item._id, {
          totalAmount: existing.totalAmount + item.totalAmount,
          count: existing.count + item.count,
        });
      },
    );

    const expensesByCategory = Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        _id: category,
        totalAmount: data.totalAmount,
        count: data.count,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    // Get expenses by status (only from ReceptionExpense since AdminExpense has no status)
    const expensesByStatus = await ReceptionExpense.aggregate([
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

    // Add admin expenses as "approved" status
    if (adminTotalData.count > 0) {
      const approvedIndex = expensesByStatus.findIndex(
        (item: any) => item._id === "approved",
      );
      if (approvedIndex >= 0) {
        expensesByStatus[approvedIndex].totalAmount +=
          adminTotalData.totalAmount;
        expensesByStatus[approvedIndex].count += adminTotalData.count;
      } else {
        expensesByStatus.push({
          _id: "approved",
          totalAmount: adminTotalData.totalAmount,
          count: adminTotalData.count,
        });
      }
    }

    // Get daily expense trend from both models
    const adminDailyTrend = await AdminExpense.aggregate([
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
    ]);

    const receptionDailyTrend = await ReceptionExpense.aggregate([
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
    ]);

    // Combine daily trends
    const dailyTrendMap = new Map();
    [...adminDailyTrend, ...receptionDailyTrend].forEach((item: any) => {
      const existing = dailyTrendMap.get(item._id) || {
        totalAmount: 0,
        count: 0,
      };
      dailyTrendMap.set(item._id, {
        totalAmount: existing.totalAmount + item.totalAmount,
        count: existing.count + item.count,
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
    const pendingExpenses = await ReceptionExpense.find({
      status: "pending",
    })
      .sort({ date: -1 })
      .limit(20)
      .populate("staff", "name email")
      .lean();

    // Get recent expenses from both models
    const adminRecentExpenses = await AdminExpense.find({
      date: { $gte: startDate, $lt: endDate },
    })
      .sort({ date: -1 })
      .limit(10)
      .populate("admin", "name email")
      .lean();

    const receptionRecentExpenses = await ReceptionExpense.find({
      date: { $gte: startDate, $lt: endDate },
    })
      .sort({ date: -1 })
      .limit(10)
      .populate("staff", "name email")
      .lean();

    // Combine and sort recent expenses
    const recentExpenses = [...adminRecentExpenses, ...receptionRecentExpenses]
      .map((expense: any) => ({
        id: expense._id.toString(),
        expenseId: expense.expenseId,
        staff: expense.admin || expense.staff,
        staffName: expense.adminName || expense.staffName,
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

    // Get expenses by staff from both models
    const adminExpensesByStaff = await AdminExpense.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lt: endDate },
        },
      },
      {
        $group: {
          _id: "$admin",
          staffName: { $first: "$adminName" },
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const receptionExpensesByStaff = await ReceptionExpense.aggregate([
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
    ]);

    // Combine staff expenses
    const staffMap = new Map();
    [...adminExpensesByStaff, ...receptionExpensesByStaff].forEach(
      (item: any) => {
        const existing = staffMap.get(item._id.toString()) || {
          staffName: item.staffName,
          totalAmount: 0,
          count: 0,
        };
        staffMap.set(item._id.toString(), {
          staffName: item.staffName,
          totalAmount: existing.totalAmount + item.totalAmount,
          count: existing.count + item.count,
        });
      },
    );

    const expensesByStaff = Array.from(staffMap.entries())
      .map(([staffId, data]) => ({
        _id: staffId,
        staffName: data.staffName,
        totalAmount: data.totalAmount,
        count: data.count,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 10);

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

      const adminYesterdayExpenses = await AdminExpense.aggregate([
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

      const receptionYesterdayExpenses = await ReceptionExpense.aggregate([
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

      previousPeriodExpenses =
        (adminYesterdayExpenses[0]?.totalAmount || 0) +
        (receptionYesterdayExpenses[0]?.totalAmount || 0);
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
        recentExpenses: recentExpenses,
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
