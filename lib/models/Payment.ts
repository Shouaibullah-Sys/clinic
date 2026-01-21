import mongoose, { Schema, model, models } from "mongoose";

export interface IPayment extends mongoose.Document {
  paymentId: string;
  patient: mongoose.Types.ObjectId;
  invoice?: mongoose.Types.ObjectId;
  appointment?: mongoose.Types.ObjectId;
  paymentMethod: "cash" | "card" | "insurance" | "online" | "check" | "bank_transfer";
  cardType?: "visa" | "mastercard" | "amex" | "discover" | "other";
  cardLastFour?: string;
  transactionId?: string;
  amount: number;
  taxAmount?: number;
  discountAmount?: number;
  netAmount: number;
  status: "pending" | "completed" | "failed" | "refunded" | "partially_paid";
  paymentDate: Date;
  collectedBy: mongoose.Types.ObjectId;
  department?: "consultation" | "pharmacy" | "laboratory" | "radiology" | "admission" | "other";
  serviceType?: string;
  notes?: string;
  refundedAmount?: number;
  refundedDate?: Date;
  refundedBy?: mongoose.Types.ObjectId;
  refundReason?: string;
  insuranceClaimId?: string;
  insuranceStatus?: "pending" | "approved" | "rejected" | "paid";
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    paymentId: {
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
    invoice: {
      type: Schema.Types.ObjectId,
      ref: "Invoice",
    },
    appointment: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "insurance", "online", "check", "bank_transfer"],
      required: true,
    },
    cardType: {
      type: String,
      enum: ["visa", "mastercard", "amex", "discover", "other"],
    },
    cardLastFour: {
      type: String,
      maxlength: 4,
    },
    transactionId: {
      type: String,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    netAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded", "partially_paid"],
      default: "pending",
    },
    paymentDate: {
      type: Date,
      default: Date.now,
    },
    collectedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    department: {
      type: String,
      enum: ["consultation", "pharmacy", "laboratory", "radiology", "admission", "other"],
    },
    serviceType: {
      type: String,
    },
    notes: {
      type: String,
    },
    refundedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    refundedDate: {
      type: Date,
    },
    refundedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    refundReason: {
      type: String,
    },
    insuranceClaimId: {
      type: String,
    },
    insuranceStatus: {
      type: String,
      enum: ["pending", "approved", "rejected", "paid"],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
paymentSchema.index({ paymentId: 1 });
paymentSchema.index({ patient: 1 });
paymentSchema.index({ paymentDate: -1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ paymentMethod: 1 });
paymentSchema.index({ collectedBy: 1 });
paymentSchema.index({ department: 1 });
paymentSchema.index({ createdAt: -1 });

// Compound indexes for common queries
paymentSchema.index({ patient: 1, status: 1 });
paymentSchema.index({ paymentDate: 1, department: 1 });
paymentSchema.index({ collectedBy: 1, paymentDate: -1 });

// Pre-save hook to generate payment ID and calculate net amount
paymentSchema.pre("save", function (next) {
  // Generate payment ID if not exists
  if (!this.paymentId || this.isNew) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const random = Math.floor(1000 + Math.random() * 9000);
    this.paymentId = `PAY${year}${month}${random}`;
  }

  // Calculate net amount
  if (this.isModified("amount") || this.isModified("taxAmount") || this.isModified("discountAmount")) {
    const tax = this.taxAmount || 0;
    const discount = this.discountAmount || 0;
    this.netAmount = this.amount + tax - discount;
  }

  // If payment is refunded, update status
  if (this.refundedAmount && this.refundedAmount > 0) {
    if (this.refundedAmount === this.netAmount) {
      this.status = "refunded";
    } else if (this.refundedAmount < this.netAmount) {
      this.status = "partially_paid";
    }
  }

  // Set cardLastFour if not provided but cardType exists
  if (this.paymentMethod === "card" && this.cardType && !this.cardLastFour) {
    this.cardLastFour = "****";
  }

  next();
});

// Virtual for formatted amount
paymentSchema.virtual("formattedAmount").get(function () {
  return `$${this.amount.toFixed(2)}`;
});

// Virtual for formatted net amount
paymentSchema.virtual("formattedNetAmount").get(function () {
  return `$${this.netAmount.toFixed(2)}`;
});

// Static methods
paymentSchema.statics.findByPatientId = function (patientId: string) {
  return this.find({ patient: patientId }).sort({ paymentDate: -1 });
};

paymentSchema.statics.findTodayPayments = function (date?: Date) {
  const targetDate = date || new Date();
  const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
  const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
  
  return this.find({
    paymentDate: { $gte: startOfDay, $lt: endOfDay },
    status: "completed",
  });
};

paymentSchema.statics.calculateDailyRevenue = async function (date?: Date) {
  const targetDate = date || new Date();
  const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
  const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
  
  const result = await this.aggregate([
    {
      $match: {
        paymentDate: { $gte: startOfDay, $lt: endOfDay },
        status: "completed",
      },
    },
    {
      $group: {
        _id: {
          department: "$department",
          paymentMethod: "$paymentMethod",
        },
        totalAmount: { $sum: "$amount" },
        totalNetAmount: { $sum: "$netAmount" },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { totalNetAmount: -1 },
    },
  ]);
  
  return result;
};

// Instance methods
paymentSchema.methods.markAsRefunded = function (
  refundAmount: number,
  refundedBy: string,
  reason?: string
) {
  this.refundedAmount = refundAmount;
  this.refundedBy = new mongoose.Types.ObjectId(refundedBy);
  this.refundedDate = new Date();
  this.refundReason = reason;
  
  if (refundAmount === this.netAmount) {
    this.status = "refunded";
  } else if (refundAmount < this.netAmount) {
    this.status = "partially_paid";
  }
  
  return this.save();
};

// JSON transformation
paymentSchema.set("toJSON", {
  virtuals: true,
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete (ret as any)._id;
    delete (ret as any).__v;
    return ret;
  },
});

export const Payment = models.Payment || model<IPayment>("Payment", paymentSchema);
