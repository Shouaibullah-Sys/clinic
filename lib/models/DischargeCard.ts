// lib/models/DischargeCard.ts

import mongoose, { Schema, model, models, Document } from "mongoose";

// Sub-interface for pre-operation medicines
export interface IDischargeCardPreOpMedicine {
  medicine?: mongoose.Types.ObjectId;
  name: string;
  form: string;
  dosage: string;
  frequency: string;
  route: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  administeredDate: Date;
  notes?: string;
  dispensed?: boolean;
  dispensedDate?: Date;
  dispensedBy?: mongoose.Types.ObjectId;
}

// Sub-interface for post-operation medicines (in-hospital)
export interface IDischargeCardPostOpMedicine {
  medicine?: mongoose.Types.ObjectId;
  name: string;
  form: string;
  dosage: string;
  route: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  administeredDate: Date;
  frequency: string;
  duration: string;
  notes?: string;
  dispensed?: boolean;
  dispensedDate?: Date;
  dispensedBy?: mongoose.Types.ObjectId;
}

// Sub-interface for discharge medicines (take-home)
export interface IDischargeCardDischargeMedicine {
  medicine?: mongoose.Types.ObjectId;
  name: string;
  form: string;
  dosage: string;
  frequency: string;
  route: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  instructions: string;
  dispensed?: boolean;
  dispensedDate?: Date;
  dispensedBy?: mongoose.Types.ObjectId;
}

// Sub-interface for other requirements
export interface IDischargeCardOtherRequirement {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
}

// Sub-interface for billing/payment
export interface IDischargeCardBilling {
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  paymentStatus: "pending" | "partial" | "paid" | "cancelled";
  paymentMethod?: string;
  transactionId?: string;
  paymentDate?: Date;
  collectedBy?: mongoose.Types.ObjectId;
  invoiceId?: string;
  // Medicine payment tracking
  medicinesPaid: boolean;
  medicinesPaidAmount: number;
  medicinesPaymentDate?: Date;
  medicinesPaymentMethod?: string;
  medicinesTransactionId?: string;
}

export interface IDischargeCard extends Document {
  dischargeId: string;
  patient: mongoose.Types.ObjectId;
  appointment?: mongoose.Types.ObjectId;
  doctor: mongoose.Types.ObjectId;

  // Operation Details
  operationName: string;
  operationCost: number;
  operationDate: Date;
  operationType: "major" | "minor" | "emergency" | "elective";
  diagnosis: string;
  icdCode?: string;
  procedureNotes: string;
  operationNotes?: string;
  complications?: string;

  // Hospital Stay
  admissionDate: Date;
  dischargeDate: Date;
  totalDays: number;

  // Pre-Operation Medicines
  preOpMedicines: IDischargeCardPreOpMedicine[];

  // Post-Operation Medicines (in-hospital)
  postOpMedicines: IDischargeCardPostOpMedicine[];

  // Discharge Medicines (take-home)
  dischargeMedicines: IDischargeCardDischargeMedicine[];

  // Other Requirements
  otherRequirements: IDischargeCardOtherRequirement[];

  // Billing
  billing: IDischargeCardBilling;

  // Status
  status:
    | "draft"
    | "pending_billing"
    | "billed"
    | "paid"
    | "completed"
    | "cancelled";

  // Discharge Instructions
  dischargeInstructions: string;
  followUpDate?: Date;
  followUpInstructions?: string;

  // Physical Findings at Discharge
  vitalsAtDischarge?: {
    bloodPressure: string;
    heartRate: number;
    temperature: number;
    weight: number;
  };

  // Additional Notes
  notes?: string;

  // Signature
  doctorSignature?: string;
  patientAcknowledgement?: boolean;

  // Pharmacy Dispensing Status
  pharmacyDispensingStatus?: "pending" | "partial" | "full";
  pharmacyDispensedDate?: Date;
  pharmacyDispensedBy?: mongoose.Types.ObjectId;

  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

// Define static methods interface
interface DischargeCardModel extends mongoose.Model<IDischargeCard> {
  generateDischargeId(): Promise<string>;
  getPatientDischargeCards(patientId: string): Promise<IDischargeCard[]>;
  getDoctorDischargeCards(doctorId: string): Promise<IDischargeCard[]>;
}

const dischargeCardPreOpMedicineSchema =
  new Schema<IDischargeCardPreOpMedicine>({
    medicine: { type: Schema.Types.ObjectId, ref: "MedicineStock" },
    name: { type: String, required: true },
    form: { type: String, required: true },
    dosage: { type: String, required: true },
    frequency: { type: String, required: true },
    route: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 },
    administeredDate: { type: Date },
    notes: { type: String },
    dispensed: { type: Boolean, default: false },
    dispensedDate: { type: Date },
    dispensedBy: { type: Schema.Types.ObjectId, ref: "User" },
  });

