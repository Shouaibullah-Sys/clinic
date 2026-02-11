// lib/models/Warehouse.ts
import mongoose, { Schema, model, models } from "mongoose";

export interface IWarehouse extends mongoose.Document {
  warehouseId: string;
  name: string;
  genericName?: string;
  category: string;
  manufacturer: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const warehouseSchema = new Schema<IWarehouse>(
  {
    warehouseId: {
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
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      enum: [
        "Antibiotic",
        "Analgesic",
        "Antipyretic",
        "Anti-inflammatory",
        "Antihistamine",
        "Antiviral",
        "Antifungal",
        "Cardiovascular",
        "Gastrointestinal",
        "Respiratory",
        "Central Nervous System",
        "Endocrine",
        "Vitamins & Supplements",
        "Dermatological",
        "Ophthalmic",
        "Other",
      ],
    },
    manufacturer: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
warehouseSchema.index({ warehouseId: 1 });
warehouseSchema.index({ name: 1 });
warehouseSchema.index({ category: 1 });
warehouseSchema.index({ manufacturer: 1 });
warehouseSchema.index({ isActive: 1 });

// Compound indexes
warehouseSchema.index({ name: 1, category: 1 });
warehouseSchema.index({ manufacturer: 1, category: 1 });

// Pre-save hooks
warehouseSchema.pre("save", function (next) {
  // Generate warehouse ID if not exists
  if (!this.warehouseId) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const random = Math.floor(1000 + Math.random() * 9000);
    this.warehouseId = `WH${year}${month}${random}`;
  }
  next();
});

export const Warehouse =
  models.Warehouse || model<IWarehouse>("Warehouse", warehouseSchema);
