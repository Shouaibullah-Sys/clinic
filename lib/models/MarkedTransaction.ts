import mongoose, { Schema, model, models } from "mongoose";

export type MarkedModule =
  | "lab"
  | "appointment"
  | "radiology"
  | "prescription"
  | "discharge"
  | "pharmacy";

export interface IMarkedTransaction extends mongoose.Document {
  module: MarkedModule;
  transactionId: string;
  transactionDate: Date;
  markedBy: mongoose.Types.ObjectId;
  markedAt: Date;
  notes?: string;
}

const markedTransactionSchema = new Schema<IMarkedTransaction>(
  {
    module: {
      type: String,
      enum: [
        "lab",
        "appointment",
        "radiology",
        "prescription",
        "discharge",
        "pharmacy",
      ],
      required: true,
    },
    transactionId: {
      type: String,
      required: true,
      trim: true,
    },
    transactionDate: {
      type: Date,
      required: true,
    },
    markedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    markedAt: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

markedTransactionSchema.index({ module: 1, transactionId: 1 }, { unique: true });
markedTransactionSchema.index({ module: 1, transactionDate: -1 });

export const MarkedTransaction =
  models.MarkedTransaction ||
  model<IMarkedTransaction>("MarkedTransaction", markedTransactionSchema);
