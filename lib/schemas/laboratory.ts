// lib/schemas/laboratory.ts
import { z } from "zod";

export const LaboratoryTestSchema = z.object({
  id: z.string().optional(),
  patientId: z.string().min(1, "Patient is required"),
  testType: z.enum(["hematology", "biochemistry", "microbiology", "pathology", "serology", "urinalysis"]),
  tests: z.array(z.object({
    testName: z.string().min(1, "Test name is required"),
    specimenType: z.string().min(1, "Specimen type is required"),
    instructions: z.string().optional(),
  })),
  clinicalIndication: z.string().min(1, "Clinical indication is required"),
  priority: z.enum(["routine", "urgent", "emergency"]).default("routine"),
  notes: z.string().optional(),
});

export type LaboratoryTest = z.infer<typeof LaboratoryTestSchema>;  