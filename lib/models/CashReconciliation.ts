// lib/models/CashReconciliation.ts

import mongoose, { Schema, model, models } from "mongoose";

export interface ICashReconciliation extends mongoose.Document {
  reconciliationId: string;
  date: Date;
  shift: "morning" | "afternoon" | "evening" | "night" | "full_day";
  startTime: Date;
  endTime: Date;
  
  // Opening Balance
  openingBalance: number;
  openingVerifiedBy?: mongoose.Types.ObjectId;
  openingNotes?: string;
  
  // Cash In (Receipts)
  cashReceipts: {
    cashPayments: number;
    cardPayments: number;
    insurancePayments: number;
    onlinePayments: number;
    otherPayments: number;
    totalReceipts: number;
  };
  
  // Cash Out (Disbursements)
  cashDisbursements: {
    refunds: number;
    expenses: number;
    pettyCash: number;
    bankDeposit: number;
    otherDisbursements: number;
    totalDisbursements: number;
  };
  
  // Calculated Totals
  expectedCashBalance: number;
  actualCashCount: number;
  discrepancy: number;
  discrepancyPercentage: number;
  
  // System Totals (from database)
  systemCashTotal: number;
  systemCardTotal: number;
  systemOnlineTotal: number;
  systemInsuranceTotal: number;
  
  // Verification
  reconciledBy: mongoose.Types.ObjectId;
  reconciledAt: Date;
  verifiedBy?: mongoose.Types.ObjectId;
  verifiedAt?: Date;
  verificationNotes?: string;
  
  // Status & Discrepancy Handling
  status: "pending" | "completed" | "verified" | "disputed" | "adjusted";
  discrepancyReason?: string;
  adjustmentMade?: boolean;
  adjustmentAmount?: number;
  adjustmentNotes?: string;
  
  // Supporting Documents
  cashCountSlipImage?: string;
  depositSlipImage?: string;
  supportingDocuments?: string[];
  
  // Location & Terminal
  terminalId?: string;
  location?: string;
  
  notes?: string;
  
  createdAt: Date;
  updatedAt: Date;
  
  // Optional fields that may be deleted in transform
  __v?: number;
}

