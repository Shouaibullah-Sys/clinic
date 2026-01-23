// app/api/laboratory/tests/categories/route.ts

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
    if (!auth.userRole || !canAccessLaboratory(auth.userRole)) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Forbidden. You don't have permission to access test categories." 
        },
        { status: 403 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get("timeRange") || "month";
    
    console.log(`Test categories requested by ${auth.userRole} ${auth.userName}`);
    
    let dateFilter: any = {};
    const now = new Date();
    
    // Set date range based on timeRange
    switch (timeRange) {
      case "today":
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        dateFilter.orderedAt = { $gte: today };
        break;
      case "week":
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        dateFilter.orderedAt = { $gte: weekAgo };
        break;
      case "month":
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        dateFilter.orderedAt = { $gte: monthAgo };
        break;
      case "quarter":
        const quarterAgo = new Date();
        quarterAgo.setMonth(quarterAgo.getMonth() - 3);
        dateFilter.orderedAt = { $gte: quarterAgo };
        break;
      case "year":
        const yearAgo = new Date();
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        dateFilter.orderedAt = { $gte: yearAgo };
        break;
    }
    
    // Base query
    let baseQuery: any = { ...dateFilter, status: { $ne: "cancelled" } };
    
    // If doctor is viewing, only show their tests
    if (auth.userRole === "doctor") {
      baseQuery.doctor = auth.userId;
    }
    
    // Get tests grouped by category
    const testsByCategory = await LabTest.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          totalRevenue: { $sum: "$charges.totalAmount" },
          avgProcessingTime: { $avg: { $subtract: ["$completedAt", "$orderedAt"] } }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    // Get status distribution
    const testsByStatus = await LabTest.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    // Get priority distribution
    const testsByPriority = await LabTest.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: "$priority",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    // Format category data for charts with safe null handling
    const categoryData = testsByCategory.map(cat => ({
      name: cat._id 
        ? cat._id.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
        : "Uncategorized",
      value: cat.count,
      revenue: cat.totalRevenue || 0,
      avgProcessingTime: cat.avgProcessingTime ? Math.round(cat.avgProcessingTime / (1000 * 60 * 60)) : 0 // Convert to hours
    }));
    
    // Format status data with safe null handling
    const statusData = testsByStatus.map(status => ({
      name: status._id 
        ? status._id.charAt(0).toUpperCase() + status._id.slice(1)
        : "Unknown",
      value: status.count
    }));
    
    // Format priority data with safe null handling - FIXED THIS LINE
    const priorityData = testsByPriority.map(priority => ({
      name: priority._id 
        ? priority._id.charAt(0).toUpperCase() + priority._id.slice(1)
        : "Not Specified",
      value: priority.count
    }));
    
    return NextResponse.json({
      success: true,
      data: {
        categoryData,
        statusData,
        priorityData,
        summary: {
          totalCategories: testsByCategory.length,
          totalTests: testsByCategory.reduce((sum, cat) => sum + cat.count, 0),
          totalRevenue: testsByCategory.reduce((sum, cat) => sum + (cat.totalRevenue || 0), 0),
          timeRange
        }
      }
    });
    
  } catch (error: any) {
    console.error("Error fetching test categories:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Failed to fetch test categories",
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}