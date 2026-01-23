// app/api/laboratory/revenue/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { LabTest } from "@/lib/models/LabTest";
import { jwtVerify } from "jose";
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, format, eachMonthOfInterval, subMonths } from "date-fns";

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

// GET: Get revenue data for charts
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
        { success: false, error: "Forbidden. You don't have permission to access revenue data." },
        { status: 403 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get("timeRange") || "month";
    
    let startDate: Date;
    let endDate: Date = new Date();
    
    // Set date range based on timeRange
    switch (timeRange) {
      case "today":
        startDate = startOfDay(new Date());
        endDate = endOfDay(new Date());
        break;
      case "week":
        startDate = startOfWeek(new Date(), { weekStartsOn: 1 });
        endDate = endOfWeek(new Date(), { weekStartsOn: 1 });
        break;
      case "month":
        startDate = startOfMonth(new Date());
        endDate = endOfMonth(new Date());
        break;
      case "quarter":
        startDate = subMonths(new Date(), 3);
        break;
      case "year":
        startDate = subMonths(new Date(), 12);
        break;
      default:
        startDate = subMonths(new Date(), 12); // Default to 1 year
    }
    
    // Base query
    let baseQuery: any = {
      "charges.paymentStatus": "paid",
      "charges.paymentDate": { $gte: startDate, $lte: endDate },
      status: { $ne: "cancelled" }
    };
    
    // If doctor is viewing, only show their tests
    if (userRole === "doctor") {
      baseQuery.doctor = userId;
    }
    
    // Get paid lab tests within date range
    const paidTests = await LabTest.find(baseQuery)
      .select("charges.totalAmount charges.paymentDate testName category")
      .lean();
    
    // Group revenue by month
    const monthlyRevenue: Record<string, number> = {};
    const monthlyTests: Record<string, number> = {};
    const categoryRevenue: Record<string, number> = {};
    
    paidTests.forEach(test => {
      const month = format(new Date(test.charges.paymentDate!), "MMM yyyy");
      monthlyRevenue[month] = (monthlyRevenue[month] || 0) + test.charges.totalAmount;
      monthlyTests[month] = (monthlyTests[month] || 0) + 1;
      
      // Track revenue by category
      categoryRevenue[test.category] = (categoryRevenue[test.category] || 0) + test.charges.totalAmount;
    });
    
    // Get all months in the range
    const months = eachMonthOfInterval({ start: startDate, end: endDate });
    
    // Prepare monthly data
    const monthlyData = months.map(month => {
      const monthKey = format(month, "MMM yyyy");
      const revenue = monthlyRevenue[monthKey] || 0;
      const testCount = monthlyTests[monthKey] || 0;
      
      // Calculate estimated expenses (30% of revenue for lab operations)
      const expenses = revenue * 0.3;
      const profit = revenue - expenses;
      
      return {
        month: monthKey,
        revenue: Math.round(revenue),
        expenses: Math.round(expenses),
        profit: Math.round(profit),
        testCount
      };
    });
    
    // Prepare category data for pie chart
    const categoryData = Object.entries(categoryRevenue).map(([name, value]) => ({
      name,
      value: Math.round(value)
    })).sort((a, b) => b.value - a.value).slice(0, 10); // Top 10 categories
    
    // Calculate summary statistics
    const totalRevenue = paidTests.reduce((sum, test) => sum + test.charges.totalAmount, 0);
    const totalTests = paidTests.length;
    const avgRevenuePerTest = totalTests > 0 ? totalRevenue / totalTests : 0;
    
    return NextResponse.json({
      success: true,
      data: {
        monthlyData,
        categoryData,
        summary: {
          totalRevenue: Math.round(totalRevenue),
          totalTests,
          avgRevenuePerTest: Math.round(avgRevenuePerTest),
          timeRange
        }
      }
    });
    
  } catch (error: any) {
    console.error("Error fetching revenue data:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch revenue data" },
      { status: 500 }
    );
  }
}