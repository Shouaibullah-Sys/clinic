import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPharmacySale extends Document {
  saleId: string; // Auto-generated (e.g., SALES260212345)
  customerName: string; // Walk-in customer name
  customerPhone: string; // Walk-in customer phone
  invoiceNumber: string; // Invoice number
  items: Array<{
    medicine: mongoose.Types.ObjectId; // Reference to MedicineStock
    name: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    totalPrice: number;
  }>;
  subtotal: number;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  paymentMethod: "cash" | "card" | "insurance";
  paymentStatus: "pending" | "partial" | "paid";
  status: "pending" | "completed" | "cancelled";
  saleDate: Date;
  soldBy: mongoose.Types.ObjectId; // Pharmacist
  finalizedAt?: Date;
  finalizedBy?: mongoose.Types.ObjectId; // Pharmacist who finalized
  notes?: string;
}

const PharmacySaleSchema = new Schema<IPharmacySale>(
  {
    saleId: {
      type: String,
      required: true,
      unique: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    customerPhone: {
      type: String,
      required: true,
      trim: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
    },
    items: [
      {
        medicine: {
          type: Schema.Types.ObjectId,
          ref: "MedicineStock",
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        unitPrice: {
          type: Number,
          required: true,
          min: 0,
        },
        discount: {
          type: Number,
          default: 0,
          min: 0,
          max: 100,
        },
        totalPrice: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    amountPaid: {
      type: Number,
      required: true,
      min: 0,
    },
    balance: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "insurance"],
      default: "cash",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "partial", "paid"],
      default: "pending",
    },
    status: {
      type: String,
      enum: ["pending", "completed", "cancelled"],
      default: "pending",
    },
    saleDate: {
      type: Date,
      default: Date.now,
    },
    soldBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    finalizedAt: {
      type: Date,
    },
    finalizedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
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

// Pre-save hook to auto-generate saleId
PharmacySaleSchema.pre("save", async function (next) {
  if (!this.saleId) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const random = Math.floor(1000 + Math.random() * 9000);
    this.saleId = `SALES${year}${month}${day}${random}`;
  }
  next();
});

const PharmacySale: Model<IPharmacySale> =
  mongoose.models.PharmacySale ||
  mongoose.model<IPharmacySale>("PharmacySale", PharmacySaleSchema);

export default PharmacySale;

// Re-attach pre-save hook to ensure it runs even with cached model
if (mongoose.models.PharmacySale) {
  mongoose.models.PharmacySale.schema.pre("save", function (next) {
    if (!this.saleId) {
      const date = new Date();
      const year = date.getFullYear().toString().slice(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const day = date.getDate().toString().padStart(2, "0");
      const random = Math.floor(1000 + Math.random() * 9000);
      this.saleId = `SALES${year}${month}${day}${random}`;
    }
    next();
  });
}
