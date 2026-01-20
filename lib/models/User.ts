// lib/models/User.ts
import mongoose, { Schema, model, models, Document } from "mongoose";
import bcrypt from "bcryptjs";

// Simple User Document
export interface IUser extends Document {
  employeeId: string;
  name: string;
  email: string;
  password: string;
  phone: string;
  role: "admin" | "doctor" | "nurse" | "staff" | "receptionist";
  department: string;
  designation: string;
  approved: boolean;
  avatar?: string;
  active: boolean;
  address?: string;
  gender: "male" | "female" | "other";
  joiningDate: Date;
  refreshTokens: string[]; // Add this line
  createdAt: Date;
  updatedAt: Date;
  
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
      enum: ["admin", "doctor", "nurse", "staff", "receptionist"],
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
    refreshTokens: { // Add this field
      type: [String],
      default: [],
      select: false, // Don't include in queries by default
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
    this.employeeId = `EMP${year}${random}`;
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

// Basic role permissions
export const RolePermissions = {
  admin: ["all"],
  doctor: ["read:patients", "write:patients", "read:appointments", "write:prescriptions"],
  nurse: ["read:patients", "update:patients", "read:medications"],
  receptionist: ["create:patients", "read:appointments", "update:appointments"],
  staff: ["read:patients"],
};
