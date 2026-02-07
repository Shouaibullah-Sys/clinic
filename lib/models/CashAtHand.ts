// lib/models/CashAtHand.ts
import mongoose, { Schema, model, models, Document } from "mongoose";
import { IUser } from "./User";

export interface ICashAtHand extends Document {
  transactionId: string;
  staff: mongoose.Types.ObjectId | IUser;
  cashierName: string;
  cashierId: string;
  shift: "morning" | "evening" | "night";
  date: Date;
  transactionType:
    | "opening"
    | "closing"
    | "deposit"
    | "withdrawal"
    | "adjustment"
    | "transfer";

  // Cash denominations (physical money counting)
  denominations: {
    // Notes
    thousand: number; // 1000
    fiveHundred: number; // 500
    twoHundred: number; // 200
    oneHundred: number; // 100
    fifty: number; // 50
    twenty: number; // 20
    ten: number; // 10
    five: number; // 5
    // Coins
    two: number; // 2
    one: number; // 1
    half: number; // 0.50
    quarter: number; // 0.25
    tenCents: number; // 0.10
    fiveCents: number; // 0.05
  };

  // Calculated totals
  calculatedTotal: number; // Sum of denominations
  declaredAmount: number; // Amount declared by cashier
  variance: number; // Difference between calculated and declared

  // Transaction details
  amount: number; // Transaction amount (for deposits/withdrawals)
  previousBalance: number;
  newBalance: number;

  // Sources/Destinations
  source?: string; // For deposits: "patient_payment", "insurance", "other"
  destination?: string; // For withdrawals: "bank_deposit", "petty_cash", "supplier_payment"
  referenceNumber?: string;

  // Verification
  verifiedBy?: mongoose.Types.ObjectId | IUser;
  verifiedByName?: string;
  verificationTime?: Date;
  verificationStatus: "pending" | "verified" | "discrepancy" | "rejected";

  // Discrepancy handling
  discrepancyNotes?: string;
  discrepancyResolved: boolean;
  resolvedBy?: mongoose.Types.ObjectId | IUser;
  resolutionNotes?: string;

  // Supporting documents
  receiptNumber?: string;
  supportingDocs?: string[]; // URLs to scanned documents

  // Audit trail
  status: "active" | "cancelled" | "voided";
  cancelledBy?: mongoose.Types.ObjectId | IUser;
  cancellationReason?: string;

  notes?: string;
  createdAt: Date;
  updatedAt: Date;

  // Updated by tracking (for edits)
  updatedBy?: mongoose.Types.ObjectId | IUser;
  updatedByName?: string;

  // Virtuals
  cashierInfo: any;
  verifierInfo: any;
}

