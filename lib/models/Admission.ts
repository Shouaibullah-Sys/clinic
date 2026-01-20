// lib/models/Admission.ts
import mongoose, { Schema, model, models } from "mongoose";

export interface IAdmission extends mongoose.Document {
  admissionId: string;
  patient: mongoose.Types.ObjectId;
  doctor: mongoose.Types.ObjectId;
  admissionDate: Date;
  dischargeDate?: Date;
  expectedStay: number; // in days
  reason: string;
  diagnosis: string;
  ward: string;
  bedNumber: string;
  roomType: "general" | "private" | "semi-private" | "icu" | "emergency";
  status: "admitted" | "discharged" | "transferred" | "cancelled";
  vitalSigns: {
    date: Date;
    bloodPressure?: { systolic: number; diastolic: number };
    heartRate?: number;
    temperature?: number;
    respiratoryRate?: number;
    oxygenSaturation?: number;
  }[];
  treatments: {
    date: Date;
    treatment: string;
    administeredBy: mongoose.Types.ObjectId;
    notes?: string;
  }[];
  notes?: string;
  dischargeSummary?: string;
  followUpDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const admissionSchema = new Schema<IAdmission>(
  {
    admissionId: {
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
    admissionDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    dischargeDate: {
      type: Date,
    },
    expectedStay: {
      type: Number,
      default: 1,
    },
    reason: {
      type: String,
      required: true,
    },
    diagnosis: {
      type: String,
      required: true,
    },
    ward: {
      type: String,
      required: true,
    },
    bedNumber: {
      type: String,
      required: true,
    },
    roomType: {
      type: String,
      enum: ["general", "private", "semi-private", "icu", "emergency"],
      default: "general",
    },
    status: {
      type: String,
      enum: ["admitted", "discharged", "transferred", "cancelled"],
      default: "admitted",
    },
    vitalSigns: [{
      date: { type: Date, default: Date.now },
      bloodPressure: {
        systolic: Number,
        diastolic: Number,
      },
      heartRate: Number,
      temperature: Number,
      respiratoryRate: Number,
      oxygenSaturation: Number,
    }],
    treatments: [{
      date: { type: Date, default: Date.now },
      treatment: { type: String, required: true },
      administeredBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
      notes: String,
    }],
    notes: {
      type: String,
    },
    dischargeSummary: {
      type: String,
    },
    followUpDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
admissionSchema.index({ admissionId: 1 });
admissionSchema.index({ patient: 1 });
admissionSchema.index({ doctor: 1 });
admissionSchema.index({ ward: 1 });
admissionSchema.index({ status: 1 });
admissionSchema.index({ admissionDate: -1 });

// Pre-save hook
admissionSchema.pre("save", function (next) {
  if (!this.admissionId || this.isNew) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000);
    this.admissionId = `ADM${year}${month}${random}`;
  }
  next();
});

export const Admission = models.Admission || model<IAdmission>("Admission", admissionSchema);