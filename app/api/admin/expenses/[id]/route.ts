// app/api/admin/expenses/[id]/route.ts
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

// GET: Get a single expense by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;
    const expense = await AdminExpense.findById(id).populate(
      "admin",
      "name email",
    );

    if (!expense) {
      return NextResponse.json(
        { success: false, error: "Expense not found" },
        { status: 404 },
      );
    }

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
    });
  } catch (error) {
    console.error("Error fetching expense:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch expense" },
      { status: 500 },
    );
  }
}

// PUT: Update an expense (no approval workflow for admin expenses)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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
    const { amount, category, description, receiptNumber, notes } = body;

    const { id } = await params;
    const expense = await AdminExpense.findById(id);

    if (!expense) {
      return NextResponse.json(
        { success: false, error: "Expense not found" },
        { status: 404 },
      );
    }

    // Handle update fields
    if (amount !== undefined) {
      expense.amount = parseFloat(amount);
    }
    if (category) {
      const validCategories = [
        "supplies",
        "maintenance",
        "utilities",
        "miscellaneous",
        "food",
        "transport",
      ];
      if (validCategories.includes(category)) {
        expense.category = category;
      }
    }
    if (description) {
      expense.description = description;
    }
    if (receiptNumber !== undefined) {
      expense.receiptNumber = receiptNumber;
    }
    if (notes !== undefined) {
      expense.notes = notes;
    }

    await expense.save();

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

// DELETE: Delete an expense (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;
    const expense = await AdminExpense.findById(id);

    if (!expense) {
      return NextResponse.json(
        { success: false, error: "Expense not found" },
        { status: 404 },
      );
    }

    await AdminExpense.findByIdAndDelete(id);

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
