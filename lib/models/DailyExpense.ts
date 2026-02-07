// lib/models/DailyExpense.ts
import mongoose, { Schema, model, models, Document } from "mongoose";
import { IUser } from "./User";

export interface IDailyExpense extends Document {
  expenseId: string;
  staff: mongoose.Types.ObjectId | IUser;
  staffName: string;
  date: Date;
  category:
    | "supplies"
    | "maintenance"
    | "utilities"
    | "miscellaneous"
    | "food"
    | "transport";
  description: string;
  amount: number;
  receiptNumber?: string;
  status: "pending" | "approved";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DailyExpenseSchema = new Schema<IDailyExpense>(
  {
    expenseId: {
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
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    category: {
      type: String,
      enum: [
        "supplies",
        "maintenance",
        "utilities",
        "miscellaneous",
        "food",
        "transport",
      ],
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    receiptNumber: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved"],
      default: "pending",
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
DailyExpenseSchema.index({ expenseId: 1 });
DailyExpenseSchema.index({ staff: 1 });
DailyExpenseSchema.index({ date: -1 });
DailyExpenseSchema.index({ category: 1 });
DailyExpenseSchema.index({ status: 1 });

// Virtual for formatted date
DailyExpenseSchema.virtual("formattedDate").get(function () {
  return this.date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
});

// Virtual for formatted amount
DailyExpenseSchema.virtual("formattedAmount").get(function () {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(this.amount);
});

// Pre-save middleware to auto-generate expense ID
DailyExpenseSchema.pre("save", function (next) {
  // Auto-generate expense ID if not provided
  if (!this.expenseId) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const random = Math.floor(1000 + Math.random() * 9000);
    this.expenseId = `EXP${year}${month}${day}${random}`;
  }

  next();
});

// Static methods
DailyExpenseSchema.statics.findByStaffId = function (
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

DailyExpenseSchema.statics.findByStatus = function (
  status: "pending" | "approved",
) {
  return this.find({ status }).sort({ date: -1 });
};

DailyExpenseSchema.statics.findByCategory = function (
  category: string,
  startDate?: Date,
  endDate?: Date,
) {
  const query: any = { category };
  if (startDate && endDate) {
    query.date = { $gte: startDate, $lte: endDate };
  }
  return this.find(query).sort({ date: -1 });
};

DailyExpenseSchema.statics.getExpenseSummary = async function (
  startDate: Date,
  endDate: Date,
) {
  const startOfDay = new Date(startDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(endDate);
  endOfDay.setHours(23, 59, 59, 999);

  const expenses = await this.find({
    date: { $gte: startOfDay, $lte: endOfDay },
  }).sort({ date: -1 });

  const summary: Record<string, number> = {
    supplies: 0,
    maintenance: 0,
    utilities: 0,
    miscellaneous: 0,
    food: 0,
    transport: 0,
  };

  let totalExpenses = 0;
  let pendingCount = 0;
  let approvedCount = 0;

  expenses.forEach((expense: IDailyExpense) => {
    if (summary[expense.category] !== undefined) {
      summary[expense.category] += expense.amount;
    }
    totalExpenses += expense.amount;

    if (expense.status === "pending") {
      pendingCount++;
    } else if (expense.status === "approved") {
      approvedCount++;
    }
  });

  return {
    expenses,
    summary,
    totalExpenses,
    pendingCount,
    approvedCount,
    expenseCount: expenses.length,
  };
};

DailyExpenseSchema.statics.approveExpense = async function (expenseId: string) {
  return this.findOneAndUpdate(
    { expenseId },
    { status: "approved" },
    { new: true },
  );
};

// Instance methods
DailyExpenseSchema.methods.approve = async function () {
  this.status = "approved";
  return this.save();
};

DailyExpenseSchema.methods.reject = async function (notes: string) {
  this.status = "pending";
  this.notes = notes;
  return this.save();
};

// Interface for static methods
interface DailyExpenseModel extends mongoose.Model<IDailyExpense> {
  findByStaffId(
    staffId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<IDailyExpense[]>;
  findByStatus(status: "pending" | "approved"): Promise<IDailyExpense[]>;
  findByCategory(
    category: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<IDailyExpense[]>;
  getExpenseSummary(startDate: Date, endDate: Date): Promise<any>;
  approveExpense(expenseId: string): Promise<IDailyExpense | null>;
}

export const DailyExpense = (models.DailyExpense ||
  model<IDailyExpense, DailyExpenseModel>(
    "DailyExpense",
    DailyExpenseSchema,
  )) as DailyExpenseModel;
