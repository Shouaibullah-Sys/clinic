import mongoose, { Schema, model, models } from "mongoose";

export interface IDiscountRequest extends mongoose.Document {
  discountId: string;
  patient: mongoose.Types.ObjectId;
  invoice?: mongoose.Types.ObjectId;
  appointment?: mongoose.Types.ObjectId;
  requestedAmount: number;
  discountPercentage?: number;
  originalAmount?: number;
  reason: string;
  requestCategory: "financial_hardship" | "senior_citizen" | "staff_discount" | "insurance_coverage" | "promotional" | "other";
  supportingDocuments?: string[]; // URLs to uploaded documents
  requestedBy: mongoose.Types.ObjectId;
  requestedAt: Date;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  approvedAmount?: number;
  approvedPercentage?: number;
  status: "pending" | "approved" | "rejected" | "cancelled" | "expired";
  reviewNotes?: string;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  expiryDate?: Date;
  appliedToInvoice?: boolean;
  appliedAt?: Date;
  appliedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const discountRequestSchema = new Schema<IDiscountRequest>(
  {
    discountId: {
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
    invoice: {
      type: Schema.Types.ObjectId,
      ref: "Invoice",
    },
    appointment: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
    },
    requestedAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    discountPercentage: {
      type: Number,
      min: 0,
      max: 100,
    },
    originalAmount: {
      type: Number,
      min: 0,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    requestCategory: {
      type: String,
      enum: [
        "financial_hardship",
        "senior_citizen",
        "staff_discount",
        "insurance_coverage",
        "promotional",
        "other",
      ],
      required: true,
    },
    supportingDocuments: [{
      type: String,
    }],
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: {
      type: Date,
    },
    approvedAmount: {
      type: Number,
      min: 0,
    },
    approvedPercentage: {
      type: Number,
      min: 0,
      max: 100,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled", "expired"],
      default: "pending",
    },
    reviewNotes: {
      type: String,
      trim: true,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: {
      type: Date,
    },
    expiryDate: {
      type: Date,
    },
    appliedToInvoice: {
      type: Boolean,
      default: false,
    },
    appliedAt: {
      type: Date,
    },
    appliedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
discountRequestSchema.index({ discountId: 1 });
discountRequestSchema.index({ patient: 1 });
discountRequestSchema.index({ requestedBy: 1 });
discountRequestSchema.index({ status: 1 });
discountRequestSchema.index({ requestedAt: -1 });
discountRequestSchema.index({ expiryDate: 1 });
discountRequestSchema.index({ requestCategory: 1 });

// Compound indexes
discountRequestSchema.index({ patient: 1, status: 1 });
discountRequestSchema.index({ requestedBy: 1, requestedAt: -1 });
discountRequestSchema.index({ status: 1, requestedAt: -1 });

// Pre-save hooks
discountRequestSchema.pre("save", function (next) {
  // Generate discount ID if not exists
  if (!this.discountId || this.isNew) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const random = Math.floor(1000 + Math.random() * 9000);
    this.discountId = `DIS${year}${month}${random}`;
  }

  // Calculate discount percentage if not provided
  if (this.originalAmount && this.requestedAmount && !this.discountPercentage) {
    this.discountPercentage = (this.requestedAmount / this.originalAmount) * 100;
  }

  // Set expiry date (default 30 days from request)
  if (!this.expiryDate && this.isNew) {
    const expiry = new Date(this.requestedAt);
    expiry.setDate(expiry.getDate() + 30);
    this.expiryDate = expiry;
  }

  // Check if expired
  if (this.expiryDate && new Date() > this.expiryDate && this.status === "pending") {
    this.status = "expired";
  }

  // If approved, set approved amount if not provided
  if (this.status === "approved" && !this.approvedAmount) {
    this.approvedAmount = this.requestedAmount;
  }

  next();
});

// Virtuals
discountRequestSchema.virtual("isExpired").get(function () {
  if (!this.expiryDate) return false;
  return new Date() > this.expiryDate && this.status === "pending";
});

discountRequestSchema.virtual("daysRemaining").get(function () {
  if (!this.expiryDate) return null;
  const now = new Date();
  const expiry = new Date(this.expiryDate);
  const diffTime = expiry.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

discountRequestSchema.virtual("formattedRequestedAmount").get(function () {
  return `$${this.requestedAmount.toFixed(2)}`;
});

discountRequestSchema.virtual("formattedApprovedAmount").get(function () {
  return this.approvedAmount ? `$${this.approvedAmount.toFixed(2)}` : null;
});

// Static methods
discountRequestSchema.statics.findPendingRequests = function () {
  return this.find({ status: "pending" })
    .populate("patient", "name phone")
    .populate("requestedBy", "name role")
    .sort({ requestedAt: -1 });
};

discountRequestSchema.statics.findByPatientId = function (patientId: string) {
  return this.find({ patient: patientId })
    .populate("requestedBy", "name")
    .populate("reviewedBy", "name")
    .sort({ requestedAt: -1 });
};

discountRequestSchema.statics.approveRequest = async function (
  discountId: string,
  approvedAmount: number,
  approvedBy: string,
  notes?: string
) {
  const request = await this.findOne({ discountId });
  
  if (!request) {
    throw new Error("Discount request not found");
  }
  
  if (request.status !== "pending") {
    throw new Error(`Cannot approve request with status: ${request.status}`);
  }
  
  request.approvedAmount = approvedAmount;
  request.approvedBy = new mongoose.Types.ObjectId(approvedBy);
  request.approvedAt = new Date();
  request.status = "approved";
  request.reviewNotes = notes;
  
  return request.save();
};

discountRequestSchema.statics.rejectRequest = async function (
  discountId: string,
  rejectedBy: string,
  notes?: string
) {
  const request = await this.findOne({ discountId });
  
  if (!request) {
    throw new Error("Discount request not found");
  }
  
  if (request.status !== "pending") {
    throw new Error(`Cannot reject request with status: ${request.status}`);
  }
  
  request.reviewedBy = new mongoose.Types.ObjectId(rejectedBy);
  request.reviewedAt = new Date();
  request.status = "rejected";
  request.reviewNotes = notes;
  
  return request.save();
};

// Instance methods
discountRequestSchema.methods.applyToInvoice = async function (
  invoiceId: string,
  appliedBy: string
) {
  if (this.status !== "approved") {
    throw new Error("Cannot apply discount that is not approved");
  }
  
  if (this.appliedToInvoice) {
    throw new Error("Discount already applied to an invoice");
  }
  
  this.appliedToInvoice = true;
  this.appliedAt = new Date();
  this.appliedBy = new mongoose.Types.ObjectId(appliedBy);
  this.invoice = new mongoose.Types.ObjectId(invoiceId);
  
  return this.save();
};

// Middleware to auto-populate
discountRequestSchema.pre("find", function () {
  this.populate("patient", "name phone email");
});

discountRequestSchema.pre("findOne", function () {
  this.populate("patient", "name phone email");
});

// JSON transformation
discountRequestSchema.set("toJSON", {
  virtuals: true,
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete (ret as any)._id;
    delete (ret as any).__v;
    return ret;
  },
});

export const DiscountRequest = models.DiscountRequest || model<IDiscountRequest>("DiscountRequest", discountRequestSchema);
