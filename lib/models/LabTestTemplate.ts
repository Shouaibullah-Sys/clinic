// lib/models/LabTestTemplate.ts

import mongoose, { Schema, model, models } from "mongoose";

export interface ILabTestTemplate extends mongoose.Document {
  testCode: string;
  testName: string;
  category: string;
  description?: string;
  specimenType: string[];
  containerType?: string[];
  sampleVolume?: string;
  fastingRequired: boolean;
  preparationInstructions?: string;
  turnaroundTime: number; // in hours
  basePrice: number;
  active: boolean;
  parameters: Array<{
    parameterCode: string;
    parameterName: string;
    unit?: string;
    normalRange: string;
    group?: string;
    criticalLow?: number;
    criticalHigh?: number;
    methodology?: string;
  }>;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const labTestTemplateSchema = new Schema<ILabTestTemplate>(
  {
    testCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    testName: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        "hematology",
        "biochemistry",
        "microbiology",
        "serology",
        "immunology",
        "hormonal",
        "urinalysis",
        "stool_test",
        "molecular",
        "imaging",
        "other",
      ],
    },
    description: {
      type: String,
      trim: true,
    },
    specimenType: [
      {
        type: String,
        enum: [
          "blood",
          "urine",
          "stool",
          "csf",
          "sputum",
          "tissue",
          "swab",
          "other",
        ],
      },
    ],
    containerType: [
      {
        type: String,
      },
    ],
    sampleVolume: {
      type: String,
    },
    fastingRequired: {
      type: Boolean,
      default: false,
    },
    preparationInstructions: {
      type: String,
      trim: true,
    },
    turnaroundTime: {
      type: Number,
      required: true,
      min: 1,
      max: 720, // 30 days in hours
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
        unit: {
          type: String,
        },
        normalRange: {
          type: String,
          required: true,
        },
        group: {
          type: String,
          trim: true,
        },
        criticalLow: {
          type: Number,
        },
        criticalHigh: {
          type: Number,
        },
        methodology: {
          type: String,
        },
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
labTestTemplateSchema.index({ testName: 1 });
labTestTemplateSchema.index({ category: 1 });
labTestTemplateSchema.index({ active: 1 });
labTestTemplateSchema.index({ basePrice: 1 });
labTestTemplateSchema.index({ createdAt: -1 });

export const LabTestTemplate =
  models.LabTestTemplate ||
  model<ILabTestTemplate>("LabTestTemplate", labTestTemplateSchema);
