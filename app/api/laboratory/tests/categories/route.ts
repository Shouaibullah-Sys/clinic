// app/api/laboratory/tests/categories/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenPayload } from "@/lib/auth/jwt";

export async function GET(request: NextRequest) {
  try {
    const payload = await getTokenPayload(request);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const allowedRoles = ["admin", "doctor", "lab_technician", "radiologist", "receptionist"];
    if (!allowedRoles.includes(payload.role)) {
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
    
    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    
    switch (timeRange) {
      case "today":
        startDate.setHours(0, 0, 0, 0);
        break;
      case "week":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case "quarter":
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case "year":
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(startDate.getMonth() - 1);
    }

    // Build query
    const where: any = {
      createdAt: { gte: startDate },
      status: { not: "cancelled" },
    };

    // If doctor is viewing, only show their tests
    if (payload.role === "doctor") {
      where.doctorId = payload.id;
    }

    // Get tests
    const tests = await prisma.labTest.findMany({
      where,
      select: {
        category: true,
        status: true,
        priority: true,
        charges: true,
        createdAt: true,
      },
    });

    // Process data manually (Prisma doesn't have aggregate pipeline like MongoDB)
    const categoryMap = new Map<string, { count: number; totalRevenue: number }>();
    const statusMap = new Map<string, number>();
    const priorityMap = new Map<string, number>();

    tests.forEach(test => {
      // Category aggregation
      const cat = test.category || "Uncategorized";
      const existing = categoryMap.get(cat) || { count: 0, totalRevenue: 0 };
      existing.count += 1;
      const charges = JSON.parse(test.charges || '{"totalAmount": 0}');
      existing.totalRevenue += charges.totalAmount || 0;
      categoryMap.set(cat, existing);

      // Status aggregation
      const status = test.status || "Unknown";
      statusMap.set(status, (statusMap.get(status) || 0) + 1);

      // Priority aggregation
      const priority = test.priority || "Not Specified";
      priorityMap.set(priority, (priorityMap.get(priority) || 0) + 1);
    });

    // Format category data
    const categoryData = Array.from(categoryMap.entries()).map(([name, data]) => ({
      name: name.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      value: data.count,
      revenue: data.totalRevenue,
    })).sort((a, b) => b.value - a.value);

    // Format status data
    const statusData = Array.from(statusMap.entries()).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    })).sort((a, b) => b.value - a.value);

    // Format priority data
    const priorityData = Array.from(priorityMap.entries()).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    })).sort((a, b) => b.value - a.value);

    const totalTests = tests.length;
    const totalRevenue = tests.reduce((sum, test) => {
      const charges = JSON.parse(test.charges || '{"totalAmount": 0}');
      return sum + (charges.totalAmount || 0);
    }, 0);

    return NextResponse.json({
      success: true,
      data: {
        categoryData,
        statusData,
        priorityData,
        summary: {
          totalCategories: categoryMap.size,
          totalTests,
          totalRevenue,
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
      },
      { status: 500 }
    );
  }
}