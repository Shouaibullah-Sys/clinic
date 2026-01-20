// lib/api/log/activity/route.ts - Activity logging endpoint
import { NextRequest, NextResponse } from "next/server";
import { ActivityLog } from "@/lib/middleware/activity-logger";
import dbConnect from "@/lib/dbConnect";

// Define ActivityLog schema
const activityLogSchema = {
  userId: String,
  activityType: String,
  description: String,
  entityType: String,
  ipAddress: String,
  userAgent: String,
  metadata: Object,
  timestamp: Date,
};

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const logData: ActivityLog = await request.json();
    
    // Store in database
    // const savedLog = await ActivityLogModel.create(logData);
    
    console.log("Activity logged:", {
      userId: logData.userId,
      activityType: logData.activityType,
      description: logData.description,
      timestamp: logData.timestamp,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to log activity:", error);
    return NextResponse.json(
      { error: "Failed to log activity" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // For admin dashboard - get activity logs
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    const activityType = searchParams.get("type");
    const limit = parseInt(searchParams.get("limit") || "100");

    // In production, fetch from database
    // const query: any = {};
    // if (userId) query.userId = userId;
    // if (activityType) query.activityType = activityType;
    // const logs = await ActivityLogModel.find(query)
    //   .sort({ timestamp: -1 })
    //   .limit(limit);

    // For now, return empty array
    return NextResponse.json({ logs: [] });
  } catch (error) {
    console.error("Failed to fetch activity logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity logs" },
      { status: 500 }
    );
  }
}