const dischargeCardPostOpMedicineSchema =
  new Schema<IDischargeCardPostOpMedicine>({
    medicine: { type: Schema.Types.ObjectId, ref: "MedicineStock" },
    name: { type: String, required: true },
    form: { type: String, required: true },
    dosage: { type: String, required: true },
    route: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 },
    administeredDate: { type: Date },
    frequency: { type: String, required: true },
    duration: { type: String, required: true },
    notes: { type: String },
    dispensed: { type: Boolean, default: false },
    dispensedDate: { type: Date },
    dispensedBy: { type: Schema.Types.ObjectId, ref: "User" },
  });

const dischargeCardDischargeMedicineSchema =
  new Schema<IDischargeCardDischargeMedicine>({
    medicine: { type: Schema.Types.ObjectId, ref: "MedicineStock" },
    name: { type: String, required: true },
    form: { type: String, required: true },
    dosage: { type: String, required: true },
    frequency: { type: String, required: true },
    route: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 },
    instructions: { type: String, required: true },
    dispensed: { type: Boolean, default: false },
    dispensedDate: { type: Date },
    dispensedBy: { type: Schema.Types.ObjectId, ref: "User" },
  });

const dischargeCardOtherRequirementSchema =
  new Schema<IDischargeCardOtherRequirement>({
    description: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 },
    notes: { type: String },
  });

const dischargeCardBillingSchema = new Schema<IDischargeCardBilling>({
  subtotal: { type: Number, default: 0, min: 0 },
  taxAmount: { type: Number, default: 0, min: 0 },
  discountAmount: { type: Number, default: 0, min: 0 },
  totalAmount: { type: Number, default: 0, min: 0 },
  paidAmount: { type: Number, default: 0, min: 0 },
  balance: { type: Number, default: 0 },
  paymentStatus: {
    type: String,
    enum: ["pending", "partial", "paid", "cancelled"],
    default: "pending",
  },
  paymentMethod: { type: String },
  transactionId: { type: String },
  paymentDate: { type: Date },
  collectedBy: { type: Schema.Types.ObjectId, ref: "User" },
  invoiceId: { type: String },
  // Medicine payment tracking
  medicinesPaid: { type: Boolean, default: false },
  medicinesPaidAmount: { type: Number, default: 0, min: 0 },
  medicinesPaymentDate: { type: Date },
  medicinesPaymentMethod: { type: String },
  medicinesTransactionId: { type: String },
});

