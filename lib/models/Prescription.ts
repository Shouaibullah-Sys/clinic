// lib/models/Prescription.ts - UPDATED
import mongoose, { Schema, model, models, Document } from "mongoose";

export interface IPrescription extends Document {
  prescriptionId: string;
  patient: mongoose.Types.ObjectId;
  doctor: mongoose.Types.ObjectId;
  appointment?: mongoose.Types.ObjectId;
  medications: {
    medicine: mongoose.Types.ObjectId;
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string;
    quantity: number;
    price: number;
    route: string;
    refills: number;
    refillsRemaining: number;
  }[];
  diagnosis: string;
  notes?: string;
  instructions?: string;
  prescribedDate: Date;
  expiryDate: Date;
  followUpDate?: Date;
  status: "active" | "completed" | "cancelled" | "expired";
  dispensedBy?: mongoose.Types.ObjectId; // Pharmacist who dispensed
  dispensedDate?: Date;
  dispensingStatus: "pending" | "partial" | "full" | "cancelled";
  pharmacyNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PrescriptionSchema = new Schema<IPrescription>(
  {
    prescriptionId: {
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
    doctor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    appointment: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
    },
    medications: [{
      medicine: { type: Schema.Types.ObjectId, ref: "MedicineStock", required: true },
      name: { type: String, required: true },
      dosage: { type: String, required: true },
      frequency: { type: String, required: true },
      duration: { type: String, required: true },
      instructions: { type: String, default: "" },
      quantity: { type: Number, required: true, min: 1 },
      price: { type: Number, required: true, min: 0 },
      route: { 
        type: String, 
        enum: ["oral", "topical", "inhalation", "injection", "rectal", "vaginal", "ophthalmic", "otic", "nasal", "transdermal"],
        default: "oral"
      },
      refills: { type: Number, default: 0, min: 0 },
      refillsRemaining: { type: Number, default: 0, min: 0 },
    }],
    diagnosis: {
      type: String,
      required: true,
    },
    notes: {
      type: String,
    },
    instructions: {
      type: String,
    },
    prescribedDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    followUpDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["active", "completed", "cancelled", "expired"],
      default: "active",
    },
    dispensedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    dispensedDate: {
      type: Date,
    },
    dispensingStatus: {
      type: String,
      enum: ["pending", "partial", "full", "cancelled"],
      default: "pending",
    },
    pharmacyNotes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
PrescriptionSchema.index({ prescriptionId: 1 });
PrescriptionSchema.index({ patient: 1 });
PrescriptionSchema.index({ doctor: 1 });
PrescriptionSchema.index({ status: 1 });
PrescriptionSchema.index({ dispensingStatus: 1 });
PrescriptionSchema.index({ expiryDate: 1 });
PrescriptionSchema.index({ createdAt: -1 });

// Pre-save hook to generate prescription ID
PrescriptionSchema.pre("save", function (next) {
  if (!this.prescriptionId) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000);
    this.prescriptionId = `RX${year}${month}${random}`;
  }
  
  // Check if prescription is expired
  if (this.expiryDate && this.expiryDate < new Date() && this.status === "active") {
    this.status = "expired";
  }
  
  next();
});

export const Prescription = models.Prescription || model<IPrescription>("Prescription", PrescriptionSchema);