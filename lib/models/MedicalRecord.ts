// lib/models/MedicalRecord.ts
import mongoose, { Schema, model, models } from "mongoose";

export interface IMedicalRecord extends mongoose.Document {
  recordId: string;
  patient: mongoose.Types.ObjectId;
  doctor: mongoose.Types.ObjectId;
  appointment?: mongoose.Types.ObjectId;
  visitDate: Date;
  diagnosis: string;
  symptoms: string[];
  examinations: {
    type: string;
    findings: string;
    date: Date;
    performedBy?: mongoose.Types.ObjectId;
  }[];
  prescriptions: mongoose.Types.ObjectId[];
  labTests: {
    testName: string;
    testId?: string;
    date: Date;
    results?: string;
    status: "pending" | "completed" | "cancelled";
  }[];
  procedures: {
    name: string;
    date: Date;
    description: string;
    performedBy?: mongoose.Types.ObjectId;
  }[];
  vitalSigns: {
    bloodPressure?: {
      systolic: number;
      diastolic: number;
    };
    heartRate?: number;
    temperature?: number;
    respiratoryRate?: number;
    oxygenSaturation?: number;
    height?: number;
    weight?: number;
    bmi?: number;
  };
  notes: string;
  followUpDate?: Date;
  admitted: boolean;
  admissionDate?: Date;
  dischargeDate?: Date;
  ward?: string;
  bedNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

const medicalRecordSchema = new Schema<IMedicalRecord>(
  {
    recordId: {
      type: String,
      required: true,
      unique: true,
    },
    patient: {
      type: Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    doctor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    appointment: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
    },
    visitDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    diagnosis: {
      type: String,
      required: true,
    },
    symptoms: [{
      type: String,
      trim: true,
    }],
    examinations: [{
      type: { type: String, required: true },
      findings: { type: String, required: true },
      date: { type: Date, default: Date.now },
      performedBy: { type: Schema.Types.ObjectId, ref: "User" },
    }],
    prescriptions: [{
      type: Schema.Types.ObjectId,
      ref: "Prescription",
    }],
    labTests: [{
      testName: { type: String, required: true },
      testId: { type: String },
      date: { type: Date, default: Date.now },
      results: { type: String },
      status: {
        type: String,
        enum: ["pending", "completed", "cancelled"],
        default: "pending",
      },
    }],
    procedures: [{
      name: { type: String, required: true },
      date: { type: Date, default: Date.now },
      description: { type: String, required: true },
      performedBy: { type: Schema.Types.ObjectId, ref: "User" },
    }],
    vitalSigns: {
      bloodPressure: {
        systolic: Number,
        diastolic: Number,
      },
      heartRate: Number,
      temperature: Number,
      respiratoryRate: Number,
      oxygenSaturation: Number,
      height: Number,
      weight: Number,
      bmi: Number,
    },
    notes: {
      type: String,
    },
    followUpDate: {
      type: Date,
    },
    admitted: {
      type: Boolean,
      default: false,
    },
    admissionDate: {
      type: Date,
    },
    dischargeDate: {
      type: Date,
    },
    ward: {
      type: String,
    },
    bedNumber: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
medicalRecordSchema.index({ recordId: 1 });
medicalRecordSchema.index({ patient: 1 });
medicalRecordSchema.index({ doctor: 1 });
medicalRecordSchema.index({ visitDate: -1 });
medicalRecordSchema.index({ "patient": 1, "visitDate": -1 });

// Pre-save hook
medicalRecordSchema.pre("save", function (next) {
  if (!this.recordId || this.isNew) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(10000 + Math.random() * 90000);
    this.recordId = `MR${year}${month}${random}`;
  }
  
  // Calculate BMI if height and weight are provided
  if (this.vitalSigns?.height && this.vitalSigns?.weight) {
    const heightInMeters = this.vitalSigns.height / 100;
    this.vitalSigns.bmi = parseFloat((this.vitalSigns.weight / (heightInMeters * heightInMeters)).toFixed(1));
  }
  
  next();
});

export const MedicalRecord = models.MedicalRecord || model<IMedicalRecord>("MedicalRecord", medicalRecordSchema);