-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Appointment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appointmentId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "department" TEXT,
    "appointmentType" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "duration" INTEGER NOT NULL,
    "autoNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "reason" TEXT NOT NULL,
    "symptoms" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "notes" TEXT,
    "consultationFee" REAL,
    "doctorFee" REAL,
    "checkInTime" DATETIME,
    "checkOutTime" DATETIME,
    "waitingTime" INTEGER,
    "consultationTime" INTEGER,
    "referralSource" TEXT,
    "previousAppointment" TEXT,
    "rescheduledFrom" TEXT,
    "cancelledBy" TEXT,
    "cancelledReason" TEXT,
    "cancelledAt" DATETIME,
    "labTests" TEXT NOT NULL DEFAULT '[]',
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Appointment_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Appointment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Appointment_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Appointment" ("appointmentId", "appointmentType", "autoNumber", "cancelledAt", "cancelledBy", "cancelledReason", "checkInTime", "checkOutTime", "consultationFee", "consultationTime", "createdAt", "createdById", "date", "department", "doctorFee", "doctorId", "duration", "endTime", "id", "labTests", "notes", "patientId", "previousAppointment", "priority", "reason", "referralSource", "rescheduledFrom", "startTime", "status", "symptoms", "updatedAt", "updatedById", "waitingTime") SELECT "appointmentId", "appointmentType", "autoNumber", "cancelledAt", "cancelledBy", "cancelledReason", "checkInTime", "checkOutTime", "consultationFee", "consultationTime", "createdAt", "createdById", "date", "department", "doctorFee", "doctorId", "duration", "endTime", "id", "labTests", "notes", "patientId", "previousAppointment", "priority", "reason", "referralSource", "rescheduledFrom", "startTime", "status", "symptoms", "updatedAt", "updatedById", "waitingTime" FROM "Appointment";
DROP TABLE "Appointment";
ALTER TABLE "new_Appointment" RENAME TO "Appointment";
CREATE UNIQUE INDEX "Appointment_appointmentId_key" ON "Appointment"("appointmentId");
CREATE UNIQUE INDEX "Appointment_autoNumber_key" ON "Appointment"("autoNumber");
CREATE TABLE "new_Billing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "billId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "services" TEXT NOT NULL,
    "totalAmount" REAL NOT NULL,
    "discount" REAL NOT NULL DEFAULT 0,
    "tax" REAL NOT NULL DEFAULT 0,
    "due" REAL NOT NULL DEFAULT 0,
    "paid" REAL NOT NULL DEFAULT 0,
    "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
    "paymentMethod" TEXT,
    "transactionId" TEXT,
    "payments" TEXT NOT NULL DEFAULT '[]',
    "charges" TEXT NOT NULL DEFAULT '[]',
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Billing" ("billId", "charges", "createdAt", "createdById", "department", "discount", "due", "id", "paid", "patientId", "paymentMethod", "paymentStatus", "payments", "services", "tax", "totalAmount", "transactionId", "updatedAt") SELECT "billId", "charges", "createdAt", "createdById", "department", "discount", "due", "id", "paid", "patientId", "paymentMethod", "paymentStatus", "payments", "services", "tax", "totalAmount", "transactionId", "updatedAt" FROM "Billing";
DROP TABLE "Billing";
ALTER TABLE "new_Billing" RENAME TO "Billing";
CREATE UNIQUE INDEX "Billing_billId_key" ON "Billing"("billId");
CREATE TABLE "new_DailyCashCollection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "collectionId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "staffName" TEXT NOT NULL,
    "shift" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "totalExpectedAmount" REAL NOT NULL,
    "totalDeclaredAmount" REAL NOT NULL,
    "discrepancy" REAL NOT NULL DEFAULT 0,
    "discrepancyPercentage" REAL NOT NULL DEFAULT 0,
    "cashFromAppointments" REAL NOT NULL DEFAULT 0,
    "cashFromLab" REAL NOT NULL DEFAULT 0,
    "cashFromRadiology" REAL NOT NULL DEFAULT 0,
    "cashFromDischarge" REAL NOT NULL DEFAULT 0,
    "totalDiscounts" REAL NOT NULL DEFAULT 0,
    "totalExpenses" REAL NOT NULL DEFAULT 0,
    "transactionIds" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedById" TEXT,
    "reviewedByName" TEXT,
    "reviewedAt" DATETIME,
    "approvalNotes" TEXT,
    "collectedAmount" REAL NOT NULL,
    "collectedAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DailyCashCollection_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DailyCashCollection_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_DailyCashCollection" ("approvalNotes", "cashFromAppointments", "cashFromDischarge", "cashFromLab", "cashFromRadiology", "collectedAmount", "collectedAt", "collectionId", "createdAt", "date", "discrepancy", "discrepancyPercentage", "id", "notes", "reviewedAt", "reviewedById", "reviewedByName", "shift", "staffId", "staffName", "status", "submittedAt", "totalDeclaredAmount", "totalDiscounts", "totalExpectedAmount", "totalExpenses", "transactionIds", "updatedAt") SELECT "approvalNotes", "cashFromAppointments", "cashFromDischarge", "cashFromLab", "cashFromRadiology", "collectedAmount", "collectedAt", "collectionId", "createdAt", "date", "discrepancy", "discrepancyPercentage", "id", "notes", "reviewedAt", "reviewedById", "reviewedByName", "shift", "staffId", "staffName", "status", "submittedAt", "totalDeclaredAmount", "totalDiscounts", "totalExpectedAmount", "totalExpenses", "transactionIds", "updatedAt" FROM "DailyCashCollection";
