// lib/models/Patient.ts - FIXED VERSION

import mongoose, { Schema, model, models } from "mongoose";

export interface IPatient extends mongoose.Document {
  patientId: string;
  name: string;
  phone: string;
  email?: string;
  dateOfBirth: Date;
  gender: "male" | "female" | "other";
  address?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  } | string; // Allow both object and string for backward compatibility
  bloodGroup?: string;
  allergies?: string[];
  medicalHistory?: string;
  active: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  
  // Virtuals
  age: number;
  formattedDateOfBirth: string;
  fullAddress?: string;
  emergencyContactSummary: string;
}

const emergencyContactSchema = new Schema({
  name: {
    type: String,
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  relationship: {
    type: String,
    trim: true,
  }
}, { _id: false });

const patientSchema = new Schema<IPatient>(
  { 
    patientId: {
      type: String,
      unique: true,
      sparse: true,
    },
    name: {
      type: String,
      required: [true, "Patient name is required"],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      unique: true,
      trim: true,
      validate: {
        validator: function(v: string) {
          return /^[\d+\-\s()]{10,15}$/.test(v.replace(/\D/g, ''));
        },
        message: "Please enter a valid phone number"
      }
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      validate: {
        validator: function(v: string) {
          return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: "Please enter a valid email address"
      }
    },
    dateOfBirth: {
      type: Date,
      required: [true, "Date of birth is required"],
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      required: [true, "Gender is required"],
    },
    address: {
      type: String,
      trim: true,
    },
    emergencyContact: {
      type: Schema.Types.Mixed, // Allow both object and string
      default: null,
    },
    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown", ""],
      default: "",
    },
    allergies: [{
      type: String,
      trim: true,
    }],
    medicalHistory: {
      type: String,
      trim: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes - ONLY schema.index() method (NO index: true in fields)
patientSchema.index({ patientId: 1 }, { unique: true, sparse: true });
patientSchema.index({ phone: 1 }, { unique: true });
patientSchema.index({ name: 1 });
patientSchema.index({ email: 1 }, { sparse: true });
patientSchema.index({ active: 1 });
patientSchema.index({ createdBy: 1 });
patientSchema.index({ createdAt: -1 });
patientSchema.index({ dateOfBirth: 1 });

// Compound indexes
patientSchema.index({ active: 1, createdAt: -1 });
patientSchema.index({ name: 1, active: 1 });
patientSchema.index({ createdBy: 1, active: 1 });

// Pre-save hook to generate patient ID
patientSchema.pre("save", function (next) {
  const patient = this as mongoose.Document & IPatient;
  
  // Only generate patientId if it doesn't exist
  if (!patient.patientId) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const random = Math.floor(1000 + Math.random() * 9000);
    patient.patientId = `PAT${year}${month}${random}`;
  }
  
  // Ensure phone is clean (digits only)
  if (patient.phone) {
    patient.phone = patient.phone.replace(/\D/g, '');
  }
  
  // Normalize emergencyContact to object format
  if (patient.emergencyContact) {
    if (typeof patient.emergencyContact === 'string') {
      try {
        // Try to parse as JSON
        const parsed = JSON.parse(patient.emergencyContact);
        if (typeof parsed === 'object' && parsed !== null) {
          patient.emergencyContact = parsed;
        } else {
          // If it's a plain string, convert to object
          patient.emergencyContact = {
            name: patient.emergencyContact,
            phone: '',
            relationship: ''
          };
        }
      } catch (error) {
        // If parsing fails, treat as name string
        patient.emergencyContact = {
          name: patient.emergencyContact as string,
          phone: '',
          relationship: ''
        };
      }
    }
    // Ensure it's a proper object structure
    if (typeof patient.emergencyContact === 'object' && patient.emergencyContact !== null) {
      const ec = patient.emergencyContact as any;
      patient.emergencyContact = {
        name: ec.name || '',
        phone: ec.phone || '',
        relationship: ec.relationship || ''
      };
    }
  }
  
  next();
});

// Pre-validate hook to ensure patientId exists
patientSchema.pre("validate", function (next) {
  const patient = this as mongoose.Document & IPatient;
  if (!patient.patientId) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const random = Math.floor(1000 + Math.random() * 9000);
    patient.patientId = `PAT${year}${month}${random}`;
  }
  next();
});

// Virtual for age calculation
patientSchema.virtual("age").get(function (this: IPatient) {
  if (!this.dateOfBirth) return 0;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
});

// Virtual for formatted date of birth
patientSchema.virtual("formattedDateOfBirth").get(function (this: IPatient) {
  if (!this.dateOfBirth) return "";
  return this.dateOfBirth.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
});

// Virtual for full address
patientSchema.virtual("fullAddress").get(function (this: IPatient) {
  return this.address || "";
});

// Virtual for emergency contact summary - FIXED
patientSchema.virtual("emergencyContactSummary").get(function (this: IPatient) {
  if (!this.emergencyContact) {
    return "Not provided";
  }
  
  if (typeof this.emergencyContact === 'string') {
    return this.emergencyContact || "Not provided";
  }
  
  // Now TypeScript knows it's an object
  const ec = this.emergencyContact as { name?: string; phone?: string; relationship?: string };
  if (!ec.name && !ec.phone && !ec.relationship) {
    return "Not provided";
  }
  
  if (ec.name && ec.relationship) {
    return `${ec.name} (${ec.relationship})`;
  } else if (ec.name) {
    return ec.name;
  } else if (ec.phone) {
    return `Contact: ${ec.phone}`;
  }
  
  return "Not provided";
});

// Static method to find active patients
patientSchema.statics.findActivePatients = function (createdBy?: mongoose.Types.ObjectId) {
  const query: any = { active: true };
  if (createdBy) {
    query.createdBy = createdBy;
  }
  return this.find(query)
    .select("patientId name phone email dateOfBirth gender bloodGroup allergies")
    .populate("createdBy", "name role")
    .sort({ name: 1 });
};

// Static method to find patient by ID with details
patientSchema.statics.findByIdWithDetails = function (id: string) {
  return this.findById(id)
    .populate("createdBy", "name role email phone")
    .select("-__v");
};

// Static method to search patients
patientSchema.statics.searchPatients = function (searchTerm: string, createdBy?: mongoose.Types.ObjectId) {
  const query: any = {
    $or: [
      { name: { $regex: searchTerm, $options: "i" } },
      { phone: { $regex: searchTerm, $options: "i" } },
      { patientId: { $regex: searchTerm, $options: "i" } },
      { email: { $regex: searchTerm, $options: "i" } },
    ],
    active: true,
  };
  
  if (createdBy) {
    query.createdBy = createdBy;
  }
  
  return this.find(query)
    .select("patientId name phone email dateOfBirth gender")
    .limit(20)
    .sort({ name: 1 });
};

// Instance method to get patient summary
patientSchema.methods.getSummary = function (this: IPatient) {
  return {
    id: this._id,
    patientId: this.patientId,
    name: this.name,
    age: this.age,
    gender: this.gender,
    phone: this.phone,
    email: this.email,
    bloodGroup: this.bloodGroup,
    hasAllergies: this.allergies && this.allergies.length > 0,
    active: this.active,
    createdBy: this.createdBy,
  };
};

// Instance method to update patient status
patientSchema.methods.updateStatus = function (this: IPatient, active: boolean) {
  this.active = active;
  return this.save();
};

// Instance method to add allergy
patientSchema.methods.addAllergy = function (this: IPatient, allergy: string) {
  if (!this.allergies) {
    this.allergies = [];
  }
  if (!this.allergies.includes(allergy)) {
    this.allergies.push(allergy);
  }
  return this.save();
};

// Instance method to remove allergy - FIXED
patientSchema.methods.removeAllergy = function (this: IPatient, allergy: string) {
  if (this.allergies) {
    // Explicitly type the filter callback parameter
    this.allergies = this.allergies.filter((a: string) => a !== allergy);
  }
  return this.save();
};

// Add TypeScript typing for static methods
interface PatientModel extends mongoose.Model<IPatient> {
  findActivePatients(createdBy?: mongoose.Types.ObjectId): Promise<IPatient[]>;
  findByIdWithDetails(id: string): Promise<IPatient | null>;
  searchPatients(searchTerm: string, createdBy?: mongoose.Types.ObjectId): Promise<IPatient[]>;
}

export const Patient = (models.Patient || model<IPatient, PatientModel>("Patient", patientSchema)) as PatientModel;