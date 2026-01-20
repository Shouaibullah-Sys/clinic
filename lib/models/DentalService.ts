// lib/models/DentalService.ts

import mongoose, { Schema, model, models, Document } from "mongoose";

// Common interfaces for reuse
export interface IServiceBase extends Document {
  serviceId: string;
  patient: mongoose.Types.ObjectId;
  department: mongoose.Types.ObjectId;
  requestingDoctor?: mongoose.Types.ObjectId;
  performingDoctor?: mongoose.Types.ObjectId;
  appointment?: mongoose.Types.ObjectId;
  status: "scheduled" | "in_progress" | "completed" | "cancelled" | "reported";
  priority: "routine" | "urgent" | "emergency";
  clinicalIndication: string;
  findings?: string;
  report?: string;
  reportDate?: Date;
  billingStatus: "pending" | "billed" | "paid";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// DENTAL SERVICE (Your existing code)
export interface IDentalService extends Document {
  dentalId: string;
  patient: mongoose.Types.ObjectId;
  department: mongoose.Types.ObjectId;
  dentist: mongoose.Types.ObjectId;
  dentalAssistant?: mongoose.Types.ObjectId;
  appointment?: mongoose.Types.ObjectId;
  visitType: "consultation" | "treatment" | "followup" | "emergency";
  chiefComplaint: string;
  dentalHistory: string;
  medicalHistory: string;
  allergies: string[];
  currentMedications: string[];
  oralExamination: {
    oralHygiene: "good" | "fair" | "poor";
    occlusion: string;
    temporomandibularJoint: string;
    oralMucosa: string;
    gingiva: string;
    periodontalStatus: string;
    dentalCharting: {
      toothNumber: number;
      condition: "sound" | "caries" | "filled" | "missing" | "crowned" | "root_stump" | "impacted";
      details?: string;
    }[];
  };
  diagnosis: string;
  treatmentPlan: {
    toothNumber: number;
    procedure: string;
    material?: string;
    fee: number;
    status: "planned" | "in_progress" | "completed" | "cancelled";
    date?: Date;
    notes?: string;
  }[];
  procedures: {
    procedure: string;
    toothNumber?: number;
    material?: string;
    anesthesia?: string;
    startTime: Date;
    endTime: Date;
    performedBy: mongoose.Types.ObjectId;
    assistant?: mongoose.Types.ObjectId;
    notes?: string;
  }[];
  radiographs: {
    type: "opg" | "iopa" | "bitewing" | "periapical" | "cephalometric";
    imageUrl: string;
    takenAt: Date;
    takenBy: mongoose.Types.ObjectId;
    findings?: string;
  }[];
  medicationsPrescribed: {
    medication: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
  }[];
  followUp: {
    required: boolean;
    date?: Date;
    reason?: string;
    instructions?: string;
  };
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  billingStatus: "pending" | "billed" | "paid";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// IMAGING SERVICES (X-ray, CT Scan, MRI, Ultrasound)
export interface IImagingService extends IServiceBase {
  imagingType: "xray" | "ct" | "mri" | "ultrasound";
  bodyPart: string;
  views: string[];
  contrast?: boolean;
  contrastType?: string;
  images: {
    imageUrl: string;
    view: string;
    description?: string;
    uploadedAt: Date;
  }[];
  radiologist?: mongoose.Types.ObjectId;
  technician?: mongoose.Types.ObjectId;
}

// EMERGENCY SERVICE
export interface IEmergencyService extends Document {
  emergencyId: string;
  patient: mongoose.Types.ObjectId;
  triageLevel: "resuscitation" | "emergent" | "urgent" | "less_urgent" | "non_urgent";
  chiefComplaint: string;
  vitalSigns: {
    bloodPressure: string;
    heartRate: number;
    respiratoryRate: number;
    temperature: number;
    oxygenSaturation: number;
    painScale: number;
  };
  historyOfPresentIllness: string;
  pastMedicalHistory: string;
  allergies: string[];
  medications: string[];
  primaryAssessment: {
    airway: string;
    breathing: string;
    circulation: string;
    disability: string;
    exposure: string;
  };
  procedures: {
    procedure: string;
    time: Date;
    performedBy: mongoose.Types.ObjectId;
    notes?: string;
  }[];
  disposition: {
    type: "admission" | "discharge" | "transfer" | "observation" | "death";
    unit?: string;
    bed?: string;
    dischargeInstructions?: string;
    transferHospital?: string;
    deathTime?: Date;
  };
  status: "active" | "admitted" | "discharged" | "transferred" | "death";
  attendingDoctor: mongoose.Types.ObjectId;
  nurses: mongoose.Types.ObjectId[];
  billingStatus: "pending" | "billed" | "paid";
  createdAt: Date;
  updatedAt: Date;
}

// OPD SERVICE
export interface IOpdService extends Document {
  opdId: string;
  patient: mongoose.Types.ObjectId;
  doctor: mongoose.Types.ObjectId;
  appointment?: mongoose.Types.ObjectId;
  visitType: "new" | "followup" | "review";
  chiefComplaint: string;
  historyOfPresentIllness: string;
  pastMedicalHistory: string;
  allergies: string[];
  currentMedications: string[];
  examination: {
    general: string;
    systemic: Record<string, string>;
  };
  diagnosis: string[];
  prescriptions: {
    medication: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
  }[];
  investigationsOrdered: {
    type: string;
    test: string;
    instructions?: string;
  }[];
  advice: string[];
  followUp?: {
    date: Date;
    reason: string;
  };
  status: "consulted" | "admitted" | "referred" | "discharged";
  billingStatus: "pending" | "billed" | "paid";
  createdAt: Date;
  updatedAt: Date;
}

// LABORATORY SERVICE
export interface ILaboratoryService extends IServiceBase {
  labType: "hematology" | "biochemistry" | "microbiology" | "pathology" | "serology" | "urinalysis";
  tests: {
    testName: string;
    specimenType: string;
    specimenCollectionTime?: Date;
    result?: string;
    unit?: string;
    referenceRange?: string;
    status: "ordered" | "collected" | "processing" | "completed" | "cancelled";
    completedAt?: Date;
    verifiedBy?: mongoose.Types.ObjectId;
  }[];
  phlebotomist?: mongoose.Types.ObjectId;
  pathologist?: mongoose.Types.ObjectId;
}

// OPERATION THEATRE (OT) SERVICE
export interface IOTService extends Document {
  otId: string;
  patient: mongoose.Types.ObjectId;
  surgeryType: string;
  diagnosis: string;
  procedureName: string;
  plannedDuration: number; // in minutes
  anesthesiaType: "general" | "spinal" | "epidural" | "local" | "sedation";
  team: {
    surgeon: mongoose.Types.ObjectId;
    assistantSurgeon?: mongoose.Types.ObjectId;
    anesthetist: mongoose.Types.ObjectId;
    nurse: mongoose.Types.ObjectId;
    technician?: mongoose.Types.ObjectId;
  };
  schedule: {
    admissionDate: Date;
    surgeryDate: Date;
    operationStart?: Date;
    operationEnd?: Date;
    recoveryStart?: Date;
    recoveryEnd?: Date;
  };
  preOpChecklist: {
    consentSigned: boolean;
    labReports: boolean;
    imaging: boolean;
    bloodArranged: boolean;
    instruments: boolean;
    anesthesiaAssessment: boolean;
  };
  intraOp: {
    startTime?: Date;
    endTime?: Date;
    findings: string;
    procedures: string[];
    complications?: string;
    bloodLoss?: number;
    urineOutput?: number;
  };
  postOp: {
    recoveryNotes: string;
    complications?: string;
    instructions: string;
    followUpDate?: Date;
  };
  status: "scheduled" | "pre_op" | "in_surgery" | "recovery" | "completed" | "cancelled";
  billingStatus: "pending" | "billed" | "paid";
  createdAt: Date;
  updatedAt: Date;
}

// PHARMACY SERVICE
export interface IPharmacyService extends Document {
  prescriptionId: string;
  patient: mongoose.Types.ObjectId;
  doctor: mongoose.Types.ObjectId;
  items: {
    medication: string;
    dosage: string;
    form: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    instructions?: string;
    dispensingStatus: "pending" | "dispensed" | "partial" | "cancelled";
    dispensedBy?: mongoose.Types.ObjectId;
    dispensedAt?: Date;
  }[];
  status: "pending" | "dispensed" | "partially_dispensed" | "cancelled";
  totalAmount: number;
  billingStatus: "pending" | "billed" | "paid";
  createdAt: Date;
  updatedAt: Date;
}

// INDOOR (INDO) SERVICE - Inpatient Department
export interface IIndoService extends Document {
  admissionId: string;
  patient: mongoose.Types.ObjectId;
  admittingDoctor: mongoose.Types.ObjectId;
  unit: string;
  bed: string;
  admissionDate: Date;
  admissionDiagnosis: string;
  dischargeDate?: Date;
  dischargeDiagnosis?: string;
  dischargeSummary?: string;
  dailyProgress: {
    date: Date;
    time: string;
    doctor: mongoose.Types.ObjectId;
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  }[];
  medications: {
    medication: string;
    dosage: string;
    frequency: string;
    route: string;
    startDate: Date;
    endDate?: Date;
    prescribedBy: mongoose.Types.ObjectId;
  }[];
  nursingRecords: {
    date: Date;
    time: string;
    nurse: mongoose.Types.ObjectId;
    vitalSigns: {
      bp: string;
      pulse: number;
      temp: number;
      respiration: number;
      spo2: number;
    };
    notes: string;
  }[];
  status: "admitted" | "discharged" | "transferred";
  billingStatus: "pending" | "billed" | "paid";
  createdAt: Date;
  updatedAt: Date;
}

// LITHOTRIPSY SERVICE
export interface ILithotripsyService extends IServiceBase {
  stoneLocation: string;
  stoneSize: number; // in mm
  machineType: string;
  energyLevel: number;
  numberOfShocks: number;
  preOpMedication: string[];
  postOpCare: string;
  complications?: string;
}

// ENDOSCOPY SERVICE
export interface IEndoscopyService extends IServiceBase {
  endoscopyType: "upper_gi" | "colonoscopy" | "bronchoscopy" | "ercp" | "cystoscopy";
  preparation: string;
  sedation: string;
  findings: string;
  biopsiesTaken: boolean;
  biopsyResults?: string[];
  interventions?: string[];
  postProcedureInstructions: string;
}

// AMBULANCE SERVICE
export interface IAmbulanceService extends Document {
  ambulanceId: string;
  patient: mongoose.Types.ObjectId;
  pickupLocation: string;
  destination: string;
  pickupTime: Date;
  arrivalTime?: Date;
  handoverTime?: Date;
  ambulanceType: "basic" | "advanced" | "mobile_icu";
  crew: {
    driver: mongoose.Types.ObjectId;
    paramedic?: mongoose.Types.ObjectId;
    nurse?: mongoose.Types.ObjectId;
  };
  vitalSignsEnRoute?: {
    time: Date;
    bloodPressure: string;
    heartRate: number;
    respiratoryRate: number;
    oxygenSaturation: number;
  }[];
  interventionsEnRoute?: {
    intervention: string;
    time: Date;
    performedBy: mongoose.Types.ObjectId;
  }[];
  status: "dispatched" | "en_route" | "arrived" | "transporting" | "completed" | "cancelled";
  billingStatus: "pending" | "billed" | "paid";
  distance: number; // in km
  baseCharge: number;
  additionalCharges?: number;
  totalCharge: number;
  createdAt: Date;
  updatedAt: Date;
}

// ECG SERVICE
export interface IECGService extends IServiceBase {
  ecgType: "resting" | "stress" | "holter" | "event";
  leadConfiguration: string;
  rhythm: string;
  rate: number;
  prInterval?: number;
  qrsDuration?: number;
  qtInterval?: number;
  axis?: string;
  interpretation: string;
  abnormalities?: string[];
  technician: mongoose.Types.ObjectId;
}

// SCHEMAS
const DentalServiceSchema = new Schema<IDentalService>(
  {
    dentalId: {
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
    department: {
      type: Schema.Types.ObjectId,
      ref: "ServiceDepartment",
      required: true,
    },
    dentist: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    dentalAssistant: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    appointment: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
    },
    visitType: {
      type: String,
      enum: ["consultation", "treatment", "followup", "emergency"],
      required: true,
    },
    chiefComplaint: {
      type: String,
      required: true,
    },
    dentalHistory: String,
    medicalHistory: String,
    allergies: [String],
    currentMedications: [String],
    oralExamination: {
      oralHygiene: {
        type: String,
        enum: ["good", "fair", "poor"],
      },
      occlusion: String,
      temporomandibularJoint: String,
      oralMucosa: String,
      gingiva: String,
      periodontalStatus: String,
      dentalCharting: [{
        toothNumber: Number,
        condition: {
          type: String,
          enum: ["sound", "caries", "filled", "missing", "crowned", "root_stump", "impacted"],
        },
        details: String,
      }],
    },
    diagnosis: String,
    treatmentPlan: [{
      toothNumber: Number,
      procedure: String,
      material: String,
      fee: Number,
      status: {
        type: String,
        enum: ["planned", "in_progress", "completed", "cancelled"],
      },
      date: Date,
      notes: String,
    }],
    procedures: [{
      procedure: String,
      toothNumber: Number,
      material: String,
      anesthesia: String,
      startTime: Date,
      endTime: Date,
      performedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
      assistant: {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
      notes: String,
    }],
    radiographs: [{
      type: {
        type: String,
        enum: ["opg", "iopa", "bitewing", "periapical", "cephalometric"],
      },
      imageUrl: String,
      takenAt: Date,
      takenBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
      findings: String,
    }],
    medicationsPrescribed: [{
      medication: String,
      dosage: String,
      frequency: String,
      duration: String,
      instructions: String,
    }],
    followUp: {
      required: Boolean,
      date: Date,
      reason: String,
      instructions: String,
    },
    status: {
      type: String,
      enum: ["scheduled", "in_progress", "completed", "cancelled"],
      default: "scheduled",
    },
    billingStatus: {
      type: String,
      enum: ["pending", "billed", "paid"],
      default: "pending",
    },
    notes: String,
  },
  { timestamps: true }
);

const ImagingServiceSchema = new Schema<IImagingService>(
  {
    serviceId: {
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
    department: {
      type: Schema.Types.ObjectId,
      ref: "ServiceDepartment",
      required: true,
    },
    requestingDoctor: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    performingDoctor: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    appointment: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
    },
    imagingType: {
      type: String,
      enum: ["xray", "ct", "mri", "ultrasound"],
      required: true,
    },
    bodyPart: {
      type: String,
      required: true,
    },
    views: [String],
    contrast: Boolean,
    contrastType: String,
    images: [{
      imageUrl: String,
      view: String,
      description: String,
      uploadedAt: Date,
    }],
    clinicalIndication: {
      type: String,
      required: true,
    },
    findings: String,
    report: String,
    reportDate: Date,
    radiologist: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    technician: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    status: {
      type: String,
      enum: ["scheduled", "in_progress", "completed", "cancelled", "reported"],
      default: "scheduled",
    },
    priority: {
      type: String,
      enum: ["routine", "urgent", "emergency"],
      default: "routine",
    },
    billingStatus: {
      type: String,
      enum: ["pending", "billed", "paid"],
      default: "pending",
    },
    notes: String,
  },
  { timestamps: true }
);

// Export all models
export const DentalService = models.DentalService || model<IDentalService>("DentalService", DentalServiceSchema);
export const ImagingService = models.ImagingService || model<IImagingService>("ImagingService", ImagingServiceSchema);
export const EmergencyService = models.EmergencyService || model<IEmergencyService>("EmergencyService", new Schema({
  emergencyId: { type: String, required: true, unique: true, uppercase: true },
  patient: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
  triageLevel: { type: String, enum: ["resuscitation", "emergent", "urgent", "less_urgent", "non_urgent"], required: true },
  chiefComplaint: { type: String, required: true },
  vitalSigns: {
    bloodPressure: String,
    heartRate: Number,
    respiratoryRate: Number,
    temperature: Number,
    oxygenSaturation: Number,
    painScale: Number,
  },
  historyOfPresentIllness: String,
  pastMedicalHistory: String,
  allergies: [String],
  medications: [String],
  primaryAssessment: {
    airway: String,
    breathing: String,
    circulation: String,
    disability: String,
    exposure: String,
  },
  procedures: [{
    procedure: String,
    time: Date,
    performedBy: { type: Schema.Types.ObjectId, ref: "User" },
    notes: String,
  }],
  disposition: {
    type: { type: String, enum: ["admission", "discharge", "transfer", "observation", "death"] },
    unit: String,
    bed: String,
    dischargeInstructions: String,
    transferHospital: String,
    deathTime: Date,
  },
  status: { type: String, enum: ["active", "admitted", "discharged", "transferred", "death"], default: "active" },
  attendingDoctor: { type: Schema.Types.ObjectId, ref: "User", required: true },
  nurses: [{ type: Schema.Types.ObjectId, ref: "User" }],
  billingStatus: { type: String, enum: ["pending", "billed", "paid"], default: "pending" },
}, { timestamps: true }));

export const OpdService = models.OpdService || model<IOpdService>("OpdService", new Schema({
  opdId: { type: String, required: true, unique: true, uppercase: true },
  patient: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
  doctor: { type: Schema.Types.ObjectId, ref: "User", required: true },
  appointment: { type: Schema.Types.ObjectId, ref: "Appointment" },
  visitType: { type: String, enum: ["new", "followup", "review"], required: true },
  chiefComplaint: { type: String, required: true },
  historyOfPresentIllness: String,
  pastMedicalHistory: String,
  allergies: [String],
  currentMedications: [String],
  examination: {
    general: String,
    systemic: Schema.Types.Mixed,
  },
  diagnosis: [String],
  prescriptions: [{
    medication: String,
    dosage: String,
    frequency: String,
    duration: String,
    instructions: String,
  }],
  investigationsOrdered: [{
    type: String,
    test: String,
    instructions: String,
  }],
  advice: [String],
  followUp: {
    date: Date,
    reason: String,
  },
  status: { type: String, enum: ["consulted", "admitted", "referred", "discharged"], default: "consulted" },
  billingStatus: { type: String, enum: ["pending", "billed", "paid"], default: "pending" },
}, { timestamps: true }));

export const LaboratoryService = models.LaboratoryService || model<ILaboratoryService>("LaboratoryService", new Schema({
  serviceId: { type: String, required: true, unique: true, uppercase: true },
  patient: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
  department: { type: Schema.Types.ObjectId, ref: "ServiceDepartment", required: true },
  requestingDoctor: { type: Schema.Types.ObjectId, ref: "User" },
  performingDoctor: { type: Schema.Types.ObjectId, ref: "User" },
  appointment: { type: Schema.Types.ObjectId, ref: "Appointment" },
  labType: { type: String, enum: ["hematology", "biochemistry", "microbiology", "pathology", "serology", "urinalysis"], required: true },
  tests: [{
    testName: { type: String, required: true },
    specimenType: { type: String, required: true },
    specimenCollectionTime: Date,
    result: String,
    unit: String,
    referenceRange: String,
    status: { type: String, enum: ["ordered", "collected", "processing", "completed", "cancelled"], default: "ordered" },
    completedAt: Date,
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
  }],
  clinicalIndication: { type: String, required: true },
  findings: String,
  report: String,
  reportDate: Date,
  phlebotomist: { type: Schema.Types.ObjectId, ref: "User" },
  pathologist: { type: Schema.Types.ObjectId, ref: "User" },
  status: { type: String, enum: ["scheduled", "in_progress", "completed", "cancelled", "reported"], default: "scheduled" },
  priority: { type: String, enum: ["routine", "urgent", "emergency"], default: "routine" },
  billingStatus: { type: String, enum: ["pending", "billed", "paid"], default: "pending" },
  notes: String,
}, { timestamps: true }));

// Similarly, you can create schemas for OTService, PharmacyService, IndoService, LithotripsyService, EndoscopyService, AmbulanceService, and ECGService

// For brevity, I'll show one more example and you can follow the pattern:
export const OTService = models.OTService || model<IOTService>("OTService", new Schema({
  otId: { type: String, required: true, unique: true, uppercase: true },
  patient: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
  surgeryType: { type: String, required: true },
  diagnosis: { type: String, required: true },
  procedureName: { type: String, required: true },
  plannedDuration: { type: Number, required: true },
  anesthesiaType: { type: String, enum: ["general", "spinal", "epidural", "local", "sedation"], required: true },
  team: {
    surgeon: { type: Schema.Types.ObjectId, ref: "User", required: true },
    assistantSurgeon: { type: Schema.Types.ObjectId, ref: "User" },
    anesthetist: { type: Schema.Types.ObjectId, ref: "User", required: true },
    nurse: { type: Schema.Types.ObjectId, ref: "User", required: true },
    technician: { type: Schema.Types.ObjectId, ref: "User" },
  },
  schedule: {
    admissionDate: { type: Date, required: true },
    surgeryDate: { type: Date, required: true },
    operationStart: Date,
    operationEnd: Date,
    recoveryStart: Date,
    recoveryEnd: Date,
  },
  preOpChecklist: {
    consentSigned: Boolean,
    labReports: Boolean,
    imaging: Boolean,
    bloodArranged: Boolean,
    instruments: Boolean,
    anesthesiaAssessment: Boolean,
  },
  intraOp: {
    startTime: Date,
    endTime: Date,
    findings: String,
    procedures: [String],
    complications: String,
    bloodLoss: Number,
    urineOutput: Number,
  },
  postOp: {
    recoveryNotes: String,
    complications: String,
    instructions: String,
    followUpDate: Date,
  },
  status: { type: String, enum: ["scheduled", "pre_op", "in_surgery", "recovery", "completed", "cancelled"], default: "scheduled" },
  billingStatus: { type: String, enum: ["pending", "billed", "paid"], default: "pending" },
}, { timestamps: true }));

// You can continue creating models for the remaining services following the same pattern