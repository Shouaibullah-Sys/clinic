// lib/models/Billing.ts
import mongoose, { Schema, model, models } from "mongoose";

export interface IBilling extends mongoose.Document {
  invoiceId: string;
  patient: mongoose.Types.ObjectId;
  appointment?: mongoose.Types.ObjectId;
  admission?: mongoose.Types.ObjectId;
  billingDate: Date;
  dueDate: Date;
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
    type: "consultation" | "medication" | "procedure" | "test" | "room" | "other";
  }[];
  subtotal: number;
  discount: number;
  tax: number;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  paymentStatus: "pending" | "partial" | "paid" | "overdue" | "cancelled";
  paymentMethod?: "cash" | "card" | "insurance" | "bank_transfer" | "mobile_payment";
  insuranceCoverage?: {
    provider: string;
    policyNumber: string;
    coveredAmount: number;
    patientShare: number;
  };
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  payments: {
    date: Date;
    amount: number;
    method: string;
    reference: string;
    receivedBy: mongoose.Types.ObjectId;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const billingSchema = new Schema<IBilling>(
  {
    invoiceId: {
      type: String,
      required: true,
      unique: true,
    },
    patient: {
      type: Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    appointment: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
    },
    admission: {
      type: Schema.Types.ObjectId,
      ref: "Admission",
    },
    billingDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    items: [{
      description: { type: String, required: true },
      quantity: { type: Number, required: true, min: 1 },
      unitPrice: { type: Number, required: true, min: 0 },
      total: { type: Number, required: true, min: 0 },
      type: {
        type: String,
        enum: ["consultation", "medication", "procedure", "test", "room", "other"],
        required: true,
      },
    }],
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
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    balance: {
      type: Number,
      default: 0,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "partial", "paid", "overdue", "cancelled"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "insurance", "bank_transfer", "mobile_payment"],
    },
    insuranceCoverage: {
      provider: String,
      policyNumber: String,
      coveredAmount: { type: Number, default: 0 },
      patientShare: { type: Number, default: 0 },
    },
    notes: {
      type: String,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    payments: [{
      date: { type: Date, default: Date.now },
      amount: { type: Number, required: true },
      method: { type: String, required: true },
      reference: { type: String },
      receivedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    }],
  },
  {
    timestamps: true,
  }
);

// Indexes
billingSchema.index({ invoiceId: 1 });
billingSchema.index({ patient: 1 });
billingSchema.index({ paymentStatus: 1 });
billingSchema.index({ billingDate: -1 });
billingSchema.index({ dueDate: 1 });

// Pre-save hook
billingSchema.pre("save", function (next) {
  if (!this.invoiceId || this.isNew) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000);
    this.invoiceId = `INV${year}${month}${random}`;
  }
  
  // Calculate subtotal
  if (this.items && this.items.length > 0) {
    this.subtotal = this.items.reduce((sum, item) => sum + item.total, 0);
  }
  
  // Calculate total amount
  this.totalAmount = this.subtotal - this.discount + this.tax;
  
  // Calculate balance
  this.balance = this.totalAmount - this.paidAmount;
  
  // Update payment status
  if (this.balance <= 0) {
    this.paymentStatus = "paid";
  } else if (this.paidAmount > 0) {
    this.paymentStatus = "partial";
  }
  
  // Check if overdue
  if (this.dueDate && new Date() > this.dueDate && this.balance > 0) {
    this.paymentStatus = "overdue";
  }
  
  next();
});

export const Billing = models.Billing || model<IBilling>("Billing", billingSchema);