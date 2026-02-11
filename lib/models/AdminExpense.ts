// lib/models/AdminExpense.ts
import mongoose, { Schema, model, models, Document } from "mongoose";
import { IUser } from "./User";

export interface IAdminExpense extends Document {
  expenseId: string;
  admin: mongoose.Types.ObjectId | IUser;
  adminName: string;
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
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AdminExpenseSchema = new Schema<IAdminExpense>(
  {
    expenseId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    admin: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    adminName: {
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
AdminExpenseSchema.index({ admin: 1 });
AdminExpenseSchema.index({ date: -1 });
AdminExpenseSchema.index({ category: 1 });

// Virtual for formatted date
AdminExpenseSchema.virtual("formattedDate").get(function () {
  return this.date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
});

// Virtual for formatted amount
AdminExpenseSchema.virtual("formattedAmount").get(function () {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(this.amount);
});

// Pre-save middleware to auto-generate expense ID
AdminExpenseSchema.pre("save", function (next) {
  // Auto-generate expense ID if not provided
  if (!this.expenseId) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const random = Math.floor(1000 + Math.random() * 9000);
    this.expenseId = `ADM${year}${month}${day}${random}`;
  }

  next();
});

// Static methods
AdminExpenseSchema.statics.findByAdminId = function (
  adminId: string,
  startDate?: Date,
  endDate?: Date,
) {
  const query: any = { admin: adminId };
  if (startDate && endDate) {
    query.date = { $gte: startDate, $lte: endDate };
  }
  return this.find(query).sort({ date: -1 });
};

AdminExpenseSchema.statics.findByCategory = function (
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

AdminExpenseSchema.statics.getExpenseSummary = async function (
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

  expenses.forEach((expense: IAdminExpense) => {
    if (summary[expense.category] !== undefined) {
      summary[expense.category] += expense.amount;
    }
    totalExpenses += expense.amount;
  });

  return {
    expenses,
    summary,
    totalExpenses,
    expenseCount: expenses.length,
  };
};

// Interface for static methods
interface AdminExpenseModel extends mongoose.Model<IAdminExpense> {
  findByAdminId(
    adminId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<IAdminExpense[]>;
  findByCategory(
    category: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<IAdminExpense[]>;
  getExpenseSummary(startDate: Date, endDate: Date): Promise<any>;
}

export const AdminExpense = (models.AdminExpense ||
  model<IAdminExpense, AdminExpenseModel>(
    "AdminExpense",
    AdminExpenseSchema,
  )) as AdminExpenseModel;
