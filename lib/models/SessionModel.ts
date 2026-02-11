// lib/models/SessionModel.ts
import mongoose, { Schema, model, models, Document } from "mongoose";

export interface ISession extends Document {
  id: string;
  userId: string;
  userRole: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SessionSchema = new Schema<ISession>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: String,
      required: true,
    },
    userRole: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
SessionSchema.index({ id: 1 });
SessionSchema.index({ userId: 1 });
SessionSchema.index({ expiresAt: 1 });

export const SessionModel =
  models.SessionModel || model<ISession>("SessionModel", SessionSchema);
