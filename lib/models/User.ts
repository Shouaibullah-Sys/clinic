// lib/models/User.ts

import mongoose, { Schema, model, models } from "mongoose";

export interface IUser extends mongoose.Document {
  email: string;
  password: string;
  name: string;
  role: "admin" | "staff" | "doctor" | "nurse" | "receptionist" | "pharmacist" | "lab_technician" | "radiologist" | "admission";
  phone: string;
  avatar?: string;
  approved: boolean;
  active: boolean;
  employeeId?: string;
  department?: string;
  specialization?: string;
  licenseNumber?: string;
  qualifications?: string[];
  experience?: number; // in years
  consultationFee?: number;
  availability?: {
    days: string[]; // ["monday", "tuesday", ...]
    startTime: string; // "09:00"
    endTime: string; // "17:00"
    breakStart?: string;
    breakEnd?: string;
  };
  biography?: string;
  joiningDate?: Date;
  permissions: string[];
  refreshTokens?: string[]; // Add refresh tokens for JWT
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
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
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["admin", "staff", "doctor", "nurse", "receptionist", "pharmacist", "lab_technician", "radiologist", "admission"],
      required: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    avatar: {
      type: String,
    },
    approved: {
      type: Boolean,
      default: false,
    },
    active: {
      type: Boolean,
      default: true,
    },
    employeeId: {
      type: String,
      unique: true,
      sparse: true,
    },
    // Doctor-specific fields
    department: {
      type: String,
    },
    specialization: {
      type: String,
    },
    licenseNumber: {
      type: String,
      unique: true,
      sparse: true,
    },
    qualifications: [{
      type: String,
    }],
    experience: {
      type: Number,
      min: 0,
    },
    consultationFee: {
      type: Number,
      min: 0,
    },
    availability: {
      days: [{
        type: String,
        enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
      }],
      startTime: {
        type: String,
        match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, // HH:MM format
      },
      endTime: {
        type: String,
        match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
      },
      breakStart: {
        type: String,
        match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
      },
      breakEnd: {
        type: String,
        match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
      },
    },
    biography: {
      type: String,
      trim: true,
    },
    joiningDate: {
      type: Date,
    },
    permissions: [{
      type: String,
    }],
    refreshTokens: [{
      type: String,
    }],
  },
  {
    timestamps: true,
    toJSON: {
      transform: function(doc, ret) {
        delete ret.password;
        delete ret.refreshTokens;
        return ret;
      }
    },
    toObject: {
      transform: function(doc, ret) {
        delete ret.password;
        delete ret.refreshTokens;
        return ret;
      }
    }
  }
);

// Counter for employeeId generation
const counterSchema = new Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});
const Counter = models.Counter || model('Counter', counterSchema);

// Indexes
userSchema.index({ role: 1 });
userSchema.index({ department: 1 });
userSchema.index({ specialization: 1 });
userSchema.index({ active: 1, approved: 1 });
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ licenseNumber: 1 }, { unique: true, sparse: true });

// Pre-save hook for doctors
userSchema.pre("save", async function (next) {
  const user = this;
  
  // Only hash password if it's modified
  if (user.isModified('password')) {
    try {
      const bcrypt = await import('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(user.password, salt);
    } catch (error) {
      return next(error as any);
    }
  }
  
  // Set default availability for doctors
  if (user.role === "doctor" && !user.availability) {
    user.availability = {
      days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      startTime: "09:00",
      endTime: "17:00",
      breakStart: "13:00",
      breakEnd: "14:00",
    };
  }
  
  // Generate unique employeeId for doctors
  if (user.role === "doctor" && !user.employeeId) {
    try {
      const counter = await Counter.findOneAndUpdate(
        { _id: 'employeeId' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      
      // Generate unique ID with prefix based on role
      const prefix = "DOC";
      user.employeeId = `${prefix}${counter.seq.toString().padStart(4, '0')}`;
      console.log(`Generated employeeId: ${user.employeeId} for ${user.role} ${user.name}`);
    } catch (error) {
      console.error('Error generating employeeId:', error);
      return next(error as any);
    }
  }
  
  // Set joining date if not provided
  if (user.role === "doctor" && !user.joiningDate) {
    user.joiningDate = new Date();
  }
  
  // Set default permissions for doctors
  if (user.role === "doctor" && (!user.permissions || user.permissions.length === 0)) {
    user.permissions = [
      "view_patients",
      "create_prescriptions",
      "view_appointments",
      "update_medical_records",
      "view_own_patients",
    ];
  }
  
  next();
});

// Virtual for full name
userSchema.virtual("fullName").get(function () {
  if (this.role === "doctor") {
    return `Dr. ${this.name}`;
  }
  return this.name;
});

// Virtual for formatted experience
userSchema.virtual("experienceText").get(function () {
  if (this.experience === 1) {
    return "1 year";
  } else if (this.experience && this.experience > 1) {
    return `${this.experience} years`;
  }
  return "Fresh";
});

// Static method to find active doctors
userSchema.statics.findActiveDoctors = function () {
  return this.find({
    role: "doctor",
    active: true,
    approved: true,
  })
    .select("name specialization department phone email consultationFee availability")
    .sort({ name: 1 });
};

// Static method to find doctor by ID
userSchema.statics.findDoctorById = function (id: string) {
  return this.findOne({
    _id: id,
    role: "doctor",
    active: true,
    approved: true,
  }).select("-password -refreshTokens");
};

// Instance method for doctor availability check
userSchema.methods.isAvailableOnDay = function (day: string): boolean {
  if (this.role !== "doctor" || !this.availability || !this.availability.days) {
    return false;
  }
  return this.availability.days.includes(day.toLowerCase());
};

// Instance method to check password
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  try {
    const bcrypt = await import('bcryptjs');
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    console.error('Error comparing password:', error);
    return false;
  }
};

// Method to add refresh token
userSchema.methods.addRefreshToken = function (token: string) {
  if (!this.refreshTokens) {
    this.refreshTokens = [];
  }
  this.refreshTokens.push(token);
  
  // Keep only last 5 refresh tokens
  if (this.refreshTokens.length > 5) {
    this.refreshTokens = this.refreshTokens.slice(-5);
  }
  
  return this.save();
};

// Method to remove refresh token
userSchema.methods.removeRefreshToken = function (token: string) {
  if (this.refreshTokens) {
    this.refreshTokens = this.refreshTokens.filter(t => t !== token);
  }
  return this.save();
};

export const User = models.User || model<IUser>("User", userSchema);