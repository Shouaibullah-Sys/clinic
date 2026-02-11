// lib/schemas/imaging.ts
import { z } from "zod";

export const ImagingRecordSchema = z.object({
  id: z.string().optional(),
  imagingType: z.enum(["xray", "ct_scan", "mri", "ultrasound"]),
  patientId: z.string().min(1, "Patient is required"),
  bodyPart: z.string().min(1, "Body part is required"),
  clinicalIndication: z.string().min(1, "Clinical indication is required"),
  views: z.array(z.string()).optional(),
  contrast: z.boolean().optional(),
  contrastType: z.string().optional(),
  priority: z.enum(["routine", "urgent", "emergency"]).optional(),
  notes: z.string().optional(),
});

export type ImagingRecord = z.infer<typeof ImagingRecordSchema>;
