import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { DailyExpense } from "@/lib/models/DailyExpense";
import { jwtVerify } from "jose";

// Helper function to generate expense ID
function generateExpenseId(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `EXP${year}${month}${day}${random}`;
}

// Helper function to get user info from request
// Supports both middleware-set headers and direct Authorization header
async function getUserInfo(request: NextRequest) {
  // Try to get from custom headers first (set by middleware)
  let userId = request.headers.get("x-user-id");
  let userRole = request.headers.get("x-user-role");
  let userName = request.headers.get("x-user-name");

  // If headers not set, try to extract from JWT token
  if (!userId || !userRole) {
    try {
      // Try to get token from Authorization header
      let token = request.headers.get("authorization")?.replace("Bearer ", "");

      // If no Authorization header, try cookies
      if (!token) {
        token = request.cookies.get("accessToken")?.value;
      }

      if (token && process.env.JWT_SECRET) {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET);
        const { payload } = await jwtVerify(token, secret);

        if (!userId) {
          userId = payload.id as string;
        }
        if (!userRole) {
          userRole = payload.role as string;
        }
        if (!userName) {
          userName = payload.name as string;
        }
      }
    } catch (error) {
      console.error("Error extracting user from token:", error);
    }
  }

  return { userId, userRole, userName };
}

// GET: Get daily expenses
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { userId, userRole, userName } = await getUserInfo(request);

    if (!userId || !userRole) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    if (!["admin", "receptionist"].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");
    const page = parseInt(searchParams.get("page") || "1");

    // Build query
    const query: any = {};

    // Non-admin users can only see their own expenses
    if (userRole !== "admin") {
      query.staff = userId;
    }

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

    // Filter by status
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const expenses = await DailyExpense.find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);

    const total = await DailyExpense.countDocuments(query);

    // Get summary stats
    let summary = null;
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      const summaryData = await DailyExpense.getExpenseSummary(start, end);
      summary = {
        totalExpenses: summaryData.totalExpenses,
        pendingCount: summaryData.pendingCount,
        approvedCount: summaryData.approvedCount,
        byCategory: summaryData.summary,
      };
    }

    return NextResponse.json({
      success: true,
      data: expenses.map((expense) => ({
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
    console.error("Error fetching daily expenses:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch daily expenses" },
      { status: 500 },
    );
  }
}

// POST: Create a new daily expense
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

    if (!["admin", "receptionist"].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { date, category, description, amount, receiptNumber, notes } = body;

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

    const expense = await DailyExpense.create({
      expenseId: generateExpenseId(),
      staff: userId,
      staffName: userName || "Unknown",
      date: date ? new Date(date) : new Date(),
      category,
      description,
      amount: parseFloat(amount),
      receiptNumber,
      notes,
      status: "pending",
    });

    return NextResponse.json({
      success: true,
      data: {
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
        updatedAt: expense.updatedAt,
      },
      message: "Daily expense created successfully",
    });
  } catch (error) {
    console.error("Error creating daily expense:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create daily expense" },
      { status: 500 },
    );
  }
}
