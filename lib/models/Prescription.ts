// lib/models/Prescription.ts

import mongoose, { Schema, model, models, Document } from "mongoose";

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
  diagnosis: string;
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
  createdAt: Date;
  updatedAt: Date;
}

const PrescriptionSchema = new Schema<IPrescription>(
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
    medications: [{
      medicine: {
        type: Schema.Types.ObjectId,
        ref: "MedicineStock",
        required: false
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
    this.dispensingStatus = "cancelled";
  }
  
  next();
});

// Static method to update expired prescriptions
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

// Static method to find active prescriptions
PrescriptionSchema.statics.findActivePrescriptions = async function(patientId?: string) {
  const query: any = { 
    status: "active",
    dispensingStatus: { $in: ["pending", "partial"] }
  };
  
  if (patientId) {
    query.patient = patientId;
  }
  
  return this.find(query)
    .populate("patient", "name patientId phone")
    .populate("doctor", "name specialization")
    .populate({
      path: "medications.medicine",
      select: "name batchNumber currentQuantity sellingPrice unitPrice expiryDate supplier",
    })
    .sort({ prescribedDate: -1 });
};

// Instance method to process dispensing - FIXED TYPE ERROR
PrescriptionSchema.methods.processDispensing = async function(
  items: Array<{ medicine: string; dispensedQuantity: number }>,
  pharmacistId: string
) {
  let totalDispensed = 0;
  let totalPrescribed = 0;

  // Calculate totals - FIX: Check if medicine exists before accessing
  this.medications.forEach((med: IPrescriptionMedication) => {
    totalPrescribed += med.quantity;
    
    // Check if medicine exists and is a valid ObjectId
    if (med.medicine && mongoose.Types.ObjectId.isValid(med.medicine)) {
      const item = items.find(i => i.medicine === med.medicine!.toString());
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

export const Prescription = models.Prescription || model<IPrescription>("Prescription", PrescriptionSchema);