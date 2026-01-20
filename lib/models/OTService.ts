// lib/models/OTService.ts - Operation Theatre
import mongoose, { Schema, model, models, Document } from "mongoose";

export interface IOTService extends Document {
  otBookingId: string;
  patient: mongoose.Types.ObjectId;
  surgeon: mongoose.Types.ObjectId;
  assistantSurgeons: mongoose.Types.ObjectId[];
  anesthetist: mongoose.Types.ObjectId;
  nurseInCharge: mongoose.Types.ObjectId;
  otTechnician: mongoose.Types.ObjectId;
  procedure: string;
  diagnosis: string;
  otRoom: string;
  scheduledDate: Date;
  scheduledStartTime: Date;
  scheduledEndTime: Date;
  actualStartTime?: Date;
  actualEndTime?: Date;
  duration: number; // in minutes
  anesthesiaType: "general" | "regional" | "local" | "sedation";
  preoperativeDiagnosis: string;
  postoperativeDiagnosis: string;
  procedureDetails: string;
  findings: string;
  specimens: {
    specimenId: string;
    type: string;
    sentToLab: boolean;
    labReportId?: string;
  }[];
  complications?: string;
  bloodLoss?: number; // in ml
  implants: {
    name: string;
    brand: string;
    serialNumber?: string;
    quantity: number;
  }[];
  status: "scheduled" | "in-preparation" | "in-progress" | "completed" | "cancelled";
  postOpInstructions: string;
  recoveryRoomTime?: Date;
  transferredToWard?: string;
  notes?: string;
  billingStatus: "pending" | "estimated" | "billed" | "paid";
  createdAt: Date;
  updatedAt: Date;
}

const OTServiceSchema = new Schema<IOTService>(
  {
    otBookingId: {
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
    surgeon: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assistantSurgeons: [{
      type: Schema.Types.ObjectId,
      ref: "User",
    }],
    anesthetist: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    nurseInCharge: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    otTechnician: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    procedure: {
      type: String,
      required: true,
      trim: true,
    },
    diagnosis: {
      type: String,
      required: true,
      trim: true,
    },
    otRoom: {
      type: String,
      required: true,
      trim: true,
    },
    scheduledDate: {
      type: Date,
      required: true,
    },
    scheduledStartTime: {
      type: Date,
      required: true,
    },
    scheduledEndTime: {
      type: Date,
      required: true,
    },
    actualStartTime: {
      type: Date,
    },
    actualEndTime: {
      type: Date,
    },
    duration: {
      type: Number,
      default: 60,
      min: 15,
    },
    anesthesiaType: {
      type: String,
      enum: ["general", "regional", "local", "sedation"],
      required: true,
    },
    preoperativeDiagnosis: {
      type: String,
      required: true,
      trim: true,
    },
    postoperativeDiagnosis: {
      type: String,
      trim: true,
    },
    procedureDetails: {
      type: String,
      required: true,
      trim: true,
    },
    findings: {
      type: String,
      trim: true,
    },
    specimens: [{
      specimenId: { type: String, required: true },
      type: { type: String, required: true },
      sentToLab: { type: Boolean, default: false },
      labReportId: { type: String },
    }],
    complications: {
      type: String,
      trim: true,
    },
    bloodLoss: {
      type: Number,
      min: 0,
    },
    implants: [{
      name: { type: String, required: true },
      brand: { type: String, required: true },
      serialNumber: { type: String },
      quantity: { type: Number, required: true, min: 1 },
    }],
    status: {
      type: String,
      enum: ["scheduled", "in-preparation", "in-progress", "completed", "cancelled"],
      default: "scheduled",
    },
    postOpInstructions: {
      type: String,
      trim: true,
    },
    recoveryRoomTime: {
      type: Date,
    },
    transferredToWard: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    billingStatus: {
      type: String,
      enum: ["pending", "estimated", "billed", "paid"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
OTServiceSchema.index({ otBookingId: 1 });
OTServiceSchema.index({ patient: 1 });
OTServiceSchema.index({ surgeon: 1 });
OTServiceSchema.index({ scheduledDate: -1 });
OTServiceSchema.index({ status: 1 });
OTServiceSchema.index({ otRoom: 1 });

// Pre-save hook
OTServiceSchema.pre("save", function (next) {
  if (!this.otBookingId) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000);
    this.otBookingId = `OT${year}${month}${day}${random}`;
  }
  
  // Auto-generate specimen IDs
  this.specimens.forEach((specimen, index) => {
    if (!specimen.specimenId) {
      specimen.specimenId = `SP${this.otBookingId.slice(2)}${(index + 1).toString().padStart(2, '0')}`;
    }
  });
  
  next();
});

export const OTService = models.OTService || model<IOTService>("OTService", OTServiceSchema);