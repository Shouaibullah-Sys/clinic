// lib/models/LithotripsyService.ts

import mongoose, { Schema, model, models, Document } from "mongoose";

export interface ILithotripsyService extends Document {
  lithotripsyId: string;
  patient: mongoose.Types.ObjectId;
  department: mongoose.Types.ObjectId;
  procedureType: "eswl" | "pcnl" | "ursl"; // ESWL, PCNL, URSL
  stoneLocation: "kidney" | "ureter" | "bladder";
  stoneSize: number; // in mm
  stoneNumber: number;
  referringDoctor: mongoose.Types.ObjectId;
  urologist: mongoose.Types.ObjectId;
  anesthetist?: mongoose.Types.ObjectId;
  nurse?: mongoose.Types.ObjectId;
  machineType: string;
  energyLevel: number;
  numberOfShocks: number;
  anesthesiaType: "local" | "sedation" | "spinal" | "general";
  preProcedureFindings: string;
  postProcedureFindings: string;
  complications?: string;
  fragmentsRetrieved: boolean;
  stentPlaced: boolean;
  stentType?: string;
  stentRemovalDate?: Date;
  postProcedureInstructions: string;
  followUpRequired: boolean;
  followUpDate?: Date;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  billingStatus: "pending" | "billed" | "paid";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LithotripsyServiceSchema = new Schema<ILithotripsyService>(
  {
    lithotripsyId: {
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
      enum: ["eswl", "pcnl", "ursl"],
      required: true,
    },
    stoneLocation: {
      type: String,
      enum: ["kidney", "ureter", "bladder"],
      required: true,
    },
    stoneSize: {
      type: Number,
      required: true,
      min: 0,
    },
    stoneNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    referringDoctor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    urologist: {
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
    machineType: {
      type: String,
      required: true,
      trim: true,
    },
    energyLevel: {
      type: Number,
      required: true,
      min: 0,
    },
    numberOfShocks: {
      type: Number,
      required: true,
      min: 0,
    },
    anesthesiaType: {
      type: String,
      enum: ["local", "sedation", "spinal", "general"],
      required: true,
    },
    preProcedureFindings: {
      type: String,
      trim: true,
    },
    postProcedureFindings: {
      type: String,
      trim: true,
    },
    complications: {
      type: String,
      trim: true,
    },
    fragmentsRetrieved: {
      type: Boolean,
      default: false,
    },
    stentPlaced: {
      type: Boolean,
      default: false,
    },
    stentType: {
      type: String,
      trim: true,
    },
    stentRemovalDate: {
      type: Date,
    },
    postProcedureInstructions: {
      type: String,
      trim: true,
    },
    followUpRequired: {
      type: Boolean,
      default: true,
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
LithotripsyServiceSchema.index({ lithotripsyId: 1 });
LithotripsyServiceSchema.index({ patient: 1 });
LithotripsyServiceSchema.index({ urologist: 1 });
LithotripsyServiceSchema.index({ procedureType: 1 });
LithotripsyServiceSchema.index({ status: 1 });

// Pre-save hook
LithotripsyServiceSchema.pre("save", function (next) {
  if (!this.lithotripsyId) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000);
    this.lithotripsyId = `LITH${year}${month}${random}`;
  }
  next();
});

export const LithotripsyService = models.LithotripsyService || model<ILithotripsyService>("LithotripsyService", LithotripsyServiceSchema);  