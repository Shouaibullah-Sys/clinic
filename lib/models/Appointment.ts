// lib/models/Appointment.ts

import mongoose, { Schema, model, models, Model } from "mongoose";

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
  checkAvailability(
    doctorId: string,
    startTime: Date,
    duration: number,
    excludeAppointmentId?: string
  ): Promise<boolean>;
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
      default: 30,
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
  }
);

// Indexes for performance
appointmentSchema.index({ appointmentId: 1 });
appointmentSchema.index({ patient: 1 });
appointmentSchema.index({ doctor: 1 });
appointmentSchema.index({ date: 1, startTime: 1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ department: 1 });
appointmentSchema.index({ createdBy: 1 });
appointmentSchema.index({ createdAt: -1 });

// Compound indexes
appointmentSchema.index({ doctor: 1, date: 1, status: 1 });
appointmentSchema.index({ patient: 1, status: 1 });
appointmentSchema.index({ date: 1, status: 1 });
appointmentSchema.index({ status: 1, startTime: 1 });

// Pre-save hooks
appointmentSchema.pre("save", function (next) {
  // Generate appointment ID if not exists
  if (!this.appointmentId || this.isNew) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const random = Math.floor(1000 + Math.random() * 9000);
    this.appointmentId = `APT${year}${month}${random}`;
  }

  // Ensure date is set to start of day for the appointment date
  if (this.date && this.startTime) {
    const appointmentDate = new Date(this.startTime);
    appointmentDate.setHours(0, 0, 0, 0);
    this.date = appointmentDate;
  }

  // Calculate end time if not provided
  if (this.startTime && this.duration && !this.endTime) {
    const endTime = new Date(this.startTime);
    endTime.setMinutes(endTime.getMinutes() + this.duration);
    this.endTime = endTime;
  }

  // Calculate duration if not provided but start/end times are
  if (this.startTime && this.endTime && !this.duration) {
    const diff = this.endTime.getTime() - this.startTime.getTime();
    this.duration = Math.round(diff / (1000 * 60));
  }

  // Calculate waiting time if checked in
  if (this.checkInTime && this.startTime) {
    const waitDiff = this.checkInTime.getTime() - this.startTime.getTime();
    this.waitingTime = Math.round(waitDiff / (1000 * 60));
  }

  // Calculate consultation time if checked out
  if (this.checkInTime && this.checkOutTime) {
    const consultDiff = this.checkOutTime.getTime() - this.checkInTime.getTime();
    this.consultationTime = Math.round(consultDiff / (1000 * 60));
  }

  // Auto-update status based on times
  const now = new Date();
  if (this.checkInTime && !this.checkOutTime && this.status === "confirmed") {
    this.status = "checked-in";
  } else if (this.checkOutTime && this.status === "checked-in") {
    this.status = "completed";
  } else if (this.startTime && now > this.startTime && this.status === "scheduled") {
    this.status = "no-show";
  }

  next();
});

// Virtual properties
appointmentSchema.virtual("isPastDue").get(function () {
  return new Date() > this.startTime && this.status === "scheduled";
});

appointmentSchema.virtual("isToday").get(function () {
  const today = new Date();
  const appointmentDate = new Date(this.startTime);
  return (
    today.getDate() === appointmentDate.getDate() &&
    today.getMonth() === appointmentDate.getMonth() &&
    today.getFullYear() === appointmentDate.getFullYear()
  );
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
    .populate("patient", "name phone email")
    .sort({ startTime: 1 });
};

appointmentSchema.statics.findTodayAppointments = function (): Promise<IAppointment[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return this.find({
    startTime: { $gte: today, $lt: tomorrow },
    status: { $nin: ["cancelled", "no-show"] },
  })
    .populate("patient", "name phone")
    .populate("doctor", "name specialization")
    .sort({ startTime: 1 });
};

appointmentSchema.statics.findByPatientId = function (patientId: string): Promise<IAppointment[]> {
  return this.find({ patient: patientId })
    .populate("doctor", "name specialization department")
    .sort({ startTime: -1 });
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
    ],
  };

  if (excludeAppointmentId) {
    query._id = { $ne: excludeAppointmentId };
  }

  const conflictingAppointments = await this.find(query);
  return conflictingAppointments.length === 0;
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