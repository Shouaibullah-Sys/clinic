// lib/models/RadiologyTemplate.ts

import mongoose, { Schema, model, models } from "mongoose";

export interface IRadiologyTemplate extends mongoose.Document {
  templateCode: string;
  examName: string;
  serviceType:
    | "x-ray"
    | "ct-scan"
    | "mri"
    | "ultrasound"
    | "mammography"
    | "fluoroscopy"
    | "pet-scan"
    | "bone-density"
    | "other";
  category: string;
  bodyPart?: string;
  views?: string[];
  description?: string;
  contrastRequired: boolean;
  contrastType?: string;
  preparationInstructions?: string;
  duration: number; // in minutes
  basePrice: number;
  active: boolean;
  parameters: Array<{
    parameterCode: string;
    parameterName: string;
    description?: string;
    normalFindings?: string;
    unit?: string;
  }>;
  clinicalIndicationTemplate?: string;
  techniqueTemplate?: string;
  comparisonTemplate?: string;
  findingsTemplate?: string;
  impressionTemplate?: string;
  recommendationTemplate?: string;
  criticalFindingsChecklist?: string[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const radiologyTemplateSchema = new Schema<IRadiologyTemplate>(
  {
    templateCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    examName: {
      type: String,
      required: true,
      trim: true,
    },
    serviceType: {
      type: String,
      required: true,
      enum: [
        "x-ray",
        "ct-scan",
        "mri",
        "ultrasound",
        "mammography",
        "fluoroscopy",
        "pet-scan",
        "bone-density",
        "other",
      ],
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    bodyPart: {
      type: String,
      trim: true,
    },
    views: [
      {
        type: String,
        trim: true,
      },
    ],
    description: {
      type: String,
      trim: true,
    },
    contrastRequired: {
      type: Boolean,
      default: false,
    },
    contrastType: {
      type: String,
      trim: true,
    },
    preparationInstructions: {
      type: String,
      trim: true,
    },
    duration: {
      type: Number,
      required: true,
      min: 1,
      max: 480, // 8 hours in minutes
    },
    basePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    active: {
      type: Boolean,
      default: true,
    },
    parameters: [
      {
        parameterCode: {
          type: String,
          required: true,
          trim: true,
        },
        parameterName: {
          type: String,
          required: true,
          trim: true,
        },
        description: {
          type: String,
          trim: true,
        },
        normalFindings: {
          type: String,
          trim: true,
        },
        unit: {
          type: String,
          trim: true,
        },
      },
    ],
    clinicalIndicationTemplate: {
      type: String,
      trim: true,
    },
    techniqueTemplate: {
      type: String,
      trim: true,
    },
    comparisonTemplate: {
      type: String,
      trim: true,
    },
    findingsTemplate: {
      type: String,
      trim: true,
    },
    impressionTemplate: {
      type: String,
      trim: true,
    },
    recommendationTemplate: {
      type: String,
      trim: true,
    },
    criticalFindingsChecklist: [
      {
        type: String,
        trim: true,
      },
    ],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
radiologyTemplateSchema.index({ examName: 1 });
radiologyTemplateSchema.index({ serviceType: 1 });
radiologyTemplateSchema.index({ category: 1 });
radiologyTemplateSchema.index({ bodyPart: 1 });
radiologyTemplateSchema.index({ active: 1 });
radiologyTemplateSchema.index({ basePrice: 1 });
radiologyTemplateSchema.index({ createdAt: -1 });

export const RadiologyTemplate =
  models.RadiologyTemplate ||
  model<IRadiologyTemplate>("RadiologyTemplate", radiologyTemplateSchema);
