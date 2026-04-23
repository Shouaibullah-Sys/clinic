// scripts/merge-lab-tests-templates.ts
// Script to merge lab-tests.ts data with MongoDB LabTestTemplate collection

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import mongoose from "mongoose";
import { LabTestTemplate } from "../lib/models/LabTestTemplate";
import { labTestCategories } from "../lab-tests";
import { User } from "../lib/models/User";

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable");
}

// Map category names to enum values
const categoryMap: Record<string, string> = {
  Hematology: "hematology",
  Biochemistry: "biochemistry",
  Microbiology: "microbiology",
  Serology: "serology",
  Immunology: "immunology",
  Hormonal: "hormonal",
  Urinalysis: "urinalysis",
  Stool_test: "stool_test",
  Molecular: "molecular",
  Imaging: "imaging",
  Other: "other",
  "Cardiac Markers": "biochemistry",
  Thyroid: "biochemistry",
  "Fertility / Hormones": "hormonal",
  Diabetes: "biochemistry",
  Urine: "urinalysis",
  "PCR / Infectious": "molecular",
};

// Map category to specimen type
const categorySpecimenMap: Record<string, string[]> = {
  Hematology: ["blood"],
  Biochemistry: ["blood"],
  "Cardiac Markers": ["blood"],
  Thyroid: ["blood"],
  "Fertility / Hormones": ["blood"],
  Diabetes: ["blood"],
  Urine: ["urine"],
  "PCR / Infectious": ["blood"],
};

// Map category to turnaround time
const categoryTurnaroundMap: Record<string, number> = {
  Hematology: 24,
  Biochemistry: 24,
  "Cardiac Markers": 24,
  Thyroid: 24,
  "Fertility / Hormones": 24,
  Diabetes: 24,
  Urine: 24,
  "PCR / Infectious": 48,
};

function generateTestCode(name: string): string {
  const clean = name
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .replace(/\s+/g, "_")
    .toUpperCase();
  return `LAB_${clean}`;
}

async function mergeLabTemplates() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB successfully");

    const adminUser = await User.findOne({ role: "admin" });
    if (!adminUser) {
      console.error("No admin user found. Please create an admin user first.");
      process.exit(1);
    }
    console.log(`Using admin user: ${adminUser.name} (${adminUser._id})`);

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const categoryGroup of labTestCategories) {
      const mappedCategory =
        categoryMap[categoryGroup.category] || "other";
      const specimenType =
        categorySpecimenMap[categoryGroup.category] || ["blood"];
      const turnaroundTime =
        categoryTurnaroundMap[categoryGroup.category] || 24;

      console.log(
        `\nProcessing category: ${categoryGroup.category} -> ${mappedCategory}`,
      );

      for (const test of categoryGroup.tests) {
        const testCode = generateTestCode(test.name);

        try {
          const existingTemplate = await LabTestTemplate.findOne({
            $or: [
              { testCode },
              { testName: { $regex: new RegExp(`^${test.name}$`, "i") } },
            ],
          });

          if (existingTemplate) {
            console.log(`  Updating: ${test.name}`);
            await LabTestTemplate.findByIdAndUpdate(existingTemplate._id, {
              $set: {
                basePrice: test.price,
                parameters: [
                  {
                    parameterCode: testCode,
                    parameterName: test.name,
                    normalRange: test.normal_range,
                    methodology: mappedCategory,
                  },
                ],
                description: test.comment,
                category: mappedCategory,
              },
            });
            updatedCount++;
          } else {
            console.log(`  Creating: ${test.name}`);
            await LabTestTemplate.create({
              testCode,
              testName: test.name,
              category: mappedCategory,
              description: test.comment,
              specimenType,
              containerType: ["Plain tube"],
              sampleVolume: "2-3 mL",
              fastingRequired: false,
              preparationInstructions: "No special preparation required",
              turnaroundTime,
              basePrice: test.price,
              active: true,
              createdBy: adminUser._id,
              parameters: [
                {
                  parameterCode: testCode,
                  parameterName: test.name,
                  unit: "",
                  normalRange: test.normal_range,
                  methodology: mappedCategory,
                },
              ],
            });
            createdCount++;
          }
        } catch (error: any) {
          const errMsg = `Error processing ${test.name}: ${error.message}`;
          console.error(`  ERROR: ${errMsg}`);
          errors.push(errMsg);
          skippedCount++;
        }
      }
    }

    console.log("\n=== Merge Complete ===");
    console.log(`Created: ${createdCount} templates`);
    console.log(`Updated: ${updatedCount} templates`);
    console.log(`Skipped: ${skippedCount} templates`);

    if (errors.length > 0) {
      console.log("\nErrors encountered:");
      errors.forEach((e) => console.log(`  - ${e}`));
    }

    const totalTemplates = await LabTestTemplate.countDocuments({});
    console.log(`\nTotal templates in database: ${totalTemplates}`);

    const templatesByCategory = await LabTestTemplate.aggregate([
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    console.log("\nTemplates by category:");
    templatesByCategory.forEach((cat: any) => {
      console.log(`  ${cat._id}: ${cat.count}`);
    });
  } catch (error) {
    console.error("Error merging lab test templates:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
    process.exit(0);
  }
}

mergeLabTemplates();
