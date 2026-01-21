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
  },
  {
    timestamps: true,
  }
);

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ department: 1 });
userSchema.index({ specialization: 1 });
userSchema.index({ active: 1, approved: 1 });
userSchema.index({ licenseNumber: 1 });

// Pre-save hook for doctors
userSchema.pre("save", function (next) {
  // Set default availability for doctors
  if (this.role === "doctor" && !this.availability) {
    this.availability = {
      days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      startTime: "09:00",
      endTime: "17:00",
      breakStart: "13:00",
      breakEnd: "14:00",
    };
  }
  
  // Set joining date if not provided
  if (this.role === "doctor" && !this.joiningDate) {
    this.joiningDate = new Date();
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

// Instance method for doctor availability check
userSchema.methods.isAvailableOnDay = function (day: string): boolean {
  if (this.role !== "doctor" || !this.availability || !this.availability.days) {
    return false;
  }
  return this.availability.days.includes(day.toLowerCase());
};

export const User = models.User || model<IUser>("User", userSchema);