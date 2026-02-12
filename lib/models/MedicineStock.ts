// lib/models/MedicineStock.ts
import mongoose, { Schema, Types, model } from "mongoose";

export interface IMedicineStock {
  _id: Types.ObjectId;
  name: string;
  form: string;
  dosage: string;
  expiryDate: Date;
  currentQuantity: number;
  originalQuantity: number;
  unitPrice: number;
  sellingPrice: number;
  supplier: string;
  description?: string;
  warehouseBatchId?: Types.ObjectId; // Reference to warehouse batch
  createdAt: Date;
  updatedAt: Date;
}

const medicineStockSchema = new Schema<IMedicineStock>(
  {
    name: { type: String, required: true },
    form: { type: String, required: true },
    dosage: { type: String, required: true },
    expiryDate: { type: Date, required: true },
    currentQuantity: { type: Number, required: true, min: 0 },
    originalQuantity: { type: Number, required: true, min: 0 },
    unitPrice: { type: Number, required: true, min: 0 },
    sellingPrice: { type: Number, required: true, min: 0 },
    supplier: { type: String, required: true },
    description: { type: String },
    warehouseBatchId: { type: Schema.Types.ObjectId, ref: "WarehouseBatch" },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Add virtual for remaining stock percentage
medicineStockSchema.virtual("remainingPercentage").get(function () {
  return (this.currentQuantity / this.originalQuantity) * 100;
});

// Indexes
medicineStockSchema.index({ name: 1 });
medicineStockSchema.index({ warehouseBatchId: 1 });
medicineStockSchema.index({ expiryDate: 1 });

export const MedicineStock =
  mongoose.models.MedicineStock ||
  model<IMedicineStock>("MedicineStock", medicineStockSchema);
