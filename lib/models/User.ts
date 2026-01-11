// lib/models/User.ts
import mongoose, { Schema, model, models } from "mongoose";

export interface IUser {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  phone: string;
  role: "admin" | "staff";
  approved: boolean;
  avatar?: string;
  refreshTokens?: string[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
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
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["admin", "staff"],
      default: "staff",
      required: true,
    },
    approved: {
      type: Boolean,
      default: false,
    },
    avatar: {
      type: String,
    },
    refreshTokens: {
      type: [String],
      default: [],
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
userSchema.index({ role: 1 });
userSchema.index({ approved: 1 });
userSchema.index({ active: 1 });

// Virtual for full role description
userSchema.virtual("roleDescription").get(function () {
  const roleDescriptions = {
    admin: "Administrator (Full Access)",
    staff: "Staff (Glass Management)",
  };
  return roleDescriptions[this.role] || this.role;
});

// Pre-save hook to capitalize name
userSchema.pre("save", function (next) {
  if (this.name) {
    this.name = this.name
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }
  next();
});

// Use named export
// Role permissions mapping
export const RolePermissions = {
  admin: [
    "read:users",
    "write:users",
    "delete:users",
    "read:glass",
    "write:glass",
    "delete:glass",
    "read:orders",
    "write:orders",
    "delete:orders",
    "read:dashboard",
    "read:finance",
    "write:finance",
    "read:ophthalmology",
    "write:ophthalmology",
  ],
  staff: [
    "read:glass",
    "write:glass",
    "read:orders",
    "write:orders",
    "read:dashboard",
    "read:ophthalmology",
  ],
} as const;

export const User = models.User || model<IUser>("User", userSchema);
