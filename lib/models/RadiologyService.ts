// lib/models/RadiologyService.ts - For X-Ray, CT-Scan, MRI
import mongoose, { Schema, model, models, Document } from "mongoose";

export interface IRadiologyService extends Document {
  serviceId: string;
  patient: mongoose.Types.ObjectId;
  department: mongoose.Types.ObjectId;
  serviceType: "x-ray" | "ct-scan" | "mri" | "ultrasound";
  bodyPart: string;
  view: string;
  contrastUsed?: boolean;
  contrastType?: string;
  referringDoctor: mongoose.Types.ObjectId;
  radiologist: mongoose.Types.ObjectId;
  technician: mongoose.Types.ObjectId;
  appointment: mongoose.Types.ObjectId;
  requestDate: Date;
  scheduledDate: Date;
  performedDate?: Date;
  images: {
    imageId: string;
    imageUrl: string;
    view: string;
    description?: string;
    takenAt: Date;
    takenBy: mongoose.Types.ObjectId;
  }[];
  findings: string;
  impression: string;
  recommendations?: string;
  reportStatus: "pending" | "completed" | "reviewed" | "approved";
  reportGeneratedBy?: mongoose.Types.ObjectId;
  reportGeneratedAt?: Date;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  priority: "routine" | "urgent" | "emergency";
  status: "scheduled" | "in-progress" | "completed" | "cancelled";
  billingStatus: "pending" | "billed" | "paid";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RadiologyServiceSchema = new Schema<IRadiologyService>(
  {
    serviceId: {
      type: String,
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
    },
    serviceType: {
      type: String,
      enum: ["x-ray", "ct-scan", "mri", "ultrasound"],
      required: true,
    },
    bodyPart: {
      type: String,
      required: true,
      trim: true,
    },
    view: {
      type: String,
      required: true,
      trim: true,
    },
    contrastUsed: {
      type: Boolean,
      default: false,
    },
    contrastType: {
      type: String,
      trim: true,
    },
    referringDoctor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    radiologist: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    technician: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    appointment: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
    },
    requestDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    scheduledDate: {
      type: Date,
      required: true,
    },
    performedDate: {
      type: Date,
    },
    images: [{
      imageId: { type: String, required: true },
      imageUrl: { type: String, required: true },
      view: { type: String, required: true },
      description: { type: String },
      takenAt: { type: Date, default: Date.now },
      takenBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    }],
    findings: {
      type: String,
      trim: true,
    },
    impression: {
      type: String,
      trim: true,
    },
    recommendations: {
      type: String,
      trim: true,
    },
    reportStatus: {
      type: String,
      enum: ["pending", "completed", "reviewed", "approved"],
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
    priority: {
      type: String,
      enum: ["routine", "urgent", "emergency"],
      default: "routine",
    },
    status: {
      type: String,
      enum: ["scheduled", "in-progress", "completed", "cancelled"],
      default: "scheduled",
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
  },
  {
    timestamps: true,
  }
);

// Indexes
RadiologyServiceSchema.index({ patient: 1 });
RadiologyServiceSchema.index({ serviceType: 1 });
RadiologyServiceSchema.index({ scheduledDate: -1 });
RadiologyServiceSchema.index({ status: 1 });
RadiologyServiceSchema.index({ referringDoctor: 1 });

// Pre-save hook
RadiologyServiceSchema.pre("save", function (next) {
  if (!this.serviceId) {
    const prefixMap = {
      "x-ray": "XRAY",
      "ct-scan": "CT",
      "mri": "MRI",
      "ultrasound": "US",
    };
    const prefix = prefixMap[this.serviceType] || "RAD";
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000);
    this.serviceId = `${prefix}${year}${month}${random}`;
  }
  next();
});

export const RadiologyService = models.RadiologyService || model<IRadiologyService>("RadiologyService", RadiologyServiceSchema);