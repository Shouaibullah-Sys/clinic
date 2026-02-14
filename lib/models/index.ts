// lib/models/index.ts
// Import all models to ensure they are registered with Mongoose

export * from "./Admission";
export * from "./APILog";
export * from "./Appointment";
export * from "./Billing";
export * from "./CashAtHand";
export * from "./CashAudit";
export * from "./CashFloat";
export * from "./CashReconciliation";
export * from "./DailyExpense";
export * from "./DailyRecord";
export * from "./MarkedTransaction";
export * from "./DiscountRequest";
export * from "./Expense";
export * from "./Invoice";
export * from "./LabTest";
export * from "./LabTestTemplate";
export * from "./MedicalRecord";
export * from "./Medicine";
export * from "./MedicineIssue";
export * from "./MedicineStock";
export * from "./Patient";
export * from "./Payment";
export * from "./Prescription";
export * from "./RadiologyTemplate";
export * from "./RadiologyService";
export * from "./ServiceDepartment";
export * from "./Session";
export * from "./TestResult";
export * from "./User";

// Import specific models from files with multiple exports to avoid conflicts
export {
  DentalService,
  ImagingService,
  EmergencyService,
  OpdService,
  LaboratoryService,
  OTService,
} from "./DentalService";
