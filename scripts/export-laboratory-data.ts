// scripts/export-laboratory-data.ts
// Script to export all laboratory-related data from the MongoDB database

import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// Get the directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MongoDB connection string
const MONGODB_URI =
  process.env.EXPORT_MONGODB_URI || process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    "Missing MongoDB URI. Set EXPORT_MONGODB_URI or MONGODB_URI in .env.local",
  );
}

// LabTest Schema (minimal version for export)
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

async function exportData() {
  console.log("Starting laboratory data export...\n");

  try {
    // Connect to MongoDB
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI!);
    console.log("Connected successfully!\n");

    // Output directory
    const outputDir = path.join(__dirname, "../exports");

    // Create exports directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Export LabTest collection
    console.log("Exporting LabTest collection...");
    const labTests = await LabTest.find({}).lean();
    const labTestsFile = path.join(outputDir, "lab-tests.json");
    fs.writeFileSync(labTestsFile, JSON.stringify(labTests, null, 2));
    console.log(`  Exported ${labTests.length} lab tests to: ${labTestsFile}`);

    // Export LabTestTemplate collection
    console.log("\nExporting LabTestTemplate collection...");
    const labTestTemplates = await LabTestTemplate.find({}).lean();
    const labTestTemplatesFile = path.join(
      outputDir,
      "lab-test-templates.json",
    );
    fs.writeFileSync(
      labTestTemplatesFile,
      JSON.stringify(labTestTemplates, null, 2),
    );
    console.log(
      `  Exported ${labTestTemplates.length} lab test templates to: ${labTestTemplatesFile}`,
    );

    // Export LaboratoryService collection
    console.log("\nExporting LaboratoryService collection...");
    const laboratoryServices = await LaboratoryService.find({}).lean();
    const laboratoryServicesFile = path.join(
      outputDir,
      "laboratory-services.json",
    );
    fs.writeFileSync(
      laboratoryServicesFile,
      JSON.stringify(laboratoryServices, null, 2),
    );
    console.log(
      `  Exported ${laboratoryServices.length} laboratory services to: ${laboratoryServicesFile}`,
    );

    // Export TestResult collection
    console.log("\nExporting TestResult collection...");
    const testResults = await TestResult.find({}).lean();
    const testResultsFile = path.join(outputDir, "test-results.json");
    fs.writeFileSync(testResultsFile, JSON.stringify(testResults, null, 2));
    console.log(
      `  Exported ${testResults.length} test results to: ${testResultsFile}`,
    );

    // Summary
    console.log("\n" + "=".repeat(50));
    console.log("EXPORT SUMMARY");
    console.log("=".repeat(50));
    console.log(`Lab Tests: ${labTests.length}`);
    console.log(`Lab Test Templates: ${labTestTemplates.length}`);
    console.log(`Laboratory Services: ${laboratoryServices.length}`);
    console.log(`Test Results: ${testResults.length}`);
    console.log(
      `Total records: ${labTests.length + labTestTemplates.length + laboratoryServices.length + testResults.length}`,
    );
    console.log("\nFiles saved to:", outputDir);
    console.log("=".repeat(50));

    // Create a combined export file
    const combinedData = {
      exportDate: new Date().toISOString(),
      labTests,
      labTestTemplates,
      laboratoryServices,
      testResults,
    };

    const combinedFile = path.join(outputDir, "laboratory-all-data.json");
    fs.writeFileSync(combinedFile, JSON.stringify(combinedData, null, 2));
    console.log(`\nCombined export: ${combinedFile}`);

    console.log("\n✅ Export completed successfully!");
  } catch (error) {
    console.error("Error during export:", error);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

// Run the export
exportData();
