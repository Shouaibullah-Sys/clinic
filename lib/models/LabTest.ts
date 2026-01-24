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
  appointment?: mongoose.Types.ObjectId;
  patient: mongoose.Types.ObjectId;
  doctor: mongoose.Types.ObjectId;
  testName: string;
  category: string;
  description?: string;
  price: number;
  discountedPrice?: number;
  charges: ILabTestCharges;
  status: "pending" | "ordered" | "collected" | "processing" | "completed" | "reported" | "cancelled";
  priority: "routine" | "urgent" | "emergency";
  notes?: string;
  
  // Laboratory module fields
  labReferenceId?: string;
  collectionStatus: "pending" | "scheduled" | "collected" | "rejected" | "insufficient";
  collectionDetails?: {
    collectionTime?: Date;
    collectedBy?: mongoose.Types.ObjectId;
    collectionNotes?: string;
    sampleId?: string;
    sampleCondition?: "satisfactory" | "hemolyzed" | "clotted" | "insufficient" | "contaminated" | "other";
    sampleConditionNotes?: string;
  };
  processingStatus: "pending" | "processing" | "completed" | "failed";
  processingDetails?: {
    processingStartTime?: Date;
    processingEndTime?: Date;
    processedBy?: mongoose.Types.ObjectId;
    equipmentUsed?: string;
    reagentsUsed?: string[];
    qualityControl?: {
      passed?: boolean;
      notes?: string;
      performedBy?: mongoose.Types.ObjectId;
      performedAt?: Date;
    };
    processingNotes?: string;
  };
  verificationStatus: "pending" | "preliminary" | "verified" | "rejected";
  verificationDetails?: {
    verifiedBy?: mongoose.Types.ObjectId;
    verifiedAt?: Date;
    verificationNotes?: string;
  };
  paymentVerified: boolean;
  paymentVerifiedBy?: mongoose.Types.ObjectId;
  paymentVerifiedAt?: Date;
  
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
  // Add parameters field
  parameters: [{
    name: { type: String, required: true },
    value: { type: String, required: true },
    unit: { type: String },
    remarks: { type: String },
  }],
},
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
  canCollectSample: boolean;
  canProcess: boolean;
}

// Define static methods interface
interface LabTestModel extends mongoose.Model<ILabTest> {
  findByAppointmentId(appointmentId: string): Promise<ILabTest[]>;
  findByPatientId(patientId: string): Promise<ILabTest[]>;
  findByDoctorId(doctorId: string): Promise<ILabTest[]>;
  getUnpaidTests(patientId?: string): Promise<ILabTest[]>;
  verifyPayment(testId: string, verifiedBy: string, notes?: string): Promise<ILabTest | null>;
  unverifyPayment(testId: string): Promise<ILabTest | null>;
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
    
