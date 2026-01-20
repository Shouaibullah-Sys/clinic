// lib/models/TestResult.ts
import mongoose, { Schema, model, models } from "mongoose";

export interface ITestResult extends mongoose.Document {
  resultId: string;
  patient: mongoose.Types.ObjectId;
  test: mongoose.Types.ObjectId;
  requestedBy: mongoose.Types.ObjectId;
  medicalRecord?: mongoose.Types.ObjectId;
  requestDate: Date;
  collectionDate?: Date;
  receivedDate?: Date;
  completedDate?: Date;
  specimenNumber: string;
  results: {
    parameter: string;
    value: string;
    unit?: string;
    normalRange?: string;
    flag?: "normal" | "low" | "high" | "critical";
  }[];
  notes?: string;
  status: "pending" | "collected" | "processing" | "completed" | "cancelled";
  performedBy?: mongoose.Types.ObjectId;
  verifiedBy?: mongoose.Types.ObjectId;
  verifiedDate?: Date;
  attachment?: string;
  createdAt: Date;
  updatedAt: Date;
}

const testResultSchema = new Schema<ITestResult>(
  {
    resultId: {
      type: String,
      required: true,
      unique: true,
    },
    patient: {
      type: Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    test: {
      type: Schema.Types.ObjectId,
      ref: "LabTest",
      required: true,
    },
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    medicalRecord: {
      type: Schema.Types.ObjectId,
      ref: "MedicalRecord",
    },
    requestDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    collectionDate: {
      type: Date,
    },
    receivedDate: {
      type: Date,
    },
    completedDate: {
      type: Date,
    },
    specimenNumber: {
      type: String,
      required: true,
    },
    results: [{
      parameter: { type: String, required: true },
      value: { type: String, required: true },
      unit: { type: String },
      normalRange: { type: String },
      flag: { type: String, enum: ["normal", "low", "high", "critical"] },
    }],
    notes: {
      type: String,
    },
    status: {
      type: String,
      enum: ["pending", "collected", "processing", "completed", "cancelled"],
      default: "pending",
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    verifiedDate: {
      type: Date,
    },
    attachment: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
testResultSchema.index({ resultId: 1 });
testResultSchema.index({ patient: 1 });
testResultSchema.index({ test: 1 });
testResultSchema.index({ requestDate: -1 });
testResultSchema.index({ status: 1 });
testResultSchema.index({ specimenNumber: 1 });

// Pre-save hook
testResultSchema.pre("save", function (next) {
  if (!this.resultId || this.isNew) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000);
    this.resultId = `RES${year}${month}${random}`;
  }
  
  if (!this.specimenNumber) {
    const random = Math.floor(100000 + Math.random() * 900000);
    this.specimenNumber = `SP${random}`;
  }
  
  next();
});

export const TestResult = models.TestResult || model<ITestResult>("TestResult", testResultSchema);