const CashAtHandSchema = new Schema<ICashAtHand>(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    staff: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    cashierName: {
      type: String,
      required: true,
      trim: true,
    },
    cashierId: {
      type: String,
      required: true,
      trim: true,
    },
    shift: {
      type: String,
      enum: ["morning", "evening", "night"],
      required: true,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    transactionType: {
      type: String,
      enum: [
        "opening",
        "closing",
        "deposit",
        "withdrawal",
        "adjustment",
        "transfer",
      ],
      required: true,
    },

    // Cash denominations
    denominations: {
      thousand: { type: Number, default: 0, min: 0 },
      fiveHundred: { type: Number, default: 0, min: 0 },
      twoHundred: { type: Number, default: 0, min: 0 },
      oneHundred: { type: Number, default: 0, min: 0 },
      fifty: { type: Number, default: 0, min: 0 },
      twenty: { type: Number, default: 0, min: 0 },
      ten: { type: Number, default: 0, min: 0 },
      five: { type: Number, default: 0, min: 0 },
      two: { type: Number, default: 0, min: 0 },
      one: { type: Number, default: 0, min: 0 },
      half: { type: Number, default: 0, min: 0 },
      quarter: { type: Number, default: 0, min: 0 },
      tenCents: { type: Number, default: 0, min: 0 },
      fiveCents: { type: Number, default: 0, min: 0 },
    },

    // Calculated amounts
    calculatedTotal: {
      type: Number,
      default: 0,
      min: 0,
    },
    declaredAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    variance: {
      type: Number,
      default: 0,
    },

    // Transaction amounts
    amount: {
      type: Number,
      default: 0,
      min: 0,
    },
    previousBalance: {
      type: Number,
      default: 0,
    },
    newBalance: {
      type: Number,
      default: 0,
    },

    // Transaction details
    source: {
      type: String,
      trim: true,
    },
    destination: {
      type: String,
      trim: true,
    },
    referenceNumber: {
      type: String,
      trim: true,
    },

    // Verification
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    verifiedByName: {
      type: String,
      trim: true,
    },
    verificationTime: {
      type: Date,
    },
    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "discrepancy", "rejected"],
      default: "pending",
    },

    // Discrepancy handling
    discrepancyNotes: {
      type: String,
      trim: true,
    },
    discrepancyResolved: {
      type: Boolean,
      default: false,
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    resolutionNotes: {
      type: String,
      trim: true,
    },

    // Supporting documents
    receiptNumber: {
      type: String,
      trim: true,
    },
    supportingDocs: [
      {
        type: String,
        trim: true,
      },
    ],

    // Audit trail
    status: {
      type: String,
      enum: ["active", "cancelled", "voided"],
      default: "active",
    },
    cancelledBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    cancellationReason: {
      type: String,
      trim: true,
    },

    notes: {
      type: String,
      trim: true,
    },

    // Updated by tracking (for edits)
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    updatedByName: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes for efficient querying
CashAtHandSchema.index({ transactionId: 1 });
CashAtHandSchema.index({ staff: 1 });
CashAtHandSchema.index({ date: -1 });
CashAtHandSchema.index({ transactionType: 1 });
CashAtHandSchema.index({ shift: 1 });
CashAtHandSchema.index({ verificationStatus: 1 });
CashAtHandSchema.index({ status: 1 });
CashAtHandSchema.index({ cashierId: 1, date: -1 });
CashAtHandSchema.index({ "denominations.calculatedTotal": 1 });
CashAtHandSchema.index({ variance: 1 });

// Virtuals
CashAtHandSchema.virtual("cashierInfo", {
  ref: "User",
  localField: "staff",
  foreignField: "_id",
  justOne: true,
});

CashAtHandSchema.virtual("verifierInfo", {
  ref: "User",
  localField: "verifiedBy",
  foreignField: "_id",
  justOne: true,
});

// Virtual for formatted date
CashAtHandSchema.virtual("formattedDate").get(function () {
  return this.date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
});

// Virtual for shift timing
CashAtHandSchema.virtual("shiftTiming").get(function () {
  const timings = {
    morning: "06:00 AM - 02:00 PM",
    evening: "02:00 PM - 10:00 PM",
    night: "10:00 PM - 06:00 AM",
  };
  return timings[this.shift as keyof typeof timings] || this.shift;
});

// Pre-save middleware to calculate totals and variance
CashAtHandSchema.pre("save", function (next) {
  // Calculate total from denominations
  const denom = this.denominations;
  this.calculatedTotal =
    denom.thousand * 1000 +
    denom.fiveHundred * 500 +
    denom.twoHundred * 200 +
    denom.oneHundred * 100 +
    denom.fifty * 50 +
    denom.twenty * 20 +
    denom.ten * 10 +
    denom.five * 5 +
    denom.two * 2 +
    denom.one * 1 +
    denom.half * 0.5 +
    denom.quarter * 0.25 +
    denom.tenCents * 0.1 +
    denom.fiveCents * 0.05;

  // Calculate variance
  this.variance = this.calculatedTotal - this.declaredAmount;

  // Auto-generate transaction ID if not provided
  if (!this.transactionId) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const random = Math.floor(1000 + Math.random() * 9000);
    this.transactionId = `CASH${year}${month}${day}${random}`;
  }

  // For opening balance, amount should equal declared amount
  if (this.transactionType === "opening") {
    this.amount = this.declaredAmount;
    this.previousBalance = 0;
    this.newBalance = this.declaredAmount;
  }

  // For closing balance
  if (this.transactionType === "closing") {
    this.amount = this.declaredAmount;
  }

  // Update verification status based on variance
  if (this.variance !== 0 && this.verificationStatus === "pending") {
    this.verificationStatus = "discrepancy";
  }

  next();
});

// Static methods
CashAtHandSchema.statics.findByCashierId = function (
  cashierId: string,
  startDate?: Date,
  endDate?: Date,
) {
  const query: any = { cashierId };
  if (startDate && endDate) {
    query.date = { $gte: startDate, $lte: endDate };
  }
  return this.find(query).sort({ date: -1 });
};

