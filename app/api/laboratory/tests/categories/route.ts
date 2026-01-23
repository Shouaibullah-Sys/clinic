// app/api/laboratory/tests/categories/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { LabTest } from "@/lib/models/LabTest";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";

async function verifyToken(token: string) {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    return null;
  }
}

// GET: Get test categories distribution
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    // Authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. No token provided." },
        { status: 401 }
      );
    }
    
    const token = authHeader.split(" ")[1];
    const payload = await verifyToken(token);
    
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token." },
        { status: 401 }
      );
    }
    
    const userId = payload.id as string;
    const userRole = payload.role as string;
    
    // Allow laboratory staff, admin, doctors, and receptionists
    const allowedRoles = ["lab_technician", "admin", "doctor", "receptionist"];
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. You don't have permission to access test categories." },
        { status: 403 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get("timeRange") || "month";
    
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
    if (userRole === "doctor") {
      baseQuery.doctor = userId;
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
    
    // Format category data for charts
    const categoryData = testsByCategory.map(cat => ({
      name: cat._id.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
      value: cat.count,
      revenue: cat.totalRevenue || 0,
      avgProcessingTime: cat.avgProcessingTime ? Math.round(cat.avgProcessingTime / (1000 * 60 * 60)) : 0 // Convert to hours
    }));
    
    // Format status data
    const statusData = testsByStatus.map(status => ({
      name: status._id.charAt(0).toUpperCase() + status._id.slice(1),
      value: status.count
    }));
    
    // Format priority data
    const priorityData = testsByPriority.map(priority => ({
      name: priority._id.charAt(0).toUpperCase() + priority._id.slice(1),
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
      { success: false, error: error.message || "Failed to fetch test categories" },
      { status: 500 }
    );
  }
}