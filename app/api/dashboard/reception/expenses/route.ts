import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenPayload } from "@/lib/auth/jwt";

function generateExpenseId(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `EXP${year}${month}${day}${random}`;
}

async function getUserInfo(request: NextRequest) {
  const payload = await getTokenPayload(request);
  return {
    userId: payload?.id as string,
    userRole: payload?.role as string,
    userName: payload?.name as string,
  };
}

export async function GET(request: NextRequest) {
  try {
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

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");
    const page = parseInt(searchParams.get("page") || "1");

    let where: any = {};

    if (userRole !== "admin") {
      where.createdById = userId;
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.date = { gte: start, lte: end };
    }

    if (category) {
      where.category = category;
    }

    if (status) {
      where.status = status;
    }

    const skip = (page - 1) * limit;

    const [expenses, total] = await Promise.all([
      (prisma as any).receptionExpense.findMany({
        where,
        orderBy: { date: "desc" },
        skip,
        take: limit,
      }),
      (prisma as any).receptionExpense.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: expenses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Error fetching daily expenses:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch daily expenses" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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

    const expense = await (prisma as any).receptionExpense.create({
      data: {
        expenseId: generateExpenseId(),
        createdById: userId,
        date: date ? new Date(date) : new Date(),
        category,
        description,
        amount: parseFloat(amount),
        receiptNumber,
        notes,
        status: "pending",
      },
    });

    return NextResponse.json({
      success: true,
      data: expense,
      message: "Daily expense created successfully",
    });
  } catch (error: any) {
    console.error("Error creating daily expense:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create daily expense" },
      { status: 500 },
    );
  }
}