CashAtHandSchema.statics.getCashSummary = async function (date: Date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const transactions = await this.find({
    date: { $gte: startOfDay, $lte: endOfDay },
    status: "active",
  }).sort({ date: 1 });

  let openingBalance = 0;
  let closingBalance = 0;
  let totalDeposits = 0;
  let totalWithdrawals = 0;
  const cashierSummaries: Record<string, any> = {};

  transactions.forEach((txn: ICashAtHand) => {
    if (txn.transactionType === "opening") {
      openingBalance = txn.amount;
    } else if (txn.transactionType === "closing") {
      closingBalance = txn.amount;
    } else if (txn.transactionType === "deposit") {
      totalDeposits += txn.amount;
    } else if (txn.transactionType === "withdrawal") {
      totalWithdrawals += txn.amount;
    }

    // Track by cashier
    if (!cashierSummaries[txn.cashierId]) {
      cashierSummaries[txn.cashierId] = {
        cashierName: txn.cashierName,
        openingCount: 0,
        closingCount: 0,
        depositCount: 0,
        withdrawalCount: 0,
        totalTransactions: 0,
        totalVariance: 0,
      };
    }

    cashierSummaries[txn.cashierId].totalTransactions++;
    if (txn.variance) {
      cashierSummaries[txn.cashierId].totalVariance += Math.abs(txn.variance);
    }

    if (txn.transactionType === "opening")
      cashierSummaries[txn.cashierId].openingCount++;
    if (txn.transactionType === "closing")
      cashierSummaries[txn.cashierId].closingCount++;
    if (txn.transactionType === "deposit")
      cashierSummaries[txn.cashierId].depositCount++;
    if (txn.transactionType === "withdrawal")
      cashierSummaries[txn.cashierId].withdrawalCount++;
  });

  const expectedBalance = openingBalance + totalDeposits - totalWithdrawals;

  return {
    date,
    openingBalance,
    closingBalance,
    totalDeposits,
    totalWithdrawals,
    expectedBalance,
    variance: closingBalance - expectedBalance,
    transactionCount: transactions.length,
    cashierSummaries: Object.values(cashierSummaries),
  };
};

CashAtHandSchema.statics.findDiscrepancies = function (
  startDate: Date,
  endDate: Date,
) {
  return this.find({
    date: { $gte: startDate, $lte: endDate },
    verificationStatus: "discrepancy",
    status: "active",
  }).sort({ date: -1 });
};

// Instance methods
CashAtHandSchema.methods.verifyTransaction = async function (
  verifierId: mongoose.Types.ObjectId,
  verifierName: string,
) {
  this.verifiedBy = verifierId;
  this.verifiedByName = verifierName;
  this.verificationTime = new Date();

  if (this.variance === 0) {
    this.verificationStatus = "verified";
    this.discrepancyResolved = true;
    this.resolvedBy = verifierId;
    this.resolutionNotes = "Variance resolved during verification";
  }

  return this.save();
};

CashAtHandSchema.methods.resolveDiscrepancy = async function (
  resolverId: mongoose.Types.ObjectId,
  notes: string,
) {
  this.discrepancyResolved = true;
  this.resolvedBy = resolverId;
  this.resolutionNotes = notes;
  this.verificationStatus = "verified";

  // Create adjustment transaction if needed
  if (this.variance !== 0) {
    const CashAtHand = this.constructor as any;
    const adjustment = new CashAtHand({
      staff: this.staff,
      cashierName: this.cashierName,
      cashierId: this.cashierId,
      shift: this.shift,
      date: new Date(),
      transactionType: "adjustment",
      denominations: { ...this.denominations },
      declaredAmount: this.calculatedTotal, // Use calculated total as declared
      amount: Math.abs(this.variance),
      previousBalance: this.newBalance,
      newBalance:
        this.variance > 0
          ? this.newBalance + this.variance
          : this.newBalance - Math.abs(this.variance),
      source: this.variance > 0 ? "variance_addition" : "variance_deduction",
      notes: `Adjustment for variance in transaction ${this.transactionId}: ${notes}`,
      verificationStatus: "verified",
      verifiedBy: resolverId,
      verifiedByName: "System Auto-Verified",
      verificationTime: new Date(),
      discrepancyResolved: true,
    });

    await adjustment.save();
  }

  return this.save();
};

CashAtHandSchema.methods.cancelTransaction = async function (
  cancelledById: mongoose.Types.ObjectId,
  reason: string,
) {
  this.status = "cancelled";
  this.cancelledBy = cancelledById;
  this.cancellationReason = reason;
  return this.save();
};

// Interface for static methods
interface CashAtHandModel extends mongoose.Model<ICashAtHand> {
  findByCashierId(
    cashierId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<ICashAtHand[]>;
  getCashSummary(date: Date): Promise<any>;
  findDiscrepancies(startDate: Date, endDate: Date): Promise<ICashAtHand[]>;
}

export const CashAtHand = (models.CashAtHand ||
  model<ICashAtHand, CashAtHandModel>(
    "CashAtHand",
    CashAtHandSchema,
  )) as CashAtHandModel;

// Supporting models for cash management
