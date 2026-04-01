// scripts/import-laboratory-data.ts
// Script to import laboratory data to a new MongoDB database

import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// Get the directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Target connection string for import destination
const MONGODB_URI =
  process.env.IMPORT_MONGODB_URI || process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    "Missing MongoDB URI. Set IMPORT_MONGODB_URI or MONGODB_URI in .env.local",
  );
}

// LabTest Schema
const labTestSchema = new mongoose.Schema({}, { strict: false });
const LabTest = mongoose.model("LabTest", labTestSchema, "labtests");

// LabTestTemplate Schema
const labTestTemplateSchema = new mongoose.Schema({}, { strict: false });
const LabTestTemplate = mongoose.model(
  "LabTestTemplate",
  labTestTemplateSchema,
  "labtesttemplates",
);

// LaboratoryService Schema
const laboratoryServiceSchema = new mongoose.Schema({}, { strict: false });
const LaboratoryService = mongoose.model(
  "LaboratoryService",
  laboratoryServiceSchema,
  "laboratoryservices",
);

// TestResult Schema
const testResultSchema = new mongoose.Schema({}, { strict: false });
const TestResult = mongoose.model(
  "TestResult",
  testResultSchema,
  "testresults",
);

async function importData() {
  console.log("Starting laboratory data import...\n");
  console.log("Target database:", MONGODB_URI);

  if (process.env.ALLOW_DESTRUCTIVE_IMPORT !== "true") {
    console.error(
      "Aborted: import is destructive (it clears collections first). Set ALLOW_DESTRUCTIVE_IMPORT=true to continue.",
    );
    process.exit(1);
  }

  try {
    // Connect to MongoDB
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected successfully!\n");

    // Source directory
    const sourceDir = path.join(__dirname, "../exports");

    // Import LabTest collection
    console.log("Importing LabTest collection...");
    const labTestsFile = path.join(sourceDir, "lab-tests.json");
    if (fs.existsSync(labTestsFile)) {
      const labTests = JSON.parse(fs.readFileSync(labTestsFile, "utf-8"));

      if (labTests.length > 0) {
        // Clear existing data and insert new data
        await LabTest.deleteMany({});
        await LabTest.insertMany(labTests);
        console.log(`  Imported ${labTests.length} lab tests`);
      } else {
        console.log("  No lab tests to import");
      }
    } else {
      console.log("  File not found:", labTestsFile);
    }

    // Import LabTestTemplate collection
    console.log("\nImporting LabTestTemplate collection...");
    const labTestTemplatesFile = path.join(
      sourceDir,
      "lab-test-templates.json",
    );
    if (fs.existsSync(labTestTemplatesFile)) {
      const labTestTemplates = JSON.parse(
        fs.readFileSync(labTestTemplatesFile, "utf-8"),
      );

      if (labTestTemplates.length > 0) {
        await LabTestTemplate.deleteMany({});
        await LabTestTemplate.insertMany(labTestTemplates);
        console.log(`  Imported ${labTestTemplates.length} lab test templates`);
      } else {
        console.log("  No lab test templates to import");
      }
    } else {
      console.log("  File not found:", labTestTemplatesFile);
    }

    // Import LaboratoryService collection
    console.log("\nImporting LaboratoryService collection...");
    const laboratoryServicesFile = path.join(
      sourceDir,
      "laboratory-services.json",
    );
    if (fs.existsSync(laboratoryServicesFile)) {
      const laboratoryServices = JSON.parse(
        fs.readFileSync(laboratoryServicesFile, "utf-8"),
      );

      if (laboratoryServices.length > 0) {
        await LaboratoryService.deleteMany({});
        await LaboratoryService.insertMany(laboratoryServices);
        console.log(
          `  Imported ${laboratoryServices.length} laboratory services`,
        );
      } else {
        console.log("  No laboratory services to import (empty in source)");
      }
    } else {
      console.log("  File not found:", laboratoryServicesFile);
    }

    // Import TestResult collection
    console.log("\nImporting TestResult collection...");
    const testResultsFile = path.join(sourceDir, "test-results.json");
    if (fs.existsSync(testResultsFile)) {
      const testResults = JSON.parse(fs.readFileSync(testResultsFile, "utf-8"));

      if (testResults.length > 0) {
        await TestResult.deleteMany({});
        await TestResult.insertMany(testResults);
        console.log(`  Imported ${testResults.length} test results`);
      } else {
        console.log("  No test results to import (empty in source)");
      }
    } else {
      console.log("  File not found:", testResultsFile);
    }

    // Verify the import
    console.log("\n" + "=".repeat(50));
    console.log("VERIFYING IMPORT");
    console.log("=".repeat(50));

    const labTestsCount = await LabTest.countDocuments({});
    const labTestTemplatesCount = await LabTestTemplate.countDocuments({});
    const laboratoryServicesCount = await LaboratoryService.countDocuments({});
    const testResultsCount = await TestResult.countDocuments({});

    console.log(`Lab Tests in database: ${labTestsCount}`);
    console.log(`Lab Test Templates in database: ${labTestTemplatesCount}`);
    console.log(`Laboratory Services in database: ${laboratoryServicesCount}`);
    console.log(`Test Results in database: ${testResultsCount}`);
    console.log("=".repeat(50));

    console.log("\n✅ Import completed successfully!");
  } catch (error) {
    console.error("Error during import:", error);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

// Run the import
importData();
