// app/api/laboratory/tests/volume/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { LabTest } from "@/lib/models/LabTest";
import { authenticateRequest, canAccessLaboratory } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

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

    const volume = await LabTest.aggregate([
      {
        $match: {
          orderedAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$orderedAt" },
          },
          tests: { $sum: 1 },
          completed: {
            $sum: {
              $cond: [{ $eq: ["$status", "completed"] }, 1, 0],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 30 },
    ]);

    return NextResponse.json({
      success: true,
      data: volume.map((item) => ({
        date: item._id,
        tests: item.tests,
        completed: item.completed,
      })),
    });
  } catch (error: any) {
    console.error("Error fetching test volume:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch test volume",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}
