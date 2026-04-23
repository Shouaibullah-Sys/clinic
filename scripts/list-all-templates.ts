import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import mongoose from "mongoose";
import { LabTestTemplate } from "../lib/models/LabTestTemplate";

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable");
}

async function getAllTemplates() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB successfully\n");

    const templates = await LabTestTemplate.find({}).lean();
    
    console.log(`=== TOTAL TEMPLATES: ${templates.length} ===\n`);
    
    // Group by category
    const byCategory: Record<string, number> = {};
    templates.forEach(t => {
      const cat = t.category || 'unknown';
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    });
    
    console.log("=== TEMPLATES BY CATEGORY ===");
    Object.entries(byCategory).sort((a,b) => a[0].localeCompare(b[0])).forEach(([cat, count]) => {
      console.log(`  ${cat}: ${count}`);
    });
    
    console.log("\n=== ALL TEMPLATES (testName | category | basePrice) ===");
    templates.sort((a,b) => a.testName.localeCompare(b.testName)).forEach(t => {
      console.log(`  ${t.testName} | ${t.category} | ${t.basePrice}`);
    });

  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

getAllTemplates();