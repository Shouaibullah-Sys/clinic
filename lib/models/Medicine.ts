import mongoose, { Schema, model, models } from "mongoose";

export interface IMedicine extends mongoose.Document {
  medicineId: string;
  appointment: mongoose.Types.ObjectId;
  patient: mongoose.Types.ObjectId;
  name: string;
  genericName?: string;
  form: string;
  dosage: string;
  frequency: string;
  route: string;
  duration: string;
  quantity: number;
  price: number;
  total: number;
  status: "prescribed" | "dispensed" | "cancelled";
  prescribedBy: mongoose.Types.ObjectId;
  prescribedAt: Date;
  dispensedBy?: mongoose.Types.ObjectId;
  dispensedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const medicineSchema = new Schema<IMedicine>(
  {
    medicineId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    appointment: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
    },
    patient: {
      type: Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    genericName: {
      type: String,
      trim: true,
    },
    form: {
      type: String,
      required: true,
      trim: true,
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
    },
    duration: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["prescribed", "dispensed", "cancelled"],
      default: "prescribed",
    },
    prescribedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    prescribedAt: {
      type: Date,
      default: Date.now,
    },
    dispensedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    dispensedAt: {
      type: Date,
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
medicineSchema.index({ medicineId: 1 });
medicineSchema.index({ appointment: 1 });
medicineSchema.index({ patient: 1 });
medicineSchema.index({ status: 1 });
medicineSchema.index({ prescribedAt: -1 });
medicineSchema.index({ name: 1 });

// Compound indexes
medicineSchema.index({ appointment: 1, status: 1 });
medicineSchema.index({ patient: 1, status: 1 });

// Pre-save hooks
medicineSchema.pre("save", function (next) {
  // Generate medicine ID if not exists
  if (!this.medicineId) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const random = Math.floor(1000 + Math.random() * 9000);
    this.medicineId = `MED${year}${month}${random}`;
  }

  // Calculate total if not provided
  if (!this.total && this.price && this.quantity) {
    this.total = this.price * this.quantity;
  }

  next();
});

export const Medicine =
  models.Medicine || model<IMedicine>("Medicine", medicineSchema);
