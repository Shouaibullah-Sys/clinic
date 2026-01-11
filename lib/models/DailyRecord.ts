// lib/models/DailyRecord.ts
import mongoose, { Schema, Types, model } from "mongoose";

export interface IDailyRecord {
  _id: Types.ObjectId;
  customerName: string;
  serviceType: string;
  clothingType: string;
  phoneNumber: string;
  invoiceNumber: string;
  amountCharged: number;
  amountPaid: number;
  discount: number;
  paymentStatus: "paid" | "unpaid" | "partial";
  orderStatus: "pending" | "in_progress" | "completed" | "delivered";
  deliveryDate: Date;
  date: Date;
  measurements?: {
    [key: string]: string | number;
  };
  specialInstructions?: string;
  recordedBy?: {
    name: string;
    _id: Types.ObjectId;
  };
  createdAt: Date;
  updatedAt: Date;
}

const dailyRecordSchema = new Schema<IDailyRecord>(
  {
    customerName: { type: String, required: true, index: true },
    serviceType: { 
      type: String, 
      required: true, 
      index: true,
      enum: ["stitching", "alteration", "repair", "dry_cleaning", "other"]
    },
    clothingType: { 
      type: String, 
      required: true, 
      index: true,
      enum: ["shirt", "pant", "suit", "dress", "blouse", "skirt", "jacket", "other"]
    },
    phoneNumber: { type: String, required: true, index: true },
    invoiceNumber: { type: String, required: true, unique: true },
    amountCharged: { type: Number, required: true, min: 0 },
    amountPaid: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    paymentStatus: {
      type: String,
      enum: ["paid", "unpaid", "partial"],
      default: "unpaid",
      index: true,
    },
    orderStatus: {
      type: String,
      enum: ["pending", "in_progress", "completed", "delivered"],
      default: "pending",
      index: true,
    },
    deliveryDate: { type: Date, required: true, index: true },
    date: { type: Date, default: Date.now, index: true },
    measurements: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {}
    },
    specialInstructions: { type: String, default: "" },
    recordedBy: {
      name: { type: String },
      _id: { type: Types.ObjectId, ref: 'User' },
    },
  },
  { timestamps: true }
);

// Add virtual for balance due
dailyRecordSchema.virtual("balanceDue").get(function () {
  return this.amountCharged - this.amountPaid - this.discount;
});

// Add virtual for days until delivery
dailyRecordSchema.virtual("daysUntilDelivery").get(function () {
  const today = new Date();
  const delivery = new Date(this.deliveryDate);
  const diffTime = delivery.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Instance method to add payment
dailyRecordSchema.methods.addPayment = async function (amount: number) {
  this.amountPaid += amount;
  
  if (this.amountPaid >= (this.amountCharged - this.discount)) {
    this.paymentStatus = "paid";
  } else if (this.amountPaid > 0) {
    this.paymentStatus = "partial";
  } else {
    this.paymentStatus = "unpaid";
  }
  
  await this.save();
};

// Instance method to mark as delivered
dailyRecordSchema.methods.markAsDelivered = async function () {
  this.orderStatus = "delivered";
  await this.save();
};

// Static method to generate invoice number
dailyRecordSchema.statics.generateInvoiceNumber = async function () {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  // Find the last record created today
  const lastRecord = await this.findOne({
    invoiceNumber: { $regex: `^TAILOR-${year}${month}${day}` },
  }).sort({ createdAt: -1 });

  if (!lastRecord) {
    return `TAILOR-${year}${month}${day}-001`;
  }

  // Extract the sequential number and increment
  const lastNumber = lastRecord.invoiceNumber.split("-").pop();
  const nextNumber = String(parseInt(lastNumber || "0") + 1).padStart(3, "0");

  return `TAILOR-${year}${month}${day}-${nextNumber}`;
};

// Indexes for better query performance
dailyRecordSchema.index({ date: -1 });
dailyRecordSchema.index({ deliveryDate: 1 });
dailyRecordSchema.index({ paymentStatus: 1 });
dailyRecordSchema.index({ orderStatus: 1 });
dailyRecordSchema.index({ customerName: 1 });
dailyRecordSchema.index({ phoneNumber: 1 });
dailyRecordSchema.index({ serviceType: 1 });
dailyRecordSchema.index({ clothingType: 1 });
dailyRecordSchema.index({ invoiceNumber: 1 });

// Compound indexes for common queries
dailyRecordSchema.index({ orderStatus: 1, deliveryDate: 1 });
dailyRecordSchema.index({ customerName: 1, date: -1 });

// Type for document with methods
export type DailyRecordDocument = mongoose.Document<unknown, {}, IDailyRecord> & 
  IDailyRecord & {
    addPayment(amount: number): Promise<void>;
    markAsDelivered(): Promise<void>;
  };

// Type for model with statics
interface DailyRecordModel extends mongoose.Model<IDailyRecord> {
  generateInvoiceNumber(): Promise<string>;
}

export const DailyRecord: DailyRecordModel =
  (mongoose.models.DailyRecord as DailyRecordModel) ||
  model<IDailyRecord, DailyRecordModel>("DailyRecord", dailyRecordSchema);

// Type for summary calculations
export interface IDailySummary {
  date: Date;
  totalCharged: number;
  totalPaid: number;
  totalDiscount: number;
  totalBalance: number;
  totalRecords: number;
  pendingOrders: number;
  completedOrders: number;
  deliveredOrders: number;
}

// Type for monthly summary
export interface IMonthlySummary {
  month: string;
  year: number;
  totalCharged: number;
  totalPaid: number;
  totalDiscount: number;
  totalBalance: number;
  totalRecords: number;
  serviceTypeBreakdown: {
    stitching: number;
    alteration: number;
    repair: number;
    dry_cleaning: number;
    other: number;
  };
  clothingTypeBreakdown: {
    shirt: number;
    pant: number;
    suit: number;
    dress: number;
    blouse: number;
    skirt: number;
    jacket: number;
    other: number;
  };
}