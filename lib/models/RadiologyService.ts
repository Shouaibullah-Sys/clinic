// lib/models/RadiologyService.ts
import mongoose, { Schema, model, models, Document } from "mongoose";

// Define the charges sub-schema interface
export interface IRadiologyServiceCharges {
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

export interface IRadiologyService extends Document {
  serviceId: string;
  patient: mongoose.Types.ObjectId;
  department: mongoose.Types.ObjectId;
  templateId?: mongoose.Types.ObjectId;
  serviceType: "x-ray" | "ct-scan" | "mri" | "ultrasound";
  bodyPart: string;
  view: string;
  contrastUsed?: boolean;
  contrastType?: string;
  referringDoctor: mongoose.Types.ObjectId;
  radiologist: mongoose.Types.ObjectId;
  technician: mongoose.Types.ObjectId;
  appointment: mongoose.Types.ObjectId;
  requestDate: Date;
  scheduledDate: Date;
  performedDate?: Date;
  images: {
    imageId: string;
    imageUrl: string;
    view: string;
    description?: string;
    takenAt: Date;
    takenBy: mongoose.Types.ObjectId;
  }[];
  findings: string;
  impression: string;
  recommendations?: string;
  reportStatus: "pending" | "completed" | "reviewed" | "approved";
  reportGeneratedBy?: mongoose.Types.ObjectId;
  reportGeneratedAt?: Date;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  priority: "routine" | "urgent" | "emergency";
  status: "scheduled" | "in-progress" | "completed" | "cancelled";
  billingStatus: "pending" | "billed" | "paid";
  charges: IRadiologyServiceCharges;
  paymentVerified: boolean;
  paymentVerifiedBy?: mongoose.Types.ObjectId;
  paymentVerifiedAt?: Date;
  notes?: string;
  report?: {
    clinicalIndication?: string;
    technique?: string;
    comparison?: string;
    findings?: string;
    impression?: string;
    recommendations?: string;
    criticalFindings?: boolean;
    criticalFindingsDetails?: string;
    criticalCommunication?: {
      communicated: boolean;
      communicatedTo?: string;
      communicatedAt?: Date;
      method?: string;
      notes?: string;
    };
    status: "draft" | "final" | "amended";
    version: number;
    amendmentReason?: string;
    finalizedBy?: mongoose.Types.ObjectId;
    finalizedAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
  
  // Virtuals
  calculatedTotal: number;
  isPaid: boolean;
  canPerform: boolean;
}

// Define the charges sub-schema
const radiologyServiceChargesSchema = new Schema<IRadiologyServiceCharges>({
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

// Define static methods interface
interface RadiologyServiceModel extends mongoose.Model<IRadiologyService> {
  findByAppointmentId(appointmentId: string): Promise<IRadiologyService[]>;
  findByPatientId(patientId: string): Promise<IRadiologyService[]>;
  getUnpaidServices(patientId?: string): Promise<IRadiologyService[]>;
  verifyPayment(serviceId: string, verifiedBy: string, notes?: string): Promise<IRadiologyService | null>;
  unverifyPayment(serviceId: string): Promise<IRadiologyService | null>;
}

const RadiologyServiceSchema = new Schema<IRadiologyService, RadiologyServiceModel>(
  {
    serviceId: {
      type: String,
      unique: true,
      uppercase: true,
    },
    patient: {
      type: Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: "ServiceDepartment",
    },
    templateId: {
      type: Schema.Types.ObjectId,
      ref: "RadiologyTemplate",
    },
    serviceType: {
      type: String,
      enum: ["x-ray", "ct-scan", "mri", "ultrasound"],
      required: true,
    },
    bodyPart: {
      type: String,
      required: true,
      trim: true,
    },
    view: {
      type: String,
      required: true,
      trim: true,
    },
    contrastUsed: {
      type: Boolean,
      default: false,
    },
    contrastType: {
      type: String,
      trim: true,
    },
    referringDoctor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    radiologist: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    technician: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    appointment: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
    },
    requestDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    scheduledDate: {
      type: Date,
      required: true,
    },
    performedDate: {
      type: Date,
    },
    images: [{
      imageId: { type: String, required: true },
      imageUrl: { type: String, required: true },
      view: { type: String, required: true },
      description: { type: String },
      takenAt: { type: Date, default: Date.now },
      takenBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    }],
    findings: {
      type: String,
      trim: true,
    },
    impression: {
      type: String,
      trim: true,
    },
    recommendations: {
      type: String,
      trim: true,
    },
    reportStatus: {
      type: String,
      enum: ["pending", "completed", "reviewed", "approved"],
      default: "pending",
    },
    reportGeneratedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    reportGeneratedAt: {
      type: Date,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: {
      type: Date,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: {
      type: Date,
    },
    priority: {
      type: String,
      enum: ["routine", "urgent", "emergency"],
      default: "routine",
    },
    status: {
      type: String,
      enum: ["scheduled", "in-progress", "completed", "cancelled"],
      default: "scheduled",
    },
    billingStatus: {
      type: String,
      enum: ["pending", "billed", "paid"],
      default: "pending",
    },
    charges: {
      type: radiologyServiceChargesSchema,
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
    notes: {
      type: String,
      trim: true,
    },
    report: {
      clinicalIndication: { type: String, trim: true },
      technique: { type: String, trim: true },
      comparison: { type: String, trim: true },
      findings: { type: String, trim: true },
      impression: { type: String, trim: true },
      recommendations: { type: String, trim: true },
      criticalFindings: { type: Boolean, default: false },
      criticalFindingsDetails: { type: String, trim: true },
      criticalCommunication: {
        communicated: { type: Boolean, default: false },
        communicatedTo: { type: String, trim: true },
        communicatedAt: { type: Date },
        method: { type: String, trim: true },
        notes: { type: String, trim: true },
      },
      status: {
        type: String,
        enum: ["draft", "final", "amended"],
        default: "draft",
      },
      version: { type: Number, default: 1, min: 1 },
      amendmentReason: { type: String, trim: true },
      finalizedBy: { type: Schema.Types.ObjectId, ref: "User" },
      finalizedAt: { type: Date },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
RadiologyServiceSchema.index({ patient: 1 });
RadiologyServiceSchema.index({ serviceType: 1 });
RadiologyServiceSchema.index({ scheduledDate: -1 });
RadiologyServiceSchema.index({ status: 1 });
RadiologyServiceSchema.index({ referringDoctor: 1 });
RadiologyServiceSchema.index({ "charges.paymentStatus": 1 });
RadiologyServiceSchema.index({ paymentVerified: 1 });
RadiologyServiceSchema.index({ appointment: 1 });

// Compound indexes
RadiologyServiceSchema.index({ patient: 1, status: 1 });
RadiologyServiceSchema.index({ "charges.paymentStatus": 1, status: 1 });
RadiologyServiceSchema.index({ priority: 1, paymentVerified: 1 });
RadiologyServiceSchema.index({ appointment: 1, status: 1 });

// Virtual for calculated total amount
RadiologyServiceSchema.virtual("calculatedTotal").get(function () {
  const base = this.charges?.basePrice || 0;
  const tax = this.charges?.tax || 0;
  const other = this.charges?.otherCharges || 0;
  const discount = this.charges?.discount || 0;
  
  return base + tax + other - discount;
});

// Virtual for isPaid
RadiologyServiceSchema.virtual("isPaid").get(function () {
  return this.charges?.paymentStatus === "paid";
});

// Virtual for canPerform
RadiologyServiceSchema.virtual("canPerform").get(function () {
  const condition1 = this.status !== "cancelled";
  const condition2 = this.paymentVerified || this.priority !== "routine";
  const condition3 = this.status === "scheduled";

  return condition1 && condition2 && condition3;
});

  // Pre-save hook
  RadiologyServiceSchema.pre("save", function (next) {
    // Generate service ID if not exists
    if (!this.serviceId) {
      const prefixMap = {
        "x-ray": "XRAY",
        "ct-scan": "CT",
        "mri": "MRI",
        "ultrasound": "US",
      };
      const prefix = prefixMap[this.serviceType] || "RAD";
      const date = new Date();
      const year = date.getFullYear().toString().slice(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const random = Math.floor(1000 + Math.random() * 9000);
      this.serviceId = `${prefix}${year}${month}${random}`;
    }
  
  // Calculate total amount and update charges
  if (this.isModified("charges") || this.isNew) {
    const base = this.charges?.basePrice || 0;
    this.charges.totalAmount = base + this.charges.tax + this.charges.otherCharges - this.charges.discount;
    
    // Update due amount
    this.charges.due = Math.max(0, this.charges.totalAmount - this.charges.paid);
    
    // Update payment status
    if (this.charges.due === 0 && this.charges.totalAmount > 0) {
      this.charges.paymentStatus = "paid";
      this.billingStatus = "paid";
      if (!this.paymentVerified) {
        this.paymentVerified = true;
        this.paymentVerifiedAt = new Date();
      }
    } else if (this.charges.paid > 0) {
      this.charges.paymentStatus = "partial";
      this.billingStatus = "billed";
    } else {
      this.charges.paymentStatus = "pending";
      this.billingStatus = "pending";
    }
  }
  
  next();
});

// Static methods
RadiologyServiceSchema.statics.findByAppointmentId = function (appointmentId: string) {
  return this.find({ appointment: appointmentId })
    .populate("patient", "name patientId")
    .populate("referringDoctor", "name specialization")
    .populate("radiologist", "name")
    .populate("technician", "name")
    .populate("charges.collectedBy", "name")
    .populate("paymentVerifiedBy", "name")
    .sort({ requestDate: -1 });
};

RadiologyServiceSchema.statics.findByPatientId = function (patientId: string) {
  return this.find({ patient: patientId })
    .populate("appointment", "appointmentId date")
    .populate("referringDoctor", "name specialization")
    .populate("charges.collectedBy", "name")
    .populate("paymentVerifiedBy", "name")
    .sort({ requestDate: -1 });
};

RadiologyServiceSchema.statics.getUnpaidServices = function (patientId?: string) {
  const query: any = { 
    "charges.paymentStatus": { $in: ["pending", "partial"] },
    status: { $ne: "cancelled" }
  };
  if (patientId) {
    query.patient = patientId;
  }
  
  return this.find(query)
    .populate("patient", "name patientId phone")
    .populate("referringDoctor", "name")
    .populate("charges.collectedBy", "name")
    .sort({ requestDate: 1 });
};

// Payment verification static methods
RadiologyServiceSchema.statics.verifyPayment = async function (
  serviceId: string,
  verifiedBy: string,
  notes?: string
): Promise<IRadiologyService | null> {
  return this.findByIdAndUpdate(
    serviceId,
    {
      $set: {
        paymentVerified: true,
        paymentVerifiedBy: verifiedBy,
        paymentVerifiedAt: new Date(),
        billingStatus: "paid",
      },
    },
    { new: true }
  );
};

RadiologyServiceSchema.statics.unverifyPayment = async function (
  serviceId: string
): Promise<IRadiologyService | null> {
  return this.findByIdAndUpdate(
    serviceId,
    {
      $set: {
        paymentVerified: false,
        paymentVerifiedBy: null,
        paymentVerifiedAt: null,
        billingStatus: "pending",
      },
    },
    { new: true }
  );
};

export const RadiologyService = (models.RadiologyService || model<IRadiologyService, RadiologyServiceModel>("RadiologyService", RadiologyServiceSchema)) as RadiologyServiceModel;
