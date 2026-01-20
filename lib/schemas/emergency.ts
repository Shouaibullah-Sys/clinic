// lib/schemas/emergency.ts
import { z } from "zod";

export const EmergencyCaseSchema = z.object({
  id: z.string().optional(),
  patientId: z.string().min(1, "Patient is required"),
  triageLevel: z.enum(["resuscitation", "emergent", "urgent", "less_urgent", "non_urgent"]),
  chiefComplaint: z.string().min(1, "Chief complaint is required"),
  vitalSigns: z.object({
    bloodPressure: z.string(),
    heartRate: z.number().min(20).max(300),
    respiratoryRate: z.number().min(5).max(100),
    temperature: z.number().min(30).max(45),
    oxygenSaturation: z.number().min(0).max(100),
    painScale: z.number().min(0).max(10),
  }),
  allergies: z.array(z.string()).default([]),
  medications: z.array(z.string()).default([]),
  disposition: z.object({
    type: z.enum(["admission", "discharge", "transfer", "observation"]),
    unit: z.string().optional(),
    bed: z.string().optional(),
  }).optional(),
});

export type EmergencyCase = z.infer<typeof EmergencyCaseSchema>;