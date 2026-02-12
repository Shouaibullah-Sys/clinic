    // lib/models/CashAudit.ts - For periodic cash audits
import mongoose, { Schema, model, models, Document } from "mongoose";
import { IUser } from "./User";

export interface ICashAudit extends Document {
  auditId: string;
  auditor: mongoose.Types.ObjectId | IUser;
  auditorName: string;
  auditDate: Date;
  cashier: mongoose.Types.ObjectId | IUser;
  cashierName: string;
  
  // Cash counts
  expectedAmount: number;
  actualAmount: number;
  variance: number;
  
  denominations: {
    thousand: number;
    fiveHundred: number;
    twoHundred: number;
    oneHundred: number;
    fifty: number;
    twenty: number;
    ten: number;
    five: number;
    two: number;
    one: number;
    half: number;
    quarter: number;
    tenCents: number;
    fiveCents: number;
  };
  
  // Findings
  findings: string;
  recommendations: string;
  status: "pending" | "completed" | "follow_up" | "resolved";
  followUpDate?: Date;
  resolvedBy?: mongoose.Types.ObjectId | IUser;
  resolutionNotes?: string;
  
  supportingDocs?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const CashAuditSchema = new Schema<ICashAudit>(
  {
    auditId: {
      type: String,
      required: true,
      unique: true,
    },
    auditor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    auditorName: {
      type: String,
      required: true,
    },
    auditDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    cashier: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    cashierName: {
      type: String,
      required: true,
    },
    expectedAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    actualAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    variance: {
      type: Number,
      default: 0,
    },
    denominations: {
      thousand: { type: Number, default: 0, min: 0 },
      fiveHundred: { type: Number, default: 0, min: 0 },
      twoHundred: { type: Number, default: 0, min: 0 },
      oneHundred: { type: Number, default: 0, min: 0 },
      fifty: { type: Number, default: 0, min: 0 },
      twenty: { type: Number, default: 0, min: 0 },
      ten: { type: Number, default: 0, min: 0 },
      five: { type: Number, default: 0, min: 0 },
      two: { type: Number, default: 0, min: 0 },
      one: { type: Number, default: 0, min: 0 },
      half: { type: Number, default: 0, min: 0 },
      quarter: { type: Number, default: 0, min: 0 },
      tenCents: { type: Number, default: 0, min: 0 },
      fiveCents: { type: Number, default: 0, min: 0 },
    },
    findings: {
      type: String,
    },
    recommendations: {
      type: String,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "follow_up", "resolved"],
      default: "pending",
    },
    followUpDate: {
      type: Date,
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    resolutionNotes: {
      type: String,
    },
    supportingDocs: [{
      type: String,
    }],
  },
  {
    timestamps: true,
  }
);

CashAuditSchema.index({ auditor: 1 });
CashAuditSchema.index({ cashier: 1 });
CashAuditSchema.index({ auditDate: -1 });
CashAuditSchema.index({ variance: 1 });

// Pre-save hook    
CashAuditSchema.pre("save", function (next) {
  if (!this.auditId) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const random = Math.floor(1000 + Math.random() * 9000);
    this.auditId = `AUDIT${year}${month}${random}`;
  }
  
  // Calculate variance
  this.variance = this.actualAmount - this.expectedAmount;
  
  next();
});

export const CashAudit = models.CashAudit || model<ICashAudit>("CashAudit", CashAuditSchema);
