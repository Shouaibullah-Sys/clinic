// lib/models/ReceptionExpense.ts
import mongoose, { Schema, model, models, Document } from "mongoose";
import { IUser } from "./User";

export interface IReceptionExpense extends Document {
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

const ReceptionExpenseSchema = new Schema<IReceptionExpense>(
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
ReceptionExpenseSchema.index({ staff: 1 });
ReceptionExpenseSchema.index({ date: -1 });
ReceptionExpenseSchema.index({ category: 1 });
ReceptionExpenseSchema.index({ status: 1 });

// Virtual for formatted date
ReceptionExpenseSchema.virtual("formattedDate").get(function () {
  return this.date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
});

// Virtual for formatted amount
ReceptionExpenseSchema.virtual("formattedAmount").get(function () {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(this.amount);
});

// Pre-save middleware to auto-generate expense ID
ReceptionExpenseSchema.pre("save", function (next) {
  // Auto-generate expense ID if not provided
  if (!this.expenseId) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const random = Math.floor(1000 + Math.random() * 9000);
    this.expenseId = `RCP${year}${month}${day}${random}`;
  }

  next();
});

// Static methods
ReceptionExpenseSchema.statics.findByStaffId = function (
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

ReceptionExpenseSchema.statics.findByStatus = function (
  status: "pending" | "approved",
) {
  return this.find({ status }).sort({ date: -1 });
};

ReceptionExpenseSchema.statics.findByCategory = function (
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

ReceptionExpenseSchema.statics.getExpenseSummary = async function (
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

  expenses.forEach((expense: IReceptionExpense) => {
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

ReceptionExpenseSchema.statics.approveExpense = async function (
  expenseId: string,
) {
  return this.findOneAndUpdate(
    { expenseId },
    { status: "approved" },
    { new: true },
  );
};

// Instance methods
ReceptionExpenseSchema.methods.approve = async function () {
  this.status = "approved";
  return this.save();
};

ReceptionExpenseSchema.methods.reject = async function (notes: string) {
  this.status = "pending";
  this.notes = notes;
  return this.save();
};

// Interface for static methods
interface ReceptionExpenseModel extends mongoose.Model<IReceptionExpense> {
  findByStaffId(
    staffId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<IReceptionExpense[]>;
  findByStatus(status: "pending" | "approved"): Promise<IReceptionExpense[]>;
  findByCategory(
    category: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<IReceptionExpense[]>;
  getExpenseSummary(startDate: Date, endDate: Date): Promise<any>;
  approveExpense(expenseId: string): Promise<IReceptionExpense | null>;
}

export const ReceptionExpense = (models.ReceptionExpense ||
  model<IReceptionExpense, ReceptionExpenseModel>(
    "ReceptionExpense",
    ReceptionExpenseSchema,
  )) as ReceptionExpenseModel;
