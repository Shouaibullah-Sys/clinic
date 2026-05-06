import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenPayload } from "@/lib/auth/jwt";

async function getUserInfo(request: NextRequest) {
  const userId = await getTokenPayload(request);
  return { userId: userId?.id, userRole: userId?.role, userName: userId?.name };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId, userRole } = await getUserInfo(request);

    if (!userId || !userRole) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (userRole !== "admin") {
      return NextResponse.json({ success: false, error: "Forbidden - Admin access only" }, { status: 403 });
    }

    const { id } = await params;
    const expense = await prisma.adminExpense.findUnique({ where: { id } });

    if (!expense) {
      return NextResponse.json({ success: false, error: "Expense not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: expense,
    });
  } catch (error) {
    console.error("Error fetching expense:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch expense" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId, userRole } = await getUserInfo(request);

    if (!userId || !userRole) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (userRole !== "admin") {
      return NextResponse.json({ success: false, error: "Forbidden - Admin access only" }, { status: 403 });
    }

    const body = await request.json();
    const { amount, category, description, receiptNumber, notes } = body;

    const { id } = await params;
    const expense = await prisma.adminExpense.findUnique({ where: { id } });

    if (!expense) {
      return NextResponse.json({ success: false, error: "Expense not found" }, { status: 404 });
    }

    const validCategories = ["supplies", "maintenance", "utilities", "miscellaneous", "food", "transport"];
    const updateData: any = {};
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (category && validCategories.includes(category)) updateData.category = category;
    if (description) updateData.description = description;
    if (receiptNumber !== undefined) updateData.receiptNumber = receiptNumber;
    if (notes !== undefined) updateData.notes = notes;

    const updatedExpense = await prisma.adminExpense.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: updatedExpense,
      message: "Expense updated successfully",
    });
  } catch (error) {
    console.error("Error updating expense:", error);
    return NextResponse.json({ success: false, error: "Failed to update expense" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId, userRole } = await getUserInfo(request);

    if (!userId || !userRole) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (userRole !== "admin") {
      return NextResponse.json({ success: false, error: "Forbidden - Admin access only" }, { status: 403 });
    }

    const { id } = await params;
    const expense = await prisma.adminExpense.findUnique({ where: { id } });

    if (!expense) {
      return NextResponse.json({ success: false, error: "Expense not found" }, { status: 404 });
    }

    await prisma.adminExpense.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Expense deleted successfully" });
  } catch (error) {
    console.error("Error deleting expense:", error);
    return NextResponse.json({ success: false, error: "Failed to delete expense" }, { status: 500 });
  }
}