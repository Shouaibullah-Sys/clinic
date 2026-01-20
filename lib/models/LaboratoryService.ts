// lib/models/LaboratoryService.ts

import mongoose, { Schema, model, models, Document } from "mongoose";

export interface ILaboratoryService extends Document {
  labTestId: string;
  patient: mongoose.Types.ObjectId;
  department: mongoose.Types.ObjectId;
  testType: "hematology" | "biochemistry" | "microbiology" | "serology" | "histopathology" | "urinalysis" | "stool" | "hormone" | "immunology";
  testName: string;
  testCode: string;
  referringDoctor: mongoose.Types.ObjectId;
  requestedBy?: mongoose.Types.ObjectId;
  sampleType: "blood" | "urine" | "stool" | "sputum" | "tissue" | "fluid" | "swab";
  sampleCollectionTime?: Date;
  sampleReceivedTime?: Date;
  sampleCollectedBy?: mongoose.Types.ObjectId;
  sampleStatus: "pending" | "collected" | "received" | "processing" | "completed" | "rejected";
  priority: "routine" | "urgent" | "stat";
  parameters: {
    parameter: string;
    result?: string;
    unit?: string;
    normalRange: string;
    flag?: "low" | "normal" | "high" | "critical";
    method?: string;
    equipment?: string;
  }[];
  results: {
    test: string;
    value: string;
    unit: string;
    referenceRange: string;
    flag: "normal" | "low" | "high" | "critical";
    performedBy: mongoose.Types.ObjectId;
    performedAt: Date;
    verifiedBy?: mongoose.Types.ObjectId;
    verifiedAt?: Date;
    notes?: string;
  }[];
  status: "requested" | "sample_collected" | "sample_received" | "in_progress" | "completed" | "cancelled";
  reportStatus: "pending" | "generated" | "reviewed" | "approved" | "delivered";
  reportGeneratedBy?: mongoose.Types.ObjectId;
  reportGeneratedAt?: Date;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  reportUrl?: string;
  turnaroundTime: number; // in hours
  billingStatus: "pending" | "billed" | "paid";
  notes?: string;
  followUpNeeded: boolean;
  followUpNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LaboratoryServiceSchema = new Schema<ILaboratoryService>(
  {
    labTestId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    patient: {
      type: Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: "ServiceDepartment",
      required: true,
    },
    testType: {
      type: String,
      enum: ["hematology", "biochemistry", "microbiology", "serology", "histopathology", "urinalysis", "stool", "hormone", "immunology"],
      required: true,
    },
    testName: {
      type: String,
      required: true,
      trim: true,
    },
    testCode: {
      type: String,
      required: true,
      trim: true,
    },
    referringDoctor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    sampleType: {
      type: String,
      enum: ["blood", "urine", "stool", "sputum", "tissue", "fluid", "swab"],
      required: true,
    },
    sampleCollectionTime: {
      type: Date,
    },
    sampleReceivedTime: {
      type: Date,
    },
    sampleCollectedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    sampleStatus: {
      type: String,
      enum: ["pending", "collected", "received", "processing", "completed", "rejected"],
      default: "pending",
    },
    priority: {
      type: String,
      enum: ["routine", "urgent", "stat"],
      default: "routine",
    },
    parameters: [{
      parameter: { type: String, required: true },
      result: { type: String },
      unit: { type: String },
      normalRange: { type: String, required: true },
      flag: { type: String, enum: ["low", "normal", "high", "critical"] },
      method: { type: String },
      equipment: { type: String },
    }],
    results: [{
      test: { type: String, required: true },
      value: { type: String, required: true },
      unit: { type: String, required: true },
      referenceRange: { type: String, required: true },
      flag: { type: String, enum: ["normal", "low", "high", "critical"], required: true },
      performedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
      performedAt: { type: Date, default: Date.now },
      verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
      verifiedAt: { type: Date },
      notes: { type: String },
    }],
    status: {
      type: String,
      enum: ["requested", "sample_collected", "sample_received", "in_progress", "completed", "cancelled"],
      default: "requested",
    },
    reportStatus: {
      type: String,
      enum: ["pending", "generated", "reviewed", "approved", "delivered"],
      default: "pending",
    },
    reportGeneratedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    reportGeneratedAt: {
      type: Date,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: {
      type: Date,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: {
      type: Date,
    },
    reportUrl: {
      type: String,
    },
    turnaroundTime: {
      type: Number,
      default: 24, // hours
    },
    billingStatus: {
      type: String,
      enum: ["pending", "billed", "paid"],
      default: "pending",
    },
    notes: {
      type: String,
      trim: true,
    },
    followUpNeeded: {
      type: Boolean,
      default: false,
    },
    followUpNotes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
LaboratoryServiceSchema.index({ labTestId: 1 });
LaboratoryServiceSchema.index({ patient: 1 });
LaboratoryServiceSchema.index({ testType: 1 });
LaboratoryServiceSchema.index({ status: 1 });
LaboratoryServiceSchema.index({ reportStatus: 1 });
LaboratoryServiceSchema.index({ referringDoctor: 1 });

// Pre-save hook
LaboratoryServiceSchema.pre("save", function (next) {
  if (!this.labTestId) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000);
    this.labTestId = `LAB${year}${month}${random}`;
  }
  next();
});

export const LaboratoryService = models.LaboratoryService || model<ILaboratoryService>("LaboratoryService", LaboratoryServiceSchema);