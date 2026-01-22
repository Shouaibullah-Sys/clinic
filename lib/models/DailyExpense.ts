// lib/models/DailyExpense.ts
import mongoose, { Schema, Types, model } from "mongoose";

export type ExpenseType =
  | "normal"
  | "staff_salary"
  | "clinic_rent"
  | "medical_supplies"
  | "equipment"
  | "utilities"
  | "other";
export type ExpenseCategory =
  | "operational"
  | "salary"
  | "rent"
  | "supplies"
  | "equipment"
  | "utilities"
  | "miscellaneous";

export interface IDailyExpense {
  _id: Types.ObjectId;
  date: Date;
  description: string;
  amount: number;
  expenseType: ExpenseType;
  category: ExpenseCategory;
  receiptNumber?: string | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const dailyExpenseSchema = new Schema<IDailyExpense>(
  {
    date: { type: Date, default: Date.now },
    description: { type: String, required: true, minlength: 3 },
    amount: { type: Number, required: true, min: 0 },
    expenseType: {
      type: String,
      enum: [
        "normal",
        "staff_salary",
        "clinic_rent",
        "medical_supplies",
        "equipment",
        "utilities",
        "other",
      ],
      default: "normal",
    },
    category: {
      type: String,
      enum: [
        "operational",
        "salary",
        "rent",
        "supplies",
        "equipment",
        "utilities",
        "miscellaneous",
      ],
      default: "operational",
    },
    receiptNumber: { type: String, required: false },
    notes: { type: String, required: false },
  },
  { timestamps: true }
);

// Indexes for better query performance
dailyExpenseSchema.index({ date: -1 });
dailyExpenseSchema.index({ expenseType: 1 });
dailyExpenseSchema.index({ category: 1 });

export const DailyExpense =
  mongoose.models.DailyExpense ||
  model<IDailyExpense>("DailyExpense", dailyExpenseSchema);
