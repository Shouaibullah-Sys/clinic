// lib/models/Appointment.ts

import mongoose, { Schema, model, models, Model } from "mongoose";
import { startOfDay, endOfDay, isToday, isSameDay } from "date-fns";

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
  checkInTime?: Date;
  checkOutTime?: Date;
  waitingTime?: number;
  consultationTime?: number;
  referralSource?: string;
  previousAppointment?: mongoose.Types.ObjectId;
  rescheduledFrom?: mongoose.Types.ObjectId;
  cancelledBy?: mongoose.Types.ObjectId;
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
      index: true,
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
      index: true,
    },
    status: {
      type: String,
      enum: ["scheduled", "confirmed", "checked-in", "in-progress", "completed", "cancelled", "no-show", "rescheduled"],
      default: "scheduled",
      index: true,
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
appointmentSchema.index({ appointmentId: 1 }, { unique: true });
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
    } else if (appointment.startTime && now > appointment.startTime && appointment.status === "scheduled") {
      appointment.status = "no-show";
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
  return this.startTime.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
});

appointmentSchema.virtual("formattedTime").get(function () {
  return this.startTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
});

appointmentSchema.virtual("timeSlot").get(function () {
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
    // Get doctor's appointments for the target date
    const startOfTargetDay = startOfDay(date);
    const endOfTargetDay = endOfDay(date);

    const appointments = await this.find({
      doctor: doctorId,
      startTime: { $gte: startOfTargetDay, $lte: endOfTargetDay },
      status: { $nin: ["cancelled", "no-show"] },
    }).sort({ startTime: 1 });

    // Get appointment count for the date for auto-numbering
    const appointmentCount = await this.getAppointmentCountByDate(doctorId, date);

    // Default working hours (8 AM to 6 PM)
    const WORK_START_HOUR = 8;
    const WORK_END_HOUR = 18;
    const SLOT_INTERVAL = 20; // 20 minutes

    let currentTime = new Date(date);
    currentTime.setHours(WORK_START_HOUR, 0, 0, 0);

    const endOfWorkDay = new Date(date);
    endOfWorkDay.setHours(WORK_END_HOUR, 0, 0, 0);

    // If it's today, start from current time or next available slot
    const today = new Date();
    if (isSameDay(date, today)) {
      const now = new Date();
      if (now > currentTime) {
        // Round up to next 20-minute interval
        const minutes = now.getMinutes();
        const remainder = minutes % SLOT_INTERVAL;
        const roundedMinutes = remainder === 0 ? minutes : minutes + (SLOT_INTERVAL - remainder);
        
        currentTime = new Date(now);
        currentTime.setMinutes(roundedMinutes, 0, 0);
        
        // Make sure we don't start before work start time
        const workStartTime = new Date(date);
        workStartTime.setHours(WORK_START_HOUR, 0, 0, 0);
        if (currentTime < workStartTime) {
          currentTime = workStartTime;
        }
      }
    }

    // Find next available slot
    let slotNumber = appointmentCount + 1;
    
    while (currentTime < endOfWorkDay) {
      const slotEndTime = new Date(currentTime);
      slotEndTime.setMinutes(slotEndTime.getMinutes() + duration);

      // Check if slot would end after work end time
      if (slotEndTime > endOfWorkDay) {
        break;
      }

      // Check for conflicts with existing appointments
      const hasConflict = appointments.some(appointment => {
        const appointmentStart = new Date(appointment.startTime);
        const appointmentEnd = new Date(appointment.endTime);
        
        return (
          (currentTime >= appointmentStart && currentTime < appointmentEnd) ||
          (slotEndTime > appointmentStart && slotEndTime <= appointmentEnd) ||
          (currentTime <= appointmentStart && slotEndTime >= appointmentEnd)
        );
      });

      if (!hasConflict) {
        return {
          startTime: new Date(currentTime),
          endTime: slotEndTime,
          formattedTime: `${currentTime.getHours().toString().padStart(2, '0')}:${currentTime.getMinutes().toString().padStart(2, '0')} - ${slotEndTime.getHours().toString().padStart(2, '0')}:${slotEndTime.getMinutes().toString().padStart(2, '0')}`,
          autoNumber: slotNumber.toString().padStart(3, '0'),
        };
      }

      // Move to next 20-minute interval
      currentTime.setMinutes(currentTime.getMinutes() + SLOT_INTERVAL);
      slotNumber++;
    }

    return null;
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

    // Get doctor's appointments for the target date
    const startOfTargetDay = startOfDay(date);
    const endOfTargetDay = endOfDay(date);

    const appointments = await this.find({
      doctor: doctorId,
      startTime: { $gte: startOfTargetDay, $lte: endOfTargetDay },
      status: { $nin: ["cancelled", "no-show"] },
    }).sort({ startTime: 1 });

    // Get appointment count for the date for auto-numbering
    const appointmentCount = await this.getAppointmentCountByDate(doctorId, date);

    // Default working hours (8 AM to 6 PM)
    const WORK_START_HOUR = 8;
    const WORK_END_HOUR = 18;
    const SLOT_INTERVAL = 20;

    let currentTime = new Date(date);
    currentTime.setHours(WORK_START_HOUR, 0, 0, 0);

    const endOfWorkDay = new Date(date);
    endOfWorkDay.setHours(WORK_END_HOUR, 0, 0, 0);

    // If it's today, start from current time or next available slot
    const today = new Date();
    if (isSameDay(date, today)) {
      const now = new Date();
      if (now > currentTime) {
        // Round up to next 20-minute interval
        const minutes = now.getMinutes();
        const remainder = minutes % SLOT_INTERVAL;
        const roundedMinutes = remainder === 0 ? minutes : minutes + (SLOT_INTERVAL - remainder);
        
        currentTime = new Date(now);
        currentTime.setMinutes(roundedMinutes, 0, 0);
        
        // Make sure we don't start before work start time
        const workStartTime = new Date(date);
        workStartTime.setHours(WORK_START_HOUR, 0, 0, 0);
        if (currentTime < workStartTime) {
          currentTime = workStartTime;
        }
      }
    }

    // Find available slots
    let slotNumber = appointmentCount + 1;
    
    while (currentTime < endOfWorkDay && slots.length < limit) {
      const slotEndTime = new Date(currentTime);
      slotEndTime.setMinutes(slotEndTime.getMinutes() + duration);

      // Check if slot would end after work end time
      if (slotEndTime > endOfWorkDay) {
        break;
      }

      // Check for conflicts with existing appointments
      const hasConflict = appointments.some(appointment => {
        const appointmentStart = new Date(appointment.startTime);
        const appointmentEnd = new Date(appointment.endTime);
        
        return (
          (currentTime >= appointmentStart && currentTime < appointmentEnd) ||
          (slotEndTime > appointmentStart && slotEndTime <= appointmentEnd) ||
          (currentTime <= appointmentStart && slotEndTime >= appointmentEnd)
        );
      });

      if (!hasConflict) {
        slots.push({
          startTime: new Date(currentTime),
          endTime: slotEndTime,
          formattedTime: `${currentTime.getHours().toString().padStart(2, '0')}:${currentTime.getMinutes().toString().padStart(2, '0')} - ${slotEndTime.getHours().toString().padStart(2, '0')}:${slotEndTime.getMinutes().toString().padStart(2, '0')}`,
          autoNumber: slotNumber.toString().padStart(3, '0'),
        });
        slotNumber++;
      }

      // Move to next 20-minute interval
      currentTime.setMinutes(currentTime.getMinutes() + SLOT_INTERVAL);
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

// Add a method to clean the object for API responses
appointmentSchema.methods.toCleanObject = function (): any {
  const obj = this.toObject();
  
  // Transform ObjectIds to strings
  const transformId = (field: any) => {
    if (field && field._id) {
      return field._id.toString();
    }
    return field?.toString();
  };
  
  // Transform populated objects
  const transformPopulated = (field: any) => {
    if (field && typeof field === 'object' && !(field instanceof mongoose.Types.ObjectId)) {
      const { _id, __v, ...rest } = field;
      return {
        id: _id?.toString(),
        ...rest,
      };
    }
    return field;
  };
  
  return {
    id: obj._id?.toString(),
    appointmentId: obj.appointmentId,
    autoNumber: obj.autoNumber,
    patient: transformPopulated(obj.patient),
    doctor: transformPopulated(obj.doctor),
    department: obj.department,
    appointmentType: obj.appointmentType,
    date: obj.date,
    startTime: obj.startTime,
    endTime: obj.endTime,
    duration: obj.duration,
    status: obj.status,
    reason: obj.reason,
    symptoms: obj.symptoms,
    priority: obj.priority,
    notes: obj.notes,
    checkInTime: obj.checkInTime,
    checkOutTime: obj.checkOutTime,
    waitingTime: obj.waitingTime,
    consultationTime: obj.consultationTime,
    referralSource: obj.referralSource,
    previousAppointment: transformId(obj.previousAppointment),
    rescheduledFrom: transformId(obj.rescheduledFrom),
    cancelledBy: transformPopulated(obj.cancelledBy),
    cancelledReason: obj.cancelledReason,
    cancelledAt: obj.cancelledAt,
    createdBy: transformPopulated(obj.createdBy),
    updatedBy: transformPopulated(obj.updatedBy),
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
    
    // Virtuals
    isPastDue: this.isPastDue,
    isToday: this.isToday,
    isUpcoming: this.isUpcoming,
    formattedDate: this.formattedDate,
    formattedTime: this.formattedTime,
    timeSlot: this.timeSlot,
  };
};

// Export the model with proper typing
export const Appointment: IAppointmentModel = 
  (models.Appointment as IAppointmentModel) || 
  model<IAppointment, IAppointmentModel>("Appointment", appointmentSchema);