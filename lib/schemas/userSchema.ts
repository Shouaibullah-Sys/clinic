// lib/schemas/userSchema.ts
import { z } from "zod";

// Available roles
export const UserRoleEnum = [
  "admin",
  "doctor",
  "nurse",
  "staff",
  "receptionist",
  "pharmacist",
  "lab_technician",
  "radiologist",
] as const;

// Base user schema for validation
export const BaseUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits").max(15),
  role: z.enum(UserRoleEnum),
  department: z.string().min(1, "Department is required"),
  designation: z.string().min(1, "Designation is required"),
  specialization: z.string().optional(),
  licenseNumber: z.string().optional(),
  approved: z.boolean().default(false),
  active: z.boolean().default(true),
  address: z.string().optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  joiningDate: z.string().or(z.date()).optional(),
  avatar: z.string().optional(),
});

// Schema for creating a new user
export const CreateUserSchema = BaseUserSchema.extend({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    ),
});

// Schema for updating a user (password optional)
export const UpdateUserSchema = BaseUserSchema.extend({
  password: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.length >= 8,
      "Password must be at least 8 characters"
    )
    .refine(
      (val) =>
        !val ||
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(
          val
        ),
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    ),
});

// Department options
export const DepartmentOptions = [
  "Administration",
  "Emergency",
  "ICU",
  "General Ward",
  "Pediatrics",
  "Orthopedics",
  "Cardiology",
  "Neurology",
  "Radiology",
  "Laboratory",
  "Pharmacy",
  "OPD",
  "Dental",
  "ENT",
  "Gynecology",
  "Dermatology",
  "Physiotherapy",
  "Ambulance",
] as const;

// Designation options
export const DesignationOptions = [
  "Administrator",
  "Senior Doctor",
  "Junior Doctor",
  "Consultant",
  "Specialist",
  "Senior Nurse",
  "Staff Nurse",
  "Pharmacist",
  "Lab Technician",
  "Radiologist",
  "Receptionist",
  "Clerk",
  "Accountant",
  "IT Support",
  "Cleaner",
  "Driver",
] as const;