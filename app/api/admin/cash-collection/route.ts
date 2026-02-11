// app/api/admin/cash-collection/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import { DailyCashCollection } from "@/lib/models/DailyCashCollection";
import { CashAtHand } from "@/lib/models/CashAtHand";

// Helper function to get user info from request
async function getUserInfo(request: NextRequest) {
  let userId = request.headers.get("x-user-id");
  let userRole = request.headers.get("x-user-role");
  let userName = request.headers.get("x-user-name");

  return { userId, userRole, userName };
}

// GET: Get daily cash collections
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
    const status = searchParams.get("status");
    const shift = searchParams.get("shift");
    const staffId = searchParams.get("staffId");
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

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Filter by shift
    if (shift) {
      query.shift = shift;
    }

    // Filter by staff
    if (staffId) {
      query.staff = new mongoose.Types.ObjectId(staffId);
    }

    const skip = (page - 1) * limit;

    const collections = await DailyCashCollection.find(query)
      .populate("staff", "name email")
      .populate("reviewedBy", "name email")
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await DailyCashCollection.countDocuments(query);

    // Get summary stats
    let summary = null;
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const summaryData = await DailyCashCollection.getDailySummary(end);
      summary = {
        totalCollected: summaryData[0]?.totalCollected || 0,
        totalExpected: summaryData[0]?.totalExpected || 0,
        totalDiscrepancy: summaryData[0]?.totalDiscrepancy || 0,
        totalCashIn: summaryData[0]?.totalCashIn || 0,
        totalExpenses: summaryData[0]?.totalExpenses || 0,
        totalDiscounts: summaryData[0]?.totalDiscounts || 0,
        count: summaryData[0]?.count || 0,
      };
    }

    return NextResponse.json({
      success: true,
      data: collections.map((collection) => ({
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
        reviewedBy: collection.reviewedBy,
        reviewedByName: collection.reviewedByName,
        reviewedAt: collection.reviewedAt,
        approvalNotes: collection.approvalNotes,
        collectedAmount: collection.collectedAmount,
        collectedAt: collection.collectedAt,
        notes: collection.notes,
        createdAt: collection.createdAt,
        updatedAt: collection.updatedAt,
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
    console.error("Error fetching cash collections:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch cash collections" },
      { status: 500 },
    );
  }
}

// POST: Submit a new daily cash collection (for receptionists)
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

    // Calculate discrepancy
    const discrepancy = totalDeclaredAmount - totalExpectedAmount;
    const discrepancyPercentage =
      totalExpectedAmount > 0
        ? (Math.abs(discrepancy) / totalExpectedAmount) * 100
        : 0;

    const collection = await DailyCashCollection.create({
      staff: userId,
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
        updatedAt: collection.updatedAt,
      },
      message: "Daily cash collection submitted successfully",
    });
  } catch (error) {
    console.error("Error creating cash collection:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create cash collection" },
      { status: 500 },
    );
  }
}
