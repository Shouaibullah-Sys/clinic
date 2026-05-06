-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "avatar" TEXT,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "employeeId" TEXT,
    "department" TEXT,
    "designation" TEXT,
    "specialization" TEXT,
    "licenseNumber" TEXT,
    "qualifications" TEXT,
    "experience" INTEGER,
    "consultationFee" REAL,
    "availability" TEXT,
    "biography" TEXT,
    "joiningDate" DATETIME,
    "address" TEXT,
    "gender" TEXT,
    "permissions" TEXT NOT NULL,
    "refreshTokens" TEXT NOT NULL,
    "markedOnlyAccess" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "guardian" TEXT,
    "refPerson" TEXT,
    "passTskNo" TEXT,
    "registrationNo" TEXT,
    "dateOfBirth" DATETIME NOT NULL,
    "gender" TEXT NOT NULL,
    "address" TEXT,
    "emergencyContact" TEXT,
    "bloodGroup" TEXT,
    "allergies" TEXT NOT NULL,
    "medicalHistory" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Appointment" (
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
    "labTests" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Appointment_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Appointment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Appointment_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Billing" (
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
    "payments" TEXT NOT NULL,
    "charges" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Prescription" (
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
    "charges" TEXT NOT NULL,
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

-- CreateTable
CREATE TABLE "Medicine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "medicineId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "category" TEXT,
    "group" TEXT,
    "unit" TEXT,
    "packing" TEXT,
    "costPrice" REAL,
    "sellPrice" REAL,
    "rack" TEXT,
    "openingQty" INTEGER NOT NULL DEFAULT 0,
    "reorderLevel" INTEGER NOT NULL DEFAULT 0,
    "expiryDate" DATETIME,
    "totalQty" INTEGER NOT NULL DEFAULT 0,
    "currentQty" INTEGER NOT NULL DEFAULT 0,
    "damageQty" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MedicineStock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "medicineId" TEXT NOT NULL,
    "batchNo" TEXT NOT NULL,
    "warehouseBatchId" TEXT,
    "expiryDate" DATETIME,
    "inwardQty" INTEGER NOT NULL,
    "outwardQty" INTEGER NOT NULL DEFAULT 0,
    "returnQty" INTEGER NOT NULL DEFAULT 0,
    "damageQty" INTEGER NOT NULL DEFAULT 0,
    "costPrice" REAL,
    "sellPrice" REAL,
    "MRP" REAL,
    "totalQty" INTEGER NOT NULL DEFAULT 0,
    "currentQty" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT,
    "form" TEXT,
    "dosage" TEXT,
    "frequency" TEXT,
    "route" TEXT,
    "supplier" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MedicineStock_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LabTest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "testId" TEXT NOT NULL,
    "testName" TEXT,
    "description" TEXT,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "category" TEXT,
    "tests" TEXT NOT NULL,
    "testsConducted" TEXT NOT NULL,
    "results" TEXT NOT NULL,
    "normalRange" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
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
    "charges" TEXT NOT NULL,
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
    "testParameters" TEXT NOT NULL,
    "orderedById" TEXT,
    "orderedAt" DATETIME,
    "paymentVerified" BOOLEAN NOT NULL DEFAULT false,
    "paymentVerifiedById" TEXT,
    "paymentVerifiedAt" DATETIME,
    "notes" TEXT,
    "patientSnapshot" TEXT NOT NULL,
    CONSTRAINT "LabTest_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LabTest_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LabTest_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LabTest_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LabTest_printedById_fkey" FOREIGN KEY ("printedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LabTest_orderedById_fkey" FOREIGN KEY ("orderedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LabTestTemplate" (
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
    "parameters" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RadiologyService" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "subCategory" TEXT,
    "cost" REAL,
    "price" REAL NOT NULL,
    "discount" REAL NOT NULL DEFAULT 0,
    "tax" REAL NOT NULL DEFAULT 0,
    "reportDays" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RadiologyTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "template" TEXT NOT NULL,
    "category" TEXT,
    "bodyPart" TEXT,
    "views" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT NOT NULL,
    "instruction" TEXT,
    "contrastRequired" BOOLEAN NOT NULL DEFAULT false,
    "contrastType" TEXT,
    "preparationInstructions" TEXT,
    "duration" INTEGER NOT NULL,
    "basePrice" REAL NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "parameters" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RadiologyExam" (
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
    "images" TEXT NOT NULL,
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
    "charges" TEXT NOT NULL,
    CONSTRAINT "RadiologyExam_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RadiologyExam_printedById_fkey" FOREIGN KEY ("printedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RadiologyExam_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MedicalRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recordId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "recordType" TEXT NOT NULL,
    "appointmentId" TEXT,
    "date" DATETIME NOT NULL,
    "chiefComplaint" TEXT,
    "history" TEXT,
    "examination" TEXT,
    "diagnosis" TEXT,
    "treatment" TEXT,
    "advice" TEXT,
    "nextVisit" DATETIME,
    "vitals" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MedicalRecord_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MedicalRecord_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MedicalRecord_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TestResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "testId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "labTestId" TEXT,
    "templateId" TEXT,
    "results" TEXT NOT NULL,
    "normalRange" TEXT,
    "unit" TEXT,
    "comment" TEXT,
    "isAbnormal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PharmacySale" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "saleId" TEXT NOT NULL,
    "patientId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "saleDate" DATETIME NOT NULL,
    "items" TEXT NOT NULL,
    "subtotal" REAL NOT NULL,
    "discount" REAL NOT NULL DEFAULT 0,
    "totalAmount" REAL NOT NULL,
    "amountPaid" REAL NOT NULL DEFAULT 0,
    "balance" REAL NOT NULL DEFAULT 0,
    "paymentMethod" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'completed',
    "soldById" TEXT NOT NULL,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PharmacySale_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PharmacySale_soldById_fkey" FOREIGN KEY ("soldById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Admission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "admissionId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "admissionType" TEXT NOT NULL,
    "ward" TEXT,
    "roomNo" TEXT,
    "bedNo" TEXT,
    "admissionDate" DATETIME NOT NULL,
    "dischargeDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'admitted',
    "reason" TEXT,
    "diagnosis" TEXT,
    "treatment" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Admission_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Admission_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "visitDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "vitals" TEXT,
    "chiefComplaint" TEXT,
    "history" TEXT,
    "examination" TEXT,
    "diagnosis" TEXT,
    "treatment" TEXT,
    "advice" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paymentId" TEXT NOT NULL,
    "patientId" TEXT,
    "invoiceId" TEXT,
    "appointmentId" TEXT,
    "paymentMethod" TEXT NOT NULL,
    "cardType" TEXT,
    "cardLastFour" TEXT,
    "transactionId" TEXT,
    "amount" REAL NOT NULL,
    "taxAmount" REAL NOT NULL DEFAULT 0,
    "discountAmount" REAL NOT NULL DEFAULT 0,
    "netAmount" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paymentDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedById" TEXT NOT NULL,
    "department" TEXT,
    "serviceType" TEXT,
    "notes" TEXT,
    "refundedAmount" REAL NOT NULL DEFAULT 0,
    "refundedDate" DATETIME,
    "refundedBy" TEXT,
    "refundReason" TEXT,
    "insuranceClaimId" TEXT,
    "insuranceStatus" TEXT,
    "pharmacySaleId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Payment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Payment_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Payment_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Payment_pharmacySaleId_fkey" FOREIGN KEY ("pharmacySaleId") REFERENCES "PharmacySale" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "invoiceDate" DATETIME NOT NULL,
    "dueDate" DATETIME,
    "subtotal" REAL NOT NULL,
    "tax" REAL NOT NULL DEFAULT 0,
    "discount" REAL NOT NULL DEFAULT 0,
    "total" REAL NOT NULL,
    "paid" REAL NOT NULL DEFAULT 0,
    "due" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "items" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DischargeCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cardId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "dischargeDate" DATETIME NOT NULL,
    "summary" TEXT,
    "advice" TEXT,
    "followUp" DATETIME,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DailyRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "totalAppointments" INTEGER NOT NULL DEFAULT 0,
    "newPatients" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "expenseId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "category" TEXT,
    "date" DATETIME NOT NULL,
    "paymentMethod" TEXT,
    "receiptNumber" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AdminExpense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "expenseId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "category" TEXT,
    "date" DATETIME NOT NULL,
    "paymentMethod" TEXT,
    "receiptNumber" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ReceptionExpense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "expenseId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "category" TEXT,
    "date" DATETIME NOT NULL,
    "paymentMethod" TEXT,
    "receiptNumber" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DiscountRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "patientId" TEXT,
    "amount" REAL NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "approvedAt" DATETIME,
    "approvedAmount" REAL,
    "approvedById" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DailyCashCollection" (
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
    "transactionIds" TEXT NOT NULL,
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

-- CreateTable
CREATE TABLE "CashAtHand" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "transactionId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "particular" TEXT NOT NULL,
    "debit" REAL NOT NULL DEFAULT 0,
    "credit" REAL NOT NULL DEFAULT 0,
    "balance" REAL NOT NULL,
    "paymentMethod" TEXT,
    "referenceId" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'pending',
    "collectionId" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Warehouse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "warehouseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "genericName" TEXT,
    "category" TEXT,
    "manufacturer" TEXT,
    "description" TEXT,
    "location" TEXT,
    "manager" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WarehouseBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "lotNumber" TEXT,
    "form" TEXT,
    "dosage" TEXT,
    "frequency" TEXT,
    "route" TEXT,
    "expiryDate" DATETIME,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "originalQuantity" INTEGER NOT NULL DEFAULT 0,
    "unitCost" REAL,
    "supplier" TEXT,
    "location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'available',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WarehouseBatch_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WarehouseTransfer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "transferId" TEXT NOT NULL,
    "items" TEXT NOT NULL,
    "transferredById" TEXT NOT NULL,
    "receivedById" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WarehouseTransfer_transferredById_fkey" FOREIGN KEY ("transferredById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WarehouseTransfer_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "APILog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "responseTime" INTEGER,
    "userId" TEXT,
    "body" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ServiceDepartment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RadiologyRequest" (
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
    "images" TEXT NOT NULL,
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
    "charges" TEXT NOT NULL,
    "paymentVerified" BOOLEAN NOT NULL DEFAULT false,
    "paymentVerifiedBy" TEXT,
    "paymentVerifiedAt" DATETIME,
    "notes" TEXT,
    "report" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RadiologyRequest_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RadiologyRequest_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "ServiceDepartment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RadiologyRequest_referringDoctorId_fkey" FOREIGN KEY ("referringDoctorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RadiologyRequest_radiologistId_fkey" FOREIGN KEY ("radiologistId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RadiologyRequest_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RadiologyRequest_reportGeneratedById_fkey" FOREIGN KEY ("reportGeneratedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MarkedTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "module" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "transactionDate" DATETIME NOT NULL,
    "markedById" TEXT NOT NULL,
    "markedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    CONSTRAINT "MarkedTransaction_markedById_fkey" FOREIGN KEY ("markedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_patientId_key" ON "Patient"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_appointmentId_key" ON "Appointment"("appointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_autoNumber_key" ON "Appointment"("autoNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Billing_billId_key" ON "Billing"("billId");

-- CreateIndex
CREATE UNIQUE INDEX "Prescription_prescriptionId_key" ON "Prescription"("prescriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "Medicine_medicineId_key" ON "Medicine"("medicineId");

-- CreateIndex
CREATE UNIQUE INDEX "LabTest_testId_key" ON "LabTest"("testId");

-- CreateIndex
CREATE UNIQUE INDEX "LabTestTemplate_testType_key" ON "LabTestTemplate"("testType");

-- CreateIndex
CREATE UNIQUE INDEX "RadiologyService_serviceId_key" ON "RadiologyService"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "RadiologyTemplate_template_key" ON "RadiologyTemplate"("template");

-- CreateIndex
CREATE UNIQUE INDEX "RadiologyExam_examId_key" ON "RadiologyExam"("examId");

-- CreateIndex
CREATE UNIQUE INDEX "MedicalRecord_recordId_key" ON "MedicalRecord"("recordId");

-- CreateIndex
CREATE UNIQUE INDEX "TestResult_testId_key" ON "TestResult"("testId");

-- CreateIndex
CREATE UNIQUE INDEX "PharmacySale_saleId_key" ON "PharmacySale"("saleId");

-- CreateIndex
CREATE UNIQUE INDEX "Admission_admissionId_key" ON "Admission"("admissionId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionId_key" ON "Session"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_paymentId_key" ON "Payment"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceId_key" ON "Invoice"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "DischargeCard_cardId_key" ON "DischargeCard"("cardId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyRecord_date_key" ON "DailyRecord"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Expense_expenseId_key" ON "Expense"("expenseId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminExpense_expenseId_key" ON "AdminExpense"("expenseId");

-- CreateIndex
CREATE UNIQUE INDEX "ReceptionExpense_expenseId_key" ON "ReceptionExpense"("expenseId");

-- CreateIndex
CREATE UNIQUE INDEX "DiscountRequest_requestId_key" ON "DiscountRequest"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyCashCollection_collectionId_key" ON "DailyCashCollection"("collectionId");

-- CreateIndex
CREATE UNIQUE INDEX "CashAtHand_transactionId_key" ON "CashAtHand"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_warehouseId_key" ON "Warehouse"("warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "WarehouseBatch_batchId_key" ON "WarehouseBatch"("batchId");

-- CreateIndex
CREATE UNIQUE INDEX "WarehouseTransfer_transferId_key" ON "WarehouseTransfer"("transferId");

-- CreateIndex
CREATE UNIQUE INDEX "AppSetting_key_key" ON "AppSetting"("key");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceDepartment_name_key" ON "ServiceDepartment"("name");

-- CreateIndex
CREATE UNIQUE INDEX "RadiologyRequest_serviceId_key" ON "RadiologyRequest"("serviceId");

-- CreateIndex
CREATE INDEX "MarkedTransaction_module_transactionId_idx" ON "MarkedTransaction"("module", "transactionId");

-- CreateIndex
CREATE INDEX "MarkedTransaction_module_transactionDate_idx" ON "MarkedTransaction"("module", "transactionDate");
