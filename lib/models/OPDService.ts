// lib/models/OPDService.ts

import mongoose, { Schema, model, models, Document } from "mongoose";

export interface IOPDService extends Document {
  opdId: string;
  patient: mongoose.Types.ObjectId;
  department: mongoose.Types.ObjectId;
  doctor: mongoose.Types.ObjectId;
  nurse?: mongoose.Types.ObjectId;
  appointment?: mongoose.Types.ObjectId;
  visitType: "new" | "followup" | "review" | "emergency";
  chiefComplaint: string;
  historyOfPresentIllness: string;
  pastMedicalHistory: string;
  familyHistory: string;
  personalHistory: string;
  allergies: string[];
  currentMedications: string[];
  vitals: {
    bloodPressure: string;
    pulse: number;
    respiratoryRate: number;
    temperature: number;
    oxygenSaturation: number;
    height?: number;
    weight?: number;
    bmi?: number;
    painScore?: number;
    recordedBy: mongoose.Types.ObjectId;
    recordedAt: Date;
  };
  examination: {
    generalExamination: string;
    systemicExamination: string;
    localExamination: string;
  };
  diagnosis: {
    provisionalDiagnosis: string;
    differentialDiagnosis?: string[];
    finalDiagnosis?: string;
  };
  investigations: {
    investigation: string;
    reason: string;
    status: "requested" | "completed" | "pending";
    result?: string;
  }[];
  treatmentPlan: {
    medication: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
  }[];
  procedures: {
    procedure: string;
    date: Date;
    performedBy: mongoose.Types.ObjectId;
    notes?: string;
  }[];
  referrals: {
    department: string;
    reason: string;
    referredBy: mongoose.Types.ObjectId;
    referredAt: Date;
  }[];
  followUp: {
    required: boolean;
    date?: Date;
    reason?: string;
    instructions?: string;
  };
  visitStatus: "checked_in" | "doctor_seen" | "investigation_pending" | "pharmacy_pending" | "completed" | "cancelled";
  billingStatus: "pending" | "billed" | "paid";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OPDServiceSchema = new Schema<IOPDService>(
  {
    opdId: {
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
    doctor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    nurse: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    appointment: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
    },
    visitType: {
      type: String,
      enum: ["new", "followup", "review", "emergency"],
      required: true,
    },
    chiefComplaint: {
      type: String,
      required: true,
      trim: true,
    },
    historyOfPresentIllness: {
      type: String,
      trim: true,
    },
    pastMedicalHistory: {
      type: String,
      trim: true,
    },
    familyHistory: {
      type: String,
      trim: true,
    },
    personalHistory: {
      type: String,
      trim: true,
    },
    allergies: [{
      type: String,
      trim: true,
    }],
    currentMedications: [{
      type: String,
      trim: true,
    }],
    vitals: {
      bloodPressure: { type: String },
      pulse: { type: Number },
      respiratoryRate: { type: Number },
      temperature: { type: Number },
      oxygenSaturation: { type: Number },
      height: { type: Number },
      weight: { type: Number },
      bmi: { type: Number },
      painScore: { type: Number, min: 0, max: 10 },
      recordedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
      recordedAt: { type: Date, default: Date.now },
    },
    examination: {
      generalExamination: { type: String, trim: true },
      systemicExamination: { type: String, trim: true },
      localExamination: { type: String, trim: true },
    },
    diagnosis: {
      provisionalDiagnosis: { type: String, required: true, trim: true },
      differentialDiagnosis: [{ type: String, trim: true }],
      finalDiagnosis: { type: String, trim: true },
    },
    investigations: [{
      investigation: { type: String, required: true },
      reason: { type: String, required: true },
      status: { type: String, enum: ["requested", "completed", "pending"], default: "requested" },
      result: { type: String },
    }],
    treatmentPlan: [{
      medication: { type: String, required: true },
      dosage: { type: String, required: true },
      frequency: { type: String, required: true },
      duration: { type: String, required: true },
      instructions: { type: String },
    }],
    procedures: [{
      procedure: { type: String, required: true },
      date: { type: Date, default: Date.now },
      performedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
      notes: { type: String },
    }],
    referrals: [{
      department: { type: String, required: true },
      reason: { type: String, required: true },
      referredBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
      referredAt: { type: Date, default: Date.now },
    }],
    followUp: {
      required: { type: Boolean, default: false },
      date: { type: Date },
      reason: { type: String },
      instructions: { type: String },
    },
    visitStatus: {
      type: String,
      enum: ["checked_in", "doctor_seen", "investigation_pending", "pharmacy_pending", "completed", "cancelled"],
      default: "checked_in",
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
OPDServiceSchema.index({ opdId: 1 });
OPDServiceSchema.index({ patient: 1 });
OPDServiceSchema.index({ doctor: 1 });
OPDServiceSchema.index({ visitStatus: 1 });
OPDServiceSchema.index({ createdAt: -1 });

// Pre-save hook
OPDServiceSchema.pre("save", function (next) {
  if (!this.opdId) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(100 + Math.random() * 900);
    this.opdId = `OPD${year}${month}${day}${random}`;
  }
  
  // Calculate BMI if height and weight are provided
  if (this.vitals?.height && this.vitals?.weight) {
    const heightInMeters = this.vitals.height / 100;
    this.vitals.bmi = parseFloat((this.vitals.weight / (heightInMeters * heightInMeters)).toFixed(2));
  }
  
  next();
});

export const OPDService = models.OPDService || model<IOPDService>("OPDService", OPDServiceSchema);