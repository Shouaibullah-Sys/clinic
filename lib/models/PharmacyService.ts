// lib/models/PharmacyService.ts
import mongoose, { Schema, model, models, Document } from "mongoose";

export interface IPharmacyService extends Document {
  dispensingId: string;
  patient: mongoose.Types.ObjectId;
  prescription: mongoose.Types.ObjectId;
  pharmacist: mongoose.Types.ObjectId;
  items: {
    medicine: mongoose.Types.ObjectId;
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    expiryDate: Date;
    dosageInstructions: string;
    warnings?: string;
  }[];
  subtotal: number;
  discount: number;
  tax: number;
  totalAmount: number;
  paymentStatus: "pending" | "partial" | "paid";
  paymentMethod?: "cash" | "card" | "insurance";
  insuranceCoverage?: {
    provider: string;
    coveredAmount: number;
    patientShare: number;
  };
  dispensingDate: Date;
  dispensedBy: mongoose.Types.ObjectId;
  status: "pending" | "dispensed" | "partially_dispensed" | "cancelled";
  notes?: string;
  followUpDate?: Date;
  refillReminder: boolean;
  reminderSent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PharmacyServiceSchema = new Schema<IPharmacyService>(
  {
    dispensingId: {
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
    prescription: {
      type: Schema.Types.ObjectId,
      ref: "Prescription",
      required: true,
    },
    pharmacist: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [
      {
        medicine: {
          type: Schema.Types.ObjectId,
          ref: "Medicine",
          required: true,
        },
        name: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        unitPrice: { type: Number, required: true, min: 0 },
        totalPrice: { type: Number, required: true, min: 0 },
        expiryDate: { type: Date, required: true },
        dosageInstructions: { type: String, required: true },
        warnings: { type: String },
      },
    ],
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    tax: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "partial", "paid"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "insurance"],
    },
    insuranceCoverage: {
      provider: String,
      coveredAmount: { type: Number, default: 0 },
      patientShare: { type: Number, default: 0 },
    },
    dispensingDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    dispensedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "dispensed", "partially_dispensed", "cancelled"],
      default: "pending",
    },
    notes: {
      type: String,
      trim: true,
    },
    followUpDate: {
      type: Date,
    },
    refillReminder: {
      type: Boolean,
      default: false,
    },
    reminderSent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
PharmacyServiceSchema.index({ dispensingId: 1 });
PharmacyServiceSchema.index({ patient: 1 });
PharmacyServiceSchema.index({ prescription: 1 });
PharmacyServiceSchema.index({ dispensingDate: -1 });
PharmacyServiceSchema.index({ status: 1 });
PharmacyServiceSchema.index({ paymentStatus: 1 });

// Pre-save hook
PharmacyServiceSchema.pre("save", function (next) {
  if (!this.dispensingId) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const random = Math.floor(1000 + Math.random() * 9000);
    this.dispensingId = `DISP${year}${month}${random}`;
  }

  // Calculate totals
  if (this.items && this.items.length > 0) {
    this.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
    this.totalAmount = this.subtotal - this.discount + this.tax;
  }

  next();
});

export const PharmacyService =
  models.PharmacyService ||
  model<IPharmacyService>("PharmacyService", PharmacyServiceSchema);
