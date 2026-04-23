// lib/models/APILog.ts

import mongoose, { Schema, Document } from "mongoose";

export interface IAPILog extends Document {
  userId: string;
  activityType: string;
  metadata: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

const APILogSchema = new Schema<IAPILog>({
  userId: {
    type: String,
    required: true,
  },
  activityType: {
    type: String,
    required: true,
    enum: [
      "api_request",
      "unauthorized",
      "validation_error",
      "authentication",
      "authorization",
      "service_access",
      "service_error",
      "data_change",
      "audit",
    ],
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },
  ipAddress: {
    type: String,
    required: true,
  },
  userAgent: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Create indexes for efficient querying
APILogSchema.index({ userId: 1, timestamp: -1 });
APILogSchema.index({ activityType: 1, timestamp: -1 });

export const APILog =
  mongoose.models.APILog || mongoose.model<IAPILog>("APILog", APILogSchema);