    // Laboratory module fields
    labReferenceId: {
      type: String,
      unique: true,
      sparse: true,
    },
    collectionStatus: {
      type: String,
      enum: ["pending", "scheduled", "collected", "rejected", "insufficient"],
      default: "pending",
    },
    collectionDetails: {
      collectionTime: Date,
      collectedBy: { type: Schema.Types.ObjectId, ref: "User" },
      collectionNotes: String,
      sampleId: String,
      sampleCondition: {
        type: String,
        enum: ["satisfactory", "hemolyzed", "clotted", "insufficient", "contaminated", "other"],
      },
      sampleConditionNotes: String,
    },
    processingStatus: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
    },
    processingDetails: {
      processingStartTime: Date,
      processingEndTime: Date,
      processedBy: { type: Schema.Types.ObjectId, ref: "User" },
      equipmentUsed: String,
      reagentsUsed: [String],
      qualityControl: {
        passed: Boolean,
        notes: String,
        performedBy: { type: Schema.Types.ObjectId, ref: "User" },
        performedAt: Date,
      },
      processingNotes: String,
    },
    verificationStatus: {
      type: String,
      enum: ["pending", "preliminary", "verified", "rejected"],
      default: "pending",
    },
    verificationDetails: {
      verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
      verifiedAt: Date,
      verificationNotes: String,
    },
    paymentVerified: {
      type: Boolean,
      default: false,
      required: true,
    },
    paymentVerifiedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    paymentVerifiedAt: {
      type: Date,
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
  // Add parameters field
  parameters: [{
    name: { type: String, required: true },
    value: { type: String, required: true },
    unit: { type: String },
    remarks: { type: String },
  }],
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
labTestSchema.index({ collectionStatus: 1 });
labTestSchema.index({ processingStatus: 1 });
labTestSchema.index({ verificationStatus: 1 });
labTestSchema.index({ paymentVerified: 1 });
labTestSchema.index({ priority: 1 });

// Compound indexes
labTestSchema.index({ patient: 1, status: 1 });
labTestSchema.index({ doctor: 1, status: 1 });
labTestSchema.index({ appointment: 1, status: 1 });
labTestSchema.index({ "charges.paymentStatus": 1, status: 1 });
labTestSchema.index({ priority: 1, paymentVerified: 1 });
labTestSchema.index({ collectionStatus: 1, processingStatus: 1 });

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

// Virtual for canCollectSample
labTestSchema.virtual("canCollectSample").get(function () {
  // Sample can be collected if:
  // 1. Test is not cancelled
  // 2. Payment is verified OR test doesn't require payment verification (urgent/emergency)
  // 3. Collection status is pending or scheduled

  const condition1 = this.status !== "cancelled";
  const condition2 = (this.paymentVerified || this.priority !== "routine");
  // Handle undefined/null collectionStatus as "pending" (default)
  const effectiveCollectionStatus = this.collectionStatus || "pending";
  const condition3 = ["pending", "scheduled"].includes(effectiveCollectionStatus);

  return condition1 && condition2 && condition3;
});

// Virtual for canProcess
labTestSchema.virtual("canProcess").get(function () {
  // Test can be processed if:
  // 1. Sample is collected
  // 2. Payment is verified
  // 3. Processing status is pending
  return (
    this.collectionStatus === "collected" &&
    this.paymentVerified &&
    this.processingStatus === "pending"
  );
});

// Pre-save hook to update charges and payment verification
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
    // Auto-verify payment if fully paid
    if (!labTest.paymentVerified) {
      labTest.paymentVerified = true;
      labTest.paymentVerifiedAt = new Date();
    }
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
  
  // Generate lab reference ID if not exists and test is collected
  if (!labTest.labReferenceId && labTest.collectionStatus === "collected") {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const random = Math.floor(100 + Math.random() * 900);
    labTest.labReferenceId = `LREF${year}${month}${day}${random}`;
  }
  
  // Update timestamps based on status changes
  if (labTest.collectionStatus === "collected" && !labTest.collectedAt) {
    labTest.collectedAt = new Date();
  }
  
  if (labTest.processingStatus === "completed" && !labTest.completedAt) {
    labTest.completedAt = new Date();
  }
  
  if (labTest.verificationStatus === "verified" && labTest.status !== "reported") {
    labTest.status = "reported";
    labTest.reportedAt = new Date();
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
    .populate("collectionDetails.collectedBy", "name")
    .populate("paymentVerifiedBy", "name")
    .populate("processingDetails.processedBy", "name")
    .populate("verificationDetails.verifiedBy", "name")
    .sort({ createdAt: -1 });
};

labTestSchema.statics.findByPatientId = function (patientId: string) {
  return this.find({ patient: patientId })
    .populate("appointment", "appointmentId date")
    .populate("doctor", "name specialization")
    .populate("charges.collectedBy", "name")
    .populate("paymentVerifiedBy", "name")
    .sort({ orderedAt: -1 });
};

labTestSchema.statics.findByDoctorId = function (doctorId: string) {
  return this.find({ doctor: doctorId })
    .populate("patient", "name patientId")
    .populate("appointment", "appointmentId date")
    .populate("charges.collectedBy", "name")
    .populate("paymentVerifiedBy", "name")
    .sort({ orderedAt: -1 });
};

labTestSchema.statics.getUnpaidTests = function (patientId?: string) {
  const query: any = { 
    "charges.paymentStatus": { $in: ["pending", "partial"] },
    status: { $ne: "cancelled" }
  };
  if (patientId) {
    query.patient = patientId;
  }
  
  return this.find(query)
    .populate("patient", "name patientId phone")
    .populate("doctor", "name")
    .populate("charges.collectedBy", "name")
    .sort({ orderedAt: 1 });
};

// Payment verification static methods
labTestSchema.statics.verifyPayment = async function (
  testId: string,
  verifiedBy: string,
  notes?: string
): Promise<ILabTest | null> {
  return this.findByIdAndUpdate(
    testId,
    {
      $set: {
        paymentVerified: true,
        paymentVerifiedBy: verifiedBy,
        paymentVerifiedAt: new Date(),
        ...(notes && { "verificationDetails.verificationNotes": notes }),
      },
    },
    { new: true }
  );
};

labTestSchema.statics.unverifyPayment = async function (
  testId: string
): Promise<ILabTest | null> {
  return this.findByIdAndUpdate(
    testId,
    {
      $set: {
        paymentVerified: false,
        paymentVerifiedBy: null,
        paymentVerifiedAt: null,
      },
    },
    { new: true }
  );
};

export const LabTest = (models.LabTest || model<ILabTest, LabTestModel>("LabTest", labTestSchema)) as LabTestModel;