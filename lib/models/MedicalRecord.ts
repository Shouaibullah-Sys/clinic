// lib/models/MedicalRecord.ts - FIXED VERSION
import mongoose, { Schema, model, models } from "mongoose";

export interface IMedicalRecord extends mongoose.Document {
  recordId: string;
  patient: mongoose.Types.ObjectId;
  doctor: mongoose.Types.ObjectId;
  appointment?: mongoose.Types.ObjectId;
  visitDate: Date;
  diagnosis: string;
  symptoms: string[];
  examinations: {
    type: string;
    findings: string;
    date: Date;
    performedBy?: mongoose.Types.ObjectId;
  }[];
  prescriptions: mongoose.Types.ObjectId[];
  labTests: {
    testName: string;
    testId?: string;
    date: Date;
    results?: string;
    status: "pending" | "completed" | "cancelled";
  }[];
  procedures: {
    name: string;
    date: Date;
    description: string;
    performedBy?: mongoose.Types.ObjectId;
  }[];
  vitalSigns?: {
    bloodPressure?: {
      systolic: number;
      diastolic: number;
    };
    heartRate?: number;
    temperature?: number;
    respiratoryRate?: number;
    oxygenSaturation?: number;
    height?: number;
    weight?: number;
    bmi?: number;
  };
  notes?: string;
  followUpDate?: Date;
  admitted: boolean;
  admissionDate?: Date;
  dischargeDate?: Date;
  ward?: string;
  bedNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

const medicalRecordSchema = new Schema<IMedicalRecord>(
  {
    recordId: {
      type: String,
      required: true,
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
    appointment: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
    },
    visitDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    diagnosis: {
      type: String,
      required: true,
      trim: true,
    },
    symptoms: [{
      type: String,
      trim: true,
    }],
    examinations: [{
      type: { 
        type: String, 
        required: true,
        trim: true,
      },
      findings: { 
        type: String, 
        required: true,
        trim: true,
      },
      date: { 
        type: Date, 
        default: Date.now,
      },
      performedBy: { 
        type: Schema.Types.ObjectId, 
        ref: "User" 
      },
    }],
    prescriptions: [{
      type: Schema.Types.ObjectId,
      ref: "Prescription",
    }],
    labTests: [{
      testName: { 
        type: String, 
        required: true,
        trim: true,
      },
      testId: { 
        type: String,
        trim: true,
      },
      date: { 
        type: Date, 
        default: Date.now,
      },
      results: { 
        type: String,
        trim: true,
      },
      status: {
        type: String,
        enum: ["pending", "completed", "cancelled"],
        default: "pending",
      },
    }],
    procedures: [{
      name: { 
        type: String, 
        required: true,
        trim: true,
      },
      date: { 
        type: Date, 
        default: Date.now,
      },
      description: { 
        type: String, 
        required: true,
        trim: true,
      },
      performedBy: { 
        type: Schema.Types.ObjectId, 
        ref: "User" 
      },
    }],
    vitalSigns: {
      bloodPressure: {
        systolic: {
          type: Number,
          min: 0,
          max: 300,
        },
        diastolic: {
          type: Number,
          min: 0,
          max: 300,
        },
      },
      heartRate: {
        type: Number,
        min: 0,
        max: 300,
      },
      temperature: {
        type: Number,
        min: 30,
        max: 45,
      },
      respiratoryRate: {
        type: Number,
        min: 0,
        max: 100,
      },
      oxygenSaturation: {
        type: Number,
        min: 0,
        max: 100,
      },
      height: {
        type: Number,
        min: 0,
        max: 300,
      },
      weight: {
        type: Number,
        min: 0,
        max: 500,
      },
      bmi: {
        type: Number,
        min: 0,
        max: 100,
      },
    },
    notes: {
      type: String,
      trim: true,
    },
    followUpDate: {
      type: Date,
    },
    admitted: {
      type: Boolean,
      default: false,
    },
    admissionDate: {
      type: Date,
    },
    dischargeDate: {
      type: Date,
    },
    ward: {
      type: String,
      trim: true,
    },
    bedNumber: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// **IMPORTANT: Check if you have index: true in field definitions above**
// If you do, remove them and keep only these schema.index() calls:

// Indexes - DO NOT use index: true in field definitions above
medicalRecordSchema.index({ recordId: 1 }, { unique: true });
medicalRecordSchema.index({ patient: 1 });
medicalRecordSchema.index({ doctor: 1 });
medicalRecordSchema.index({ visitDate: -1 });
medicalRecordSchema.index({ "patient": 1, "visitDate": -1 });
medicalRecordSchema.index({ admitted: 1 });
medicalRecordSchema.index({ "patient": 1, "admitted": 1 });
medicalRecordSchema.index({ createdAt: -1 });

// Pre-save hook
medicalRecordSchema.pre("save", function (next) {
  const medicalRecord = this;
  
  // Generate record ID if not exists
  if (!medicalRecord.recordId || medicalRecord.isNew) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(10000 + Math.random() * 90000);
    medicalRecord.recordId = `MR${year}${month}${random}`;
  }
  
  // Calculate BMI if height and weight are provided
  if (
    medicalRecord.vitalSigns && 
    medicalRecord.vitalSigns.height && 
    medicalRecord.vitalSigns.weight
  ) {
    const heightInMeters = medicalRecord.vitalSigns.height / 100;
    const bmi = medicalRecord.vitalSigns.weight / (heightInMeters * heightInMeters);
    medicalRecord.vitalSigns.bmi = parseFloat(bmi.toFixed(1));
  }
  
  // Auto-set admission/discharge logic
  if (medicalRecord.admitted && !medicalRecord.admissionDate) {
    medicalRecord.admissionDate = new Date();
  }
  
  if (!medicalRecord.admitted && medicalRecord.admissionDate && !medicalRecord.dischargeDate) {
    medicalRecord.dischargeDate = new Date();
  }
  
  next();
});

// Pre-validate hook to ensure recordId
medicalRecordSchema.pre("validate", function (next) {
  if (!this.recordId) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(10000 + Math.random() * 90000);
    this.recordId = `MR${year}${month}${random}`;
  }
  next();
});

// Virtual for formatted visit date
medicalRecordSchema.virtual("formattedVisitDate").get(function () {
  return this.visitDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
});

// Virtual for blood pressure string
medicalRecordSchema.virtual("bloodPressureString").get(function () {
  if (this.vitalSigns?.bloodPressure) {
    return `${this.vitalSigns.bloodPressure.systolic}/${this.vitalSigns.bloodPressure.diastolic}`;
  }
  return "N/A";
});

// Static method to find by patient
medicalRecordSchema.statics.findByPatientId = function (patientId: string) {
  return this.find({ patient: patientId })
    .populate("doctor", "name specialization")
    .populate("appointment", "appointmentId date startTime")
    .sort({ visitDate: -1 });
};

// Static method to find recent records
medicalRecordSchema.statics.findRecent = function (limit: number = 10) {
  return this.find()
    .populate("patient", "name patientId")
    .populate("doctor", "name specialization")
    .sort({ visitDate: -1 })
    .limit(limit);
};

// Instance method to get summary
medicalRecordSchema.methods.getSummary = function () {
  return {
    recordId: this.recordId,
    patientId: this.patient,
    doctorId: this.doctor,
    visitDate: this.visitDate,
    diagnosis: this.diagnosis,
    symptoms: this.symptoms,
    hasVitals: !!this.vitalSigns,
    admitted: this.admitted,
  };
};

export const MedicalRecord = models.MedicalRecord || model<IMedicalRecord>("MedicalRecord", medicalRecordSchema);