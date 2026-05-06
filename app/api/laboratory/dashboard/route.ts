import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, canAccessLaboratory } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 },
      );
    }

    if (!auth.userRole || !canAccessLaboratory(auth.userRole)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Forbidden. You don't have permission to access laboratory dashboard.",
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

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalTestsToday,
      pendingCollection,
      completedToday,
      monthlyTests,
      urgentTests,
    ] = await Promise.all([
      prisma.labTest.count({
        where: { createdAt: { gte: todayStart } },
      }),
      prisma.labTest.count({
        where: { sampleCollected: false, status: { not: "cancelled" } },
      }),
      prisma.labTest.count({
        where: { status: "completed", sampleCollected: true, sampleDate: { gte: todayStart } },
      }),
      prisma.labTest.count({
        where: { createdAt: { gte: startDate } },
      }),
      prisma.labTest.count({
        where: { urgent: true, status: { notIn: ["completed", "cancelled", "reported"] } },
      }),
    ]);

    const completionRate = totalTestsToday > 0
      ? Math.round((completedToday / totalTestsToday) * 100)
      : 0;

    const collectionRate = totalTestsToday > 0
      ? Math.round(((totalTestsToday - pendingCollection) / totalTestsToday) * 100)
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        statistics: {
          totalTestsToday,
          pendingCollection,
          completedToday,
          monthlyTests,
          urgentTests,
          averageProcessingTime: 0,
          completionRate,
          collectionRate,
        },
        categories: [],
        volumeData: [],
        user: {
          name: auth.userName || "Unknown",
          role: auth.userRole,
        },
        timeRange: {
          selected: timeRange,
          startDate: startDate.toISOString(),
          endDate: now.toISOString(),
        },
      },
    });
  } catch (error: any) {
    console.error("Error fetching laboratory dashboard data:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch dashboard data",
      },
      { status: 500 },
    );
  }
}