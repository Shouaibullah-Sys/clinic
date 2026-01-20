// lib/models/Medicine.ts
import mongoose, { Schema, model, models } from "mongoose";

export interface IMedicine extends mongoose.Document {
  medicineId: string;
  name: string;
  genericName: string;
  brand: string;
  category: string;
  form: "tablet" | "capsule" | "syrup" | "injection" | "ointment" | "cream" | "drops" | "inhaler";
  strength: string;
  unit: string;
  description?: string;
  indications: string[];
  contraindications: string[];
  sideEffects: string[];
  dosageInstructions: string;
  storageInstructions: string;
  manufacturer: string;
  supplier: string;
  batchNumber: string;
  expiryDate: Date;
  price: number;
  cost: number;
  stock: number;
  reorderLevel: number;
  minimumStock: number;
  location?: string;
  barcode?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const medicineSchema = new Schema<IMedicine>(
  {
    medicineId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    genericName: {
      type: String,
      required: true,
      trim: true,
    },
    brand: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    form: {
      type: String,
      enum: ["tablet", "capsule", "syrup", "injection", "ointment", "cream", "drops", "inhaler"],
      required: true,
    },
    strength: {
      type: String,
      required: true,
    },
    unit: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    indications: [{
      type: String,
      trim: true,
    }],
    contraindications: [{
      type: String,
      trim: true,
    }],
    sideEffects: [{
      type: String,
      trim: true,
    }],
    dosageInstructions: {
      type: String,
    },
    storageInstructions: {
      type: String,
    },
    manufacturer: {
      type: String,
      required: true,
    },
    supplier: {
      type: String,
      required: true,
    },
    batchNumber: {
      type: String,
      required: true,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    cost: {
      type: Number,
      required: true,
      min: 0,
    },
    stock: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    reorderLevel: {
      type: Number,
      default: 10,
    },
    minimumStock: {
      type: Number,
      default: 5,
    },
    location: {
      type: String,
    },
    barcode: {
      type: String,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
medicineSchema.index({ medicineId: 1 });
medicineSchema.index({ name: 1 });
medicineSchema.index({ genericName: 1 });
medicineSchema.index({ category: 1 });
medicineSchema.index({ expiryDate: 1 });
medicineSchema.index({ stock: 1 });
medicineSchema.index({ active: 1 });

// Pre-save hook
medicineSchema.pre("save", function (next) {
  if (!this.medicineId || this.isNew) {
    const random = Math.floor(10000 + Math.random() * 90000);
    this.medicineId = `MED${random}`;
  }
  next();
});

export const Medicine = models.Medicine || model<IMedicine>("Medicine", medicineSchema);