const cashReconciliationSchema = new Schema<ICashReconciliation>(
  {
    reconciliationId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    date: {
      type: Date,
      required: true,
    },
    shift: {
      type: String,
      enum: ["morning", "afternoon", "evening", "night", "full_day"],
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      default: Date.now,
    },
    
    // Opening Balance
    openingBalance: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    openingVerifiedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    openingNotes: {
      type: String,
    },
    
    // Cash In (Receipts)
    cashReceipts: {
      cashPayments: {
        type: Number,
        default: 0,
        min: 0,
      },
      cardPayments: {
        type: Number,
        default: 0,
        min: 0,
      },
      insurancePayments: {
        type: Number,
        default: 0,
        min: 0,
      },
      onlinePayments: {
        type: Number,
        default: 0,
        min: 0,
      },
      otherPayments: {
        type: Number,
        default: 0,
        min: 0,
      },
      totalReceipts: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    
    // Cash Out (Disbursements)
    cashDisbursements: {
      refunds: {
        type: Number,
        default: 0,
        min: 0,
      },
      expenses: {
        type: Number,
        default: 0,
        min: 0,
      },
      pettyCash: {
        type: Number,
        default: 0,
        min: 0,
      },
      bankDeposit: {
        type: Number,
        default: 0,
        min: 0,
      },
      otherDisbursements: {
        type: Number,
        default: 0,
        min: 0,
      },
      totalDisbursements: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    
    // Calculated Totals
    expectedCashBalance: {
      type: Number,
      default: 0,
    },
    actualCashCount: {
      type: Number,
      required: true,
      min: 0,
    },
    discrepancy: {
      type: Number,
      default: 0,
    },
    discrepancyPercentage: {
      type: Number,
      default: 0,
    },
    
    // System Totals
    systemCashTotal: {
      type: Number,
      default: 0,
      min: 0,
    },
    systemCardTotal: {
      type: Number,
      default: 0,
      min: 0,
    },
    systemOnlineTotal: {
      type: Number,
      default: 0,
      min: 0,
    },
    systemInsuranceTotal: {
      type: Number,
      default: 0,
      min: 0,
    },
    
    // Verification
    reconciledBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reconciledAt: {
      type: Date,
      default: Date.now,
    },
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    verifiedAt: {
      type: Date,
    },
    verificationNotes: {
      type: String,
    },
    
    // Status & Discrepancy Handling
    status: {
      type: String,
      enum: ["pending", "completed", "verified", "disputed", "adjusted"],
      default: "pending",
    },
    discrepancyReason: {
      type: String,
    },
    adjustmentMade: {
      type: Boolean,
      default: false,
    },
    adjustmentAmount: {
      type: Number,
      default: 0,
    },
    adjustmentNotes: {
      type: String,
    },
    
    // Supporting Documents
    cashCountSlipImage: {
      type: String,
    },
    depositSlipImage: {
      type: String,
    },
    supportingDocuments: [{
      type: String,
    }],
    
    // Location & Terminal
    terminalId: {
      type: String,
    },
    location: {
      type: String,
    },
    
    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
cashReconciliationSchema.index({ reconciliationId: 1 });
cashReconciliationSchema.index({ date: 1, shift: 1 });
cashReconciliationSchema.index({ reconciledBy: 1 });
cashReconciliationSchema.index({ status: 1 });
cashReconciliationSchema.index({ createdAt: -1 });
cashReconciliationSchema.index({ discrepancy: 1 });

// Compound indexes for common queries
cashReconciliationSchema.index({ date: 1, status: 1 });
cashReconciliationSchema.index({ reconciledBy: 1, date: -1 });
cashReconciliationSchema.index({ date: 1, shift: 1, status: 1 });

// Pre-save hooks
cashReconciliationSchema.pre("save", function (next) {
  // Generate reconciliation ID if not exists
  if (!this.reconciliationId || this.isNew) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const random = Math.floor(100 + Math.random() * 900);
    this.reconciliationId = `CR${year}${month}${day}${random}`;
  }

  // Calculate total receipts
  this.cashReceipts.totalReceipts = 
    (this.cashReceipts.cashPayments || 0) +
    (this.cashReceipts.cardPayments || 0) +
    (this.cashReceipts.insurancePayments || 0) +
    (this.cashReceipts.onlinePayments || 0) +
    (this.cashReceipts.otherPayments || 0);

  // Calculate total disbursements
  this.cashDisbursements.totalDisbursements = 
    (this.cashDisbursements.refunds || 0) +
    (this.cashDisbursements.expenses || 0) +
    (this.cashDisbursements.pettyCash || 0) +
    (this.cashDisbursements.bankDeposit || 0) +
    (this.cashDisbursements.otherDisbursements || 0);

  // Calculate expected cash balance
  this.expectedCashBalance = 
    (this.openingBalance || 0) +
    (this.cashReceipts.totalReceipts || 0) -
    (this.cashDisbursements.totalDisbursements || 0);

  // Calculate discrepancy
  this.discrepancy = (this.actualCashCount || 0) - (this.expectedCashBalance || 0);

  // Calculate discrepancy percentage
  if (this.expectedCashBalance > 0) {
    this.discrepancyPercentage = (Math.abs(this.discrepancy) / this.expectedCashBalance) * 100;
  }

  // Set end time if not provided
  if (!this.endTime) {
    this.endTime = new Date();
  }

  // Auto-update status based on completion
  if (this.actualCashCount !== undefined && this.actualCashCount !== null) {
    if (this.status === "pending") {
      this.status = "completed";
    }
  }

  next();
});

// Virtual properties
cashReconciliationSchema.virtual("shiftName").get(function () {
  const shiftNames: Record<string, string> = {
    morning: "Morning Shift (6 AM - 2 PM)",
    afternoon: "Afternoon Shift (2 PM - 10 PM)",
    evening: "Evening Shift (4 PM - 12 AM)",
    night: "Night Shift (10 PM - 6 AM)",
    full_day: "Full Day (24 Hours)",
  };
  return shiftNames[this.shift] || this.shift;
});

cashReconciliationSchema.virtual("formattedDate").get(function () {
  return this.date.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
});

cashReconciliationSchema.virtual("shiftDuration").get(function () {
  if (this.startTime && this.endTime) {
    const duration = this.endTime.getTime() - this.startTime.getTime();
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }
  return "N/A";
});

cashReconciliationSchema.virtual("isDiscrepancySignificant").get(function () {
  // Consider discrepancy significant if > 1% of expected balance or > $10
  return Math.abs(this.discrepancy) > 10 || this.discrepancyPercentage > 1;
});

cashReconciliationSchema.virtual("discrepancyStatus").get(function () {
  if (this.discrepancy === 0) return "perfect";
  if (Math.abs(this.discrepancy) <= 5) return "minor";
  if (Math.abs(this.discrepancy) <= 20) return "moderate";
  return "major";
});

// Static methods
cashReconciliationSchema.statics.findTodayReconciliation = async function (userId?: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const query: any = { date: { $gte: today } };
  if (userId) {
    query.reconciledBy = userId;
  }
  
  return this.findOne(query)
    .populate("reconciledBy", "name email role")
    .populate("verifiedBy", "name email role")
    .populate("openingVerifiedBy", "name email role")
    .sort({ createdAt: -1 });
};

cashReconciliationSchema.statics.findByDateRange = function (startDate: Date, endDate: Date) {
  return this.find({
    date: { $gte: startDate, $lte: endDate },
  })
    .populate("reconciledBy", "name email")
    .sort({ date: -1, createdAt: -1 });
};

cashReconciliationSchema.statics.getDailySummary = async function (date: Date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  return this.aggregate([
    {
      $match: {
        date: { $gte: startOfDay, $lte: endOfDay },
        status: { $in: ["completed", "verified"] },
      },
    },
    {
      $group: {
        _id: null,
        totalCashCount: { $sum: "$actualCashCount" },
        totalExpected: { $sum: "$expectedCashBalance" },
        totalDiscrepancy: { $sum: "$discrepancy" },
        totalCashIn: { $sum: "$cashReceipts.totalReceipts" },
        totalCashOut: { $sum: "$cashDisbursements.totalDisbursements" },
        count: { $sum: 1 },
      },
    },
  ]);
};

cashReconciliationSchema.statics.verifyReconciliation = async function (
  reconciliationId: string,
  verifiedBy: string,
  notes?: string
) {
  const reconciliation = await this.findOne({ reconciliationId });
  
  if (!reconciliation) {
    throw new Error("Reconciliation not found");
  }
  
  if (reconciliation.status !== "completed") {
    throw new Error(`Cannot verify reconciliation with status: ${reconciliation.status}`);
  }
  
  reconciliation.verifiedBy = new mongoose.Types.ObjectId(verifiedBy);
  reconciliation.verifiedAt = new Date();
  reconciliation.verificationNotes = notes;
  reconciliation.status = "verified";
  
  return reconciliation.save();
};

cashReconciliationSchema.statics.addAdjustment = async function (
  reconciliationId: string,
  adjustmentAmount: number,
  notes?: string
) {
  const reconciliation = await this.findOne({ reconciliationId });
  
  if (!reconciliation) {
    throw new Error("Reconciliation not found");
  }
  
  reconciliation.adjustmentMade = true;
  reconciliation.adjustmentAmount = adjustmentAmount;
  reconciliation.adjustmentNotes = notes;
  reconciliation.status = "adjusted";
  
  // Update actual cash count with adjustment
  reconciliation.actualCashCount += adjustmentAmount;
  
  // Recalculate discrepancy
  reconciliation.discrepancy = reconciliation.actualCashCount - reconciliation.expectedCashBalance;
  
  return reconciliation.save();
};

// Instance methods
cashReconciliationSchema.methods.getCashFlowSummary = function () {
  return {
    openingBalance: this.openingBalance,
    totalReceipts: this.cashReceipts.totalReceipts,
    totalDisbursements: this.cashDisbursements.totalDisbursements,
    expectedBalance: this.expectedCashBalance,
    actualCount: this.actualCashCount,
    discrepancy: this.discrepancy,
    discrepancyPercentage: this.discrepancyPercentage,
  };
};

cashReconciliationSchema.methods.exportToCSV = function () {
  const data = {
    "Reconciliation ID": this.reconciliationId,
    Date: this.formattedDate,
    Shift: this.shiftName,
    "Reconciled By": (this.reconciledBy as any)?.name || "N/A",
    "Opening Balance": this.openingBalance.toFixed(2),
    "Cash Payments": this.cashReceipts.cashPayments.toFixed(2),
    "Card Payments": this.cashReceipts.cardPayments.toFixed(2),
    "Total Receipts": this.cashReceipts.totalReceipts.toFixed(2),
    "Refunds": this.cashDisbursements.refunds.toFixed(2),
    "Expenses": this.cashDisbursements.expenses.toFixed(2),
    "Total Disbursements": this.cashDisbursements.totalDisbursements.toFixed(2),
    "Expected Balance": this.expectedCashBalance.toFixed(2),
    "Actual Count": this.actualCashCount.toFixed(2),
    "Discrepancy": this.discrepancy.toFixed(2),
    "Discrepancy %": this.discrepancyPercentage.toFixed(2) + "%",
    Status: this.status,
    Notes: this.notes || "",
  };
  
  return Object.entries(data)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
};

// Middleware
cashReconciliationSchema.post("save", function (doc, next) {
  console.log(`Cash reconciliation ${doc.reconciliationId} saved with status: ${doc.status}`);
  next();
});

// JSON transformation
cashReconciliationSchema.set("toJSON", {
  virtuals: true,
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete (ret as any)._id;
    delete ret.__v;
    
    // Remove internal fields if needed
    if (ret.supportingDocuments && ret.supportingDocuments.length === 0) {
      delete ret.supportingDocuments;
    }
    
    return ret;
  },
});

// Ensure virtuals are included in toObject
cashReconciliationSchema.set("toObject", { virtuals: true });

export const CashReconciliation = models.CashReconciliation || 
  model<ICashReconciliation>("CashReconciliation", cashReconciliationSchema);
