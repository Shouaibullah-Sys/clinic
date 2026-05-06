// app/api/admin/expenses/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenPayload } from "@/lib/auth/jwt";

export async function GET(request: NextRequest) {
  try {
    const user = await getTokenPayload(request);
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const category = searchParams.get("category");
    const limit = parseInt(searchParams.get("limit") || "50");
    const page = parseInt(searchParams.get("page") || "1");

    const where: any = {};

    if (startDate && endDate) {
      where.date = { gte: new Date(startDate), lte: new Date(endDate) };
    }

    if (category) {
      where.category = category;
    }

    const skip = (page - 1) * limit;

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { date: "desc" },
      skip,
      take: limit,
    });

    const total = await prisma.expense.count({ where });

    let summary = null;
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const expensesInRange = await prisma.expense.findMany({
        where: { date: { gte: start, lte: end } },
      });
      
      const totalExpenses = expensesInRange.reduce((sum, e) => sum + e.amount, 0);
      const byCategory: Record<string, number> = {};
      expensesInRange.forEach(e => {
        const cat = e.category || "uncategorized";
        byCategory[cat] = (byCategory[cat] || 0) + e.amount;
      });

      summary = {
        totalExpenses,
        byCategory,
        expenseCount: expensesInRange.length,
      };
    }

    return NextResponse.json({
      success: true,
      data: expenses.map((expense) => ({
        id: expense.id,
        expenseId: expense.expenseId,
        createdBy: expense.createdById,
        date: expense.date,
        category: expense.category,
        description: expense.description,
        amount: expense.amount,
        paymentMethod: expense.paymentMethod,
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

export async function POST(request: NextRequest) {
  try {
    const user = await getTokenPayload(request);
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Admin access required" },
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

    if (!category || !description || amount === undefined) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

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

    const dateObj = new Date();
    const year = dateObj.getFullYear().toString().slice(-2);
    const month = (dateObj.getMonth() + 1).toString().padStart(2, "0");
    const day = dateObj.getDate().toString().padStart(2, "0");
    const random = Math.floor(1000 + Math.random() * 9000);
    const expenseId = `ADM${year}${month}${day}${random}`;

    const expense = await prisma.expense.create({
      data: {
        expenseId,
        createdById: staffId || user.id,
        date: date ? new Date(date) : new Date(),
        category,
        description,
        amount: parseFloat(amount),
        receiptNumber,
        notes,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: expense.id,
        expenseId: expense.expenseId,
        createdBy: expense.createdById,
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
