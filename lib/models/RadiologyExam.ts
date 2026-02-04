// lib/models/RadiologyExam.ts - Direct Radiology Exam Model

import mongoose, { Schema, model, models } from "mongoose";

// Define the charges sub-schema interface
export interface IRadiologyExamCharges {
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

export interface IRadiologyExam extends mongoose.Document {
  examId: string;
  appointment?: mongoose.Types.ObjectId;
  patient: mongoose.Types.ObjectId;
  doctor?: mongoose.Types.ObjectId;
  examName: string;
  category: string;
  description?: string;
  price: number;
  discountedPrice?: number;
  charges: IRadiologyExamCharges;
  status:
    | "pending"
    | "ordered"
    | "scheduled"
    | "in-progress"
    | "completed"
    | "reported"
    | "cancelled";
  priority: "routine" | "urgent" | "emergency";
  notes?: string;

  // Direct radiology exam workflow fields
  isDirectExam: boolean;
  createdBy?: mongoose.Types.ObjectId;
  createdAtDirect?: Date;
  finalized: boolean;
  finalizedAt?: Date;
  finalizedBy?: mongoose.Types.ObjectId;
  readyForPrint: boolean;
  printedAt?: Date;
  printedBy?: mongoose.Types.ObjectId;

  // Radiology module fields
  radiologyReferenceId?: string;
  examStatus:
    | "pending"
    | "scheduled"
    | "in-progress"
    | "completed"
    | "cancelled";
  examDetails?: {
    scheduledTime?: Date;
    performedBy?: mongoose.Types.ObjectId;
    examNotes?: string;
    examCondition?: "satisfactory" | "poor" | "incomplete" | "other";
    examConditionNotes?: string;
  };
  processingStatus: "pending" | "processing" | "completed" | "failed";
  processingDetails?: {
    processingStartTime?: Date;
    processingEndTime?: Date;
    processedBy?: mongoose.Types.ObjectId;
    equipmentUsed?: string;
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

  modality?: {
    type: string;
    scheduledTime?: Date;
    performedBy?: mongoose.Types.ObjectId;
    bodyPart?: string;
    view?: string;
    contrastUsed?: boolean;
    contrastType?: string;
    remarks?: string;
    findings?: Array<{
      name: string;
      value: string;
      unit?: string;
      remarks?: string;
    }>;
  };
  results?: {
    findings: Array<{
      name: string;
      value: string | number;
      unit?: string;
      normalRange: string;
      flag?: "normal" | "abnormal" | "critical";
      remarks?: string;
    }>;
    impression?: string;
    reportedBy?: mongoose.Types.ObjectId;
    reportedAt?: Date;
    verifiedBy?: mongoose.Types.ObjectId;
    verifiedAt?: Date;
    reportUrl?: string;
  };
  orderedBy: mongoose.Types.ObjectId;
  orderedAt: Date;
  completedAt?: Date;
  reportedAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Virtuals
  calculatedTotal: number;
  isPaid: boolean;
  canPerform: boolean;
}

// Define static methods interface
interface RadiologyExamModel extends mongoose.Model<IRadiologyExam> {
  findByAppointmentId(appointmentId: string): Promise<IRadiologyExam[]>;
  findByPatientId(patientId: string): Promise<IRadiologyExam[]>;
  findByDoctorId(doctorId: string): Promise<IRadiologyExam[]>;
  getUnpaidExams(patientId?: string): Promise<IRadiologyExam[]>;
  verifyPayment(
    examId: string,
    verifiedBy: string,
    notes?: string,
  ): Promise<IRadiologyExam | null>;
  unverifyPayment(examId: string): Promise<IRadiologyExam | null>;
  // Direct radiology exam workflow static methods
  findDirectExams(): Promise<IRadiologyExam[]>;
  findDirectExamsByCreator(creatorId: string): Promise<IRadiologyExam[]>;
  findDirectExamsPendingFinalization(): Promise<IRadiologyExam[]>;
  findDirectExamsReadyForPrint(): Promise<IRadiologyExam[]>;
  finalizeExam(
    examId: string,
    finalizedBy: string,
  ): Promise<IRadiologyExam | null>;
  markReadyForPrint(
    examId: string,
    userId: string,
  ): Promise<IRadiologyExam | null>;
  markAsPrinted(
    examId: string,
    printedBy: string,
  ): Promise<IRadiologyExam | null>;
}

// Define the charges sub-schema
const radiologyExamChargesSchema = new Schema<IRadiologyExamCharges>({
  basePrice: { type: Number, default: 0, min: 0 },
  tax: { type: Number, default: 0, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  otherCharges: { type: Number, default: 0, min: 0 },
  totalAmount: { type: Number, default: 0, min: 0 },
  paid: { type: Number, default: 0, min: 0 },
  due: { type: Number, default: 0, min: 0 },
  paymentStatus: {
    type: String,
    enum: ["pending", "partial", "paid", "cancelled"],
    default: "pending",
  },
  paymentMethod: { type: String, trim: true },
  transactionId: { type: String, trim: true },
  paymentDate: { type: Date },
  collectedBy: { type: Schema.Types.ObjectId, ref: "User" },
});

// Define the modality sub-schema
const modalitySchema = new Schema({
  type: { type: String, trim: true },
  scheduledTime: { type: Date },
  performedBy: { type: Schema.Types.ObjectId, ref: "User" },
  bodyPart: { type: String, trim: true },
  view: { type: String, trim: true },
  contrastUsed: { type: Boolean, default: false },
  contrastType: { type: String, trim: true },
  remarks: { type: String, trim: true },
  findings: [
    {
      name: { type: String, required: true, trim: true },
      value: { type: String, trim: true },
      unit: { type: String, trim: true },
      remarks: { type: String, trim: true },
    },
  ],
});

// Define the main schema
const radiologyExamSchema = new Schema<IRadiologyExam, RadiologyExamModel>(
  {
    examId: {
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
    },
    examName: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        "xray",
        "ct",
        "mri",
        "ultrasound",
        "mammography",
        "fluoroscopy",
        "nuclear_medicine",
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
      type: radiologyExamChargesSchema,
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
        "scheduled",
        "in-progress",
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

    // Direct radiology exam workflow fields
    isDirectExam: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    createdAtDirect: {
      type: Date,
    },
    finalized: {
      type: Boolean,
      default: false,
    },
    finalizedAt: {
      type: Date,
    },
    finalizedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    readyForPrint: {
      type: Boolean,
      default: false,
    },
    printedAt: {
      type: Date,
    },
    printedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    // Radiology module fields
    radiologyReferenceId: {
      type: String,
    },
    examStatus: {
      type: String,
      enum: ["pending", "scheduled", "in-progress", "completed", "cancelled"],
      default: "pending",
    },
    examDetails: {
      scheduledTime: { type: Date },
      performedBy: { type: Schema.Types.ObjectId, ref: "User" },
      examNotes: { type: String, trim: true },
      examCondition: {
        type: String,
        enum: ["satisfactory", "poor", "incomplete", "other"],
      },
      examConditionNotes: { type: String, trim: true },
    },
    processingStatus: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
    },
    processingDetails: {
      processingStartTime: { type: Date },
      processingEndTime: { type: Date },
      processedBy: { type: Schema.Types.ObjectId, ref: "User" },
      equipmentUsed: { type: String, trim: true },
      qualityControl: {
        passed: { type: Boolean },
        notes: { type: String, trim: true },
        performedBy: { type: Schema.Types.ObjectId, ref: "User" },
        performedAt: { type: Date },
      },
      processingNotes: { type: String, trim: true },
    },
    verificationStatus: {
      type: String,
      enum: ["pending", "preliminary", "verified", "rejected"],
      default: "pending",
    },
    verificationDetails: {
      verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
      verifiedAt: { type: Date },
      verificationNotes: { type: String, trim: true },
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
    modality: {
      type: modalitySchema,
      default: {},
    },
    results: {
      findings: [
        {
          name: { type: String, required: true, trim: true },
          value: { type: Schema.Types.Mixed, required: true },
          unit: { type: String, trim: true },
          normalRange: { type: String, trim: true },
          flag: {
            type: String,
            enum: ["normal", "abnormal", "critical"],
            default: "normal",
          },
          remarks: { type: String, trim: true },
        },
      ],
      impression: { type: String, trim: true },
      reportedBy: { type: Schema.Types.ObjectId, ref: "User" },
      reportedAt: { type: Date },
      verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
      verifiedAt: { type: Date },
      reportUrl: { type: String, trim: true },
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
    completedAt: { type: Date },
    reportedAt: { type: Date },
    cancelledAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes for performance
radiologyExamSchema.index({ examId: 1 }, { unique: true });
radiologyExamSchema.index({ appointment: 1 });
radiologyExamSchema.index({ patient: 1 });
radiologyExamSchema.index({ doctor: 1 });
radiologyExamSchema.index({ status: 1 });
radiologyExamSchema.index({ category: 1 });
radiologyExamSchema.index({ "charges.paymentStatus": 1 });
radiologyExamSchema.index({ orderedAt: -1 });
radiologyExamSchema.index({ createdAt: -1 });
radiologyExamSchema.index({ examStatus: 1 });
radiologyExamSchema.index({ processingStatus: 1 });
radiologyExamSchema.index({ verificationStatus: 1 });
radiologyExamSchema.index({ paymentVerified: 1 });
radiologyExamSchema.index({ priority: 1 });
radiologyExamSchema.index(
  { radiologyReferenceId: 1 },
  { unique: true, sparse: true },
);

// Direct radiology exam workflow indexes
radiologyExamSchema.index({ isDirectExam: 1 });
radiologyExamSchema.index({ finalized: 1 });
radiologyExamSchema.index({ readyForPrint: 1 });
radiologyExamSchema.index({ createdBy: 1 });

// Compound indexes
radiologyExamSchema.index({ patient: 1, status: 1 });
radiologyExamSchema.index({ doctor: 1, status: 1 });
radiologyExamSchema.index({ appointment: 1, status: 1 });
radiologyExamSchema.index({ "charges.paymentStatus": 1, status: 1 });
radiologyExamSchema.index({ priority: 1, paymentVerified: 1 });
radiologyExamSchema.index({ examStatus: 1, processingStatus: 1 });
radiologyExamSchema.index({ patient: 1, orderedAt: -1 });

// Direct radiology exam workflow compound indexes
radiologyExamSchema.index({ isDirectExam: 1, paymentVerified: 1 });
radiologyExamSchema.index({ isDirectExam: 1, finalized: 1 });
radiologyExamSchema.index({ isDirectExam: 1, readyForPrint: 1 });
radiologyExamSchema.index({ isDirectExam: 1, status: 1 });
radiologyExamSchema.index({ createdBy: 1, createdAtDirect: -1 });
radiologyExamSchema.index({ finalized: 1, readyForPrint: 1 });
radiologyExamSchema.index({
  paymentVerified: 1,
  finalized: 1,
  readyForPrint: 1,
});

// Virtual for calculated total amount
radiologyExamSchema.virtual("calculatedTotal").get(function () {
  const base = this.discountedPrice || this.price;
  const tax = this.charges?.tax || 0;
  const other = this.charges?.otherCharges || 0;
  const discount = this.charges?.discount || 0;
  return base + tax + other - discount;
});

// Virtual for isPaid
radiologyExamSchema.virtual("isPaid").get(function () {
  return this.charges?.paymentStatus === "paid";
});

// Virtual for canPerform
radiologyExamSchema.virtual("canPerform").get(function () {
  const condition1 = this.status !== "cancelled";
  const condition2 = this.paymentVerified || this.priority !== "routine";
  const condition3 = this.examStatus === "scheduled";
  return condition1 && condition2 && condition3;
});

// Pre-save hook to update charges and payment verification
radiologyExamSchema.pre("save", function (next) {
  const radiologyExam = this;

  // Calculate total amount
  const base = radiologyExam.discountedPrice || radiologyExam.price;
  radiologyExam.charges.basePrice = base;
  radiologyExam.charges.totalAmount =
    base +
    radiologyExam.charges.tax +
    radiologyExam.charges.otherCharges -
    radiologyExam.charges.discount;

  // Update due amount
  radiologyExam.charges.due = Math.max(
    0,
    radiologyExam.charges.totalAmount - radiologyExam.charges.paid,
  );

  // Update payment status
  if (
    radiologyExam.charges.due === 0 &&
    radiologyExam.charges.totalAmount > 0
  ) {
    radiologyExam.charges.paymentStatus = "paid";
    if (!radiologyExam.paymentVerified) {
      radiologyExam.paymentVerified = true;
      radiologyExam.paymentVerifiedAt = new Date();
    }
  } else if (radiologyExam.charges.paid > 0) {
    radiologyExam.charges.paymentStatus = "partial";
  } else {
    radiologyExam.charges.paymentStatus = "pending";
  }

  // Generate exam ID if not exists
  if (!radiologyExam.examId) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const random = Math.floor(1000 + Math.random() * 9000);
    radiologyExam.examId = `RAD${year}${month}${random}`;
  }

  // Set createdAtDirect for direct exams if not set
  if (radiologyExam.isDirectExam && !radiologyExam.createdAtDirect) {
    radiologyExam.createdAtDirect = new Date();
  }

  // Generate radiology reference ID if not exists
  if (
    !radiologyExam.radiologyReferenceId &&
    radiologyExam.examStatus === "completed"
  ) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const random = Math.floor(100 + Math.random() * 900);
    radiologyExam.radiologyReferenceId = `RREF${year}${month}${day}${random}`;
  }

  // Update timestamps based on status changes
  if (radiologyExam.examStatus === "completed" && !radiologyExam.completedAt) {
    radiologyExam.completedAt = new Date();
  }

  if (
    radiologyExam.verificationStatus === "verified" &&
    radiologyExam.status !== "reported"
  ) {
    radiologyExam.status = "reported";
    radiologyExam.reportedAt = new Date();
  }

  next();
});

// Pre-validate hook
radiologyExamSchema.pre("validate", function (next) {
  if (!this.examId) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const random = Math.floor(1000 + Math.random() * 9000);
    this.examId = `RAD${year}${month}${random}`;
  }
  next();
});

// Static methods
radiologyExamSchema.statics.findByAppointmentId = function (
  appointmentId: string,
) {
  return this.find({ appointment: appointmentId })
    .populate("patient", "name patientId")
    .populate("doctor", "name specialization")
    .populate("orderedBy", "name")
    .populate("charges.collectedBy", "name")
    .populate("paymentVerifiedBy", "name")
    .populate("createdBy", "name")
    .populate("finalizedBy", "name")
    .populate("printedBy", "name")
    .sort({ createdAt: -1 });
};

radiologyExamSchema.statics.findByPatientId = function (patientId: string) {
  return this.find({ patient: patientId })
    .populate("appointment", "appointmentId date")
    .populate("doctor", "name specialization")
    .populate("charges.collectedBy", "name")
    .populate("paymentVerifiedBy", "name")
    .populate("createdBy", "name")
    .populate("finalizedBy", "name")
    .populate("printedBy", "name")
    .sort({ orderedAt: -1 });
};

radiologyExamSchema.statics.findByDoctorId = function (doctorId: string) {
  return this.find({ doctor: doctorId })
    .populate("patient", "name patientId")
    .populate("appointment", "appointmentId date")
    .populate("charges.collectedBy", "name")
    .populate("paymentVerifiedBy", "name")
    .populate("createdBy", "name")
    .populate("finalizedBy", "name")
    .populate("printedBy", "name")
    .sort({ orderedAt: -1 });
};

radiologyExamSchema.statics.getUnpaidExams = function (patientId?: string) {
  const query: any = {
    "charges.paymentStatus": { $in: ["pending", "partial"] },
    status: { $ne: "cancelled" },
  };
  if (patientId) {
    query.patient = patientId;
  }

  return this.find(query)
    .populate("patient", "name patientId phone")
    .populate("doctor", "name")
    .populate("charges.collectedBy", "name")
    .populate("createdBy", "name")
    .populate("finalizedBy", "name")
    .populate("printedBy", "name")
    .sort({ orderedAt: 1 });
};

// Payment verification static methods
radiologyExamSchema.statics.verifyPayment = async function (
  examId: string,
  verifiedBy: string,
  notes?: string,
): Promise<IRadiologyExam | null> {
  return this.findByIdAndUpdate(
    examId,
    {
      $set: {
        paymentVerified: true,
        paymentVerifiedBy: verifiedBy,
        paymentVerifiedAt: new Date(),
        ...(notes && { "verificationDetails.verificationNotes": notes }),
      },
    },
    { new: true },
  );
};

radiologyExamSchema.statics.unverifyPayment = async function (
  examId: string,
): Promise<IRadiologyExam | null> {
  return this.findByIdAndUpdate(
    examId,
    {
      $set: {
        paymentVerified: false,
        paymentVerifiedBy: null,
        paymentVerifiedAt: null,
      },
    },
    { new: true },
  );
};

// Direct radiology exam workflow static methods
radiologyExamSchema.statics.findDirectExams = function (): Promise<
  IRadiologyExam[]
> {
  return this.find({ isDirectExam: true })
    .populate("patient", "name patientId phone")
    .populate("createdBy", "name")
    .populate("finalizedBy", "name")
    .populate("printedBy", "name")
    .sort({ createdAtDirect: -1 });
};

radiologyExamSchema.statics.findDirectExamsByCreator = function (
  creatorId: string,
): Promise<IRadiologyExam[]> {
  return this.find({ isDirectExam: true, createdBy: creatorId })
    .populate("patient", "name patientId phone")
    .populate("createdBy", "name")
    .populate("finalizedBy", "name")
    .populate("printedBy", "name")
    .sort({ createdAtDirect: -1 });
};

radiologyExamSchema.statics.findDirectExamsPendingFinalization =
  function (): Promise<IRadiologyExam[]> {
    return this.find({
      isDirectExam: true,
      paymentVerified: true,
      finalized: false,
      status: { $in: ["completed", "reported"] },
    })
      .populate("patient", "name patientId phone")
      .populate("createdBy", "name")
      .sort({ createdAtDirect: -1 });
  };

radiologyExamSchema.statics.findDirectExamsReadyForPrint = function (): Promise<
  IRadiologyExam[]
> {
  return this.find({
    isDirectExam: true,
    finalized: true,
    readyForPrint: true,
    printedAt: null,
  })
    .populate("patient", "name patientId phone")
    .populate("createdBy", "name")
    .populate("finalizedBy", "name")
    .sort({ finalizedAt: -1 });
};

radiologyExamSchema.statics.finalizeExam = async function (
  examId: string,
  finalizedBy: string,
): Promise<IRadiologyExam | null> {
  return this.findByIdAndUpdate(
    examId,
    {
      $set: {
        finalized: true,
        finalizedAt: new Date(),
        finalizedBy: finalizedBy,
        readyForPrint: true,
      },
    },
    { new: true },
  );
};

radiologyExamSchema.statics.markReadyForPrint = async function (
  examId: string,
  userId: string,
): Promise<IRadiologyExam | null> {
  return this.findByIdAndUpdate(
    examId,
    {
      $set: {
        readyForPrint: true,
      },
    },
    { new: true },
  );
};

radiologyExamSchema.statics.markAsPrinted = async function (
  examId: string,
  printedBy: string,
): Promise<IRadiologyExam | null> {
  return this.findByIdAndUpdate(
    examId,
    {
      $set: {
        printedAt: new Date(),
        printedBy: printedBy,
      },
    },
    { new: true },
  );
};

// Instance method to update exam status
radiologyExamSchema.methods.updateExamStatus = function (
  status: string,
  details?: any,
) {
  this.examStatus = status;
  if (details) {
    this.examDetails = { ...this.examDetails, ...details };
  }
  if (status === "completed" && !this.completedAt) {
    this.completedAt = new Date();
  }
  return this.save();
};

// Instance method to update processing status
radiologyExamSchema.methods.updateProcessingStatus = function (
  status: string,
  details?: any,
) {
  this.processingStatus = status;
  if (details) {
    this.processingDetails = { ...this.processingDetails, ...details };
  }
  if (status === "completed" && !this.completedAt) {
    this.completedAt = new Date();
  }
  return this.save();
};

// Instance method to update verification status
radiologyExamSchema.methods.updateVerificationStatus = function (
  status: string,
  details?: any,
) {
  this.verificationStatus = status;
  if (details) {
    this.verificationDetails = { ...this.verificationDetails, ...details };
  }
  if (status === "verified" && !this.reportedAt) {
    this.reportedAt = new Date();
    this.status = "reported";
  }
  return this.save();
};

// Instance method to add findings
radiologyExamSchema.methods.addFindings = function (
  results: any,
  reportedBy: string,
) {
  this.results = results;
  this.results.reportedBy = reportedBy;
  this.results.reportedAt = new Date();
  this.status = "completed";
  return this.save();
};

// Instance method to get exam summary
radiologyExamSchema.methods.getSummary = function () {
  return {
    examId: this.examId,
    patientId: this.patient,
    doctorId: this.doctor,
    examName: this.examName,
    category: this.category,
    status: this.status,
    priority: this.priority,
    orderedAt: this.orderedAt,
    price: this.price,
    paymentStatus: this.charges?.paymentStatus,
    paymentVerified: this.paymentVerified,
    examStatus: this.examStatus,
    processingStatus: this.processingStatus,
    verificationStatus: this.verificationStatus,
    // Direct radiology exam workflow fields
    isDirectExam: this.isDirectExam,
    createdBy: this.createdBy,
    createdAtDirect: this.createdAtDirect,
    finalized: this.finalized,
    finalizedAt: this.finalizedAt,
    finalizedBy: this.finalizedBy,
    readyForPrint: this.readyForPrint,
    printedAt: this.printedAt,
    printedBy: this.printedBy,
  };
};

// Instance method to cancel exam
radiologyExamSchema.methods.cancel = function (reason?: string) {
  this.status = "cancelled";
  this.cancelledAt = new Date();
  if (reason) {
    this.notes = this.notes
      ? `${this.notes}\nCancelled: ${reason}`
      : `Cancelled: ${reason}`;
  }
  return this.save();
};

// Direct radiology exam workflow instance methods
radiologyExamSchema.methods.finalize = function (finalizedBy: string) {
  this.finalized = true;
  this.finalizedAt = new Date();
  this.finalizedBy = finalizedBy;
  this.readyForPrint = true;
  return this.save();
};

radiologyExamSchema.methods.markReadyForPrint = function () {
  this.readyForPrint = true;
  return this.save();
};

radiologyExamSchema.methods.markAsPrinted = function (printedBy: string) {
  this.printedAt = new Date();
  this.printedBy = printedBy;
  return this.save();
};

radiologyExamSchema.methods.isDirectRadiologyExam = function () {
  return this.isDirectExam === true;
};

radiologyExamSchema.methods.canFinalize = function () {
  return (
    this.isDirectExam &&
    this.paymentVerified &&
    !this.finalized &&
    (this.status === "completed" || this.status === "reported")
  );
};

radiologyExamSchema.methods.canPrint = function () {
  return this.finalized && this.readyForPrint && !this.printedAt;
};

// Export the model
export const RadiologyExam =
  models.RadiologyExam ||
  model<IRadiologyExam, RadiologyExamModel>(
    "RadiologyExam",
    radiologyExamSchema,
  );
