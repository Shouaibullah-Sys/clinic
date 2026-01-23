// lib/models/LabTest.ts

import mongoose, { Schema, model, models } from "mongoose";

// Define the charges sub-schema interface
export interface ILabTestCharges {
  basePrice: number;
  tax: number;
  discount: number;
  otherCharges: number;
  totalAmount: number;
  paid: number;
  due: number;
  paymentStatus: "pending" | "partial" | "paid" | "cancelled";
  paymentMethod?: string;
  transactionId?: string;
  paymentDate?: Date;
  collectedBy?: mongoose.Types.ObjectId;
}

export interface ILabTest extends mongoose.Document {
  testId: string;
  appointment: mongoose.Types.ObjectId;
  patient: mongoose.Types.ObjectId;
  doctor: mongoose.Types.ObjectId;
  testName: string;
  category: string;
  description?: string;
  price: number;
  discountedPrice?: number;
  charges: ILabTestCharges; // Changed from optional to required
  status: "pending" | "ordered" | "collected" | "processing" | "completed" | "reported" | "cancelled";
  priority: "routine" | "urgent" | "emergency";
  notes?: string;
  specimen?: {
    type?: string;
    collectionTime?: Date;
    collectedBy?: mongoose.Types.ObjectId;
    quantity?: string;
    container?: string;
    remarks?: string;
  };
  results?: {
    parameters: Array<{
      name: string;
      value: string | number;
      unit?: string;
      normalRange: string;
      flag?: "normal" | "low" | "high" | "critical";
      remarks?: string;
    }>;
    interpretation?: string;
    reportedBy?: mongoose.Types.ObjectId;
    reportedAt?: Date;
    verifiedBy?: mongoose.Types.ObjectId;
    verifiedAt?: Date;
    reportUrl?: string;
  };
  orderedBy: mongoose.Types.ObjectId;
  orderedAt: Date;
  collectedAt?: Date;
  completedAt?: Date;
  reportedAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Virtuals
  calculatedTotal: number;
  isPaid: boolean;
  isUrgent: boolean;
}

// Define static methods interface
interface LabTestModel extends mongoose.Model<ILabTest> {
  findByAppointmentId(appointmentId: string): Promise<ILabTest[]>;
  findByPatientId(patientId: string): Promise<ILabTest[]>;
  findByDoctorId(doctorId: string): Promise<ILabTest[]>;
  getUnpaidTests(patientId?: string): Promise<ILabTest[]>;
}

const labTestChargesSchema = new Schema<ILabTestCharges>({
  basePrice: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  otherCharges: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  paid: { type: Number, default: 0 },
  due: { type: Number, default: 0 },
  paymentStatus: {
    type: String,
    enum: ["pending", "partial", "paid", "cancelled"],
    default: "pending",
  },
  paymentMethod: String,
  transactionId: String,
  paymentDate: Date,
  collectedBy: { type: Schema.Types.ObjectId, ref: "User" },
});

