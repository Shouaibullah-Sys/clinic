// app/api/admin/cash-collection/[id]/route.ts
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

// GET: Get a single cash collection by ID
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
    const collection = await DailyCashCollection.findById(id)
      .populate("staff", "name email")
      .populate("reviewedBy", "name email");

    if (!collection) {
      return NextResponse.json(
        { success: false, error: "Cash collection not found" },
        { status: 404 },
      );
    }

    // Get related CashAtHand transactions
    const relatedTransactions = await CashAtHand.find({
      transactionId: { $in: collection.transactionIds },
    });

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
        reviewedBy: collection.reviewedBy,
        reviewedByName: collection.reviewedByName,
        reviewedAt: collection.reviewedAt,
        approvalNotes: collection.approvalNotes,
        collectedAmount: collection.collectedAmount,
        collectedAt: collection.collectedAt,
        notes: collection.notes,
        createdAt: collection.createdAt,
        updatedAt: collection.updatedAt,
        relatedTransactions: relatedTransactions.map((tx) => ({
          id: tx._id.toString(),
          transactionId: tx.transactionId,
          transactionType: tx.transactionType,
          amount: tx.amount,
          declaredAmount: tx.declaredAmount,
          variance: tx.variance,
          verificationStatus: tx.verificationStatus,
          createdAt: tx.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching cash collection:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch cash collection" },
      { status: 500 },
    );
  }
}

// PUT: Approve or reject a cash collection
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
    const { action, notes } = body;

    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid action. Must be 'approve' or 'reject'",
        },
        { status: 400 },
      );
    }

    const { id } = await params;
    const collection = await DailyCashCollection.findById(id);

    if (!collection) {
      return NextResponse.json(
        { success: false, error: "Cash collection not found" },
        { status: 404 },
      );
    }

    // Check if already processed
    if (collection.status === "approved" || collection.status === "rejected") {
      return NextResponse.json(
        { success: false, error: `Collection is already ${collection.status}` },
        { status: 400 },
      );
    }

    if (action === "approve") {
      // Approve the collection
      collection.reviewedBy = new mongoose.Types.ObjectId(userId);
      collection.reviewedByName = userName || "Unknown";
      collection.reviewedAt = new Date();
      collection.approvalNotes = notes;
      collection.status = "approved";
      collection.collectedAt = new Date();

      // Update related CashAtHand transactions to verified
      if (collection.transactionIds && collection.transactionIds.length > 0) {
        await CashAtHand.updateMany(
          { transactionId: { $in: collection.transactionIds } },
          {
            $set: {
              verificationStatus: "verified",
              verifiedBy: new mongoose.Types.ObjectId(userId),
              verifiedByName: userName || "Unknown",
              verificationTime: new Date(),
            },
          },
        );
      }

      await collection.save();

      return NextResponse.json({
        success: true,
        data: {
          id: collection._id.toString(),
          collectionId: collection.collectionId,
          status: collection.status,
          reviewedBy: collection.reviewedBy,
          reviewedByName: collection.reviewedByName,
          reviewedAt: collection.reviewedAt,
          approvalNotes: collection.approvalNotes,
          collectedAmount: collection.collectedAmount,
          collectedAt: collection.collectedAt,
        },
        message: "Cash collection approved successfully",
      });
    } else {
      // Reject the collection
      collection.reviewedBy = new mongoose.Types.ObjectId(userId);
      collection.reviewedByName = userName || "Unknown";
      collection.reviewedAt = new Date();
      collection.approvalNotes = notes;
      collection.status = "rejected";

      // Update related CashAtHand transactions to discrepancy
      if (collection.transactionIds && collection.transactionIds.length > 0) {
        await CashAtHand.updateMany(
          { transactionId: { $in: collection.transactionIds } },
          {
            $set: {
              verificationStatus: "discrepancy",
              discrepancyNotes: notes || "Collection rejected by admin",
            },
          },
        );
      }

      await collection.save();

      return NextResponse.json({
        success: true,
        data: {
          id: collection._id.toString(),
          collectionId: collection.collectionId,
          status: collection.status,
          reviewedBy: collection.reviewedBy,
          reviewedByName: collection.reviewedByName,
          reviewedAt: collection.reviewedAt,
          approvalNotes: collection.approvalNotes,
        },
        message: "Cash collection rejected successfully",
      });
    }
  } catch (error) {
    console.error("Error updating cash collection:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update cash collection" },
      { status: 500 },
    );
  }
}

// DELETE: Delete a cash collection (admin only)
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
    const collection = await DailyCashCollection.findById(id);

    if (!collection) {
      return NextResponse.json(
        { success: false, error: "Cash collection not found" },
        { status: 404 },
      );
    }

    // Only allow deletion of submitted or rejected collections
    if (collection.status === "approved") {
      return NextResponse.json(
        { success: false, error: "Cannot delete approved collections" },
        { status: 400 },
      );
    }

    await DailyCashCollection.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "Cash collection deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting cash collection:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete cash collection" },
      { status: 500 },
    );
  }
}
