import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { ReceptionExpense } from "@/lib/models/ReceptionExpense";
import { jwtVerify } from "jose";

// Helper function to get user info from request
async function getUserInfo(request: NextRequest) {
  let userId = request.headers.get("x-user-id");
  let userRole = request.headers.get("x-user-role");
  let userName = request.headers.get("x-user-name");

  if (!userId || !userRole) {
    try {
      let token = request.headers.get("authorization")?.replace("Bearer ", "");
      if (!token) {
        token = request.cookies.get("accessToken")?.value;
      }

      if (token && process.env.JWT_SECRET) {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET);
        const { payload } = await jwtVerify(token, secret);

        if (!userId) userId = payload.id as string;
        if (!userRole) userRole = payload.role as string;
        if (!userName) userName = payload.name as string;
      }
    } catch (error) {
      console.error("Error extracting user from token:", error);
    }
  }

  return { userId, userRole, userName };
}

// GET: Get a single expense by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await dbConnect();
    const { id } = await params;
    const { userId, userRole } = await getUserInfo(request);

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

    const expense = await ReceptionExpense.findById(id);

    if (!expense) {
      return NextResponse.json(
        { success: false, error: "Expense not found" },
        { status: 404 },
      );
    }

    // Non-admin users can only see their own expenses
    if (userRole !== "admin" && expense.staff.toString() !== userId) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

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
    });
  } catch (error) {
    console.error("Error fetching expense:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch expense" },
      { status: 500 },
    );
  }
}

// PUT: Update an expense
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await dbConnect();
    const { id } = await params;
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

    const expense = await ReceptionExpense.findById(id);

    if (!expense) {
      return NextResponse.json(
        { success: false, error: "Expense not found" },
        { status: 404 },
      );
    }

    // Non-admin users can only update their own expenses
    if (userRole !== "admin" && expense.staff.toString() !== userId) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    // Validate category if provided
    const validCategories = [
      "supplies",
      "maintenance",
      "utilities",
      "miscellaneous",
      "food",
      "transport",
    ];
    if (category && !validCategories.includes(category)) {
      return NextResponse.json(
        { success: false, error: "Invalid category" },
        { status: 400 },
      );
    }

    // Update fields
    if (date) expense.date = new Date(date);
    if (category) expense.category = category;
    if (description) expense.description = description;
    if (amount !== undefined) expense.amount = parseFloat(amount);
    if (receiptNumber !== undefined) expense.receiptNumber = receiptNumber;
    if (notes !== undefined) expense.notes = notes;

    await expense.save();

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
      message: "Expense updated successfully",
    });
  } catch (error) {
    console.error("Error updating expense:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update expense" },
      { status: 500 },
    );
  }
}

// DELETE: Delete an expense
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await dbConnect();
    const { id } = await params;
    const { userId, userRole } = await getUserInfo(request);

    if (!userId || !userRole) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Only admins can delete expenses
    if (userRole !== "admin") {
      return NextResponse.json(
        { success: false, error: "Only admins can delete expenses" },
        { status: 403 },
      );
    }

    const expense = await ReceptionExpense.findById(id);

    if (!expense) {
      return NextResponse.json(
        { success: false, error: "Expense not found" },
        { status: 404 },
      );
    }

    await ReceptionExpense.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "Expense deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting expense:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete expense" },
      { status: 500 },
    );
  }
}
