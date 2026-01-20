// lib/models/CashFloat.ts - For managing cash float/petty cash
import mongoose, { Schema, model, models, Document } from "mongoose";
import { IUser } from "./User";

export interface ICashFloat extends Document {
  floatId: string;
  cashier: mongoose.Types.ObjectId | IUser;
  cashierName: string;
  amount: number;
  dateAssigned: Date;
  dateReturned?: Date;
  status: "assigned" | "returned" | "partially_returned" | "lost";
  purpose: "daily_operations" | "petty_cash" | "emergency" | "other";
  notes?: string;
  returnedAmount?: number;
  verifiedBy?: mongoose.Types.ObjectId | IUser;
  verificationDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CashFloatSchema = new Schema<ICashFloat>(
  {
    floatId: {
      type: String,
      required: true,
      unique: true,
    },
    cashier: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    cashierName: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    dateAssigned: {
      type: Date,
      required: true,
      default: Date.now,
    },
    dateReturned: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["assigned", "returned", "partially_returned", "lost"],
      default: "assigned",
    },
    purpose: {
      type: String,
      enum: ["daily_operations", "petty_cash", "emergency", "other"],
      required: true,
    },
    notes: {
      type: String,
    },
    returnedAmount: {
      type: Number,
      default: 0,
    },
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    verificationDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

CashFloatSchema.index({ floatId: 1 });
CashFloatSchema.index({ cashier: 1 });
CashFloatSchema.index({ dateAssigned: -1 });
CashFloatSchema.index({ status: 1 });

// Pre-save hook
CashFloatSchema.pre("save", function (next) {
  if (!this.floatId) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const random = Math.floor(1000 + Math.random() * 9000);
    this.floatId = `FLOAT${year}${month}${random}`;
  }
  next();
});

export const CashFloat = models.CashFloat || model<ICashFloat>("CashFloat", CashFloatSchema);