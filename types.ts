// types.ts
export enum UserRole {
  ADMIN = "admin",
  USER = "user",
  // etc.
}

export type User = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

export interface RadiologyTemplate {
  _id: string;
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
  duration: number;
  basePrice: number;
  active: boolean;
  parameters: Array<{
    parameterCode: string;
    parameterName: string;
    description?: string;
    normalFindings?: string;
    unit?: string;
  }>;
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}