const labTestSchema = new Schema<ILabTest>(
  {
    testId: {
      type: String,
      required: true,
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
    doctor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    testName: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        "hematology",    
        "blood_test",
        "urine_test",
        "stool_test",
        "imaging",
        "biopsy",
        "culture",
        "hormone_test",
        "genetic_test",
        "other",
      ],
    },
    description: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    discountedPrice: {
      type: Number,
      min: 0,
    },
    charges: {
      type: labTestChargesSchema,
      default: () => ({
        basePrice: 0,
        tax: 0,
        discount: 0,
        otherCharges: 0,
        totalAmount: 0,
        paid: 0,
        due: 0,
        paymentStatus: "pending" as const,
      }),
    },
    status: {
      type: String,
      enum: [
        "pending",
        "ordered",
        "collected",
        "processing",
        "completed",
        "reported",
        "cancelled",
      ],
      default: "ordered",
    },
    priority: {
      type: String,
      enum: ["routine", "urgent", "emergency"],
      default: "routine",
    },
    notes: {
      type: String,
      trim: true,
    },
    specimen: {
      type: {
        type: String,
        enum: ["blood", "urine", "stool", "tissue", "saliva", "other"],
      },
      collectionTime: Date,
      collectedBy: { type: Schema.Types.ObjectId, ref: "User" },
      quantity: String,
      container: String,
      remarks: String,
    },
    results: {
      parameters: [
        {
          name: { type: String, required: true },
          value: { type: Schema.Types.Mixed, required: true },
          unit: String,
          normalRange: String,
          flag: {
            type: String,
            enum: ["normal", "low", "high", "critical"],
            default: "normal",
          },
          remarks: String,
        },
      ],
      interpretation: String,
      reportedBy: { type: Schema.Types.ObjectId, ref: "User" },
      reportedAt: Date,
      verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
      verifiedAt: Date,
      reportUrl: String,
    },
    orderedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orderedAt: {
      type: Date,
      default: Date.now,
    },
    collectedAt: Date,
    completedAt: Date,
    reportedAt: Date,
    cancelledAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
labTestSchema.index({ testId: 1 }, { unique: true });
labTestSchema.index({ appointment: 1 });
labTestSchema.index({ patient: 1 });
labTestSchema.index({ doctor: 1 });
labTestSchema.index({ status: 1 });
labTestSchema.index({ category: 1 });
labTestSchema.index({ "charges.paymentStatus": 1 });
labTestSchema.index({ orderedAt: -1 });
labTestSchema.index({ createdAt: -1 });

// Compound indexes
labTestSchema.index({ patient: 1, status: 1 });
labTestSchema.index({ doctor: 1, status: 1 });
labTestSchema.index({ appointment: 1, status: 1 });
labTestSchema.index({ "charges.paymentStatus": 1, status: 1 });

// Virtual for calculated total amount
labTestSchema.virtual("calculatedTotal").get(function () {
  const base = this.discountedPrice || this.price;
  const tax = this.charges.tax;
  const other = this.charges.otherCharges;
  const discount = this.charges.discount;
  
  return base + tax + other - discount;
});

// Virtual for isPaid
labTestSchema.virtual("isPaid").get(function () {
  return this.charges.paymentStatus === "paid";
});

// Virtual for isUrgent
labTestSchema.virtual("isUrgent").get(function () {
  return this.priority === "urgent" || this.priority === "emergency";
});

// Pre-save hook to update charges
labTestSchema.pre("save", function (next) {
  const labTest = this;
  
  // Calculate total amount
  const base = labTest.discountedPrice || labTest.price;
  labTest.charges.basePrice = base;
  labTest.charges.totalAmount = base + labTest.charges.tax + labTest.charges.otherCharges - labTest.charges.discount;
  
  // Update due amount
  labTest.charges.due = Math.max(0, labTest.charges.totalAmount - labTest.charges.paid);
  
  // Update payment status
  if (labTest.charges.due === 0 && labTest.charges.totalAmount > 0) {
    labTest.charges.paymentStatus = "paid";
  } else if (labTest.charges.paid > 0) {
    labTest.charges.paymentStatus = "partial";
  } else {
    labTest.charges.paymentStatus = "pending";
  }
  
  // Generate test ID if not exists
  if (!labTest.testId) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const random = Math.floor(1000 + Math.random() * 9000);
    labTest.testId = `LAB${year}${month}${random}`;
  }
  
  next();
});

// Static methods
labTestSchema.statics.findByAppointmentId = function (appointmentId: string) {
  return this.find({ appointment: appointmentId })
    .populate("patient", "name patientId")
    .populate("doctor", "name specialization")
    .populate("orderedBy", "name")
    .populate("charges.collectedBy", "name")
    .sort({ createdAt: -1 });
};

labTestSchema.statics.findByPatientId = function (patientId: string) {
  return this.find({ patient: patientId })
    .populate("appointment", "appointmentId date")
    .populate("doctor", "name specialization")
    .populate("charges.collectedBy", "name")
    .sort({ orderedAt: -1 });
};

labTestSchema.statics.findByDoctorId = function (doctorId: string) {
  return this.find({ doctor: doctorId })
    .populate("patient", "name patientId")
    .populate("appointment", "appointmentId date")
    .populate("charges.collectedBy", "name")
    .sort({ orderedAt: -1 });
};

labTestSchema.statics.getUnpaidTests = function (patientId?: string) {
  const query: any = { "charges.paymentStatus": { $in: ["pending", "partial"] } };
  if (patientId) {
    query.patient = patientId;
  }
  
  return this.find(query)
    .populate("patient", "name patientId phone")
    .populate("doctor", "name")
    .populate("charges.collectedBy", "name")
    .sort({ orderedAt: 1 });
};

export const LabTest = (models.LabTest || model<ILabTest, LabTestModel>("LabTest", labTestSchema)) as LabTestModel;