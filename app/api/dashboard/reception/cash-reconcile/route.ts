import { NextRequest, NextResponse } from "next/server";
import  dbConnect  from "@/lib/dbConnect";
import { CashReconciliation } from "@/lib/models/CashReconciliation";

// PUT: Update cash reconciliation
export async function PUT(request: NextRequest) {
  try {
    await dbConnect();
    
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");
    
    if (!userId || !userRole) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    if (!["admin", "receptionist"].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { cashCount, notes } = body;
    
    if (!cashCount) {
      return NextResponse.json(
        { success: false, error: "Cash count is required" },
        { status: 400 }
      );
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Find or create cash reconciliation for today
    let reconciliation = await CashReconciliation.findOne({
      date: { $gte: today },
      reconciledBy: userId
    });
    
    if (reconciliation) {
      // Update existing reconciliation
      reconciliation.cashCount = parseFloat(cashCount);
      reconciliation.notes = notes;
      reconciliation.reconciledAt = new Date();
      await reconciliation.save();
    } else {
      // Create new reconciliation
      reconciliation = await CashReconciliation.create({
        date: new Date(),
        cashCount: parseFloat(cashCount),
        notes,
        reconciledBy: userId,
        reconciledAt: new Date()
      });
    }
    
    return NextResponse.json({
      success: true,
      data: {
        id: reconciliation._id.toString(),
        date: reconciliation.date,
        cashCount: reconciliation.cashCount,
        reconciledAt: reconciliation.reconciledAt
      },
      message: "Cash reconciliation updated successfully"
    });
    
  } catch (error) {
    console.error("Error updating cash reconciliation:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update cash reconciliation" },
      { status: 500 }
    );
  }
}

// GET: Get cash reconciliation for today
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");
    
    if (!userId || !userRole) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    if (!["admin", "receptionist"].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const reconciliation = await CashReconciliation.findOne({
      date: { $gte: today },
      reconciledBy: userId
    }).populate("reconciledBy", "name");
    
    return NextResponse.json({
      success: true,
      data: reconciliation || null
    });
    
  } catch (error) {
    console.error("Error fetching cash reconciliation:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch cash reconciliation" },
      { status: 500 }
    );
  }
}