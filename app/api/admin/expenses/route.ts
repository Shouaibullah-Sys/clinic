// app/api/admin/expenses/route.ts
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { AdminExpense } from "@/lib/models/AdminExpense";

// Helper function to get user info from request
async function getUserInfo(request: NextRequest) {
  let userId = request.headers.get("x-user-id");
  let userRole = request.headers.get("x-user-role");
  let userName = request.headers.get("x-user-name");

  return { userId, userRole, userName };
}

// GET: Get daily expenses (admin view - can see all expenses)
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { userId, userRole } = await getUserInfo(request);

    if (!userId || !userRole) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    if (userRole !== "admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden - Admin access only" },
        { status: 403 },
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const category = searchParams.get("category");
    const limit = parseInt(searchParams.get("limit") || "50");
    const page = parseInt(searchParams.get("page") || "1");

    // Build query
    const query: any = {};

    // Filter by date range
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.date = { $gte: start, $lte: end };
    }

    // Filter by category
    if (category) {
      query.category = category;
    }

    const skip = (page - 1) * limit;

    const expenses = await AdminExpense.find(query)
      .populate("admin", "name email")
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);

    const total = await AdminExpense.countDocuments(query);

    // Get summary stats
    let summary = null;
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const summaryData = await AdminExpense.getExpenseSummary(start, end);
      summary = {
        totalExpenses: summaryData.totalExpenses,
        byCategory: summaryData.summary,
        expenseCount: summaryData.expenseCount,
      };
    }

    return NextResponse.json({
      success: true,
      data: expenses.map((expense: any) => ({
        id: expense._id.toString(),
        expenseId: expense.expenseId,
        admin: expense.admin,
        adminName: expense.adminName,
        date: expense.date,
        category: expense.category,
        description: expense.description,
        amount: expense.amount,
        receiptNumber: expense.receiptNumber,
        notes: expense.notes,
        createdAt: expense.createdAt,
        updatedAt: expense.updatedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary,
    });
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch expenses" },
      { status: 500 },
    );
  }
}

// POST: Create a new daily expense (admin can create expenses)
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const { userId, userRole, userName } = await getUserInfo(request);

    if (!userId || !userRole) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    if (userRole !== "admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden - Admin access only" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const {
      date,
      category,
      description,
      amount,
      receiptNumber,
      notes,
      staffId,
    } = body;

    // Validate required fields
    if (!category || !description || amount === undefined) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Validate category
    const validCategories = [
      "supplies",
      "maintenance",
      "utilities",
      "miscellaneous",
      "food",
      "transport",
    ];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { success: false, error: "Invalid category" },
        { status: 400 },
      );
    }

    // Generate expense ID
    const dateObj = new Date();
    const year = dateObj.getFullYear().toString().slice(-2);
    const month = (dateObj.getMonth() + 1).toString().padStart(2, "0");
    const day = dateObj.getDate().toString().padStart(2, "0");
    const random = Math.floor(1000 + Math.random() * 9000);
    const expenseId = `ADM${year}${month}${day}${random}`;

    const expense = await AdminExpense.create({
      expenseId,
      admin: staffId || userId,
      adminName: userName || "Unknown",
      date: date ? new Date(date) : new Date(),
      category,
      description,
      amount: parseFloat(amount),
      receiptNumber,
      notes,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: expense._id.toString(),
        expenseId: expense.expenseId,
        admin: expense.admin,
        adminName: expense.adminName,
        date: expense.date,
        category: expense.category,
        description: expense.description,
        amount: expense.amount,
        receiptNumber: expense.receiptNumber,
        notes: expense.notes,
        createdAt: expense.createdAt,
        updatedAt: expense.updatedAt,
      },
      message: "Expense created successfully",
    });
  } catch (error) {
    console.error("Error creating expense:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create expense" },
      { status: 500 },
    );
  }
}
