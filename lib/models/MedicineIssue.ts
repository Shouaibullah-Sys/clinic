// lib/models/MedicineIssue.ts
import mongoose, { Document, Schema } from "mongoose";

export interface IMedicineIssue extends Document {
  medicineId: mongoose.Types.ObjectId;
  quantity: number;
  issueDate: Date;
  issuedTo: string; // Patient name or department
  issuedBy: string; // Pharmacist name
  prescriptionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MedicineIssueSchema: Schema = new Schema(
  {
    medicineId: {
      type: Schema.Types.ObjectId,
      ref: "MedicineStock",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    issueDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    issuedTo: {
      type: String,
      required: true,
      trim: true,
    },
    issuedBy: {
      type: String,
      required: true,
      trim: true,
    },
    prescriptionId: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
MedicineIssueSchema.index({ issueDate: -1 });
MedicineIssueSchema.index({ medicineId: 1, issueDate: -1 });

export const MedicineIssue =
  mongoose.models.MedicineIssue ||
  mongoose.model<IMedicineIssue>("MedicineIssue", MedicineIssueSchema);
