// lib/models/WarehouseBatch.ts
import mongoose, { Schema, model, models } from "mongoose";

export interface IWarehouseBatch extends mongoose.Document {
  batchId: string;
  warehouse: mongoose.Types.ObjectId;
  batchNumber: string;
  lotNumber: string;
  form: string;
  dosage: string;
  frequency: string;
  route: string;
  expiryDate: Date;
  quantity: number;
  originalQuantity: number;
  unitCost: number;
  supplier: string;
  location?: string;
  status: "available" | "partial" | "depleted" | "expired";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const warehouseBatchSchema = new Schema<IWarehouseBatch>(
  {
    batchId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    warehouse: {
      type: Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
    },
    batchNumber: {
      type: String,
      required: true,
      trim: true,
    },
    lotNumber: {
      type: String,
      required: true,
      trim: true,
    },
    form: {
      type: String,
      required: true,
      trim: true,
      enum: [
        "Tablet",
        "Capsule",
        "Syrup",
        "Injection",
        "Ointment",
        "Cream",
        "Drops",
        "Inhaler",
        "Patch",
        "Other",
      ],
    },
    dosage: {
      type: String,
      required: true,
      trim: true,
    },
    frequency: {
      type: String,
      required: true,
      trim: true,
    },
    route: {
      type: String,
      required: true,
      trim: true,
      enum: [
        "Oral",
        "IV",
        "IM",
        "SC",
        "Topical",
        "Inhalation",
        "Ophthalmic",
        "Otic",
        "Nasal",
        "Rectal",
        "Other",
      ],
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    originalQuantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unitCost: {
      type: Number,
      required: true,
      min: 0,
    },
    supplier: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["available", "partial", "depleted", "expired"],
      default: "available",
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

// Indexes
warehouseBatchSchema.index({ batchId: 1 });
warehouseBatchSchema.index({ warehouse: 1 });
warehouseBatchSchema.index({ batchNumber: 1 });
warehouseBatchSchema.index({ lotNumber: 1 });
warehouseBatchSchema.index({ expiryDate: 1 });
warehouseBatchSchema.index({ status: 1 });
warehouseBatchSchema.index({ supplier: 1 });

// Compound indexes
warehouseBatchSchema.index({ warehouse: 1, status: 1 });
warehouseBatchSchema.index({ warehouse: 1, expiryDate: 1 });
warehouseBatchSchema.index({ expiryDate: 1, status: 1 });

// Virtual for remaining percentage
warehouseBatchSchema.virtual("remainingPercentage").get(function () {
  return (this.quantity / this.originalQuantity) * 100;
});

// Pre-save hooks
warehouseBatchSchema.pre("save", function (next) {
  // Generate batch ID if not exists
  if (!this.batchId) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const random = Math.floor(1000 + Math.random() * 9000);
    this.batchId = `WB${year}${month}${random}`;
  }

  // Auto-update status based on quantity and expiry
  const now = new Date();
  const isExpired = this.expiryDate < now;
  const isDepleted = this.quantity === 0;
  const isPartial = this.quantity > 0 && this.quantity < this.originalQuantity;

  if (isExpired) {
    this.status = "expired";
  } else if (isDepleted) {
    this.status = "depleted";
  } else if (isPartial) {
    this.status = "partial";
  } else {
    this.status = "available";
  }

  next();
});

export const WarehouseBatch =
  models.WarehouseBatch ||
  model<IWarehouseBatch>("WarehouseBatch", warehouseBatchSchema);
