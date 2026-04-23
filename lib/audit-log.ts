import dbConnect from "@/lib/dbConnect";
import { APILog } from "@/lib/models/APILog";

type AuditPayload = {
  action: string;
  entityType: string;
  entityId?: string;
  userId?: string;
  userRole?: string;
  userName?: string;
  changes?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  [key: string]: unknown;
};

export async function createAuditLog(payload: AuditPayload): Promise<void> {
  try {
    await dbConnect();

    await APILog.create({
      userId: payload.userId || "system",
      activityType: "audit",
      metadata: payload,
      ipAddress: payload.ipAddress || "127.0.0.1",
      userAgent: payload.userAgent || "server",
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
}

