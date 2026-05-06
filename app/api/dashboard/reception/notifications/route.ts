// app/api/dashboard/reception/notifications/route.ts

import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 },
      );
    }

    // Mock notifications - in a real app, this would query notifications table
    const mockNotifications = [
      {
        id: "1",
        type: "warning" as const,
        title: "High Patient Volume",
        message: "Current waiting time has exceeded 20 minutes",
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        actionUrl: "/reception/checkin",
        actionText: "Manage Queue",
      },
      {
        id: "2",
        type: "info" as const,
        title: "Daily Cash Reconciliation",
        message: "Remember to reconcile cash balance before closing",
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        actionUrl: "/reception/cash",
        actionText: "Reconcile",
      },
      {
        id: "3",
        type: "success" as const,
        title: "System Backup Completed",
        message: "Daily backup completed successfully at 2:00 AM",
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      },
    ];

    return NextResponse.json({
      success: true,
      data: mockNotifications,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch notifications" },
      { status: 500 },
    );
  }
}