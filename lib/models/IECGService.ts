import mongoose, { Schema, model, models, Document } from "mongoose";

// ECG SERVICE INTERFACE
export interface IECGService extends Document {
  ecgId: string;
  patient: mongoose.Types.ObjectId;
  department: mongoose.Types.ObjectId;
  requestingDoctor: mongoose.Types.ObjectId;
  performingDoctor?: mongoose.Types.ObjectId;
  appointment?: mongoose.Types.ObjectId;
  ecgType: "resting" | "stress" | "holter" | "event" | "ambulatory";
  clinicalIndication: string;
  patientPosition: "supine" | "sitting" | "standing";
  leads: {
    placementCorrect: boolean;
    skinPreparation: "good" | "fair" | "poor";
    notes?: string;
  };
  recording: {
    startTime: Date;
    endTime: Date;
    duration: number; // in seconds
    paperSpeed: number; // mm/sec
    calibration: number; // mm/mV
    gain: number;
    filterSettings: string;
    artifacts: string[];
    technicianNotes?: string;
  };
  measurements: {
    rhythm: string;
    heartRate: number; // beats per minute
    prInterval?: number; // ms
    qrsDuration?: number; // ms
    qtInterval?: number; // ms;
    qtc?: number; // corrected QT interval
    pAxis?: number; // degrees
    qrsAxis?: number; // degrees
    tAxis?: number; // degrees
    rv5?: number; // mm
    sv1?: number; // mm
  };
  interpretation: {
    primaryDiagnosis: string;
    secondaryFindings?: string[];
    stSegment: {
      elevation: boolean;
      depression: boolean;
      location?: string;
      mm?: number;
    };
    tWave: {
      inversion: boolean;
      location?: string;
      description?: string;
    };
    conductionAbnormalities?: string[];
    chamberEnlargement?: {
      leftAtrial: boolean;
      rightAtrial: boolean;
      leftVentricular: boolean;
      rightVentricular: boolean;
    };
    ischemiaInjury?: string[];
    arrhythmias?: string[];
    pacemakerFunction?: {
      present: boolean;
      type?: string;
      capture?: boolean;
      sensing?: boolean;
    };
    overallImpression: "normal" | "abnormal" | "borderline" | "technical_difficulties";
    severity: "mild" | "moderate" | "severe";
  };
  comparison?: {
    previousDate?: Date;
    changes?: string;
  };
  qualityAssessment: {
    signalQuality: "excellent" | "good" | "fair" | "poor";
    artifactLevel: "none" | "mild" | "moderate" | "severe";
    diagnosticQuality: boolean;
  };
  images: {
    type: "12_lead" | "rhythm_strip" | "long_recording" | "vector";
    imageUrl: string;
    description?: string;
    uploadedAt: Date;
    uploadedBy: mongoose.Types.ObjectId;
  }[];
  report: {
    findings: string;
    impression: string;
    recommendations: string[];
    criticalFindings: boolean;
    criticalFindingsNotified: boolean;
    notifiedTo?: mongoose.Types.ObjectId;
    notificationTime?: Date;
  };
  followUp: {
    required: boolean;
    urgency: "routine" | "soon" | "urgent";
    recommendedTests?: string[];
    cardiologyReferral?: boolean;
    nextECGDate?: Date;
  };
  status: "scheduled" | "in_progress" | "completed" | "reported" | "cancelled";
  priority: "routine" | "urgent" | "emergency";
  billingStatus: "pending" | "billed" | "paid";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ECG SCHEMA
const ECGServiceSchema = new Schema<IECGService>(
  {
    ecgId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      default: function() {
        return `ECG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      },
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
      required: true,
    },
    performingDoctor: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    appointment: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
    },
    ecgType: {
      type: String,
      enum: ["resting", "stress", "holter", "event", "ambulatory"],
      required: true,
      default: "resting",
    },
    clinicalIndication: {
      type: String,
      required: true,
      trim: true,
    },
    patientPosition: {
      type: String,
      enum: ["supine", "sitting", "standing"],
      default: "supine",
    },
    leads: {
      placementCorrect: {
        type: Boolean,
        default: true,
      },
      skinPreparation: {
        type: String,
        enum: ["good", "fair", "poor"],
        default: "good",
      },
      notes: {
        type: String,
        trim: true,
      },
    },
    recording: {
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
        min: 10,
        max: 600,
      },
      paperSpeed: {
        type: Number,
        enum: [25, 50],
        default: 25,
      },
      calibration: {
        type: Number,
        enum: [10, 20],
        default: 10,
      },
      gain: {
        type: Number,
        default: 1,
      },
      filterSettings: {
        type: String,
        default: "standard",
      },
      artifacts: [{
        type: String,
        enum: ["baseline_wander", "muscle_tremor", "electrode_motion", "powerline_interference", "other"],
      }],
      technicianNotes: {
        type: String,
        trim: true,
      },
    },
    measurements: {
      rhythm: {
        type: String,
        required: true,
        enum: ["normal_sinus", "sinus_bradycardia", "sinus_tachycardia", "atrial_fibrillation", 
               "atrial_flutter", "svt", "vt", "vfib", "heart_block", "paced", "other"],
        default: "normal_sinus",
      },
      heartRate: {
        type: Number,
        required: true,
        min: 20,
        max: 300,
      },
      prInterval: {
        type: Number,
        min: 120,
        max: 200,
      },
      qrsDuration: {
        type: Number,
        min: 80,
        max: 120,
      },
      qtInterval: {
        type: Number,
      },
      qtc: {
        type: Number,
      },
      pAxis: {
        type: Number,
        min: -180,
        max: 180,
      },
      qrsAxis: {
        type: Number,
        min: -180,
        max: 180,
      },
      tAxis: {
        type: Number,
        min: -180,
        max: 180,
      },
      rv5: {
        type: Number,
      },
      sv1: {
        type: Number,
      },
    },
    interpretation: {
      primaryDiagnosis: {
        type: String,
        required: true,
        trim: true,
      },
      secondaryFindings: [{
        type: String,
        trim: true,
      }],
      stSegment: {
        elevation: {
          type: Boolean,
          default: false,
        },
        depression: {
          type: Boolean,
          default: false,
        },
        location: {
          type: String,
          enum: ["anterior", "inferior", "lateral", "septal", "posterior", "diffuse"],
        },
        mm: {
          type: Number,
          min: 0.5,
          max: 10,
        },
      },
      tWave: {
        inversion: {
          type: Boolean,
          default: false,
        },
        location: {
          type: String,
          enum: ["anterior", "inferior", "lateral", "septal", "posterior", "diffuse"],
        },
        description: {
          type: String,
        },
      },
      conductionAbnormalities: [{
        type: String,
        enum: ["av_block_first", "av_block_second", "av_block_third", "bundle_branch_block", 
               "hemiblock", "wolff_parkinson_white", "lgl"],
      }],
      chamberEnlargement: {
        leftAtrial: {
          type: Boolean,
          default: false,
        },
        rightAtrial: {
          type: Boolean,
          default: false,
        },
        leftVentricular: {
          type: Boolean,
          default: false,
        },
        rightVentricular: {
          type: Boolean,
          default: false,
        },
      },
      ischemiaInjury: [{
        type: String,
        enum: ["acute_infarction", "old_infarction", "ischemia", "injury", "none"],
      }],
      arrhythmias: [{
        type: String,
        enum: ["premature_atrial_contractions", "premature_ventricular_contractions", 
               "atrial_fibrillation", "atrial_flutter", "ventricular_tachycardia", 
               "supraventricular_tachycardia", "bradycardia", "tachycardia", "sinus_arrest"],
      }],
      pacemakerFunction: {
        present: {
          type: Boolean,
          default: false,
        },
        type: {
          type: String,
          enum: ["single_chamber", "dual_chamber", "biventricular", "icd"],
        },
        capture: {
          type: Boolean,
        },
        sensing: {
          type: Boolean,
        },
      },
      overallImpression: {
        type: String,
        enum: ["normal", "abnormal", "borderline", "technical_difficulties"],
        required: true,
        default: "normal",
      },
      severity: {
        type: String,
        enum: ["mild", "moderate", "severe"],
      },
    },
    comparison: {
      previousDate: {
        type: Date,
      },
      changes: {
        type: String,
        trim: true,
      },
    },
    qualityAssessment: {
      signalQuality: {
        type: String,
        enum: ["excellent", "good", "fair", "poor"],
        required: true,
        default: "good",
      },
      artifactLevel: {
        type: String,
        enum: ["none", "mild", "moderate", "severe"],
        required: true,
        default: "none",
      },
      diagnosticQuality: {
        type: Boolean,
        required: true,
        default: true,
      },
    },
    images: [{
      type: {
        type: String,
        enum: ["12_lead", "rhythm_strip", "long_recording", "vector"],
        required: true,
      },
      imageUrl: {
        type: String,
        required: true,
      },
      description: {
        type: String,
        trim: true,
      },
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
      uploadedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    }],
    report: {
      findings: {
        type: String,
        required: true,
        trim: true,
      },
      impression: {
        type: String,
        required: true,
        trim: true,
      },
      recommendations: [{
        type: String,
        trim: true,
      }],
      criticalFindings: {
        type: Boolean,
        default: false,
      },
      criticalFindingsNotified: {
        type: Boolean,
        default: false,
      },
      notifiedTo: {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
      notificationTime: {
        type: Date,
      },
    },
    followUp: {
      required: {
        type: Boolean,
        default: false,
      },
      urgency: {
        type: String,
        enum: ["routine", "soon", "urgent"],
        default: "routine",
      },
      recommendedTests: [{
        type: String,
        enum: ["echo", "stress_test", "holter", "event_monitor", "ct_angiogram", "coronary_angiogram"],
      }],
      cardiologyReferral: {
        type: Boolean,
        default: false,
      },
      nextECGDate: {
        type: Date,
      },
    },
    status: {
      type: String,
      enum: ["scheduled", "in_progress", "completed", "reported", "cancelled"],
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
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
ECGServiceSchema.index({ patient: 1, createdAt: -1 });
ECGServiceSchema.index({ ecgId: 1 });
ECGServiceSchema.index({ status: 1 });
ECGServiceSchema.index({ "interpretation.overallImpression": 1 });
ECGServiceSchema.index({ "report.criticalFindings": 1 });
ECGServiceSchema.index({ createdAt: -1 });
ECGServiceSchema.index({ "measurements.heartRate": 1 });
ECGServiceSchema.index({ "interpretation.primaryDiagnosis": 1 });

// Virtual for age (if patient has dob field)
ECGServiceSchema.virtual("patientAge").get(function() {
  // This would require the patient document to be populated
  if (!this.populated("patient")) return null;
  // Calculate age from patient's date of birth
  return null;
});

// Pre-save middleware to calculate QTc if not provided
ECGServiceSchema.pre("save", function(next) {
  if (this.measurements.qtInterval && this.measurements.heartRate && !this.measurements.qtc) {
    // Using Bazett's formula: QTc = QT / √(RR interval in seconds)
    const rrInterval = 60 / this.measurements.heartRate; // RR interval in seconds
    this.measurements.qtc = this.measurements.qtInterval / Math.sqrt(rrInterval);
  }
  
  // Automatically set critical findings notification if critical
  if (this.report.criticalFindings && !this.report.criticalFindingsNotified) {
    this.report.criticalFindingsNotified = false;
    // In real implementation, you might want to trigger notification here
  }
  
  next();
});

// Static methods
ECGServiceSchema.statics.findByPatient = function(patientId: mongoose.Types.ObjectId) {
  return this.find({ patient: patientId }).sort({ createdAt: -1 });
};

ECGServiceSchema.statics.findAbnormalECGs = function(startDate?: Date, endDate?: Date) {
  const query: any = { "interpretation.overallImpression": "abnormal" };
  
  if (startDate && endDate) {
    query.createdAt = { $gte: startDate, $lte: endDate };
  } else if (startDate) {
    query.createdAt = { $gte: startDate };
  } else if (endDate) {
    query.createdAt = { $lte: endDate };
  }
  
  return this.find(query);
};

ECGServiceSchema.statics.findCriticalECGs = function(notified?: boolean) {
  const query: any = { "report.criticalFindings": true };
  
  if (notified !== undefined) {
    query["report.criticalFindingsNotified"] = notified;
  }
  
  return this.find(query);
};

// Instance methods
ECGServiceSchema.methods.markAsReported = function(reportData: Partial<IECGService["report"]>) {
  this.report = { ...this.report, ...reportData };
  this.status = "reported";
  return this.save();
};

ECGServiceSchema.methods.markCriticalFindingsNotified = function(notifiedTo: mongoose.Types.ObjectId) {
  this.report.criticalFindingsNotified = true;
  this.report.notifiedTo = notifiedTo;
  this.report.notificationTime = new Date();
  return this.save();
};

// ECG MODEL
export const ECGService = models.ECGService || model<IECGService>("ECGService", ECGServiceSchema);  