// lib/models/Prescription.ts

import mongoose, { Schema, model, models, Document } from "mongoose";

// Define the charges sub-schema interface
export interface IPrescriptionCharges {
  basePrice: number;
  tax: number;
  discount: number;
  otherCharges: number;
  totalAmount: number;
  paid: number;
  due: number;
  paymentStatus: "unpaid" | "partial" | "paid" | "cancelled";
  paymentMethod?: string;
  transactionId?: string;
  paymentDate?: Date;
  collectedBy?: mongoose.Types.ObjectId;
}

export interface IPrescriptionMedication {
  medicine?: mongoose.Types.ObjectId;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  quantity: number;
  price: number;
  route: string;
  refills: number;
  refillsRemaining: number;
}

export interface IPrescription extends Document {
  prescriptionId: string;
  patient: mongoose.Types.ObjectId;
  doctor: mongoose.Types.ObjectId;
  appointment?: mongoose.Types.ObjectId;
  medications: IPrescriptionMedication[];
  diagnosis?: string;
  notes?: string;
  instructions?: string;
  prescribedDate: Date;
  expiryDate: Date;
  followUpDate?: Date;
  status: "active" | "completed" | "cancelled" | "expired";
  dispensedBy?: mongoose.Types.ObjectId;
  dispensedDate?: Date;
  dispensingStatus: "pending" | "partial" | "full" | "cancelled";
  pharmacyNotes?: string;
  // Payment tracking fields
  paymentStatus: "unpaid" | "partial" | "paid" | "verified";
  paymentVerified: boolean;
  paymentVerifiedBy?: mongoose.Types.ObjectId;
  paymentVerifiedAt?: Date;
  // Pricing finalization fields
  pricingFinalized: boolean;
  pricingFinalizedBy?: mongoose.Types.ObjectId;
  pricingFinalizedAt?: Date;
  charges: IPrescriptionCharges;
  createdAt: Date;
  updatedAt: Date;

  // Virtuals
  canDispense: boolean;
}

// Define static methods interface
interface PrescriptionModel extends mongoose.Model<IPrescription> {
  updateExpiredPrescriptions(): Promise<any>;
  findActivePrescriptions(patientId?: string): Promise<IPrescription[]>;
  verifyPayment(
    prescriptionId: string,
    verifiedBy: string,
    notes?: string,
  ): Promise<IPrescription | null>;
  unverifyPayment(prescriptionId: string): Promise<IPrescription | null>;
  getUnpaidPrescriptions(patientId?: string): Promise<IPrescription[]>;
}

