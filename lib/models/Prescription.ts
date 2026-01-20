// lib/models/Prescription.ts
import mongoose, { Schema, model, models } from "mongoose";

export interface IPrescription extends mongoose.Document {
  prescriptionId: string;
  patient: mongoose.Types.ObjectId;
  doctor: mongoose.Types.ObjectId;
  medicalRecord?: mongoose.Types.ObjectId;
  date: Date;
  medications: {
    medicine: mongoose.Types.ObjectId;
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
    quantity: number;
  }[];
  diagnosis: string;
  notes?: string;
  status: "active" | "completed" | "cancelled";
  pharmacyNotes?: string;
  dispensedBy?: mongoose.Types.ObjectId;
  dispensedDate?: Date;
  refills: number;
  currentRefill: number;
  createdAt: Date;
  updatedAt: Date;
}

const prescriptionSchema = new Schema<IPrescription>(
  {
    prescriptionId: {
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
    medicalRecord: {
      type: Schema.Types.ObjectId,
      ref: "MedicalRecord",
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    medications: [{
      medicine: { type: Schema.Types.ObjectId, ref: "Medicine", required: true },
      name: { type: String, required: true },
      dosage: { type: String, required: true }, // e.g., "500mg"
      frequency: { type: String, required: true }, // e.g., "twice daily"
      duration: { type: String, required: true }, // e.g., "7 days"
      instructions: { type: String },
      quantity: { type: Number, required: true, min: 1 },
    }],
    diagnosis: {
      type: String,
      required: true,
    },
    notes: {
      type: String,
    },
    status: {
      type: String,
      enum: ["active", "completed", "cancelled"],
      default: "active",
    },
    pharmacyNotes: {
      type: String,
    },
    dispensedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    dispensedDate: {
      type: Date,
    },
    refills: {
      type: Number,
      default: 0,
      min: 0,
    },
    currentRefill: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
prescriptionSchema.index({ prescriptionId: 1 });
prescriptionSchema.index({ patient: 1 });
prescriptionSchema.index({ doctor: 1 });
prescriptionSchema.index({ date: -1 });
prescriptionSchema.index({ status: 1 });

// Pre-save hook
prescriptionSchema.pre("save", function (next) {
  if (!this.prescriptionId || this.isNew) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000);
    this.prescriptionId = `RX${year}${month}${random}`;
  }
  next();
});

export const Prescription = models.Prescription || model<IPrescription>("Prescription", prescriptionSchema);