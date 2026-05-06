import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenPayload } from "@/lib/auth/jwt";

export async function GET(request: NextRequest) {
  try {
    const user = await getTokenPayload(request);
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const status = searchParams.get("status");
    const shift = searchParams.get("shift");
    const limit = parseInt(searchParams.get("limit") || "50");
    const page = parseInt(searchParams.get("page") || "1");

    const where: any = {};

    if (startDate && endDate) {
      where.date = { gte: new Date(startDate), lte: new Date(endDate) };
    }

    if (status) {
      where.status = status;
    }

    if (shift) {
      where.shift = shift;
    }

    const skip = (page - 1) * limit;

    const collections = await prisma.dailyCashCollection.findMany({
      where,
      include: {
        staff: { select: { name: true, email: true } },
        reviewedBy: { select: { name: true, email: true } },
      },
      orderBy: { date: "desc" },
      skip,
      take: limit,
    });

    const total = await prisma.dailyCashCollection.count({ where });

    return NextResponse.json({
      success: true,
      data: collections,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    console.error("Error fetching cash collections:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch cash collections" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getTokenPayload(request);
    if (!user || !["admin", "receptionist"].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: "Admin or receptionist access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      shift,
      date,
      totalExpectedAmount,
      totalDeclaredAmount,
      cashFromAppointments,
      cashFromLab,
      cashFromRadiology,
      cashFromDischarge,
      totalDiscounts,
      totalExpenses,
      transactionIds,
      notes,
    } = body;

    if (!shift || !totalExpectedAmount || !totalDeclaredAmount) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const validShifts = ["morning", "evening", "night"];
    if (!validShifts.includes(shift)) {
      return NextResponse.json(
        { success: false, error: "Invalid shift" },
        { status: 400 }
      );
    }

    const discrepancy = totalDeclaredAmount - totalExpectedAmount;
    const discrepancyPercentage =
      totalExpectedAmount > 0
        ? (Math.abs(discrepancy) / totalExpectedAmount) * 100
        : 0;

    const collection = await prisma.dailyCashCollection.create({
      data: {
        collectionId: `DCC${new Date().getFullYear().toString().slice(-2)}${String(new Date().getMonth() + 1).padStart(2, "0")}${String(new Date().getDate()).padStart(2, "0")}${Math.floor(1000 + Math.random() * 9000)}`,
        staffId: user.id,
        staffName: user.name || "Unknown",
        shift,
        date: date ? new Date(date) : new Date(),
        totalExpectedAmount: parseFloat(totalExpectedAmount),
        totalDeclaredAmount: parseFloat(totalDeclaredAmount),
        discrepancy,
        discrepancyPercentage,
        cashFromAppointments: parseFloat(cashFromAppointments) || 0,
        cashFromLab: parseFloat(cashFromLab) || 0,
        cashFromRadiology: parseFloat(cashFromRadiology) || 0,
        cashFromDischarge: parseFloat(cashFromDischarge) || 0,
        totalDiscounts: parseFloat(totalDiscounts) || 0,
        totalExpenses: parseFloat(totalExpenses) || 0,
        transactionIds: transactionIds || [],
        status: "submitted",
        collectedAmount: parseFloat(totalDeclaredAmount),
        notes,
      },
    });

    return NextResponse.json({
      success: true,
      data: collection,
      message: "Daily cash collection submitted successfully",
    });
  } catch (error: any) {
    console.error("Error creating cash collection:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create cash collection" },
      { status: 500 }
    );
  }
}