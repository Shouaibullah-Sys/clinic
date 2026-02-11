// lib/middleware/activity-logger.ts
import { NextRequest } from "next/server";

export interface ActivityLog {
  userId: string;
  activityType: string;
  description: string;
  entityType: string;
  ipAddress: string;
  userAgent: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export class ActivityLogger {
  private static instance: ActivityLogger;
  private logs: ActivityLog[] = [];
  private readonly MAX_LOGS = 1000; // Keep last 1000 logs in memory

  private constructor() {}

  static getInstance(): ActivityLogger {
    if (!ActivityLogger.instance) {
      ActivityLogger.instance = new ActivityLogger();
    }
    return ActivityLogger.instance;
  }

  async log(
    request: NextRequest,
    activityType: string,
    description: string,
    entityType: string,
    userId?: string,
    metadata?: Record<string, any>,
  ) {
    try {
      // Extract IP address from headers
      const ipAddress =
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        "unknown";

      const userAgent = request.headers.get("user-agent") || "unknown";
      const path = request.nextUrl.pathname;
      const method = request.method;

      const log: ActivityLog = {
        userId: userId || "system",
        activityType,
        description,
        entityType,
        ipAddress,
        userAgent,
        metadata: {
          ...metadata,
          path,
          method,
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date(),
      };

      // Store in memory for quick access
      this.logs.unshift(log);
      if (this.logs.length > this.MAX_LOGS) {
        this.logs.pop();
      }

      // Persist to database in background
      this.persistToDatabase(log);

      return log;
    } catch (error) {
      console.error("Failed to log activity:", error);
    }
  }

  private async persistToDatabase(log: ActivityLog) {
    try {
      // Send to API for logging
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/log/activity`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(log),
      });
    } catch (error) {
      console.error("Failed to persist activity log:", error);
    }
  }

  getLogs(limit: number = 100): ActivityLog[] {
    return this.logs.slice(0, limit);
  }

  getLogsByUser(userId: string, limit: number = 50): ActivityLog[] {
    return this.logs.filter((log) => log.userId === userId).slice(0, limit);
  }

  getLogsByType(activityType: string, limit: number = 50): ActivityLog[] {
    return this.logs
      .filter((log) => log.activityType === activityType)
      .slice(0, limit);
  }

  clearOldLogs(olderThanDays: number = 7) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);

    this.logs = this.logs.filter((log) => log.timestamp > cutoff);
  }
}

// Service activity tracking
export class ServiceActivityTracker {
  static async trackServiceAccess(
    request: NextRequest,
    serviceType: string,
    action: string,
    userId: string,
    resourceId?: string,
  ) {
    const logger = ActivityLogger.getInstance();

    await logger.log(
      request,
      "service_access",
      `${action} ${serviceType} ${resourceId ? `(${resourceId})` : ""}`,
      "Service",
      userId,
      {
        service: serviceType,
        action,
        resourceId,
        endpoint: request.nextUrl.pathname,
      },
    );
  }

  static async trackServiceError(
    request: NextRequest,
    serviceType: string,
    action: string,
    userId: string,
    error: Error,
    resourceId?: string,
  ) {
    const logger = ActivityLogger.getInstance();

    await logger.log(
      request,
      "service_error",
      `Failed to ${action} ${serviceType}: ${error.message}`,
      "Service",
      userId,
      {
        service: serviceType,
        action,
        resourceId,
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
    );
  }

  static async trackDataChange(
    request: NextRequest,
    serviceType: string,
    action: string,
    userId: string,
    resourceId: string,
    changes: any,
    previousState?: any,
  ) {
    const logger = ActivityLogger.getInstance();

    await logger.log(
      request,
      "data_change",
      `${action}d ${serviceType} record ${resourceId}`,
      "Service",
      userId,
      {
        service: serviceType,
        action,
        resourceId,
        changes,
        previousState,
        endpoint: request.nextUrl.pathname,
      },
    );
  }
}
