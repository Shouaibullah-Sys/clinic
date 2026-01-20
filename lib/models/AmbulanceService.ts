

import mongoose, { Schema, model, models, Document } from "mongoose";

export interface IAmbulanceService extends Document {
  ambulanceId: string;
  vehicleNumber: string;
  vehicleType: "basic_life_support" | "advanced_life_support" | "neonatal" | "patient_transport";
  driver: mongoose.Types.ObjectId;
  paramedic?: mongoose.Types.ObjectId;
  attendant?: mongoose.Types.ObjectId;
  dispatchTime: Date;
  pickupLocation: {
    address: string;
    city: string;
    state: string;
    pincode: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  destinationLocation: {
    address: string;
    city: string;
    state: string;
    pincode: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  patient?: mongoose.Types.ObjectId;
  patientName?: string;
  patientContact?: string;
  emergencyContact?: string;
  emergencyContactNumber?: string;
  caseType: "emergency" | "transfer" | "discharge" | "inter_facility" | "event_coverage";
  priority: "critical" | "urgent" | "routine";
  chiefComplaint?: string;
  vitalSigns: {
    time: Date;
    bloodPressure?: string;
    heartRate?: number;
    respiratoryRate?: number;
    temperature?: number;
    oxygenSaturation?: number;
    gcs?: number;
  }[];
  interventions: {
    time: Date;
    intervention: string;
    medication?: string;
    dosage?: string;
    performedBy: mongoose.Types.ObjectId;
    response?: string;
  }[];
  status: "available" | "dispatched" | "en_route_pickup" | "at_pickup" | "en_route_destination" | "at_destination" | "returning" | "maintenance";
  estimatedArrivalTime?: Date;
  actualArrivalTime?: Date;
  estimatedCompletionTime?: Date;
  actualCompletionTime?: Date;
  distanceTravelled?: number; // in km
  fuelConsumed?: number; // in liters
  billingStatus: "pending" | "billed" | "paid";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AmbulanceServiceSchema = new Schema<IAmbulanceService>(
  {
    ambulanceId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    vehicleNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    vehicleType: {
      type: String,
      enum: ["basic_life_support", "advanced_life_support", "neonatal", "patient_transport"],
      required: true,
    },
    driver: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    paramedic: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    attendant: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    dispatchTime: {
      type: Date,
      required: true,
      default: Date.now,
    },
    pickupLocation: {
      address: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
      coordinates: {
        lat: { type: Number },
        lng: { type: Number },
      },
    },
    destinationLocation: {
      address: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
      coordinates: {
        lat: { type: Number },
        lng: { type: Number },
      },
    },
    patient: {
      type: Schema.Types.ObjectId,
      ref: "Patient",
    },
    patientName: {
      type: String,
      trim: true,
    },
    patientContact: {
      type: String,
      trim: true,
    },
    emergencyContact: {
      type: String,
      trim: true,
    },
    emergencyContactNumber: {
      type: String,
      trim: true,
    },
    caseType: {
      type: String,
      enum: ["emergency", "transfer", "discharge", "inter_facility", "event_coverage"],
      required: true,
    },
    priority: {
      type: String,
      enum: ["critical", "urgent", "routine"],
      required: true,
    },
    chiefComplaint: {
      type: String,
      trim: true,
    },
    vitalSigns: [{
      time: { type: Date, default: Date.now },
      bloodPressure: { type: String },
      heartRate: { type: Number },
      respiratoryRate: { type: Number },
      temperature: { type: Number },
      oxygenSaturation: { type: Number },
      gcs: { type: Number, min: 3, max: 15 },
    }],
    interventions: [{
      time: { type: Date, default: Date.now },
      intervention: { type: String, required: true },
      medication: { type: String },
      dosage: { type: String },
      performedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
      response: { type: String },
    }],
    status: {
      type: String,
      enum: ["available", "dispatched", "en_route_pickup", "at_pickup", "en_route_destination", "at_destination", "returning", "maintenance"],
      default: "available",
    },
    estimatedArrivalTime: {
      type: Date,
    },
    actualArrivalTime: {
      type: Date,
    },
    estimatedCompletionTime: {
      type: Date,
    },
    actualCompletionTime: {
      type: Date,
    },
    distanceTravelled: {
      type: Number,
      min: 0,
    },
    fuelConsumed: {
      type: Number,
      min: 0,
    },
    billingStatus: {
      type: String,
      enum: ["pending", "billed", "paid"],
      default: "pending",
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
AmbulanceServiceSchema.index({ ambulanceId: 1 });
AmbulanceServiceSchema.index({ vehicleNumber: 1 });
AmbulanceServiceSchema.index({ status: 1 });
AmbulanceServiceSchema.index({ dispatchTime: -1 });
AmbulanceServiceSchema.index({ driver: 1 });
AmbulanceServiceSchema.index({ caseType: 1 });

// Pre-save hook
AmbulanceServiceSchema.pre("save", function (next) {
  if (!this.ambulanceId) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000);
    this.ambulanceId = `AMB${year}${month}${random}`;
  }
  next();
});

export const AmbulanceService = models.AmbulanceService || model<IAmbulanceService>("AmbulanceService", AmbulanceServiceSchema);