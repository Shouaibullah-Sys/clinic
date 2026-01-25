// lib/models/Prescription.ts - COMPLETE FIXED VERSION

import mongoose, { Schema, model, models } from "mongoose";

export interface IPrescription extends mongoose.Document {
  prescriptionId: string;
  patient: mongoose.Types.ObjectId;
  doctor: mongoose.Types.ObjectId;
  appointment?: mongoose.Types.ObjectId;
  prescribedDate: Date;
  medications: {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    route: string;
    instructions?: string;
    quantity: number;
    refills: number;
    refillsRemaining: number;
  }[];
  diagnosis: string;
  instructions: string;
  notes?: string;
  status: "active" | "completed" | "cancelled" | "expired";
  expiryDate: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Virtuals
  isExpired: boolean;
  isActive: boolean;
  totalMedications: number;
}

const prescriptionSchema = new Schema<IPrescription>(
  {
    prescriptionId: {
      type: String,
      required: true,
      unique: true,
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
    prescribedDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    medications: [{
      name: { 
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
      duration: { 
        type: String, 
        required: true,
        trim: true,
      },
      route: { 
        type: String, 
        required: true,
        trim: true,
        enum: ["oral", "topical", "inhalation", "injection", "rectal", "vaginal", "ophthalmic", "otic", "nasal", "transdermal"]
      },
      instructions: { 
        type: String,
        trim: true,
      },
      quantity: { 
        type: Number, 
        required: true, 
        min: 1,
      },
      refills: { 
        type: Number, 
        default: 0, 
        min: 0,
      },
      refillsRemaining: { 
        type: Number, 
        default: 0, 
        min: 0,
      },
    }],
    diagnosis: {
      type: String,
      required: true,
      trim: true,
    },
    instructions: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "completed", "cancelled", "expired"],
      default: "active",
    },
    expiryDate: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes - ONLY schema.index() method (NO index: true in fields)
prescriptionSchema.index({ prescriptionId: 1 }, { unique: true });
prescriptionSchema.index({ patient: 1 });
prescriptionSchema.index({ doctor: 1 });
prescriptionSchema.index({ appointment: 1 }, { sparse: true });
prescriptionSchema.index({ prescribedDate: -1 });
prescriptionSchema.index({ status: 1 });
prescriptionSchema.index({ expiryDate: 1 });
prescriptionSchema.index({ createdAt: -1 });
prescriptionSchema.index({ patient: 1, status: 1 });
prescriptionSchema.index({ doctor: 1, status: 1 });

// Compound indexes
prescriptionSchema.index({ patient: 1, prescribedDate: -1 });
prescriptionSchema.index({ doctor: 1, prescribedDate: -1 });
prescriptionSchema.index({ status: 1, expiryDate: 1 });

// Pre-save hook
prescriptionSchema.pre("save", function (next) {
  const prescription = this;
  
  // Generate prescription ID if not exists
  if (!prescription.prescriptionId || prescription.isNew) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(10000 + Math.random() * 90000);
    prescription.prescriptionId = `RX${year}${month}${random}`;
  }
  
  // Set expiry date to 30 days from prescribed date if not set
  if (!prescription.expiryDate) {
    const expiry = new Date(prescription.prescribedDate);
    expiry.setDate(expiry.getDate() + 30);
    prescription.expiryDate = expiry;
  }
  
  // Initialize refillsRemaining if not set
  prescription.medications.forEach(med => {
    if (med.refillsRemaining === undefined) {
      med.refillsRemaining = med.refills;
    }
  });
  
  // Auto-update status based on expiry date
  const now = new Date();
  if (prescription.expiryDate < now && prescription.status === "active") {
    prescription.status = "expired";
  }
  
  next();
});

// Pre-validate hook
prescriptionSchema.pre("validate", function (next) {
  if (!this.prescriptionId) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(10000 + Math.random() * 90000);
    this.prescriptionId = `RX${year}${month}${random}`;
  }
  next();
});

// Virtual for isExpired
prescriptionSchema.virtual("isExpired").get(function () {
  return new Date() > this.expiryDate;
});

// Virtual for isActive
prescriptionSchema.virtual("isActive").get(function () {
  return this.status === "active" && !this.isExpired;
});

// Virtual for totalMedications
prescriptionSchema.virtual("totalMedications").get(function () {
  return this.medications ? this.medications.length : 0;
});

// Virtual for formatted prescribed date
prescriptionSchema.virtual("formattedPrescribedDate").get(function () {
  return this.prescribedDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
});

// Virtual for formatted expiry date
prescriptionSchema.virtual("formattedExpiryDate").get(function () {
  return this.expiryDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
});

// Static method to find active prescriptions for patient
prescriptionSchema.statics.findActiveForPatient = function (patientId: string) {
  return this.find({
    patient: patientId,
    status: "active",
    expiryDate: { $gt: new Date() }
  })
    .populate("doctor", "name specialization")
    .populate("appointment", "appointmentId date")
    .sort({ prescribedDate: -1 });
};

// Static method to find prescriptions by doctor
prescriptionSchema.statics.findByDoctor = function (doctorId: string, limit: number = 50) {
  return this.find({ doctor: doctorId })
    .populate("patient", "name patientId phone")
    .populate("appointment", "appointmentId date")
    .sort({ prescribedDate: -1 })
    .limit(limit);
};

// Static method to find prescriptions by appointment
prescriptionSchema.statics.findByAppointment = function (appointmentId: string) {
  return this.find({ appointment: appointmentId })
    .populate("patient", "name patientId")
    .populate("doctor", "name specialization")
    .sort({ prescribedDate: -1 });
};

// Static method to search prescriptions
prescriptionSchema.statics.searchPrescriptions = function (searchTerm: string, doctorId?: string) {
  const query: any = {
    $or: [
      { prescriptionId: { $regex: searchTerm, $options: "i" } },
      { diagnosis: { $regex: searchTerm, $options: "i" } },
      { "medications.name": { $regex: searchTerm, $options: "i" } },
    ]
  };
  
  if (doctorId) {
    query.doctor = doctorId;
  }
  
  return this.find(query)
    .populate("patient", "name patientId")
    .populate("doctor", "name")
    .sort({ prescribedDate: -1 })
    .limit(20);
};

// Instance method to mark as completed
prescriptionSchema.methods.markAsCompleted = function () {
  this.status = "completed";
  return this.save();
};

// Instance method to cancel prescription
prescriptionSchema.methods.cancel = function (reason?: string) {
  this.status = "cancelled";
  if (reason) {
    this.notes = this.notes ? `${this.notes}\nCancelled: ${reason}` : `Cancelled: ${reason}`;
  }
  return this.save();
};

// Instance method to refill medication
prescriptionSchema.methods.refillMedication = function (medicationIndex: number) {
  if (this.medications && this.medications[medicationIndex]) {
    if (this.medications[medicationIndex].refillsRemaining > 0) {
      this.medications[medicationIndex].refillsRemaining--;
      return this.save();
    }
  }
  return Promise.resolve(this);
};

// Instance method to get prescription summary
prescriptionSchema.methods.getSummary = function () {
  return {
    prescriptionId: this.prescriptionId,
    patientId: this.patient,
    doctorId: this.doctor,
    prescribedDate: this.prescribedDate,
    expiryDate: this.expiryDate,
    status: this.status,
    diagnosis: this.diagnosis,
    totalMedications: this.totalMedications,
    isActive: this.isActive,
    isExpired: this.isExpired,
  };
};

export const Prescription = models.Prescription || model<IPrescription>("Prescription", prescriptionSchema);