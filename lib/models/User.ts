// lib/models/User.ts
import mongoose, { Schema, model, models, Document } from "mongoose";
import bcrypt from "bcryptjs";

// Extended User Document with all roles
export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  employeeId: string;
  name: string;
  email: string;
  password: string;
  phone: string;
  role: "admin" | "doctor" | "nurse" | "staff" | "receptionist" | "pharmacist" | "lab_technician" | "radiologist";
  department: string;
  designation: string;
  specialization?: string;
  licenseNumber?: string;
  approved: boolean;
  avatar?: string;
  active: boolean;
  address?: string;
  gender: "male" | "female" | "other";
  joiningDate: Date;
  refreshTokens: string[];
  createdAt: Date;
  updatedAt: Date;
  permissions: string[];
  
  // Method
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    employeeId: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false, // Don't include in queries by default
    },
    phone: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["admin", "doctor", "nurse", "staff", "receptionist", "pharmacist", "lab_technician", "radiologist"],
      default: "staff",
      required: true,
    },
    department: {
      type: String,
      required: true,
    },
    designation: {
      type: String,
      required: true,
    },
    specialization: {
      type: String,
    },
    licenseNumber: {
      type: String,
    },
    approved: {
      type: Boolean,
      default: false,
    },
    avatar: {
      type: String,
    },
    active: {
      type: Boolean,
      default: true,
    },
    address: {
      type: String,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },
    refreshTokens: {
      type: [String],
      default: [],
      select: false,
    },
    permissions: {
      type: [String],
      default: [],
    },
    joiningDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
userSchema.index({ role: 1 });
userSchema.index({ approved: 1, active: 1 });
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ employeeId: 1 }, { unique: true });

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate employee ID if not provided
userSchema.pre("save", function (next) {
  if (!this.employeeId) {
    const random = Math.floor(1000 + Math.random() * 9000);
    const year = new Date().getFullYear().toString().slice(-2);
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    this.employeeId = `EMP${year}${month}${random}`;
  }
  next();
});

// Static method to find by email
userSchema.statics.findByEmail = function (email: string) {
  return this.findOne({ email: email.toLowerCase() });
};

interface UserModel extends mongoose.Model<IUser> {
  findByEmail(email: string): Promise<IUser | null>;
}

export const User = (models.User || model<IUser, UserModel>("User", userSchema)) as UserModel;

// Role permissions mapping
export const RolePermissions = {
  admin: ["all"],
  doctor: [
    "view_patients",
    "manage_patients",
    "view_admissions",
    "manage_admissions",
    "view_prescriptions",
    "manage_prescriptions",
    "view_medical_records",
    "manage_medical_records"
  ],
  nurse: [
    "view_patients",
    "update_patients",
    "view_admissions",
    "update_admissions",
    "view_medications",
    "administer_medications",
    "view_vital_signs",
    "record_vital_signs"
  ],
  receptionist: [
    "create_patients",
    "view_patients",
    "create_admissions",
    "view_admissions",
    "manage_appointments",
    "view_appointments",
    "manage_billing"
  ],
  pharmacist: [
    "view_prescriptions",
    "manage_prescriptions",
    "view_inventory",
    "manage_inventory",
    "dispense_medications"
  ],
  lab_technician: [
    "view_lab_tests",
    "manage_lab_tests",
    "view_lab_results",
    "manage_lab_results",
    "generate_reports"
  ],
  radiologist: [
    "view_imaging",
    "manage_imaging",
    "view_radiology_reports",
    "manage_radiology_reports",
    "generate_reports"
  ],
  staff: ["view_patients", "view_admissions"],
};