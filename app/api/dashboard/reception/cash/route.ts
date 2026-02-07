// app/api/dashboard/reception/cash/route.ts

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import { CashAtHand } from "@/lib/models/CashAtHand";

// GET: Get cash transactions for the current user
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

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

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Build query
    const query: any = {
      date: { $gte: today, $lt: tomorrow },
      status: "active",
    };

    // Non-admin users can only see their own transactions
    if (userRole !== "admin") {
      query.staff = new mongoose.Types.ObjectId(userId);
    }

    const transactions = await CashAtHand.find(query)
      .sort({ date: -1 })
      .limit(50);

    return NextResponse.json({
      success: true,
      data: transactions.map((tx) => ({
        id: tx._id.toString(),
        transactionId: tx.transactionId,
        transactionType: tx.transactionType,
        amount: tx.amount,
        calculatedTotal: tx.calculatedTotal,
        declaredAmount: tx.declaredAmount,
        variance: tx.variance,
        shift: tx.shift,
        cashierName: tx.cashierName,
        source: tx.source,
        destination: tx.destination,
        verificationStatus: tx.verificationStatus,
        createdAt: tx.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching cash transactions:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch cash transactions" },
      { status: 500 },
    );
  }
}

// POST: Create a new cash transaction (for collection)
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");
    const userName = request.headers.get("x-user-name");

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
    const {
      transactionType,
      denominations,
      declaredAmount,
      shift,
      source,
      destination,
    } = body;

    // Calculate total from denominations
    const calculatedTotal =
      denominations.thousand * 1000 +
      denominations.fiveHundred * 500 +
      denominations.twoHundred * 200 +
      denominations.oneHundred * 100 +
      denominations.fifty * 50 +
      denominations.twenty * 20 +
      denominations.ten * 10 +
      denominations.five * 5 +
      denominations.two * 2 +
      denominations.one * 1 +
      denominations.half * 0.5 +
      denominations.quarter * 0.25 +
      denominations.tenCents * 0.1 +
      denominations.fiveCents * 0.05;

    const variance = calculatedTotal - declaredAmount;

    // Generate transaction ID
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const random = Math.floor(1000 + Math.random() * 9000);
    const transactionId = `CASH${year}${month}${day}${random}`;

    const transaction = await CashAtHand.create({
      transactionId,
      staff: new mongoose.Types.ObjectId(userId),
      cashierName: userName || "Unknown",
      cashierId: userId,
      shift,
      date: new Date(),
      transactionType,
      denominations,
      calculatedTotal,
      declaredAmount,
      variance,
      amount: declaredAmount,
      previousBalance: 0,
      newBalance: declaredAmount,
      source,
      destination,
      verificationStatus: variance === 0 ? "verified" : "pending",
    });

    return NextResponse.json({
      success: true,
      data: {
        id: transaction._id.toString(),
        transactionId: transaction.transactionId,
        transactionType: transaction.transactionType,
        amount: transaction.amount,
        calculatedTotal: transaction.calculatedTotal,
        variance: transaction.variance,
        shift: transaction.shift,
        verificationStatus: transaction.verificationStatus,
        createdAt: transaction.createdAt,
      },
      message: "Cash transaction created successfully",
    });
  } catch (error) {
    console.error("Error creating cash transaction:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create cash transaction" },
      { status: 500 },
    );
  }
}

