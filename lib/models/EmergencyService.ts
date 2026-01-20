// lib/models/EmergencyService.ts
import mongoose, { Schema, model, models, Document } from "mongoose";

export interface IEmergencyService extends Document {
  emergencyId: string;
  patient: mongoose.Types.ObjectId;
  triageCategory: "red" | "orange" | "yellow" | "green" | "blue";
  arrivalMode: "ambulance" | "walk-in" | "police" | "referral";
  ambulanceNumber?: string;
  broughtBy?: string;
  relationship?: string;
  contactNumber?: string;
  chiefComplaint: string;
  vitalSigns: {
    time: Date;
    bloodPressure: string;
    heartRate: number;
    respiratoryRate: number;
    temperature: number;
    oxygenSaturation: number;
    gcs: number; // Glasgow Coma Scale
    painScore: number; // 0-10
  }[];
  allergies: string[];
  medications: string[];
  pastMedicalHistory: string[];
  examinationFindings: string;
  initialDiagnosis: string;
  treatments: {
    time: Date;
    treatment: string;
    medication?: string;
    dosage?: string;
    administeredBy: mongoose.Types.ObjectId;
    notes?: string;
  }[];
  procedures: {
    procedure: string;
    time: Date;
    performedBy: mongoose.Types.ObjectId;
    assistant?: mongoose.Types.ObjectId;
    notes?: string;
  }[];
  disposition: "admitted" | "discharged" | "transferred" | "referred" | "absconded" | "died";
  admissionTo?: string;
  dischargeTime?: Date;
  dischargeInstructions?: string;
  followUpDate?: Date;
  referringDoctor?: mongoose.Types.ObjectId;
  attendingDoctor: mongoose.Types.ObjectId;
  nurses: mongoose.Types.ObjectId[];
  status: "active" | "resolved" | "transferred";
  billingStatus: "pending" | "estimated" | "billed" | "paid";
  createdAt: Date;
  updatedAt: Date;
}

const EmergencyServiceSchema = new Schema<IEmergencyService>(
  {
    emergencyId: {
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
    triageCategory: {
      type: String,
      enum: ["red", "orange", "yellow", "green", "blue"],
      required: true,
    },
    arrivalMode: {
      type: String,
      enum: ["ambulance", "walk-in", "police", "referral"],
      required: true,
    },
    ambulanceNumber: {
      type: String,
      trim: true,
    },
    broughtBy: {
      type: String,
      trim: true,
    },
    relationship: {
      type: String,
      trim: true,
    },
    contactNumber: {
      type: String,
      trim: true,
    },
    chiefComplaint: {
      type: String,
      required: true,
      trim: true,
    },
    vitalSigns: [{
      time: { type: Date, default: Date.now },
      bloodPressure: { type: String, required: true },
      heartRate: { type: Number, required: true },
      respiratoryRate: { type: Number, required: true },
      temperature: { type: Number, required: true },
      oxygenSaturation: { type: Number, required: true },
      gcs: { type: Number, min: 3, max: 15 },
      painScore: { type: Number, min: 0, max: 10 },
    }],
    allergies: [{
      type: String,
      trim: true,
    }],
    medications: [{
      type: String,
      trim: true,
    }],
    pastMedicalHistory: [{
      type: String,
      trim: true,
    }],
    examinationFindings: {
      type: String,
      trim: true,
    },
    initialDiagnosis: {
      type: String,
      required: true,
      trim: true,
    },
    treatments: [{
      time: { type: Date, default: Date.now },
      treatment: { type: String, required: true },
      medication: { type: String },
      dosage: { type: String },
      administeredBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
      notes: { type: String },
    }],
    procedures: [{
      procedure: { type: String, required: true },
      time: { type: Date, default: Date.now },
      performedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
      assistant: { type: Schema.Types.ObjectId, ref: "User" },
      notes: { type: String },
    }],
    disposition: {
      type: String,
      enum: ["admitted", "discharged", "transferred", "referred", "absconded", "died"],
      required: true,
    },
    admissionTo: {
      type: String,
      trim: true,
    },
    dischargeTime: {
      type: Date,
    },
    dischargeInstructions: {
      type: String,
      trim: true,
    },
    followUpDate: {
      type: Date,
    },
    referringDoctor: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    attendingDoctor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    nurses: [{
      type: Schema.Types.ObjectId,
      ref: "User",
    }],
    status: {
      type: String,
      enum: ["active", "resolved", "transferred"],
      default: "active",
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
EmergencyServiceSchema.index({ emergencyId: 1 });
EmergencyServiceSchema.index({ patient: 1 });
EmergencyServiceSchema.index({ triageCategory: 1 });
EmergencyServiceSchema.index({ arrivalMode: 1 });
EmergencyServiceSchema.index({ disposition: 1 });
EmergencyServiceSchema.index({ status: 1 });

// Pre-save hook
EmergencyServiceSchema.pre("save", function (next) {
  if (!this.emergencyId) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(100 + Math.random() * 900);
    this.emergencyId = `ER${year}${month}${day}${random}`;
  }
  next();
});

export const EmergencyService = models.EmergencyService || model<IEmergencyService>("EmergencyService", EmergencyServiceSchema);