// app/api/dashboard/reception/cash/submit/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import { CashAtHand } from "@/lib/models/CashAtHand";
import { DailyCashCollection } from "@/lib/models/DailyCashCollection";

// POST: Submit daily cash collection (creates DailyCashCollection for admin approval)
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
      shift,
      date,
      totalExpectedAmount,
      totalDeclaredAmount,
      cashFromAppointments,
      cashFromLab,
      cashFromRadiology,
      cashFromDischarge,
      cashFromPharmacy,
      totalDiscounts,
      totalExpenses,
      transactionIds,
      notes,
    } = body;

    // Validate required fields
    if (!shift || !totalExpectedAmount || !totalDeclaredAmount) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Validate shift
    const validShifts = ["morning", "evening", "night"];
    if (!validShifts.includes(shift)) {
      return NextResponse.json(
        { success: false, error: "Invalid shift" },
        { status: 400 },
      );
    }

    // Check if user already submitted a collection for this shift/date
    const existingCollection = await DailyCashCollection.findOne({
      staff: new mongoose.Types.ObjectId(userId),
      shift,
      date: {
        $gte: new Date(date || new Date().setHours(0, 0, 0, 0)),
        $lt: new Date(date || new Date().setHours(23, 59, 59, 999)),
      },
    });

    if (existingCollection) {
      return NextResponse.json(
        {
          success: false,
          error: "You have already submitted a collection for this shift",
        },
        { status: 400 },
      );
    }

    // Calculate discrepancy
    const discrepancy =
      parseFloat(totalDeclaredAmount) - parseFloat(totalExpectedAmount);
    const discrepancyPercentage =
      parseFloat(totalExpectedAmount) > 0
        ? (Math.abs(discrepancy) / parseFloat(totalExpectedAmount)) * 100
        : 0;

    // Create the daily cash collection
    const collection = await DailyCashCollection.create({
      staff: new mongoose.Types.ObjectId(userId),
      staffName: userName || "Unknown",
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
      cashFromPharmacy: parseFloat(cashFromPharmacy) || 0,
      totalDiscounts: parseFloat(totalDiscounts) || 0,
      totalExpenses: parseFloat(totalExpenses) || 0,
      transactionIds: transactionIds || [],
      status: "submitted",
      collectedAmount: parseFloat(totalDeclaredAmount),
      notes,
    });

    // Update related CashAtHand transactions to link to this collection
    if (transactionIds && transactionIds.length > 0) {
      await CashAtHand.updateMany(
        { transactionId: { $in: transactionIds } },
        {
          $set: {
            verificationStatus: discrepancy === 0 ? "verified" : "pending",
          },
        },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: collection._id.toString(),
        collectionId: collection.collectionId,
        staff: collection.staff,
        staffName: collection.staffName,
        shift: collection.shift,
        date: collection.date,
        totalExpectedAmount: collection.totalExpectedAmount,
        totalDeclaredAmount: collection.totalDeclaredAmount,
        discrepancy: collection.discrepancy,
        discrepancyPercentage: collection.discrepancyPercentage,
        cashFromAppointments: collection.cashFromAppointments,
        cashFromLab: collection.cashFromLab,
        cashFromRadiology: collection.cashFromRadiology,
        cashFromDischarge: collection.cashFromDischarge,
        totalDiscounts: collection.totalDiscounts,
        totalExpenses: collection.totalExpenses,
        transactionIds: collection.transactionIds,
        status: collection.status,
        submittedAt: collection.submittedAt,
        collectedAmount: collection.collectedAmount,
        notes: collection.notes,
        createdAt: collection.createdAt,
      },
      message:
        "Daily cash collection submitted successfully for admin approval",
    });
  } catch (error) {
    console.error("Error submitting cash collection:", error);
    return NextResponse.json(
      { success: false, error: "Failed to submit cash collection" },
      { status: 500 },
    );
  }
}
