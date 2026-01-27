// lib/models/Prescription.ts - UPDATED WITH EXPIRY AUTOMATION
import mongoose, { Schema, model, models, Document } from "mongoose";

export interface IPrescription extends Document {
  prescriptionId: string;
  patient: mongoose.Types.ObjectId;
  doctor: mongoose.Types.ObjectId;
  appointment?: mongoose.Types.ObjectId;
  medications: {
    medicine: mongoose.Types.ObjectId;
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
  }[];
  diagnosis: string;
  notes?: string;
  instructions?: string;
  prescribedDate: Date;
  expiryDate: Date;
  followUpDate?: Date;
  status: "active" | "completed" | "cancelled" | "expired";
  dispensedBy?: mongoose.Types.ObjectId; // Pharmacist who dispensed
  dispensedDate?: Date;
  dispensingStatus: "pending" | "partial" | "full" | "cancelled";
  pharmacyNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PrescriptionSchema = new Schema<IPrescription>(
  {
    prescriptionId: {
      type: String,
      required: true,
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
    medications: [{
      medicine: { type: Schema.Types.ObjectId, ref: "MedicineStock", required: false }, // Made optional for manual prescriptions
      name: { type: String, required: true },
      dosage: { type: String, required: true },
      frequency: { type: String, required: true },
      duration: { type: String, required: true },
      instructions: { type: String, default: "" },
      quantity: { type: Number, required: true, min: 1 },
      price: { type: Number, required: true, min: 0 },
      route: { 
        type: String, 
        enum: ["oral", "topical", "inhalation", "injection", "rectal", "vaginal", "ophthalmic", "otic", "nasal", "transdermal"],
        default: "oral"
      },
      refills: { type: Number, default: 0, min: 0 },
      refillsRemaining: { type: Number, default: 0, min: 0 },
    }],
    diagnosis: {
      type: String,
      required: true,
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
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
PrescriptionSchema.index({ prescriptionId: 1 });
PrescriptionSchema.index({ patient: 1 });
PrescriptionSchema.index({ doctor: 1 });
PrescriptionSchema.index({ status: 1 });
PrescriptionSchema.index({ dispensingStatus: 1 });
PrescriptionSchema.index({ expiryDate: 1 });
PrescriptionSchema.index({ createdAt: -1 });

// Pre-save hook to generate prescription ID
PrescriptionSchema.pre("save", function (next) {
  if (!this.prescriptionId) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000);
    this.prescriptionId = `RX${year}${month}${random}`;
  }
  
  // Check if prescription is expired
  if (this.expiryDate && this.expiryDate < new Date() && this.status === "active") {
    this.status = "expired";
  }
  
  next();
});

// NEW: Static method to update expired prescriptions
PrescriptionSchema.statics.updateExpiredPrescriptions = async function() {
  const result = await this.updateMany(
    {
      expiryDate: { $lt: new Date() },
      status: "active"
    },
    { 
      status: "expired",
      dispensingStatus: "cancelled"
    }
  );
  return result;
};

// NEW: Static method to get prescriptions by status with pagination
PrescriptionSchema.statics.getPrescriptionsByStatus = async function(status: string, options: { page?: number; limit?: number; search?: string } = {}) {
  const { page = 1, limit = 20, search = "" } = options;
  const skip = (page - 1) * limit;
  
  let query: any = { status };
  
  if (search) {
    query.$or = [
      { prescriptionId: { $regex: search, $options: "i" } },
      { diagnosis: { $regex: search, $options: "i" } },
    ];
  }
  
  const prescriptions = await this.find(query)
    .populate({
      path: "patient",
      select: "name patientId phone",
      match: search ? {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { patientId: { $regex: search, $options: "i" } },
        ]
      } : {}
    })
    .populate({
      path: "doctor",
      select: "name specialization",
      match: search ? { name: { $regex: search, $options: "i" } } : {}
    })
    .populate({
      path: "medications.medicine",
      select: "name batchNumber currentQuantity sellingPrice unitPrice",
      model: "MedicineStock"
    })
    .select("prescriptionId patient doctor medications diagnosis notes instructions prescribedDate expiryDate status dispensingStatus")
    .sort({ prescribedDate: -1 })
    .skip(skip)
    .limit(limit);

  const total = await this.countDocuments(query);
  
  // Filter prescriptions to ensure patient and doctor are populated when searching
  const filteredPrescriptions = search 
    ? prescriptions.filter((p: any) => p.patient && p.doctor)
    : prescriptions;
  
  return {
    prescriptions: filteredPrescriptions,
    total,
    pages: Math.ceil(total / limit),
    currentPage: page
  };
};

// NEW: Instance method to process refill
PrescriptionSchema.methods.processRefill = async function(pharmacistId: string) {
  if (this.refillsRemaining <= 0) {
    throw new Error("No refills remaining");
  }
  
  this.refillsRemaining -= 1;
  this.dispensedBy = pharmacistId;
  this.dispensedDate = new Date();
  
  if (this.refillsRemaining === 0) {
    this.status = "completed";
    this.dispensingStatus = "full";
  }
  
  return this.save();
};

export const Prescription = models.Prescription || model<IPrescription>("Prescription", PrescriptionSchema);
