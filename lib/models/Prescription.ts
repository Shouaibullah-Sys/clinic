// lib/models/Prescription.ts - CORRECTED VERSION

import mongoose, { Schema, model, models } from "mongoose";

export interface IPrescription extends mongoose.Document {
  prescriptionId: string;
  patient: mongoose.Types.ObjectId;
  doctor: mongoose.Types.ObjectId;
  appointment?: mongoose.Types.ObjectId;
  prescribedDate: Date;
  medications: {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    route: string;
    instructions?: string;
    quantity: number;
    refills: number;
    refillsRemaining: number;
  }[];
  diagnosis: string;
  instructions: string;
  notes?: string;
  status: "active" | "completed" | "cancelled" | "expired";
  expiryDate: Date;
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
    appointment: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
    },
    prescribedDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    medications: [{
      name: { 
        type: String, 
        required: true,
        trim: true,
      },
      dosage: { 
        type: String, 
        required: true,
        trim: true,
      },
      frequency: { 
        type: String, 
        required: true,
        trim: true,
      },
      duration: { 
        type: String, 
        required: true,
        trim: true,
      },
      route: { 
        type: String, 
        required: true,
        trim: true,
        enum: ["oral", "topical", "inhalation", "injection", "rectal", "vaginal", "ophthalmic", "otic", "nasal", "transdermal"],
        lowercase: true,
        default: "oral",
      },
      instructions: { 
        type: String,
        trim: true,
      },
      quantity: { 
        type: Number, 
        required: true, 
        min: 1,
        default: 1,
      },
      refills: { 
        type: Number, 
        default: 0, 
        min: 0,
      },
      refillsRemaining: { 
        type: Number, 
        default: 0, 
        min: 0,
      },
    }],
    diagnosis: {
      type: String,
      required: true,
      trim: true,
    },
    instructions: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "completed", "cancelled", "expired"],
      default: "active",
    },
    expiryDate: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Only add indexes that don't duplicate the unique constraint
prescriptionSchema.index({ patient: 1 });
prescriptionSchema.index({ doctor: 1 });
prescriptionSchema.index({ appointment: 1 }, { sparse: true });
prescriptionSchema.index({ prescribedDate: -1 });
prescriptionSchema.index({ status: 1 });
prescriptionSchema.index({ expiryDate: 1 });
prescriptionSchema.index({ createdAt: -1 });
prescriptionSchema.index({ patient: 1, status: 1 });
prescriptionSchema.index({ doctor: 1, status: 1 });

// Pre-save hook
prescriptionSchema.pre("save", function (next) {
  const prescription = this;
  
  // Generate prescription ID if not exists
  if (!prescription.prescriptionId || prescription.isNew) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(10000 + Math.random() * 90000);
    prescription.prescriptionId = `RX${year}${month}${random}`;
  }
  
  // Ensure medications have valid values
  if (prescription.medications && prescription.medications.length > 0) {
    prescription.medications.forEach(med => {
      // Ensure route is lowercase
      if (med.route) {
        med.route = med.route.toLowerCase();
      } else {
        med.route = "oral";
      }
      
      // Ensure numeric fields are numbers
      med.quantity = Number(med.quantity) || 1;
      med.refills = Number(med.refills) || 0;
      med.refillsRemaining = Number(med.refillsRemaining) || med.refills;
    });
  }
  
  // Set expiry date if not provided
  if (!prescription.expiryDate) {
    const expiry = new Date(prescription.prescribedDate || new Date());
    expiry.setDate(expiry.getDate() + 30);
    prescription.expiryDate = expiry;
  }
  
  next();
});

// Pre-validate hook
prescriptionSchema.pre("validate", function (next) {
  const prescription = this;
  
  if (!prescription.prescriptionId) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(10000 + Math.random() * 90000);
    prescription.prescriptionId = `RX${year}${month}${random}`;
  }
  
  if (!prescription.expiryDate) {
    const expiry = new Date(prescription.prescribedDate || new Date());
    expiry.setDate(expiry.getDate() + 30);
    prescription.expiryDate = expiry;
  }
  
  next();
});

// Check if the model already exists to prevent overwriting
export const Prescription = models.Prescription || model<IPrescription>("Prescription", prescriptionSchema);