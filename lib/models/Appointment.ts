    // lib/models/Appointment.ts
import mongoose, { Schema, model, models } from "mongoose";

export interface IAppointment extends mongoose.Document {
  appointmentId: string;
  patient: mongoose.Types.ObjectId;
  doctor: mongoose.Types.ObjectId;
  department: string;
  appointmentType: "consultation" | "follow-up" | "emergency" | "surgery" | "test" | "checkup";
  date: Date;
  startTime: Date;
  endTime: Date;
  duration: number; // in minutes
  status: "scheduled" | "confirmed" | "in-progress" | "completed" | "cancelled" | "no-show";
  reason: string;
  symptoms?: string;
  notes?: string;
  priority: "low" | "medium" | "high" | "emergency";
  roomNumber?: string;
  createdBy: mongoose.Types.ObjectId;
  cancelledBy?: mongoose.Types.ObjectId;
  cancellationReason?: string;
  paymentStatus: "pending" | "partial" | "paid" | "insurance";
  createdAt: Date;
  updatedAt: Date;
}

const appointmentSchema = new Schema<IAppointment>(
  {
    appointmentId: {
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
    department: {
      type: String,
      required: true,
    },
    appointmentType: {
      type: String,
      enum: ["consultation", "follow-up", "emergency", "surgery", "test", "checkup"],
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    duration: {
      type: Number,
      default: 30, // default 30 minutes
    },
    status: {
      type: String,
      enum: ["scheduled", "confirmed", "in-progress", "completed", "cancelled", "no-show"],
      default: "scheduled",
    },
    reason: {
      type: String,
      required: true,
    },
    symptoms: {
      type: String,
    },
    notes: {
      type: String,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "emergency"],
      default: "medium",
    },
    roomNumber: {
      type: String,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    cancelledBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    cancellationReason: {
      type: String,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "partial", "paid", "insurance"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
appointmentSchema.index({ appointmentId: 1 });
appointmentSchema.index({ patient: 1 });
appointmentSchema.index({ doctor: 1 });
appointmentSchema.index({ date: 1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ department: 1 });
appointmentSchema.index({ "date": 1, "doctor": 1 });
appointmentSchema.index({ "date": 1, "status": 1 });

// Pre-save hook
appointmentSchema.pre("save", function (next) {
  if (!this.appointmentId || this.isNew) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000);
    this.appointmentId = `APT${year}${month}${random}`;
  }
  
  // Auto-calculate end time if not provided
  if (this.startTime && !this.endTime) {
    this.endTime = new Date(this.startTime.getTime() + (this.duration || 30) * 60000);
  }
  
  next();
});

export const Appointment = models.Appointment || model<IAppointment>("Appointment", appointmentSchema);