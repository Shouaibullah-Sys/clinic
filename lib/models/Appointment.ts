// lib/models/Appointment.ts

import mongoose, { Schema, model, models, Model } from "mongoose";
import { startOfDay, endOfDay, isToday, isSameDay, format } from "date-fns";

export interface IAppointment extends mongoose.Document {
  appointmentId: string;
  patient: mongoose.Types.ObjectId;
  doctor: mongoose.Types.ObjectId;
  department?: string;
  appointmentType: "consultation" | "followup" | "emergency" | "checkup" | "procedure" | "other";
  date: Date;
  startTime: Date;
  endTime: Date;
  duration: number;
  autoNumber: string;
  status: "scheduled" | "confirmed" | "checked-in" | "in-progress" | "completed" | "cancelled" | "no-show" | "rescheduled";
  reason: string;
  symptoms?: string;
  priority: "low" | "medium" | "high" | "emergency";
  notes?: string;
  consultationFee?: number;
  doctorFee?: number;
  checkInTime?: Date;
  checkOutTime?: Date;
  waitingTime?: number;
  consultationTime?: number;
  referralSource?: string;
  previousAppointment?: mongoose.Types.ObjectId;
  rescheduledFrom?: mongoose.Types.ObjectId;
  cancelledBy?: mongoose.Types.ObjectId;
  labTests?: mongoose.Types.ObjectId[];
  cancelledReason?: string;
  cancelledAt?: Date;
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  
  // Virtuals
  isPastDue: boolean;
  isToday: boolean;
  isUpcoming: boolean;
  formattedDate: string;
  formattedTime: string;
  timeSlot: string;
  
  // Instance methods
  checkIn(): Promise<IAppointment>;
  checkOut(): Promise<IAppointment>;
  cancel(userId: string, reason?: string): Promise<IAppointment>;
  reschedule(newStartTime: Date, newDuration?: number): Promise<IAppointment>;
}

// Static methods interface
interface IAppointmentModel extends Model<IAppointment> {
  findByDoctorAndDate(doctorId: string, date: Date): Promise<IAppointment[]>;
  findTodayAppointments(): Promise<IAppointment[]>;
  findByPatientId(patientId: string): Promise<IAppointment[]>;
  getAppointmentCountByDate(doctorId: string, date: Date): Promise<number>;
  checkAvailability(
    doctorId: string,
    startTime: Date,
    duration: number,
    excludeAppointmentId?: string
  ): Promise<boolean>;
  getNextAvailableSlot(
    doctorId: string,
    date: Date,
    duration?: number
  ): Promise<{
    startTime: Date;
    endTime: Date;
    formattedTime: string;
    autoNumber: string;
  } | null>;
  getAvailableSlots(
    doctorId: string,
    date: Date,
    duration?: number,
    limit?: number
  ): Promise<Array<{
    startTime: Date;
    endTime: Date;
    formattedTime: string;
    autoNumber: string;
  }>>;
}

