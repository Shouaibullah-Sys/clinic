//lib/models/LabTest.ts

import mongoose, { Schema, model, models } from "mongoose";

export interface ILabTest extends mongoose.Document {
  testId: string;
  appointment: mongoose.Types.ObjectId;
  patient: mongoose.Types.ObjectId;
  testName: string;
  category: string;
  price: number;
  status: "pending" | "processing" | "completed" | "cancelled";
  orderedBy: mongoose.Types.ObjectId;
  orderedAt: Date;
  result?: string;
  completedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const labTestSchema = new Schema<ILabTest>(
  {
    testId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    appointment: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
    },
    patient: {
      type: Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    testName: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        "hematology",
        "biochemistry",
        "microbiology",
        "immunology",
        "urinalysis",
        "radiology",
        "other",
      ],
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "cancelled"],
      default: "pending",
    },
    orderedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orderedAt: {
      type: Date,
      default: Date.now,
    },
    result: {
      type: String,
      trim: true,
    },
    completedAt: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
labTestSchema.index({ testId: 1 });
labTestSchema.index({ appointment: 1 });
labTestSchema.index({ patient: 1 });
labTestSchema.index({ status: 1 });
labTestSchema.index({ orderedAt: -1 });
labTestSchema.index({ category: 1 });

// Compound indexes
labTestSchema.index({ appointment: 1, status: 1 });
labTestSchema.index({ patient: 1, status: 1 });

// Pre-save hooks
labTestSchema.pre("save", function (next) {
  // Generate test ID if not exists
  if (!this.testId) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const random = Math.floor(1000 + Math.random() * 9000);
    this.testId = `LAB${year}${month}${random}`;
  }
  next();
});

export const LabTest = models.LabTest || model<ILabTest>("LabTest", labTestSchema);