// lib/models/Patient.ts
import mongoose, { Schema, model, models } from "mongoose";

export interface IPatient extends mongoose.Document {
  patientId: string;
  user: mongoose.Types.ObjectId; // Reference to User if registered
  name: {
    first: string;
    last: string;
    middle?: string;
  };
  email?: string;
  phone: string;
  alternatePhone?: string;
  dateOfBirth: Date;
  age: number;
  gender: "male" | "female" | "other" | "prefer_not_to_say";
  bloodGroup?: "A+" | "A-" | "B+" | "B-" | "O+" | "O-" | "AB+" | "AB-";
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  medicalRecordNumber: string;
  primaryPhysician?: mongoose.Types.ObjectId;
  insurance?: {
    provider: string;
    policyNumber: string;
    groupNumber?: string;
    validUntil: Date;
  };
  allergies: string[];
  chronicConditions: string[];
  currentMedications: string[];
  notes?: string;
  active: boolean;
  registeredBy: mongoose.Types.ObjectId;
  lastVisit?: Date;
  nextAppointment?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const patientSchema = new Schema<IPatient>(
  {
    patientId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    name: {
      first: { type: String, required: true, trim: true },
      last: { type: String, required: true, trim: true },
      middle: { type: String, trim: true },
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    alternatePhone: {
      type: String,
      trim: true,
    },
    dateOfBirth: {
      type: Date,
      required: true,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other", "prefer_not_to_say"],
      required: true,
    },
    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"],
    },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      country: { type: String, required: true, default: "Country" },
      postalCode: { type: String, required: true },
    },
    emergencyContact: {
      name: { type: String, required: true },
      relationship: { type: String, required: true },
      phone: { type: String, required: true },
    },
    medicalRecordNumber: {
      type: String,
      required: true,
      unique: true,
    },
    primaryPhysician: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    insurance: {
      provider: String,
      policyNumber: String,
      groupNumber: String,
      validUntil: Date,
    },
    allergies: [{
      type: String,
      trim: true,
    }],
    chronicConditions: [{
      type: String,
      trim: true,
    }],
    currentMedications: [{
      type: String,
      trim: true,
    }],
    notes: {
      type: String,
    },
    active: {
      type: Boolean,
      default: true,
    },
    registeredBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lastVisit: {
      type: Date,
    },
    nextAppointment: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
patientSchema.index({ patientId: 1 });
patientSchema.index({ medicalRecordNumber: 1 });
patientSchema.index({ "name.first": 1, "name.last": 1 });
patientSchema.index({ phone: 1 });
patientSchema.index({ email: 1 });
patientSchema.index({ active: 1 });

// Virtual for age
patientSchema.virtual("age").get(function () {
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

// Pre-save hook for patient ID
patientSchema.pre("save", function (next) {
  if (!this.patientId || this.isNew) {
    const year = new Date().getFullYear().toString().slice(-2);
    const random = Math.floor(10000 + Math.random() * 90000);
    this.patientId = `PAT${year}${random}`;
  }
  
  if (!this.medicalRecordNumber) {
    const random = Math.floor(100000 + Math.random() * 900000);
    this.medicalRecordNumber = `MRN${random}`;
  }
  
  next();
});

export const Patient = models.Patient || model<IPatient>("Patient", patientSchema);