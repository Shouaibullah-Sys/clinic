// app/api/laboratory/dashboard/route.ts (Simplified - No Financial Data)

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { LabTest } from "@/lib/models/LabTest";
import { authenticateRequest, canAccessLaboratory } from "@/lib/auth";
import mongoose from "mongoose";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    // Authenticate the request
    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 },
      );
    }

    // Safely check if user can access laboratory
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

    // Calculate date range
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

    // Build query
    const query: any = {
      orderedAt: { $gte: startDate },
    };

    // Get statistics - without financial data
    const [
      totalTestsToday,
      pendingCollection,
      pendingProcessing,
      pendingVerification,
      urgentTests,
      completedToday,
      monthlyTests,
      averageProcessingTime,
    ] = await Promise.all([
      // Total tests today
      LabTest.countDocuments({
        orderedAt: { $gte: new Date().setHours(0, 0, 0, 0) },
      }),

      // Pending collection
      LabTest.countDocuments({
        collectionStatus: "pending",
        status: { $ne: "cancelled" },
      }),

      // Pending processing
      LabTest.countDocuments({
        collectionStatus: "collected",
        processingStatus: "pending",
        status: { $ne: "cancelled" },
      }),

      // Pending verification
      LabTest.countDocuments({
        processingStatus: "completed",
        verificationStatus: "pending",
        status: { $ne: "cancelled" },
      }),

      // Urgent tests
      LabTest.countDocuments({
        priority: { $in: ["urgent", "emergency"] },
        status: { $nin: ["completed", "cancelled", "reported"] },
      }),

      // Completed today
      LabTest.countDocuments({
        status: "completed",
        "results.reportedAt": { $gte: new Date().setHours(0, 0, 0, 0) },
      }),

      // Monthly tests
      LabTest.countDocuments({
        orderedAt: { $gte: new Date(now.getFullYear(), now.getMonth(), 1) },
      }),

      // Average processing time (in hours) - simplified calculation
      LabTest.aggregate([
        {
          $match: {
            status: "completed",
            "results.reportedAt": { $exists: true },
            orderedAt: { $exists: true },
          },
        },
        {
          $addFields: {
            processingHours: {
              $divide: [
                { $subtract: ["$results.reportedAt", "$orderedAt"] },
                1000 * 60 * 60, // Convert milliseconds to hours
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            avgProcessingHours: { $avg: "$processingHours" },
          },
        },
      ]),
    ]);

    // Extract average processing time
    const avgProcessing = averageProcessingTime[0]?.avgProcessingHours || 0;

    // Get test categories
    const testCategories = await LabTest.aggregate([
      {
        $match: {
          orderedAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    // Get test volume data for chart
    const testVolume = await LabTest.aggregate([
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
      data: {
        statistics: {
          totalTestsToday,
          pendingCollection,
          pendingProcessing,
          pendingVerification,
          urgentTests,
          completedToday,
          monthlyTests,
          averageProcessingTime: Math.round(avgProcessing * 10) / 10,
          completionRate:
            totalTestsToday > 0
              ? Math.round((completedToday / totalTestsToday) * 100)
              : 0,
          collectionRate:
            totalTestsToday > 0
              ? Math.round(
                  ((totalTestsToday - pendingCollection) / totalTestsToday) *
                    100,
                )
              : 0,
        },
        categories: testCategories.map((cat) => ({
          name: cat._id || "Uncategorized",
          value: cat.count,
        })),
        volumeData: testVolume.map((item) => ({
          date: item._id,
          tests: item.tests,
          completed: item.completed,
        })),
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
