import mongoose, { Schema, model, models } from "mongoose";

export interface IPatient extends mongoose.Document {
  patientId: string;
  name: string;
  phone: string;
  email?: string;
  dateOfBirth: Date;
  gender: "male" | "female" | "other";
  address?: string;
  emergencyContact?: string;
  bloodGroup?: string;
  allergies?: string;
  medicalHistory?: string;
  active: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const patientSchema = new Schema<IPatient>(
  {
    patientId: {
      type: String,
      unique: true,
      sparse: true, // Changed from required: true
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    dateOfBirth: {
      type: Date,
      required: true,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      required: true,
    },
    address: {
      type: String,
      trim: true,
    },
    emergencyContact: {
      type: String,
      trim: true,
    },
    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown", ""],
      default: "",
    },
    allergies: {
      type: String,
      trim: true,
    },
    medicalHistory: {
      type: String,
      trim: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
patientSchema.index({ patientId: 1 });
patientSchema.index({ phone: 1 });
patientSchema.index({ name: 1 });
patientSchema.index({ active: 1 });
patientSchema.index({ createdAt: -1 });

// Pre-save hook to generate patient ID - UPDATED
patientSchema.pre("save", function (next) {
  const patient = this;
  
  // Only generate patientId if it doesn't exist
  if (!patient.patientId) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const random = Math.floor(1000 + Math.random() * 9000);
    patient.patientId = `PAT${year}${month}${random}`;
    
    console.log("Generated patientId:", patient.patientId);
  }
  
  // Ensure phone is clean (digits only)
  if (patient.phone) {
    patient.phone = patient.phone.replace(/\D/g, '');
  }
  
  next();
});

// Pre-validate hook to ensure patientId exists
patientSchema.pre("validate", function (next) {
  if (!this.patientId) {
    // Generate a temporary patientId for validation
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const random = Math.floor(1000 + Math.random() * 9000);
    this.patientId = `PAT${year}${month}${random}`;
  }
  next();
});

export const Patient = models.Patient || model<IPatient>("Patient", patientSchema);