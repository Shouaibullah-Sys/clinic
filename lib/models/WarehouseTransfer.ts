// lib/models/WarehouseTransfer.ts
import mongoose, { Schema, model, models } from "mongoose";

export interface ITransferItem {
  warehouseBatch: mongoose.Types.ObjectId;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface IWarehouseTransfer extends mongoose.Document {
  transferId: string;
  items: ITransferItem[];
  transferredBy: mongoose.Types.ObjectId;
  receivedBy?: mongoose.Types.ObjectId;
  status: "pending" | "completed" | "cancelled";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

const transferItemSchema = new Schema<ITransferItem>(
  {
    warehouseBatch: {
      type: Schema.Types.ObjectId,
      ref: "WarehouseBatch",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unitCost: {
      type: Number,
      required: true,
      min: 0,
    },
    totalCost: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false },
);

const warehouseTransferSchema = new Schema<IWarehouseTransfer>(
  {
    transferId: {
      type: String,
      uppercase: true,
    },
    items: {
      type: [transferItemSchema],
      required: true,
      validate: {
        validator: function (items: ITransferItem[]) {
          return items.length > 0;
        },
        message: "Transfer must have at least one item",
      },
    },
    transferredBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receivedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    status: {
      type: String,
      enum: ["pending", "completed", "cancelled"],
      default: "pending",
    },
    notes: {
      type: String,
      trim: true,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
warehouseTransferSchema.index({ transferId: 1 });
warehouseTransferSchema.index({ transferredBy: 1 });
warehouseTransferSchema.index({ receivedBy: 1 });
warehouseTransferSchema.index({ status: 1 });
warehouseTransferSchema.index({ createdAt: -1 });

// Compound indexes
warehouseTransferSchema.index({ transferredBy: 1, status: 1 });
warehouseTransferSchema.index({ createdAt: 1, status: 1 });

// Virtual for total transfer value
warehouseTransferSchema.virtual("totalValue").get(function () {
  return this.items.reduce((sum, item) => sum + item.totalCost, 0);
});

// Virtual for total quantity
warehouseTransferSchema.virtual("totalQuantity").get(function () {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

// Pre-save hooks
warehouseTransferSchema.pre("save", function (next) {
  // Generate transfer ID if not exists
  if (!this.transferId) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const random = Math.floor(1000 + Math.random() * 9000);
    this.transferId = `TR${year}${month}${random}`;
  }

  // Set completedAt when status changes to completed
  if (this.status === "completed" && !this.completedAt) {
    this.completedAt = new Date();
  }

  next();
});

export const WarehouseTransfer =
  models.WarehouseTransfer ||
  model<IWarehouseTransfer>("WarehouseTransfer", warehouseTransferSchema);
