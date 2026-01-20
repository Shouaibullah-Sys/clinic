// lib/models/INDOService.ts

import mongoose, { Schema, model, models, Document } from "mongoose";

export interface IINDOService extends Document {
  indoId: string;
  patient: mongoose.Types.ObjectId;
  department: mongoose.Types.ObjectId;
  procedureType: "bronchoscopy" | "laryngoscopy" | "esophagoscopy" | "sinus_endoscopy" | "nasal_endoscopy";
  referringDoctor: mongoose.Types.ObjectId;
  performingDoctor: mongoose.Types.ObjectId;
  anesthetist?: mongoose.Types.ObjectId;
  nurse?: mongoose.Types.ObjectId;
  indication: string;
  preparation: string;
  anesthesiaType: "local" | "topical" | "sedation" | "general";
  findings: string;
  procedureDetails: string;
  specimens: {
    specimenId: string;
    type: string;
    site: string;
    sentToLab: boolean;
    labReportId?: string;
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

const INDOServiceSchema = new Schema<IINDOService>(
  {
    indoId: {
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
      enum: ["bronchoscopy", "laryngoscopy", "esophagoscopy", "sinus_endoscopy", "nasal_endoscopy"],
      required: true,
    },
    referringDoctor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    performingDoctor: {
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
    anesthesiaType: {
      type: String,
      enum: ["local", "topical", "sedation", "general"],
      required: true,
    },
    findings: {
      type: String,
      trim: true,
    },
    procedureDetails: {
      type: String,
      required: true,
      trim: true,
    },
    specimens: [{
      specimenId: { type: String, required: true },
      type: { type: String, required: true },
      site: { type: String, required: true },
      sentToLab: { type: Boolean, default: false },
      labReportId: { type: String },
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
INDOServiceSchema.index({ indoId: 1 });
INDOServiceSchema.index({ patient: 1 });
INDOServiceSchema.index({ performingDoctor: 1 });
INDOServiceSchema.index({ status: 1 });
INDOServiceSchema.index({ procedureType: 1 });

// Pre-save hook
INDOServiceSchema.pre("save", function (next) {
  if (!this.indoId) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000);
    this.indoId = `INDO${year}${month}${random}`;
  }
  
  // Auto-generate specimen IDs
  this.specimens.forEach((specimen, index) => {
    if (!specimen.specimenId) {
      specimen.specimenId = `SP${this.indoId.slice(4)}${(index + 1).toString().padStart(2, '0')}`;
    }
  });
  
  next();
});

export const INDOService = models.INDOService || model<IINDOService>("INDOService", INDOServiceSchema);