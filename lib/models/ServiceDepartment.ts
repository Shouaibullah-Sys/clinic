// lib/models/ServiceDepartment.ts
import mongoose, { Schema, model, models, Document } from "mongoose";

export interface IServiceDepartment extends Document {
  departmentId: string;
  name: "x-ray" | "ct-scan" | "mri" | "ultrasound" | "emergency" | "opd" | "laboratory" | "ot" | "pharmacy" | "indo" | "lithotripsy" | "endoscopy" | "ambulance" | "dental" | "ecg";
  displayName: string;
  description?: string;
  location: string;
  floor: string;
  roomNumber: string;
  inCharge: mongoose.Types.ObjectId;
  contactNumber: string;
  email?: string;
  operatingHours: {
    monday: { open: string; close: string; is24Hours: boolean };
    tuesday: { open: string; close: string; is24Hours: boolean };
    wednesday: { open: string; close: string; is24Hours: boolean };
    thursday: { open: string; close: string; is24Hours: boolean };
    friday: { open: string; close: string; is24Hours: boolean };
    saturday: { open: string; close: string; is24Hours: boolean };
    sunday: { open: string; close: string; is24Hours: boolean };
  };
  services: {
    serviceId: string;
    name: string;
    description?: string;
    duration: number; // in minutes
    preparationInstructions?: string;
    contraindications?: string[];
    cost: number;
    isActive: boolean;
  }[];
  equipment: {
    equipmentId: string;
    name: string;
    model: string;
    manufacturer: string;
    serialNumber: string;
    purchaseDate: Date;
    warrantyUntil?: Date;
    status: "operational" | "maintenance" | "out_of_service";
    lastMaintenance?: Date;
    nextMaintenance?: Date;
  }[];
  capacity: {
    dailyAppointments: number;
    concurrentPatients: number;
    waitingAreaCapacity: number;
  };
  status: "active" | "inactive" | "under_maintenance";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ServiceDepartmentSchema = new Schema<IServiceDepartment>(
  {
    departmentId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    name: {
      type: String,
      enum: ["x-ray", "ct-scan", "mri", "ultrasound", "emergency", "opd", "laboratory", "ot", "pharmacy", "indo", "lithotripsy", "endoscopy", "ambulance", "dental", "ecg"],
      required: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    floor: {
      type: String,
      required: true,
      trim: true,
    },
    roomNumber: {
      type: String,
      required: true,
      trim: true,
    },
    inCharge: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    contactNumber: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    operatingHours: {
      monday: {
        open: { type: String, default: "08:00" },
        close: { type: String, default: "18:00" },
        is24Hours: { type: Boolean, default: false },
      },
      tuesday: {
        open: { type: String, default: "08:00" },
        close: { type: String, default: "18:00" },
        is24Hours: { type: Boolean, default: false },
      },
      wednesday: {
        open: { type: String, default: "08:00" },
        close: { type: String, default: "18:00" },
        is24Hours: { type: Boolean, default: false },
      },
      thursday: {
        open: { type: String, default: "08:00" },
        close: { type: String, default: "18:00" },
        is24Hours: { type: Boolean, default: false },
      },
      friday: {
        open: { type: String, default: "08:00" },
        close: { type: String, default: "18:00" },
        is24Hours: { type: Boolean, default: false },
      },
      saturday: {
        open: { type: String, default: "08:00" },
        close: { type: String, default: "14:00" },
        is24Hours: { type: Boolean, default: false },
      },
      sunday: {
        open: { type: String, default: "09:00" },
        close: { type: String, default: "13:00" },
        is24Hours: { type: Boolean, default: false },
      },
    },
    services: [{
      serviceId: { type: String, required: true },
      name: { type: String, required: true, trim: true },
      description: { type: String, trim: true },
      duration: { type: Number, default: 30, min: 5 },
      preparationInstructions: { type: String },
      contraindications: [{ type: String }],
      cost: { type: Number, required: true, min: 0 },
      isActive: { type: Boolean, default: true },
    }],
    equipment: [{
      equipmentId: { type: String, required: true },
      name: { type: String, required: true, trim: true },
      model: { type: String, required: true, trim: true },
      manufacturer: { type: String, required: true, trim: true },
      serialNumber: { type: String, required: true, unique: true, trim: true },
      purchaseDate: { type: Date, required: true },
      warrantyUntil: { type: Date },
      status: {
        type: String,
        enum: ["operational", "maintenance", "out_of_service"],
        default: "operational",
      },
      lastMaintenance: { type: Date },
      nextMaintenance: { type: Date },
    }],
    capacity: {
      dailyAppointments: { type: Number, default: 50, min: 1 },
      concurrentPatients: { type: Number, default: 5, min: 1 },
      waitingAreaCapacity: { type: Number, default: 20, min: 1 },
    },
    status: {
      type: String,
      enum: ["active", "inactive", "under_maintenance"],
      default: "active",
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
ServiceDepartmentSchema.index({ departmentId: 1 });
ServiceDepartmentSchema.index({ name: 1 });
ServiceDepartmentSchema.index({ status: 1 });
ServiceDepartmentSchema.index({ location: 1 });
ServiceDepartmentSchema.index({ inCharge: 1 });

// Pre-save hook
ServiceDepartmentSchema.pre("save", function (next) {
  if (!this.departmentId) {
    const prefixMap = {
      "x-ray": "XR",
      "ct-scan": "CT",
      "mri": "MRI",
      "ultrasound": "US",
      "emergency": "ER",
      "opd": "OPD",
      "laboratory": "LAB",
      "ot": "OT",
      "pharmacy": "PH",
      "indo": "INDO",
      "lithotripsy": "LITH",
      "endoscopy": "ENDO",
      "ambulance": "AMB",
      "dental": "DENT",
      "ecg": "ECG",
    };
    const prefix = prefixMap[this.name] || "DEP";
    const random = Math.floor(1000 + Math.random() * 9000);
    this.departmentId = `${prefix}${random}`;
  }
  
  // Generate service IDs if not provided
  this.services.forEach((service, index) => {
    if (!service.serviceId) {
      const prefixMap = {
        "x-ray": "XRAY",
        "ct-scan": "CTSCAN",
        "mri": "MRI",
        "ultrasound": "US",
        "emergency": "ER",
        "opd": "OPD",
        "laboratory": "LAB",
        "ot": "OT",
        "pharmacy": "PH",
        "indo": "INDO",
        "lithotripsy": "LITH",
        "endoscopy": "ENDO",
        "ambulance": "AMB",
        "dental": "DENT",
        "ecg": "ECG",
      };
      const prefix = prefixMap[this.name] || "SRV";
      const serviceNum = (index + 1).toString().padStart(3, '0');
      service.serviceId = `${prefix}${serviceNum}`;
    }
  });
  
  next();
});

export const ServiceDepartment = models.ServiceDepartment || model<IServiceDepartment>("ServiceDepartment", ServiceDepartmentSchema);