DROP TABLE "DailyCashCollection";
ALTER TABLE "new_DailyCashCollection" RENAME TO "DailyCashCollection";
CREATE UNIQUE INDEX "DailyCashCollection_collectionId_key" ON "DailyCashCollection"("collectionId");
CREATE TABLE "new_LabTest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "testId" TEXT NOT NULL,
    "testName" TEXT,
    "description" TEXT,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "category" TEXT,
    "tests" TEXT NOT NULL,
    "testsConducted" TEXT NOT NULL DEFAULT '[]',
    "results" TEXT NOT NULL DEFAULT '{}',
    "normalRange" TEXT NOT NULL DEFAULT '[]',
    "unit" TEXT NOT NULL DEFAULT '[]',
    "method" TEXT,
    "sampleCollected" BOOLEAN NOT NULL DEFAULT false,
    "sampleDate" DATETIME,
    "reportedDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" TEXT NOT NULL DEFAULT 'routine',
    "urgent" BOOLEAN NOT NULL DEFAULT false,
    "totalAmount" REAL NOT NULL,
    "discount" REAL NOT NULL DEFAULT 0,
    "paid" REAL NOT NULL DEFAULT 0,
    "due" REAL NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "charges" TEXT NOT NULL DEFAULT '{}',
    "discountedPrice" REAL,
    "price" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "isDirectTest" BOOLEAN NOT NULL DEFAULT false,
    "directBatchId" TEXT,
    "doctorName" TEXT,
    "specimenType" TEXT,
    "collectionStatus" TEXT NOT NULL DEFAULT 'pending',
    "processingStatus" TEXT NOT NULL DEFAULT 'pending',
    "verificationStatus" TEXT NOT NULL DEFAULT 'pending',
    "finalized" BOOLEAN NOT NULL DEFAULT false,
    "readyForPrint" BOOLEAN NOT NULL DEFAULT false,
    "createdAtDirect" DATETIME,
    "printedAt" DATETIME,
    "printedById" TEXT,
    "testParameters" TEXT NOT NULL DEFAULT '{}',
    "orderedById" TEXT,
    "orderedAt" DATETIME,
    "paymentVerified" BOOLEAN NOT NULL DEFAULT false,
    "paymentVerifiedById" TEXT,
    "paymentVerifiedAt" DATETIME,
    "notes" TEXT,
    "patientSnapshot" TEXT NOT NULL DEFAULT '{}',
    CONSTRAINT "LabTest_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LabTest_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LabTest_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LabTest_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LabTest_printedById_fkey" FOREIGN KEY ("printedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LabTest_orderedById_fkey" FOREIGN KEY ("orderedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_LabTest" ("appointmentId", "category", "charges", "collectionStatus", "createdAt", "createdAtDirect", "createdById", "description", "directBatchId", "discount", "discountedPrice", "doctorId", "doctorName", "due", "finalized", "id", "isDirectTest", "method", "normalRange", "notes", "orderedAt", "orderedById", "paid", "patientId", "patientSnapshot", "paymentVerified", "paymentVerifiedAt", "paymentVerifiedById", "price", "printedAt", "printedById", "priority", "processingStatus", "readyForPrint", "reportedDate", "results", "sampleCollected", "sampleDate", "specimenType", "status", "testId", "testName", "testParameters", "tests", "testsConducted", "totalAmount", "unit", "updatedAt", "urgent", "verificationStatus") SELECT "appointmentId", "category", "charges", "collectionStatus", "createdAt", "createdAtDirect", "createdById", "description", "directBatchId", "discount", "discountedPrice", "doctorId", "doctorName", "due", "finalized", "id", "isDirectTest", "method", "normalRange", "notes", "orderedAt", "orderedById", "paid", "patientId", "patientSnapshot", "paymentVerified", "paymentVerifiedAt", "paymentVerifiedById", "price", "printedAt", "printedById", "priority", "processingStatus", "readyForPrint", "reportedDate", "results", "sampleCollected", "sampleDate", "specimenType", "status", "testId", "testName", "testParameters", "tests", "testsConducted", "totalAmount", "unit", "updatedAt", "urgent", "verificationStatus" FROM "LabTest";
DROP TABLE "LabTest";
ALTER TABLE "new_LabTest" RENAME TO "LabTest";
CREATE UNIQUE INDEX "LabTest_testId_key" ON "LabTest"("testId");
CREATE TABLE "new_LabTestTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "testName" TEXT,
    "testType" TEXT NOT NULL,
    "category" TEXT,
    "tests" TEXT NOT NULL,
    "instruction" TEXT,
    "basePrice" REAL,
    "specimenType" TEXT,
    "turnaroundTime" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "parameters" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_LabTestTemplate" ("active", "basePrice", "category", "createdAt", "id", "instruction", "parameters", "specimenType", "testName", "testType", "tests", "turnaroundTime", "updatedAt") SELECT "active", "basePrice", "category", "createdAt", "id", "instruction", coalesce("parameters", '[]') AS "parameters", "specimenType", "testName", "testType", "tests", "turnaroundTime", "updatedAt" FROM "LabTestTemplate";
DROP TABLE "LabTestTemplate";
ALTER TABLE "new_LabTestTemplate" RENAME TO "LabTestTemplate";
CREATE UNIQUE INDEX "LabTestTemplate_testType_key" ON "LabTestTemplate"("testType");
CREATE TABLE "new_Prescription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prescriptionId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "diagnosis" TEXT,
    "notes" TEXT,
    "instructions" TEXT,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiryDate" DATETIME,
    "followUpDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'active',
    "medications" TEXT,
    "dispensingStatus" TEXT NOT NULL DEFAULT 'pending',
    "paymentStatus" TEXT NOT NULL DEFAULT 'unpaid',
    "paymentMethod" TEXT,
    "amountPaid" REAL NOT NULL DEFAULT 0,
    "charges" TEXT NOT NULL DEFAULT '{}',
    "paymentVerified" BOOLEAN NOT NULL DEFAULT false,
    "paymentVerifiedById" TEXT,
    "paymentVerifiedAt" DATETIME,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Prescription_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Prescription_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Prescription_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Prescription" ("amountPaid", "appointmentId", "charges", "createdAt", "createdById", "date", "diagnosis", "dispensingStatus", "doctorId", "expiryDate", "followUpDate", "id", "instructions", "medications", "notes", "patientId", "paymentMethod", "paymentStatus", "paymentVerified", "paymentVerifiedAt", "paymentVerifiedById", "prescriptionId", "status", "updatedAt") SELECT "amountPaid", "appointmentId", "charges", "createdAt", "createdById", "date", "diagnosis", "dispensingStatus", "doctorId", "expiryDate", "followUpDate", "id", "instructions", "medications", "notes", "patientId", "paymentMethod", "paymentStatus", "paymentVerified", "paymentVerifiedAt", "paymentVerifiedById", "prescriptionId", "status", "updatedAt" FROM "Prescription";
DROP TABLE "Prescription";
ALTER TABLE "new_Prescription" RENAME TO "Prescription";
CREATE UNIQUE INDEX "Prescription_prescriptionId_key" ON "Prescription"("prescriptionId");
CREATE TABLE "new_RadiologyExam" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "examId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "visitId" TEXT,
    "category" TEXT,
    "serviceId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "date" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reportDate" DATETIME,
    "findings" TEXT,
    "impression" TEXT,
    "recommendation" TEXT,
    "templateId" TEXT,
    "content" TEXT,
    "images" TEXT NOT NULL DEFAULT '[]',
    "priorHistory" TEXT,
    "clinicalNotes" TEXT,
    "totalAmount" REAL NOT NULL,
    "discount" REAL NOT NULL DEFAULT 0,
    "paid" REAL NOT NULL DEFAULT 0,
    "due" REAL NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "paymentVerified" BOOLEAN NOT NULL DEFAULT false,
    "paymentVerifiedById" TEXT,
    "paymentVerifiedAt" DATETIME,
    "finalized" BOOLEAN NOT NULL DEFAULT false,
    "readyForPrint" BOOLEAN NOT NULL DEFAULT false,
    "printedAt" DATETIME,
    "printedById" TEXT,
    "isDirectExam" BOOLEAN NOT NULL DEFAULT false,
    "results" TEXT,
    "reportedById" TEXT,
    "reportedAt" DATETIME,
    "completedAt" DATETIME,
    "charges" TEXT NOT NULL DEFAULT '{}',
    CONSTRAINT "RadiologyExam_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RadiologyExam_printedById_fkey" FOREIGN KEY ("printedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RadiologyExam_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_RadiologyExam" ("appointmentId", "category", "charges", "clinicalNotes", "completedAt", "content", "createdAt", "createdById", "date", "discount", "doctorId", "due", "examId", "finalized", "findings", "id", "images", "impression", "isDirectExam", "paid", "patientId", "paymentVerified", "paymentVerifiedAt", "paymentVerifiedById", "printedAt", "printedById", "priorHistory", "readyForPrint", "recommendation", "reportDate", "reportedAt", "reportedById", "results", "serviceId", "status", "templateId", "totalAmount", "updatedAt", "visitId") SELECT "appointmentId", "category", "charges", "clinicalNotes", "completedAt", "content", "createdAt", "createdById", "date", "discount", "doctorId", "due", "examId", "finalized", "findings", "id", "images", "impression", "isDirectExam", "paid", "patientId", "paymentVerified", "paymentVerifiedAt", "paymentVerifiedById", "printedAt", "printedById", "priorHistory", "readyForPrint", "recommendation", "reportDate", "reportedAt", "reportedById", "results", "serviceId", "status", "templateId", "totalAmount", "updatedAt", "visitId" FROM "RadiologyExam";
DROP TABLE "RadiologyExam";
ALTER TABLE "new_RadiologyExam" RENAME TO "RadiologyExam";
CREATE UNIQUE INDEX "RadiologyExam_examId_key" ON "RadiologyExam"("examId");
CREATE TABLE "new_RadiologyRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "departmentId" TEXT,
    "templateId" TEXT,
    "serviceType" TEXT NOT NULL,
    "bodyPart" TEXT NOT NULL,
    "view" TEXT NOT NULL,
    "contrastUsed" BOOLEAN NOT NULL DEFAULT false,
    "contrastType" TEXT,
    "referringDoctorId" TEXT NOT NULL,
    "radiologistId" TEXT,
    "technicianId" TEXT,
    "appointmentId" TEXT,
    "requestDate" DATETIME NOT NULL,
    "scheduledDate" DATETIME NOT NULL,
    "performedDate" DATETIME,
    "images" TEXT NOT NULL DEFAULT '[]',
    "findings" TEXT,
    "impression" TEXT,
    "recommendations" TEXT,
    "reportStatus" TEXT NOT NULL DEFAULT 'pending',
    "reportGeneratedById" TEXT,
    "reportGeneratedAt" DATETIME,
    "reviewedBy" TEXT,
    "reviewedAt" DATETIME,
    "approvedBy" TEXT,
    "approvedAt" DATETIME,
    "priority" TEXT NOT NULL DEFAULT 'routine',
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "billingStatus" TEXT NOT NULL DEFAULT 'pending',
    "charges" TEXT NOT NULL DEFAULT '{}',
    "paymentVerified" BOOLEAN NOT NULL DEFAULT false,
    "paymentVerifiedBy" TEXT,
    "paymentVerifiedAt" DATETIME,
    "notes" TEXT,
    "report" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RadiologyRequest_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RadiologyRequest_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "ServiceDepartment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RadiologyRequest_referringDoctorId_fkey" FOREIGN KEY ("referringDoctorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RadiologyRequest_radiologistId_fkey" FOREIGN KEY ("radiologistId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RadiologyRequest_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RadiologyRequest_reportGeneratedById_fkey" FOREIGN KEY ("reportGeneratedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_RadiologyRequest" ("appointmentId", "approvedAt", "approvedBy", "billingStatus", "bodyPart", "charges", "contrastType", "contrastUsed", "createdAt", "departmentId", "findings", "id", "images", "impression", "notes", "patientId", "paymentVerified", "paymentVerifiedAt", "paymentVerifiedBy", "performedDate", "priority", "radiologistId", "recommendations", "referringDoctorId", "report", "reportGeneratedAt", "reportGeneratedById", "reportStatus", "requestDate", "reviewedAt", "reviewedBy", "scheduledDate", "serviceId", "serviceType", "status", "technicianId", "templateId", "updatedAt", "view") SELECT "appointmentId", "approvedAt", "approvedBy", "billingStatus", "bodyPart", "charges", "contrastType", "contrastUsed", "createdAt", "departmentId", "findings", "id", "images", "impression", "notes", "patientId", "paymentVerified", "paymentVerifiedAt", "paymentVerifiedBy", "performedDate", "priority", "radiologistId", "recommendations", "referringDoctorId", "report", "reportGeneratedAt", "reportGeneratedById", "reportStatus", "requestDate", "reviewedAt", "reviewedBy", "scheduledDate", "serviceId", "serviceType", "status", "technicianId", "templateId", "updatedAt", "view" FROM "RadiologyRequest";
DROP TABLE "RadiologyRequest";
ALTER TABLE "new_RadiologyRequest" RENAME TO "RadiologyRequest";
CREATE UNIQUE INDEX "RadiologyRequest_serviceId_key" ON "RadiologyRequest"("serviceId");
CREATE TABLE "new_RadiologyTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "template" TEXT NOT NULL,
    "category" TEXT,
    "bodyPart" TEXT,
    "views" TEXT NOT NULL DEFAULT '[]',
    "description" TEXT,
    "content" TEXT NOT NULL,
    "instruction" TEXT,
    "contrastRequired" BOOLEAN NOT NULL DEFAULT false,
    "contrastType" TEXT,
    "preparationInstructions" TEXT,
    "duration" INTEGER NOT NULL,
    "basePrice" REAL NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "parameters" TEXT NOT NULL DEFAULT '[]',
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_RadiologyTemplate" ("active", "basePrice", "bodyPart", "category", "content", "contrastRequired", "contrastType", "createdAt", "createdById", "description", "duration", "id", "instruction", "parameters", "preparationInstructions", "template", "updatedAt", "views") SELECT "active", "basePrice", "bodyPart", "category", "content", "contrastRequired", "contrastType", "createdAt", "createdById", "description", "duration", "id", "instruction", "parameters", "preparationInstructions", "template", "updatedAt", "views" FROM "RadiologyTemplate";
DROP TABLE "RadiologyTemplate";
ALTER TABLE "new_RadiologyTemplate" RENAME TO "RadiologyTemplate";
CREATE UNIQUE INDEX "RadiologyTemplate_template_key" ON "RadiologyTemplate"("template");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
