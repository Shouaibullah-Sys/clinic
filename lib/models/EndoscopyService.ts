// lib/models/EndoscopyService.ts

import mongoose, { Schema, model, models, Document } from "mongoose";

export interface IEndoscopyService extends Document {
  endoscopyId: string;
  patient: mongoose.Types.ObjectId;
  department: mongoose.Types.ObjectId;
  procedureType: "gastroscopy" | "colonoscopy" | "ercp" | "sigmoidoscopy" | "capsule_endoscopy";
  referringDoctor: mongoose.Types.ObjectId;
  gastroenterologist: mongoose.Types.ObjectId;
  anesthetist?: mongoose.Types.ObjectId;
  nurse?: mongoose.Types.ObjectId;
  indication: string;
  preparation: string;
  sedationUsed: boolean;
  sedationType?: "conscious" | "deep" | "general";
  scopeType: string;
  scopeSerialNumber: string;
  findings: string;
  biopsies: {
    site: string;
    number: number;
    sentToLab: boolean;
    labReportId?: string;
  }[];
  polyps: {
    location: string;
    size: number;
    removed: boolean;
    removalMethod?: string;
    sentToHistology: boolean;
  }[];
  therapeuticProcedures: {
    procedure: string;
    details: string;
  }[];
  complications?: string;
  postProcedureInstructions: string;
  followUpRequired: boolean;
  followUpDate?: Date;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  billingStatus: "pending" | "billed" | "paid";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EndoscopyServiceSchema = new Schema<IEndoscopyService>(
  {
    endoscopyId: {
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
    procedureType: {
      type: String,
      enum: ["gastroscopy", "colonoscopy", "ercp", "sigmoidoscopy", "capsule_endoscopy"],
      required: true,
    },
    referringDoctor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    gastroenterologist: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    anesthetist: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    nurse: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    indication: {
      type: String,
      required: true,
      trim: true,
    },
    preparation: {
      type: String,
      trim: true,
    },
    sedationUsed: {
      type: Boolean,
      default: true,
    },
    sedationType: {
      type: String,
      enum: ["conscious", "deep", "general"],
    },
    scopeType: {
      type: String,
      required: true,
      trim: true,
    },
    scopeSerialNumber: {
      type: String,
      required: true,
      trim: true,
    },
    findings: {
      type: String,
      required: true,
      trim: true,
    },
    biopsies: [{
      site: { type: String, required: true },
      number: { type: Number, required: true, min: 1 },
      sentToLab: { type: Boolean, default: false },
      labReportId: { type: String },
    }],
    polyps: [{
      location: { type: String, required: true },
      size: { type: Number, required: true, min: 0 },
      removed: { type: Boolean, default: false },
      removalMethod: { type: String },
      sentToHistology: { type: Boolean, default: false },
    }],
    therapeuticProcedures: [{
      procedure: { type: String, required: true },
      details: { type: String, required: true },
    }],
    complications: {
      type: String,
      trim: true,
    },
    postProcedureInstructions: {
      type: String,
      trim: true,
    },
    followUpRequired: {
      type: Boolean,
      default: false,
    },
    followUpDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["scheduled", "in_progress", "completed", "cancelled"],
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
EndoscopyServiceSchema.index({ endoscopyId: 1 });
EndoscopyServiceSchema.index({ patient: 1 });
EndoscopyServiceSchema.index({ gastroenterologist: 1 });
EndoscopyServiceSchema.index({ procedureType: 1 });
EndoscopyServiceSchema.index({ status: 1 });

// Pre-save hook
EndoscopyServiceSchema.pre("save", function (next) {
  if (!this.endoscopyId) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000);
    this.endoscopyId = `ENDO${year}${month}${random}`;
  }
  next();
});

export const EndoscopyService = models.EndoscopyService || model<IEndoscopyService>("EndoscopyService", EndoscopyServiceSchema);