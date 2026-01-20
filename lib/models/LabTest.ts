// lib/models/LabTest.ts
import mongoose, { Schema, model, models } from "mongoose";

export interface ILabTest extends mongoose.Document {
  testId: string;
  testName: string;
  testCode: string;
  category: string;
  description?: string;
  specimenType: "blood" | "urine" | "stool" | "tissue" | "saliva" | "other";
  preparationInstructions?: string;
  turnaroundTime: number; // in hours
  price: number;
  normalRange?: string;
  unit?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const labTestSchema = new Schema<ILabTest>(
  {
    testId: {
      type: String,
      required: true,
      unique: true,
    },
    testName: {
      type: String,
      required: true,
      trim: true,
    },
    testCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    category: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    specimenType: {
      type: String,
      enum: ["blood", "urine", "stool", "tissue", "saliva", "other"],
      required: true,
    },
    preparationInstructions: {
      type: String,
    },
    turnaroundTime: {
      type: Number,
      default: 24,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    normalRange: {
      type: String,
    },
    unit: {
      type: String,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
labTestSchema.index({ testId: 1 });
labTestSchema.index({ testCode: 1 });
labTestSchema.index({ testName: 1 });
labTestSchema.index({ category: 1 });
labTestSchema.index({ active: 1 });

// Pre-save hook
labTestSchema.pre("save", function (next) {
  if (!this.testId || this.isNew) {
    const random = Math.floor(10000 + Math.random() * 90000);
    this.testId = `TEST${random}`;
  }
  next();
});

export const LabTest = models.LabTest || model<ILabTest>("LabTest", labTestSchema);