// Define the charges sub-schema
const prescriptionChargesSchema = new Schema<IPrescriptionCharges>({
  basePrice: { type: Number, default: 0, min: 0 },
  tax: { type: Number, default: 0, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  otherCharges: { type: Number, default: 0, min: 0 },
  totalAmount: { type: Number, default: 0, min: 0 },
  paid: { type: Number, default: 0, min: 0 },
  due: { type: Number, default: 0, min: 0 },
  paymentStatus: {
    type: String,
    enum: ["unpaid", "partial", "paid", "cancelled"],
    default: "unpaid",
  },
  paymentMethod: { type: String, trim: true },
  transactionId: { type: String, trim: true },
  paymentDate: { type: Date },
  collectedBy: { type: Schema.Types.ObjectId, ref: "User" },
});

const PrescriptionSchema = new Schema<IPrescription, PrescriptionModel>(
  {
    prescriptionId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    patient: {
      type: Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    doctor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    appointment: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
    },
    medications: [
      {
        medicine: {
          type: Schema.Types.ObjectId,
          ref: "MedicineStock",
          required: false,
        },
        name: { type: String, required: true },
        dosage: { type: String, required: true },
        frequency: { type: String, required: true },
        duration: { type: String, required: true },
        instructions: { type: String, default: "" },
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true, min: 0 },
        route: {
          type: String,
          enum: [
            "oral",
            "topical",
            "inhalation",
            "injection",
            "rectal",
            "vaginal",
            "ophthalmic",
            "otic",
            "nasal",
            "transdermal",
          ],
          default: "oral",
        },
        refills: { type: Number, default: 0, min: 0 },
        refillsRemaining: { type: Number, default: 0, min: 0 },
      },
    ],
    diagnosis: {
      type: String,
    },
    notes: {
      type: String,
    },
    instructions: {
      type: String,
    },
    prescribedDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    expiryDate: {
      type: Date,
      required: true,
      default: () => {
        const date = new Date();
        date.setDate(date.getDate() + 30); // Default 30 days validity
        return date;
      },
    },
    followUpDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["active", "completed", "cancelled", "expired"],
      default: "active",
    },
    dispensedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    dispensedDate: {
      type: Date,
    },
    dispensingStatus: {
      type: String,
      enum: ["pending", "partial", "full", "cancelled"],
      default: "pending",
    },
    pharmacyNotes: {
      type: String,
    },
    // Payment tracking fields
    paymentStatus: {
      type: String,
      enum: ["unpaid", "partial", "paid", "verified"],
      default: "unpaid",
    },
    paymentVerified: {
      type: Boolean,
      default: false,
    },
    paymentVerifiedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    paymentVerifiedAt: {
      type: Date,
    },
    // Pricing finalization fields
    pricingFinalized: {
      type: Boolean,
      default: false,
    },
    pricingFinalizedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    pricingFinalizedAt: {
      type: Date,
    },
    charges: {
      type: prescriptionChargesSchema,
      default: () => ({
        basePrice: 0,
        tax: 0,
        discount: 0,
        otherCharges: 0,
        totalAmount: 0,
        paid: 0,
        due: 0,
        paymentStatus: "unpaid" as const,
      }),
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes for better query performance
// Note: prescriptionId already has unique: true which creates an index
PrescriptionSchema.index({ patient: 1 });
PrescriptionSchema.index({ doctor: 1 });
PrescriptionSchema.index({ status: 1 });
PrescriptionSchema.index({ dispensingStatus: 1 });
PrescriptionSchema.index({ expiryDate: 1 });
PrescriptionSchema.index({ createdAt: -1 });
PrescriptionSchema.index({ "charges.paymentStatus": 1 });
PrescriptionSchema.index({ paymentVerified: 1 });
PrescriptionSchema.index({ pricingFinalized: 1 });

// Compound indexes
PrescriptionSchema.index({ patient: 1, status: 1 });
PrescriptionSchema.index({ "charges.paymentStatus": 1, status: 1 });
PrescriptionSchema.index({ paymentVerified: 1, dispensingStatus: 1 });

// Virtual for canDispense
PrescriptionSchema.virtual("canDispense").get(function () {
  return this.paymentVerified === true;
});

// Pre-save hook to generate prescription ID and update charges
PrescriptionSchema.pre("save", function (next) {
  if (!this.prescriptionId) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const random = Math.floor(1000 + Math.random() * 9000);
    this.prescriptionId = `RX${year}${month}${random}`;
  }

  // Calculate total amount from medications
  if (this.isModified("medications") || this.isNew) {
    const basePrice = this.medications.reduce(
      (sum, med) => sum + med.price * med.quantity,
      0,
    );
    this.charges.basePrice = basePrice;
    this.charges.totalAmount =
      basePrice +
      this.charges.tax +
      this.charges.otherCharges -
      this.charges.discount;

    // Update due amount
    this.charges.due = Math.max(
      0,
      this.charges.totalAmount - this.charges.paid,
    );

    // Update payment status
    if (this.charges.due === 0 && this.charges.totalAmount > 0) {
      this.charges.paymentStatus = "paid";
      this.paymentStatus = "verified";
      if (!this.paymentVerified) {
        this.paymentVerified = true;
        this.paymentVerifiedAt = new Date();
      }
    } else if (this.charges.paid > 0) {
      this.charges.paymentStatus = "partial";
      this.paymentStatus = "partial";
    } else {
      this.charges.paymentStatus = "unpaid";
      this.paymentStatus = "unpaid";
    }
  }

  // Check if prescription is expired
  if (
    this.expiryDate &&
    this.expiryDate < new Date() &&
    this.status === "active"
  ) {
    this.status = "expired";
    this.dispensingStatus = "cancelled";
  }

  next();
});

// Static method to update expired prescriptions
PrescriptionSchema.statics.updateExpiredPrescriptions = async function () {
  const result = await this.updateMany(
    {
      expiryDate: { $lt: new Date() },
      status: "active",
    },
    {
      status: "expired",
      dispensingStatus: "cancelled",
    },
  );
  return result;
};

// Payment verification static methods
PrescriptionSchema.statics.verifyPayment = async function (
  prescriptionId: string,
  verifiedBy: string,
  notes?: string,
): Promise<IPrescription | null> {
  return this.findByIdAndUpdate(
    prescriptionId,
    {
      $set: {
        paymentVerified: true,
        paymentVerifiedBy: verifiedBy,
        paymentVerifiedAt: new Date(),
        paymentStatus: "verified",
      },
    },
    { new: true },
  );
};

PrescriptionSchema.statics.unverifyPayment = async function (
  prescriptionId: string,
): Promise<IPrescription | null> {
  return this.findByIdAndUpdate(
    prescriptionId,
    {
      $set: {
        paymentVerified: false,
        paymentVerifiedBy: null,
        paymentVerifiedAt: null,
        paymentStatus: "unpaid",
      },
    },
    { new: true },
  );
};

PrescriptionSchema.statics.getUnpaidPrescriptions = async function (
  patientId?: string,
): Promise<IPrescription[]> {
  const query: any = {
    "charges.paymentStatus": { $in: ["unpaid", "partial"] },
    status: { $ne: "cancelled" },
  };
  if (patientId) {
    query.patient = patientId;
  }

  return this.find(query)
    .populate("patient", "name patientId phone")
    .populate("doctor", "name")
    .populate("charges.collectedBy", "name")
    .populate("paymentVerifiedBy", "name")
    .sort({ prescribedDate: 1 });
};

// Static method to find active prescriptions
PrescriptionSchema.statics.findActivePrescriptions = async function (
  patientId?: string,
) {
  const query: any = {
    status: "active",
    dispensingStatus: { $in: ["pending", "partial"] },
  };

  if (patientId) {
    query.patient = patientId;
  }

  return this.find(query)
    .populate("patient", "name patientId phone")
    .populate("doctor", "name specialization")
    .populate({
      path: "medications.medicine",
      select:
        "name batchNumber currentQuantity sellingPrice unitPrice expiryDate supplier",
    })
    .sort({ prescribedDate: -1 });
};

// Instance method to process dispensing - FIXED TYPE ERROR
PrescriptionSchema.methods.processDispensing = async function (
  items: Array<{ medicine: string; dispensedQuantity: number }>,
  pharmacistId: string,
) {
  let totalDispensed = 0;
  let totalPrescribed = 0;

  // Calculate totals - FIX: Check if medicine exists before accessing
  this.medications.forEach((med: IPrescriptionMedication) => {
    totalPrescribed += med.quantity;

    // Check if medicine exists and is a valid ObjectId
    if (med.medicine && mongoose.Types.ObjectId.isValid(med.medicine)) {
      const item = items.find((i) => i.medicine === med.medicine!.toString());
      if (item) {
        totalDispensed += item.dispensedQuantity;
      }
    }
    // Alternative: try to match by medicine name if no ID
    else if (med.name) {
      // You could add logic here to match by name if needed
    }
  });

  // Update dispensing status
  if (totalDispensed === 0) {
    this.dispensingStatus = "pending";
  } else if (totalDispensed < totalPrescribed) {
    this.dispensingStatus = "partial";
  } else {
    this.dispensingStatus = "full";
    this.status = "completed";
  }

  // Update dispensed info
  this.dispensedBy = new mongoose.Types.ObjectId(pharmacistId);
  this.dispensedDate = new Date();

  return this.save();
};

export const Prescription = (models.Prescription ||
  model<IPrescription, PrescriptionModel>(
    "Prescription",
    PrescriptionSchema,
  )) as PrescriptionModel;
