import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import mongoose from "mongoose";
import * as fs from "fs";
import * as path from "path";

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable");
}

async function exportTemplates() {
  try {
    await mongoose.connect(MONGODB_URI);
    
    const LabTestTemplate = mongoose.models.LabTestTemplate || 
      mongoose.model("LabTestTemplate", new mongoose.Schema({}));
    
    const templates = await LabTestTemplate.find({}).lean();
    
    const exportDir = path.join(process.cwd(), "exports");
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir);
    }
    
    fs.writeFileSync(
      path.join(exportDir, "lab-test-templates.json"),
      JSON.stringify(templates, null, 2)
    );
    
    console.log(`Exported ${templates.length} templates to exports/lab-test-templates.json`);
    
  } catch (error) {
    console.error("Export error:", error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

exportTemplates();