// app/api/laboratory/tests/volume/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenPayload } from "@/lib/auth/jwt";

export async function GET(request: NextRequest) {
  try {
    const payload = await getTokenPayload(request);
    
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const allowedRoles = ["admin", "doctor", "lab_technician", "radiologist", "receptionist"];
    if (!allowedRoles.includes(payload.role)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Forbidden. You don't have permission to access test volume data.",
        },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get("timeRange") || "month";

    const now = new Date();
    let startDate = new Date();

    switch (timeRange) {
      case "today":
        startDate.setHours(0, 0, 0, 0);
        break;
      case "week":
        startDate.setDate(now.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(now.getMonth() - 1);
        break;
      case "quarter":
        startDate.setMonth(now.getMonth() - 3);
        break;
      case "year":
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(now.getMonth() - 1);
    }

    // Get lab tests and aggregate in JavaScript
    const tests = await prisma.labTest.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      select: {
        createdAt: true,
        status: true,
      },
    });

    // Group by date
    const volumeMap = new Map<string, { tests: number; completed: number }>();
    
    tests.forEach(test => {
      const date = test.createdAt.toISOString().split('T')[0];
      const existing = volumeMap.get(date) || { tests: 0, completed: 0 };
      existing.tests += 1;
      if (test.status === 'completed') {
        existing.completed += 1;
      }
      volumeMap.set(date, existing);
    });

    const volume = Array.from(volumeMap.entries()).map(([date, data]) => ({
      date,
      tests: data.tests,
      completed: data.completed,
    })).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 30);

    return NextResponse.json({
      success: true,
      data: volume,
    });
  } catch (error: any) {
    console.error("Error fetching test volume:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch test volume",
      },
      { status: 500 },
    );
  }
}