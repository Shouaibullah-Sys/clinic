// scripts/seed-lab-test-templates.ts
// Seed script to populate lab test templates in the database

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import mongoose from "mongoose";
import { LabTestTemplate } from "../lib/models/LabTestTemplate";
import { labTestTemplates } from "../data/lab-test-templates";
import { User } from "../lib/models/User";

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable");
}

async function seedLabTestTemplates() {
  try {
    // Connect to MongoDB
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB successfully");

    // Find an admin user to use as createdBy
    const adminUser = await User.findOne({ role: "admin" });
    if (!adminUser) {
      console.error("No admin user found. Please create an admin user first.");
      process.exit(1);
    }
    console.log(`Using admin user: ${adminUser.name} (${adminUser._id})`);

    // Get existing templates
    const existingTemplates = await LabTestTemplate.find({});
    console.log(`Found ${existingTemplates.length} existing templates`);

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    // Process each template
    for (const templateData of labTestTemplates) {
      const existingTemplate = await LabTestTemplate.findOne({
        testCode: templateData.testCode,
      });

      if (existingTemplate) {
        // Update existing template
        console.log(
          `Updating template: ${templateData.testCode} - ${templateData.testName}`,
        );
        await LabTestTemplate.findByIdAndUpdate(existingTemplate._id, {
          $set: {
            ...templateData,
            createdBy: adminUser._id,
          },
        });
        updatedCount++;
      } else {
        // Create new template
        console.log(
          `Creating template: ${templateData.testCode} - ${templateData.testName}`,
        );
        await LabTestTemplate.create({
          ...templateData,
          createdBy: adminUser._id,
        });
        createdCount++;
      }
    }

    console.log("\n=== Seeding Complete ===");
    console.log(`Created: ${createdCount} templates`);
    console.log(`Updated: ${updatedCount} templates`);
    console.log(`Skipped: ${skippedCount} templates`);

    // Display summary
    const totalTemplates = await LabTestTemplate.countDocuments({});
    console.log(`\nTotal templates in database: ${totalTemplates}`);

    // Display templates by category
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
    console.error("Error seeding lab test templates:", error);
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
    process.exit(0);
  }
}

// Run the seed script
seedLabTestTemplates();
