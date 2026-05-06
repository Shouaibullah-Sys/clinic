// scripts/import-exported-data-to-prisma.ts
// Import exported MongoDB JSON data into Prisma (SQLite/PostgreSQL) database
// Run: pnpm run script:import-to-prisma

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup Prisma client with LibSQL adapter
const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL || "file:./prisma/dev.db",
});
const prisma = new PrismaClient({ adapter });

const EXPORTS_DIR = path.join(__dirname, "../exports");

// Helper to normalize category strings
function normalizeCategory(cat?: string): string {
  if (!cat) return "other";
  const normalized = cat.trim().toLowerCase().replace(/\s+/g, "_");
  const valid = new Set([
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
  ]);
  if (valid.has(normalized)) return normalized;
  if (normalized === "stool") return "stool_test";
  if (normalized === "urine") return "urinalysis";
  return "other";
}

  // Transform MongoDB LabTestTemplate document to Prisma create input
  function transformLabTestTemplate(doc: any): any {
    // Extract parameters, removing MongoDB _id fields
    const parameters = (doc.parameters || []).map((p: any) => {
      const { _id, ...rest } = p;
      return {
        parameterCode: p.parameterCode || "",
        parameterName: p.parameterName || "",
        unit: p.unit || "",
        normalRange: p.normalRange || "",
        genderRange: p.maleRange || p.femaleRange || p.childRange || null,
        criticalLow: p.criticalLow ?? null,
        criticalHigh: p.criticalHigh ?? null,
        methodology: p.methodology || null,
        group: p.group || null,
      };
    });

    // Always store specimenType as JSON string array (preserve all values)
    const specimenType = JSON.stringify(Array.isArray(doc.specimenType) ? doc.specimenType : [doc.specimenType || "other"]);

    // Container type and sample volume as JSON
    const containerType = JSON.stringify(Array.isArray(doc.containerType) ? doc.containerType : (doc.containerType ? [doc.containerType] : []));

    return {
      testType: String(doc.testCode || "").toUpperCase(),
      testName: doc.testName || "",
      category: normalizeCategory(doc.category),
      tests: doc.testName || "", // fallback for tests field
      description: doc.description || null,
      instruction: doc.preparationInstructions || doc.description || null,
      basePrice: doc.basePrice ? Number(doc.basePrice) : 0,
      specimenType,
      containerType,
      sampleVolume: doc.sampleVolume || null,
      fastingRequired: doc.fastingRequired !== undefined ? Boolean(doc.fastingRequired) : false,
      turnaroundTime: doc.turnaroundTime ? Math.max(1, Number(doc.turnaroundTime)) : 24,
      active: doc.active !== false,
      parameters: JSON.stringify(parameters),
    };
  }

// Transform MongoDB LabTest document to Prisma input
function transformLabTest(doc: any): any {
  const charges = doc.charges || {};
  return {
    testId: doc.testId || `LAB${Date.now().toString().slice(-6)}`,
    patientId: doc.patient?.toString() || doc.patient,
    doctorId: doc.doctor?.toString() || doc.doctor,
    appointmentId: doc.appointment?.toString() || doc.appointment,
    testName: doc.testName || "",
    category: doc.category || "other",
    tests: JSON.stringify(doc.tests || []),
    testsConducted: JSON.stringify(doc.testsConducted || []),
    results: JSON.stringify(doc.results || {}),
    normalRange: JSON.stringify(doc.normalRange || []),
    unit: JSON.stringify(doc.unit || []),
    method: doc.method || null,
    sampleCollected: doc.sampleCollected || false,
    sampleDate: doc.sampleDate ? new Date(doc.sampleDate) : null,
    reportedDate: doc.reportedDate ? new Date(doc.reportedDate) : null,
    status: doc.status || "pending",
    priority: doc.priority || "routine",
    urgent: doc.urgent || false,
    totalAmount: Number(charges.totalAmount || charges.basePrice || 0),
    discount: Number(charges.discount || 0),
    paid: Number(charges.paid || 0),
    due: Math.max(0, Number((charges.totalAmount || charges.basePrice || 0) - (charges.paid || 0))),
    charges: JSON.stringify(charges),
    discountedPrice: doc.discountedPrice ? Number(doc.discountedPrice) : null,
    price: Number(doc.price || charges.basePrice || 0),
    specimenType: doc.specimenType?.toString() || null,
    collectionStatus: doc.collectionStatus || "pending",
    processingStatus: doc.processingStatus || "pending",
    verificationStatus: doc.verificationStatus || "pending",
    finalized: doc.finalized || false,
    readyForPrint: doc.readyForPrint || false,
    createdAtDirect: doc.createdAtDirect ? new Date(doc.createdAtDirect) : null,
    directBatchId: doc.directBatchId || null,
    doctorName: doc.doctorName || null,
    // createdById, printedById, orderedById need to be set to valid user IDs
  };
}

// Transform MongoDB TestResult document to Prisma input
function transformTestResult(doc: any): any {
  return {
    testId: doc.testId || `RES${Date.now().toString().slice(-6)}`,
    patientId: doc.patientId?.toString() || doc.patientId,
    labTestId: doc.labTestId?.toString() || doc.labTestId,
    templateId: doc.templateId?.toString() || doc.templateId,
    results: JSON.stringify(doc.results || {}),
    normalRange: doc.normalRange || null,
    unit: doc.unit || null,
    comment: doc.comment || null,
    isAbnormal: doc.isAbnormal || false,
  };
}

