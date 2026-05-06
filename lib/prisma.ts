import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const createPrismaClient = () => {
  const url = process.env.DATABASE_URL || "file:./prisma/dev.db";
  const adapter = new PrismaLibSql({ url });
  return new PrismaClient({ adapter });
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Transformation helpers for LabTestTemplate data
// Converts between Prisma DB format and frontend API format

export function transformLabTestTemplateForAPI(template: any): any {
  if (!template) return template;
  
  const transformed = { ...template };
  
  // Alias: id -> _id
  if (transformed.id && !transformed._id) {
    transformed._id = transformed.id;
  }
  
  // Alias: testType -> testCode
  if (transformed.testType && !transformed.testCode) {
    transformed.testCode = transformed.testType;
  }
  
  // Keep description as is (direct mapping from DB description field)
  // If description is missing, default to empty string
  if (transformed.description === undefined || transformed.description === null) {
    transformed.description = '';
  }
  
  // Map instruction (Prisma) -> preparationInstructions (frontend)
  if (transformed.instruction !== undefined && !transformed.preparationInstructions) {
    transformed.preparationInstructions = transformed.instruction;
  }
  // Ensure preparationInstructions exists
  if (transformed.preparationInstructions === undefined) {
    transformed.preparationInstructions = '';
  }
  
  // Parse specimenType JSON string -> array
  if (typeof transformed.specimenType === 'string') {
    try {
      const parsed = JSON.parse(transformed.specimenType);
      transformed.specimenType = Array.isArray(parsed) ? parsed.filter(Boolean) : [parsed].filter(Boolean);
    } catch {
      transformed.specimenType = transformed.specimenType ? [transformed.specimenType] : [];
    }
  } else if (!Array.isArray(transformed.specimenType)) {
    transformed.specimenType = [];
  }
  
  // Parse parameters JSON string -> array
  if (typeof transformed.parameters === 'string') {
    try {
      transformed.parameters = JSON.parse(transformed.parameters);
    } catch {
      transformed.parameters = [];
    }
  } else if (!Array.isArray(transformed.parameters)) {
    transformed.parameters = [];
  }
  
  // Parse containerType JSON string -> array
  if (typeof transformed.containerType === 'string') {
    try {
      const parsed = JSON.parse(transformed.containerType);
      transformed.containerType = Array.isArray(parsed) ? parsed : [];
    } catch {
      transformed.containerType = [];
    }
  } else if (!Array.isArray(transformed.containerType)) {
    transformed.containerType = [];
  }
  
  // Default values for missing fields
  if (transformed.sampleVolume === undefined || transformed.sampleVolume === null) {
    transformed.sampleVolume = '';
  }
  if (transformed.fastingRequired === undefined || transformed.fastingRequired === null) {
    transformed.fastingRequired = false;
  }
  if (transformed.turnaroundTime === undefined || transformed.turnaroundTime === null) {
    transformed.turnaroundTime = 24;
  }
  
  // Ensure createdBy exists
  if (!transformed.createdBy && transformed.createdById) {
    transformed.createdBy = { name: 'System' };
  } else if (!transformed.createdBy) {
    transformed.createdBy = { name: 'System' };
  }
  
  return transformed;
}

export function transformLabTestTemplateForDB(data: any): any {
  const transformed = { ...data };
  
  // Convert testCode -> testType with normalization (uppercase, spaces to underscores)
  if (transformed.testCode !== undefined) {
    transformed.testType = transformed.testCode
      .toString()
      .toUpperCase()
      .replace(/\s+/g, "_");
    delete transformed.testCode;
  }
  
  // Convert preparationInstructions -> instruction (Prisma field)
  if (transformed.preparationInstructions !== undefined) {
    transformed.instruction = transformed.preparationInstructions;
    delete transformed.preparationInstructions;
  }
  // Fallback: if description provided but no prepInst, use description as instruction
  if (transformed.instruction === undefined && transformed.description !== undefined) {
    transformed.instruction = transformed.description;
  }
  
  // Keep description as is (will be stored in Prisma description field)
  
  // Convert specimenType array -> JSON string
  if (transformed.specimenType !== undefined) {
    if (Array.isArray(transformed.specimenType)) {
      transformed.specimenType = JSON.stringify(transformed.specimenType);
    } else if (typeof transformed.specimenType === 'string' && transformed.specimenType) {
      try {
        const parsed = JSON.parse(transformed.specimenType);
        transformed.specimenType = JSON.stringify(Array.isArray(parsed) ? parsed : [parsed]);
      } catch {
        transformed.specimenType = JSON.stringify([transformed.specimenType]);
      }
    } else {
      transformed.specimenType = '[]';
    }
  }
  
  // Convert parameters array -> JSON string
  if (transformed.parameters !== undefined) {
    if (Array.isArray(transformed.parameters)) {
      transformed.parameters = JSON.stringify(transformed.parameters);
    } else if (typeof transformed.parameters === 'string') {
      try {
        JSON.parse(transformed.parameters);
      } catch {
        transformed.parameters = '[]';
      }
    } else {
      transformed.parameters = '[]';
    }
  }
  
  // Convert containerType array -> JSON string
  if (transformed.containerType !== undefined) {
    if (Array.isArray(transformed.containerType)) {
      transformed.containerType = JSON.stringify(transformed.containerType);
    } else if (typeof transformed.containerType === 'string' && transformed.containerType) {
      transformed.containerType = JSON.stringify([transformed.containerType]);
    } else {
      transformed.containerType = '[]';
    }
  }
  
  // Ensure fastingRequired default
  if (transformed.fastingRequired === undefined) {
    transformed.fastingRequired = false;
  }
  
  // Remove any undefined properties to avoid Prisma errors
  Object.keys(transformed).forEach(key => {
    if (transformed[key] === undefined) {
      delete transformed[key];
    }
  });
  
  return transformed;
}

// Apply transformations to an array of templates
export function transformLabTestTemplatesForAPI(templates: any[]): any[] {
  return templates.map(t => transformLabTestTemplateForAPI(t));
}

export function transformLabTestTemplatesForDB(templates: any[]): any[] {
  return templates.map(t => transformLabTestTemplateForDB(t));
}

export default prisma;