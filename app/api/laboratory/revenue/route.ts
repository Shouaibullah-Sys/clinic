// app/api/laboratory/revenue/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { LabTest } from "@/lib/models/LabTest";
import { authenticateRequest, canAccessLaboratory } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    // Authenticate the request
    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 }
      );
    }
    
    // Check if user can access laboratory
    if (!canAccessLaboratory(auth.userRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. You don't have permission to access revenue data." },
        { status: 403 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get("timeRange") || "month";
    
    console.log(`Revenue data requested by ${auth.userRole} ${auth.userName}`);
    
    // Calculate date ranges for chart data
    const now = new Date();
    const months = [];
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        month: date.toLocaleString('default', { month: 'short', year: 'numeric' }),
        start: date,
        end: new Date(date.getFullYear(), date.getMonth() + 1, 0)
      });
    }
    
    // Get revenue data for each month
    const revenueData = [];
    
    for (const month of months) {
      const revenue = await LabTest.aggregate([
        {
          $match: {
            orderedAt: { $gte: month.start, $lte: month.end },
            "charges.paymentStatus": "paid"
          }
        },
        {
          $group: {
            _id: null,
            revenue: { $sum: "$charges.totalAmount" }
          }
        }
      ]);
      
      const expenses = revenue[0]?.revenue ? revenue[0].revenue * 0.3 : 0; // 30% expenses
      const profit = revenue[0]?.revenue ? revenue[0].revenue - expenses : 0;
      
      revenueData.push({
        month: month.month,
        revenue: revenue[0]?.revenue || 0,
        expenses,
        profit
      });
    }
    
    return NextResponse.json({
      success: true,
      data: revenueData,
      timeRange
    });
    
  } catch (error: any) {
    console.error("Error fetching revenue data:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch revenue data" },
      { status: 500 }
    );
  }
}