async function importData() {
  console.log("Starting import to Prisma database...\n");
  console.log("Using DATABASE_URL:", process.env.DATABASE_URL || "file:./prisma/dev.db");

  try {
    await prisma.$connect();
    console.log("✓ Connected to database\n");

    // ---------- Import LabTestTemplates ----------
    const templatesFile = path.join(EXPORTS_DIR, "lab-test-templates.json");
    if (fs.existsSync(templatesFile)) {
      console.log("Importing LabTestTemplates...");
      const rawTemplates = JSON.parse(fs.readFileSync(templatesFile, "utf-8"));
      let upserted = 0;
      let skipped = 0;
      let failed = 0;

      for (const raw of rawTemplates) {
        try {
          const data = transformLabTestTemplate(raw);
          // Use any to bypass potential type issues with upsert
          await (prisma as any).labTestTemplate.upsert({
            where: { testType: data.testType },
            update: data,
            create: data,
          });
          upserted++;
        } catch (err: any) {
          if (err.code === 'P2002' || err.message?.includes('Unique constraint')) {
            skipped++;
          } else {
            console.error(`  ❌ Failed ${raw.testCode}: ${err.message}`);
            failed++;
          }
        }
      }
      console.log(`  ✓ Templates: ${upserted} upserted, ${skipped} skipped, ${failed} failed`);
    } else {
      console.log("  ⚠ LabTestTemplates file not found");
    }

    // ---------- Import LabTests ----------
    const labTestsFile = path.join(EXPORTS_DIR, "lab-tests.json");
    if (fs.existsSync(labTestsFile)) {
      const content = fs.readFileSync(labTestsFile, "utf-8").trim();
      if (content && content !== "[]") {
        console.log("\nImporting LabTests...");
        const rawLabTests = JSON.parse(content);
        let imported = 0;
        let failed = 0;

        // Find a default admin user for required createdById if needed
        const adminUser = await prisma.user.findFirst({
          where: { role: "admin" },
          select: { id: true },
        });

        for (const raw of rawLabTests) {
          try {
            const data = transformLabTest(raw);
            // We'll try to use existing patient/doctor IDs directly if they exist in DB,
            // otherwise we might need to skip or assign a default.
            // For now, attempt direct insert; if FK fails, skip.
            await prisma.labTest.create({
              data: {
                ...data,
                createdById: adminUser?.id || undefined,
                createdAt: raw.createdAt ? new Date(raw.createdAt) : undefined,
                updatedAt: raw.updatedAt ? new Date(raw.updatedAt) : undefined,
              },
            });
            imported++;
          } catch (err: any) {
            // If foreign key violation, we skip
            if (err.code === 'P2003' || err.message?.includes('ForeignKeyViolation')) {
              console.warn(`  ⚠ Skipping lab test ${raw._id}: foreign key violation (missing patient/doctor?)`);
            } else {
              console.error(`  ❌ Failed lab test ${raw._id}: ${err.message}`);
            }
            failed++;
          }
        }
        console.log(`  ✓ LabTests: ${imported} imported, ${failed} failed`);
      } else {
        console.log("  ℹ LabTests file is empty, skipping.");
      }
    } else {
      console.log("  ⚠ LabTests file not found");
    }

    // ---------- Import TestResults ----------
    const testResultsFile = path.join(EXPORTS_DIR, "test-results.json");
    if (fs.existsSync(testResultsFile)) {
      const content = fs.readFileSync(testResultsFile, "utf-8").trim();
      if (content && content !== "[]") {
        console.log("\nImporting TestResults...");
        const rawResults = JSON.parse(content);
        let imported = 0;
        let failed = 0;

        for (const raw of rawResults) {
          try {
            const data = transformTestResult(raw);
            await prisma.testResult.create({
              data: {
                ...data,
                createdAt: raw.createdAt ? new Date(raw.createdAt) : undefined,
                updatedAt: raw.updatedAt ? new Date(raw.updatedAt) : undefined,
              },
            });
            imported++;
          } catch (err: any) {
            if (err.code === 'P2003' || err.message?.includes('ForeignKeyViolation')) {
              console.warn(`  ⚠ Skipping test result ${raw._id}: foreign key violation`);
            } else {
              console.error(`  ❌ Failed test result ${raw._id}: ${err.message}`);
            }
            failed++;
          }
        }
        console.log(`  ✓ TestResults: ${imported} imported, ${failed} failed`);
      } else {
        console.log("  ℹ TestResults file is empty, skipping.");
      }
    } else {
      console.log("  ⚠ TestResults file not found");
    }

    // ---------- LaboratoryService (not in default Prisma schema) ----------
    const labServicesFile = path.join(EXPORTS_DIR, "laboratory-services.json");
    if (fs.existsSync(labServicesFile)) {
      console.log("\n⚠ Cannot import LaboratoryService: model not defined in Prisma schema.");
      console.log("  To enable, add the LaboratoryService model to prisma/schema.prisma and run prisma generate.");
    }

    // Summary
    console.log("\n" + "=".repeat(50));
    console.log("Import completed!");
    console.log("=".repeat(50));

  } catch (error) {
    console.error("Import failed with error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

importData();
