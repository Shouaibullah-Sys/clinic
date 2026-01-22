// lib/models/MedicineStock.ts
import mongoose, { Schema, Types, model } from 'mongoose';

export interface IMedicineStock {
  _id: Types.ObjectId;
  name: string;
  batchNumber: string;
  expiryDate: Date;
  currentQuantity: number;
  originalQuantity: number;
  unitPrice: number;
  sellingPrice: number;
  supplier: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}


const medicineStockSchema = new Schema<IMedicineStock>({
  name: { type: String, required: true },
  batchNumber: { type: String, required: true, unique: true },
  expiryDate: { type: Date, required: true },
  currentQuantity: { type: Number, required: true, min: 0 },
  originalQuantity: { type: Number, required: true, min: 0 },
  unitPrice: { type: Number, required: true, min: 0 },
  sellingPrice: { type: Number, required: true, min: 0 },
  supplier: { type: String, required: true },
  description: { type: String }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add virtual for remaining stock percentage
medicineStockSchema.virtual('remainingPercentage').get(function() {
  return (this.currentQuantity / this.originalQuantity) * 100;
});

export const MedicineStock = mongoose.models.MedicineStock || 
  model<IMedicineStock>('MedicineStock', medicineStockSchema);