const DischargeCardSchema = new Schema<IDischargeCard, DischargeCardModel>(
  {
    dischargeId: {
      type: String,
      required: true,
      unique: true,
    },
    patient: {
      type: Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    appointment: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
    },
    doctor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Operation Details
    operationName: {
      type: String,
      required: true,
      trim: true,
    },
    operationCost: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    operationDate: {
      type: Date,
      required: true,
    },
    operationType: {
      type: String,
      enum: ["major", "minor", "emergency", "elective"],
      required: true,
    },
    diagnosis: {
      type: String,
      required: true,
      trim: true,
    },
    icdCode: {
      type: String,
      trim: true,
    },
    procedureNotes: {
      type: String,
      required: true,
    },
    operationNotes: {
      type: String,
    },
    complications: {
      type: String,
    },

    // Hospital Stay
    admissionDate: {
      type: Date,
      required: true,
    },
    dischargeDate: {
      type: Date,
      required: true,
    },
    totalDays: {
      type: Number,
      required: true,
      min: 0,
    },

    // Pre-Operation Medicines
    preOpMedicines: [dischargeCardPreOpMedicineSchema],

    // Post-Operation Medicines (in-hospital)
    postOpMedicines: [dischargeCardPostOpMedicineSchema],

    // Discharge Medicines (take-home)
    dischargeMedicines: [dischargeCardDischargeMedicineSchema],

    // Other Requirements
    otherRequirements: [dischargeCardOtherRequirementSchema],

    // Billing
    billing: {
      type: dischargeCardBillingSchema,
      default: () => ({
        subtotal: 0,
        taxAmount: 0,
        discountAmount: 0,
        totalAmount: 0,
        paidAmount: 0,
        balance: 0,
        paymentStatus: "pending",
        medicinesPaid: false,
        medicinesPaidAmount: 0,
      }),
    },

    // Status
    status: {
      type: String,
      enum: [
        "draft",
        "pending_billing",
        "billed",
        "paid",
        "completed",
        "cancelled",
      ],
      default: "draft",
    },

    // Discharge Instructions
    dischargeInstructions: {
      type: String,
      required: true,
    },
    followUpDate: {
      type: Date,
    },
    followUpInstructions: {
      type: String,
    },

    // Physical Findings at Discharge
    vitalsAtDischarge: {
      bloodPressure: { type: String },
      heartRate: { type: Number },
      temperature: { type: Number },
      weight: { type: Number },
    },

    // Additional Notes
    notes: {
      type: String,
    },

    // Signature
    doctorSignature: {
      type: String,
    },
    patientAcknowledgement: {
      type: Boolean,
      default: false,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    // Pharmacy Dispensing Status
    pharmacyDispensingStatus: {
      type: String,
      enum: ["pending", "partial", "full"],
    },
    pharmacyDispensedDate: {
      type: Date,
    },
    pharmacyDispensedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes for better query performance
DischargeCardSchema.index({ dischargeId: 1 });
DischargeCardSchema.index({ patient: 1 });
DischargeCardSchema.index({ doctor: 1 });
DischargeCardSchema.index({ status: 1 });
DischargeCardSchema.index({ dischargeDate: -1 });
DischargeCardSchema.index({ createdAt: -1 });
DischargeCardSchema.index({ "billing.paymentStatus": 1 });

// Compound indexes
DischargeCardSchema.index({ patient: 1, status: 1 });
DischargeCardSchema.index({ doctor: 1, createdAt: -1 });
DischargeCardSchema.index({ status: 1, "billing.paymentStatus": 1 });

// Pre-save hook to generate discharge ID and calculate totals
DischargeCardSchema.pre("save", async function (next) {
  // Generate discharge ID if not exists
  if (!this.dischargeId) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const random = Math.floor(1000 + Math.random() * 9000);
    this.dischargeId = `DC${year}${month}${day}${random}`;
  }

  // Calculate total days
  if (this.admissionDate && this.dischargeDate) {
    const admission = new Date(this.admissionDate);
    const discharge = new Date(this.dischargeDate);
    const diffTime = Math.abs(discharge.getTime() - admission.getTime());
    this.totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Calculate totals from all components
  let subtotal = this.operationCost || 0;

  // Add pre-op medicines total
  if (this.preOpMedicines && this.preOpMedicines.length > 0) {
    subtotal += this.preOpMedicines.reduce(
      (sum, med) => sum + (med.totalPrice || 0),
      0,
    );
  }

  // Add post-op medicines total
  if (this.postOpMedicines && this.postOpMedicines.length > 0) {
    subtotal += this.postOpMedicines.reduce(
      (sum, med) => sum + (med.totalPrice || 0),
      0,
    );
  }

  // Add discharge medicines total
  if (this.dischargeMedicines && this.dischargeMedicines.length > 0) {
    subtotal += this.dischargeMedicines.reduce(
      (sum, med) => sum + (med.totalPrice || 0),
      0,
    );
  }

  // Add other requirements total
  if (this.otherRequirements && this.otherRequirements.length > 0) {
    subtotal += this.otherRequirements.reduce(
      (sum, req) => sum + (req.totalPrice || 0),
      0,
    );
  }

  // Update billing
  this.billing.subtotal = subtotal;
  this.billing.totalAmount =
    subtotal +
    (this.billing.taxAmount || 0) -
    (this.billing.discountAmount || 0);
  this.billing.balance = this.billing.totalAmount - this.billing.paidAmount;

  // Update payment status
  if (this.billing.balance <= 0 && this.billing.totalAmount > 0) {
    this.billing.paymentStatus = "paid";
    this.status = "paid";
  } else if (this.billing.paidAmount > 0 && this.billing.balance > 0) {
    this.billing.paymentStatus = "partial";
    this.status = "billed";
  } else {
    this.billing.paymentStatus = "pending";
  }

  next();
});

// Static method to generate discharge ID
DischargeCardSchema.statics.generateDischargeId = async function () {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `DC${year}${month}${day}${random}`;
};

// Static method to get patient discharge cards
DischargeCardSchema.statics.getPatientDischargeCards = async function (
  patientId: string,
) {
  return this.find({ patient: patientId, status: { $ne: "cancelled" } })
    .populate("doctor", "name specialization")
    .populate("createdBy", "name")
    .sort({ dischargeDate: -1 });
};

// Static method to get doctor discharge cards
DischargeCardSchema.statics.getDoctorDischargeCards = async function (
  doctorId: string,
) {
  return this.find({ doctor: doctorId, status: { $ne: "cancelled" } })
    .populate("patient", "name patientId phone")
    .sort({ createdAt: -1 });
};

export const DischargeCard = (models.DischargeCard ||
  model<IDischargeCard, DischargeCardModel>(
    "DischargeCard",
    DischargeCardSchema,
  )) as DischargeCardModel;