const appointmentSchema = new Schema<IAppointment, IAppointmentModel>(
  {
    appointmentId: {
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
    department: {
      type: String,
    },
    appointmentType: {
      type: String,
      enum: ["consultation", "followup", "emergency", "checkup", "procedure", "other"],
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
      required: true,
      min: 5,
      max: 480,
      default: 20,
    },
    autoNumber: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["scheduled", "confirmed", "checked-in", "in-progress", "completed", "cancelled", "no-show", "rescheduled"],
      default: "scheduled",
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    symptoms: {
      type: String,
      trim: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "emergency"],
      default: "medium",
    },
    notes: {
      type: String,
      trim: true,
    },
    consultationFee: {
      type: Number,
      min: 0,
    },
    doctorFee: {
      type: Number,
      min: 0,
    },
    checkInTime: {
      type: Date,
    },
    checkOutTime: {
      type: Date,
    },
    waitingTime: {
      type: Number,
      min: 0,
    },
    consultationTime: {
      type: Number,
      min: 0,
    },
    referralSource: {
      type: String,
    },
    previousAppointment: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
    },
    rescheduledFrom: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
    },
    cancelledBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    cancelledReason: {
      type: String,
    },
    cancelledAt: {
      type: Date,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
appointmentSchema.index({ patient: 1 });
appointmentSchema.index({ doctor: 1 });
appointmentSchema.index({ date: 1, startTime: 1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ department: 1 });
appointmentSchema.index({ createdBy: 1 });
appointmentSchema.index({ createdAt: -1 });
appointmentSchema.index({ autoNumber: 1 });

// Compound indexes
appointmentSchema.index({ doctor: 1, date: 1, status: 1 });
appointmentSchema.index({ patient: 1, status: 1 });
appointmentSchema.index({ date: 1, status: 1 });
appointmentSchema.index({ status: 1, startTime: 1 });
appointmentSchema.index({ doctor: 1, date: 1, autoNumber: 1 });

// Pre-save hooks
appointmentSchema.pre("save", async function (next) {
  try {
    const appointment = this;
    
    // Generate appointment ID if not exists
    if (!appointment.appointmentId) {
      const date = new Date();
      const year = date.getFullYear().toString().slice(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const day = date.getDate().toString().padStart(2, "0");
      const random = Math.floor(100 + Math.random() * 900);
      appointment.appointmentId = `APT${year}${month}${day}${random}`;
    }

    // Ensure date is set to start of day for the appointment date
    if (appointment.startTime) {
      const appointmentDate = new Date(appointment.startTime);
      appointmentDate.setHours(0, 0, 0, 0);
      appointment.date = appointmentDate;
    }

    // Calculate end time if not provided
    if (appointment.startTime && appointment.duration && !appointment.endTime) {
      const endTime = new Date(appointment.startTime);
      endTime.setMinutes(endTime.getMinutes() + appointment.duration);
      appointment.endTime = endTime;
    }

    // Calculate duration if not provided but start/end times are
    if (appointment.startTime && appointment.endTime && !appointment.duration) {
      const diff = appointment.endTime.getTime() - appointment.startTime.getTime();
      appointment.duration = Math.round(diff / (1000 * 60));
    }

    // Ensure duration is at least 20 minutes
    if (appointment.duration < 20) {
      appointment.duration = 20;
    }

    // Generate autoNumber if not provided
    if (!appointment.autoNumber && appointment.doctor && appointment.startTime) {
      const AppointmentModel = appointment.constructor as IAppointmentModel;
      const appointmentDate = appointment.date || new Date(appointment.startTime);
      const count = await AppointmentModel.getAppointmentCountByDate(
        appointment.doctor.toString(),
        appointmentDate
      );
      appointment.autoNumber = (count + 1).toString().padStart(3, '0');
    }

    // Calculate waiting time if checked in
    if (appointment.checkInTime && appointment.startTime) {
      const waitDiff = appointment.checkInTime.getTime() - appointment.startTime.getTime();
      appointment.waitingTime = Math.max(0, Math.round(waitDiff / (1000 * 60)));
    }

    // Calculate consultation time if checked out
    if (appointment.checkInTime && appointment.checkOutTime) {
      const consultDiff = appointment.checkOutTime.getTime() - appointment.checkInTime.getTime();
      appointment.consultationTime = Math.max(0, Math.round(consultDiff / (1000 * 60)));
    }

    // Auto-update status based on times
    const now = new Date();
    if (appointment.checkInTime && !appointment.checkOutTime && appointment.status === "confirmed") {
      appointment.status = "checked-in";
    } else if (appointment.checkOutTime && appointment.status === "checked-in") {
      appointment.status = "completed";
    }

    next();
  } catch (error: any) {
    next(error);
  }
});

// Virtual properties
appointmentSchema.virtual("isPastDue").get(function () {
  return new Date() > this.startTime && this.status === "scheduled";
});

appointmentSchema.virtual("isToday").get(function () {
  return isToday(this.startTime);
});

appointmentSchema.virtual("isUpcoming").get(function () {
  return new Date() < this.startTime && this.status === "scheduled";
});

appointmentSchema.virtual("formattedDate").get(function () {
  if (!this.startTime) return "";
  return this.startTime.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
});

appointmentSchema.virtual("formattedTime").get(function () {
  console.log("formattedTime called, startTime:", this.startTime, "type:", typeof this.startTime);
  
  if (!this.startTime || !(this.startTime instanceof Date)) {
    console.warn("Invalid startTime in formattedTime:", this.startTime);
    return "";
  }
  
  try {
    return this.startTime.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (error) {
    console.error("Error formatting time:", error);
    return "";
  }
});

appointmentSchema.virtual("timeSlot").get(function () {
  if (!this.startTime || !this.endTime) return "";
  const start = this.startTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const end = this.endTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${start} - ${end}`;
});

appointmentSchema.virtual("labTests", {
  ref: "LabTest",
  localField: "_id",
  foreignField: "appointment",
});

// Static methods
appointmentSchema.statics.findByDoctorAndDate = function (
  doctorId: string,
  date: Date
): Promise<IAppointment[]> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return this.find({
    doctor: doctorId,
    startTime: { $gte: startOfDay, $lte: endOfDay },
    status: { $nin: ["cancelled", "no-show"] },
  })
    .populate("patient", "name phone email patientId")
    .sort({ startTime: 1 });
};

appointmentSchema.statics.findTodayAppointments = function (): Promise<IAppointment[]> {
  const today = new Date();
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);

  return this.find({
    startTime: { $gte: startOfDay, $lte: endOfDay },
    status: { $nin: ["cancelled", "no-show"] },
  })
    .populate("patient", "name phone patientId")
    .populate("doctor", "name specialization department")
    .sort({ startTime: 1 });
};

appointmentSchema.statics.findByPatientId = function (patientId: string): Promise<IAppointment[]> {
  return this.find({ patient: patientId })
    .populate("doctor", "name specialization department")
    .sort({ startTime: -1 });
};

appointmentSchema.statics.getAppointmentCountByDate = async function (
  doctorId: string,
  date: Date
): Promise<number> {
  const startOfTargetDay = startOfDay(date);
  const endOfTargetDay = endOfDay(date);

  const count = await this.countDocuments({
    doctor: doctorId,
    startTime: { $gte: startOfTargetDay, $lte: endOfTargetDay },
    status: { $nin: ["cancelled", "no-show"] },
  });

  return count;
};

appointmentSchema.statics.checkAvailability = async function (
  doctorId: string,
  startTime: Date,
  duration: number,
  excludeAppointmentId?: string
): Promise<boolean> {
  const endTime = new Date(startTime);
  endTime.setMinutes(endTime.getMinutes() + duration);

  const query: any = {
    doctor: doctorId,
    status: { $nin: ["cancelled", "no-show"] },
    $or: [
      // New appointment starts during existing appointment
      { startTime: { $lt: endTime, $gte: startTime } },
      // New appointment ends during existing appointment
      { endTime: { $gt: startTime, $lte: endTime } },
      // New appointment completely contains existing appointment
      { startTime: { $gte: startTime }, endTime: { $lte: endTime } },
      // Existing appointment completely contains new appointment
      { startTime: { $lte: startTime }, endTime: { $gte: endTime } },
    ],
  };

  if (excludeAppointmentId) {
    query._id = { $ne: excludeAppointmentId };
  }

  const conflictingAppointments = await this.find(query).limit(1);
  return conflictingAppointments.length === 0;
};

appointmentSchema.statics.getNextAvailableSlot = async function (
  doctorId: string,
  date: Date,
  duration: number = 20
): Promise<{
  startTime: Date;
  endTime: Date;
  formattedTime: string;
  autoNumber: string;
} | null> {
  try {
    // Get appointment count for the date for auto-numbering
    const appointmentCount = await this.getAppointmentCountByDate(doctorId, date);
    
    // Generate next auto-number
    const nextAutoNumber = (appointmentCount + 1).toString().padStart(3, '0');
    
    // Set default start time (9:00 AM)
    let currentTime = new Date(date);
    currentTime.setHours(9, 0, 0, 0);
    
    // If it's today, start from current time
    const today = new Date();
    if (isSameDay(date, today)) {
      const now = new Date();
      if (now > currentTime) {
        currentTime = new Date(now);
        // Round up to next 20-minute interval
        const minutes = currentTime.getMinutes();
        const remainder = minutes % 20;
        if (remainder > 0) {
          currentTime.setMinutes(minutes + (20 - remainder));
        }
      }
    }
    
    const endTime = new Date(currentTime);
    endTime.setMinutes(endTime.getMinutes() + duration);
    
    return {
      startTime: currentTime,
      endTime: endTime,
      formattedTime: `${currentTime.getHours().toString().padStart(2, '0')}:${currentTime.getMinutes().toString().padStart(2, '0')} - ${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`,
      autoNumber: nextAutoNumber,
    };
  } catch (error) {
    console.error("Error getting next available slot:", error);
    return null;
  }
};

appointmentSchema.statics.getAvailableSlots = async function (
  doctorId: string,
  date: Date,
  duration: number = 20,
  limit: number = 10
): Promise<Array<{
  startTime: Date;
  endTime: Date;
  formattedTime: string;
  autoNumber: string;
}>> {
  try {
    const slots: Array<{
      startTime: Date;
      endTime: Date;
      formattedTime: string;
      autoNumber: string;
    }> = [];

    // Get appointment count for the date for auto-numbering
    const appointmentCount = await this.getAppointmentCountByDate(doctorId, date);

    // Set default start time (9:00 AM)
    let currentTime = new Date(date);
    currentTime.setHours(9, 0, 0, 0);
    
    // If it's today, start from current time
    const today = new Date();
    if (isSameDay(date, today)) {
      const now = new Date();
      if (now > currentTime) {
        currentTime = new Date(now);
        // Round up to next 20-minute interval
        const minutes = currentTime.getMinutes();
        const remainder = minutes % 20;
        if (remainder > 0) {
          currentTime.setMinutes(minutes + (20 - remainder));
        }
      }
    }

    // Generate slots based on auto-number sequence
    let slotNumber = appointmentCount + 1;
    
    while (slots.length < limit) {
      const slotEndTime = new Date(currentTime);
      slotEndTime.setMinutes(slotEndTime.getMinutes() + duration);

      slots.push({
        startTime: new Date(currentTime),
        endTime: slotEndTime,
        formattedTime: `${currentTime.getHours().toString().padStart(2, '0')}:${currentTime.getMinutes().toString().padStart(2, '0')} - ${slotEndTime.getHours().toString().padStart(2, '0')}:${slotEndTime.getMinutes().toString().padStart(2, '0')}`,
        autoNumber: slotNumber.toString().padStart(3, '0'),
      });
      
      slotNumber++;
      
      // Move to next 20-minute interval
      currentTime.setMinutes(currentTime.getMinutes() + 20);
    }

    return slots;
  } catch (error) {
    console.error("Error getting available slots:", error);
    return [];
  }
};

// Instance methods
appointmentSchema.methods.checkIn = function (): Promise<IAppointment> {
  this.checkInTime = new Date();
  this.status = "checked-in";
  return this.save();
};

appointmentSchema.methods.checkOut = function (): Promise<IAppointment> {
  this.checkOutTime = new Date();
  this.status = "completed";
  return this.save();
};

appointmentSchema.methods.cancel = function (
  userId: string,
  reason?: string
): Promise<IAppointment> {
  this.status = "cancelled";
  this.cancelledBy = new mongoose.Types.ObjectId(userId);
  this.cancelledReason = reason;
  this.cancelledAt = new Date();
  return this.save();
};

appointmentSchema.methods.reschedule = function (
  newStartTime: Date,
  newDuration?: number
): Promise<IAppointment> {
  const oldAppointment = this.toObject();
  oldAppointment._id = undefined;
  oldAppointment.rescheduledFrom = this._id;
  oldAppointment.status = "rescheduled";

  this.startTime = newStartTime;
  if (newDuration) {
    this.duration = newDuration;
    const newEndTime = new Date(newStartTime);
    newEndTime.setMinutes(newEndTime.getMinutes() + newDuration);
    this.endTime = newEndTime;
  }
  this.status = "scheduled";
  this.rescheduledFrom = undefined;

  return this.save();
};

// Export the model with proper typing
export const Appointment: IAppointmentModel = 
  (models.Appointment as IAppointmentModel) || 
  model<IAppointment, IAppointmentModel>("Appointment", appointmentSchema);
