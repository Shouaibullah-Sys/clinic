// lib/models/DailyCashCollection.ts
import mongoose, { Schema, model, models, Document } from "mongoose";
import { IUser } from "./User";

export interface IDailyCashCollection extends Document {
  collectionId: string;
  staff: mongoose.Types.ObjectId | IUser;
  staffName: string;
  shift: "morning" | "evening" | "night";
  date: Date;

  // Cash details
  totalExpectedAmount: number;
  totalDeclaredAmount: number;
  discrepancy: number;
  discrepancyPercentage: number;

  // Breakdown
  cashFromAppointments: number;
  cashFromLab: number;
  cashFromRadiology: number;
  cashFromDischarge: number;
  totalDiscounts: number;
  totalExpenses: number;

  // Transaction references
  transactionIds: string[]; // References to CashAtHand transaction IDs

  // Approval workflow
  status: "submitted" | "pending_review" | "approved" | "rejected";
  submittedAt: Date;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedByName?: string;
  reviewedAt?: Date;
  approvalNotes?: string;

  // Final collection
  collectedAmount: number;
  collectedAt?: Date;

  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DailyCashCollectionSchema = new Schema<IDailyCashCollection>(
  {
    collectionId: {
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
    staffName: {
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
    },

    // Cash details
    totalExpectedAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    totalDeclaredAmount: {
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

    // Breakdown
    cashFromAppointments: {
      type: Number,
      default: 0,
      min: 0,
    },
    cashFromLab: {
      type: Number,
      default: 0,
      min: 0,
    },
    cashFromRadiology: {
      type: Number,
      default: 0,
      min: 0,
    },
    cashFromDischarge: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalDiscounts: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalExpenses: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Transaction references
    transactionIds: {
      type: [String],
      default: [],
    },

    // Approval workflow
    status: {
      type: String,
      enum: ["submitted", "pending_review", "approved", "rejected"],
      default: "submitted",
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedByName: {
      type: String,
      trim: true,
    },
    reviewedAt: {
      type: Date,
    },
    approvalNotes: {
      type: String,
      trim: true,
    },

    // Final collection
    collectedAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    collectedAt: {
      type: Date,
    },

    notes: {
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
DailyCashCollectionSchema.index({ collectionId: 1 });
DailyCashCollectionSchema.index({ staff: 1 });
DailyCashCollectionSchema.index({ date: -1 });
DailyCashCollectionSchema.index({ shift: 1 });
DailyCashCollectionSchema.index({ status: 1 });
DailyCashCollectionSchema.index({ createdAt: -1 });
DailyCashCollectionSchema.index({ discrepancy: 1 });

// Compound indexes for common queries
DailyCashCollectionSchema.index({ date: 1, status: 1 });
DailyCashCollectionSchema.index({ staff: 1, date: -1 });
DailyCashCollectionSchema.index({ date: 1, shift: 1, status: 1 });

// Virtual for formatted date
DailyCashCollectionSchema.virtual("formattedDate").get(function () {
  return this.date.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
});

// Virtual for shift name
DailyCashCollectionSchema.virtual("shiftName").get(function () {
  const shiftNames: Record<string, string> = {
    morning: "Morning Shift (6 AM - 2 PM)",
    evening: "Evening Shift (2 PM - 10 PM)",
    night: "Night Shift (10 PM - 6 AM)",
  };
  return shiftNames[this.shift] || this.shift;
});

// Virtual for discrepancy status
DailyCashCollectionSchema.virtual("discrepancyStatus").get(function () {
  if (this.discrepancy === 0) return "perfect";
  if (Math.abs(this.discrepancy) <= 10) return "minor";
  if (Math.abs(this.discrepancy) <= 50) return "moderate";
  return "major";
});

// Pre-save hooks
DailyCashCollectionSchema.pre("save", function (next) {
  // Generate collection ID if not exists
  if (!this.collectionId || this.isNew) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const random = Math.floor(1000 + Math.random() * 9000);
    this.collectionId = `DCC${year}${month}${day}${random}`;
  }

  // Calculate discrepancy
  this.discrepancy = this.totalDeclaredAmount - this.totalExpectedAmount;

  // Calculate discrepancy percentage
  if (this.totalExpectedAmount > 0) {
    this.discrepancyPercentage =
      (Math.abs(this.discrepancy) / this.totalExpectedAmount) * 100;
  }

  // Set collected amount to declared amount if not set
  if (this.isNew && !this.collectedAmount) {
    this.collectedAmount = this.totalDeclaredAmount;
  }

  // Set collected at when approved
  if (this.status === "approved" && !this.collectedAt) {
    this.collectedAt = new Date();
  }

  next();
});

// Static methods
DailyCashCollectionSchema.statics.findByStaffId = function (
  staffId: string,
  startDate?: Date,
  endDate?: Date,
) {
  const query: any = { staff: staffId };
  if (startDate && endDate) {
    query.date = { $gte: startDate, $lte: endDate };
  }
  return this.find(query).sort({ date: -1 });
};

DailyCashCollectionSchema.statics.findByStatus = function (
  status: "submitted" | "pending_review" | "approved" | "rejected",
) {
  return this.find({ status }).sort({ date: -1 });
};

DailyCashCollectionSchema.statics.findByDateRange = function (
  startDate: Date,
  endDate: Date,
) {
  return this.find({
    date: { $gte: startDate, $lte: endDate },
  })
    .populate("staff", "name email")
    .populate("reviewedBy", "name email")
    .sort({ date: -1, createdAt: -1 });
};

DailyCashCollectionSchema.statics.getDailySummary = async function (
  date: Date,
) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return this.aggregate([
    {
      $match: {
        date: { $gte: startOfDay, $lte: endOfDay },
        status: { $in: ["approved", "submitted"] },
      },
    },
    {
      $group: {
        _id: null,
        totalCollected: { $sum: "$collectedAmount" },
        totalExpected: { $sum: "$totalExpectedAmount" },
        totalDiscrepancy: { $sum: "$discrepancy" },
        totalCashIn: {
          $sum: {
            $add: [
              "$cashFromAppointments",
              "$cashFromLab",
              "$cashFromRadiology",
              "$cashFromDischarge",
            ],
          },
        },
        totalExpenses: { $sum: "$totalExpenses" },
        totalDiscounts: { $sum: "$totalDiscounts" },
        count: { $sum: 1 },
      },
    },
  ]);
};

DailyCashCollectionSchema.statics.approveCollection = async function (
  collectionId: string,
  reviewedBy: string,
  reviewedByName: string,
  notes?: string,
) {
  const collection = await this.findOne({ collectionId });

  if (!collection) {
    throw new Error("Collection not found");
  }

  if (collection.status === "approved") {
    throw new Error("Collection is already approved");
  }

  collection.reviewedBy = new mongoose.Types.ObjectId(reviewedBy);
  collection.reviewedByName = reviewedByName;
  collection.reviewedAt = new Date();
  collection.approvalNotes = notes;
  collection.status = "approved";
  collection.collectedAt = new Date();

  return collection.save();
};

DailyCashCollectionSchema.statics.rejectCollection = async function (
  collectionId: string,
  reviewedBy: string,
  reviewedByName: string,
  notes?: string,
) {
  const collection = await this.findOne({ collectionId });

  if (!collection) {
    throw new Error("Collection not found");
  }

  collection.reviewedBy = new mongoose.Types.ObjectId(reviewedBy);
  collection.reviewedByName = reviewedByName;
  collection.reviewedAt = new Date();
  collection.approvalNotes = notes;
  collection.status = "rejected";

  return collection.save();
};

// Instance methods
DailyCashCollectionSchema.methods.getCashFlowSummary = function () {
  return {
    totalExpected: this.totalExpectedAmount,
    totalDeclared: this.totalDeclaredAmount,
    discrepancy: this.discrepancy,
    discrepancyPercentage: this.discrepancyPercentage,
    cashFromAppointments: this.cashFromAppointments,
    cashFromLab: this.cashFromLab,
    cashFromRadiology: this.cashFromRadiology,
    cashFromDischarge: this.cashFromDischarge,
    totalDiscounts: this.totalDiscounts,
    totalExpenses: this.totalExpenses,
    collectedAmount: this.collectedAmount,
  };
};

DailyCashCollectionSchema.methods.exportToCSV = function () {
  const data = {
    "Collection ID": this.collectionId,
    Date: this.formattedDate,
    Shift: this.shiftName,
    "Staff Name": this.staffName,
    "Total Expected": this.totalExpectedAmount.toFixed(2),
    "Total Declared": this.totalDeclaredAmount.toFixed(2),
    Discrepancy: this.discrepancy.toFixed(2),
    "Discrepancy %": this.discrepancyPercentage.toFixed(2) + "%",
    "Cash from Appointments": this.cashFromAppointments.toFixed(2),
    "Cash from Lab": this.cashFromLab.toFixed(2),
    "Cash from Radiology": this.cashFromRadiology.toFixed(2),
    "Cash from Discharge": this.cashFromDischarge.toFixed(2),
    "Total Discounts": this.totalDiscounts.toFixed(2),
    "Total Expenses": this.totalExpenses.toFixed(2),
    "Collected Amount": this.collectedAmount.toFixed(2),
    Status: this.status,
    "Reviewed By": this.reviewedByName || "N/A",
    "Reviewed At": this.reviewedAt
      ? new Date(this.reviewedAt).toLocaleString()
      : "N/A",
    Notes: this.notes || "",
  };

  return Object.entries(data)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
};

// Interface for static methods
interface DailyCashCollectionModel extends mongoose.Model<IDailyCashCollection> {
  findByStaffId(
    staffId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<IDailyCashCollection[]>;
  findByStatus(
    status: "submitted" | "pending_review" | "approved" | "rejected",
  ): Promise<IDailyCashCollection[]>;
  findByDateRange(
    startDate: Date,
    endDate: Date,
  ): Promise<IDailyCashCollection[]>;
  getDailySummary(date: Date): Promise<any>;
  approveCollection(
    collectionId: string,
    reviewedBy: string,
    reviewedByName: string,
    notes?: string,
  ): Promise<IDailyCashCollection>;
  rejectCollection(
    collectionId: string,
    reviewedBy: string,
    reviewedByName: string,
    notes?: string,
  ): Promise<IDailyCashCollection>;
}

export const DailyCashCollection = (models.DailyCashCollection ||
  model<IDailyCashCollection, DailyCashCollectionModel>(
    "DailyCashCollection",
    DailyCashCollectionSchema,
  )) as DailyCashCollectionModel;