// PUT: Update/edit a cash transaction
export async function PUT(request: NextRequest) {
  try {
    await dbConnect();

    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");
    const userName = request.headers.get("x-user-name");

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
    const {
      id,
      transactionType,
      denominations,
      declaredAmount,
      shift,
      source,
      destination,
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Transaction ID is required" },
        { status: 400 },
      );
    }

    const transaction = await CashAtHand.findById(id);

    if (!transaction) {
      return NextResponse.json(
        { success: false, error: "Cash transaction not found" },
        { status: 404 },
      );
    }

    // Non-admin users can only update their own transactions
    const staffId =
      transaction.staff?._id?.toString() || transaction.staff?.toString();
    if (userRole !== "admin" && staffId !== userId) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    // Calculate total from denominations if provided
    if (denominations && typeof denominations === "object") {
      transaction.calculatedTotal =
        (denominations.thousand || 0) * 1000 +
        (denominations.fiveHundred || 0) * 500 +
        (denominations.twoHundred || 0) * 200 +
        (denominations.oneHundred || 0) * 100 +
        (denominations.fifty || 0) * 50 +
        (denominations.twenty || 0) * 20 +
        (denominations.ten || 0) * 10 +
        (denominations.five || 0) * 5 +
        (denominations.two || 0) * 2 +
        (denominations.one || 0) * 1 +
        (denominations.half || 0) * 0.5 +
        (denominations.quarter || 0) * 0.25 +
        (denominations.tenCents || 0) * 0.1 +
        (denominations.fiveCents || 0) * 0.05;

      transaction.denominations = {
        thousand: denominations.thousand || 0,
        fiveHundred: denominations.fiveHundred || 0,
        twoHundred: denominations.twoHundred || 0,
        oneHundred: denominations.oneHundred || 0,
        fifty: denominations.fifty || 0,
        twenty: denominations.twenty || 0,
        ten: denominations.ten || 0,
        five: denominations.five || 0,
        two: denominations.two || 0,
        one: denominations.one || 0,
        half: denominations.half || 0,
        quarter: denominations.quarter || 0,
        tenCents: denominations.tenCents || 0,
        fiveCents: denominations.fiveCents || 0,
      };
    }

    // Update declared amount if provided and is a valid number
    if (
      declaredAmount !== undefined &&
      declaredAmount !== null &&
      !isNaN(Number(declaredAmount))
    ) {
      const newDeclaredAmount = Number(declaredAmount);
      transaction.declaredAmount = newDeclaredAmount;
      transaction.variance = transaction.calculatedTotal - newDeclaredAmount;
      transaction.amount = newDeclaredAmount;
      transaction.verificationStatus =
        transaction.variance === 0 ? "verified" : "pending";
    }

    // Update other fields if provided
    if (transactionType) transaction.transactionType = transactionType;
    if (shift) transaction.shift = shift;
    if (source) transaction.source = source;
    if (destination) transaction.destination = destination;

    transaction.updatedBy = new mongoose.Types.ObjectId(userId);
    transaction.updatedByName = userName || "Unknown";
    transaction.updatedAt = new Date();

    await transaction.save();

    return NextResponse.json({
      success: true,
      data: {
        id: transaction._id.toString(),
        transactionId: transaction.transactionId,
        transactionType: transaction.transactionType,
        amount: transaction.amount,
        calculatedTotal: transaction.calculatedTotal,
        declaredAmount: transaction.declaredAmount,
        variance: transaction.variance,
        shift: transaction.shift,
        cashierName: transaction.cashierName,
        source: transaction.source,
        destination: transaction.destination,
        verificationStatus: transaction.verificationStatus,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
      },
      message: "Cash transaction updated successfully",
    });
  } catch (error) {
    console.error("Error updating cash transaction:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update cash transaction" },
      { status: 500 },
    );
  }
}

// DELETE: Delete a cash transaction
export async function DELETE(request: NextRequest) {
  try {
    await dbConnect();

    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId || !userRole) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Only admins can delete transactions
    if (userRole !== "admin") {
      return NextResponse.json(
        { success: false, error: "Only admins can delete cash transactions" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Transaction ID is required" },
        { status: 400 },
      );
    }

    const transaction = await CashAtHand.findById(id);

    if (!transaction) {
      return NextResponse.json(
        { success: false, error: "Cash transaction not found" },
        { status: 404 },
      );
    }

    await CashAtHand.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "Cash transaction deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting cash transaction:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete cash transaction" },
      { status: 500 },
    );
  }
}
