import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import mongoose from "mongoose";
import { LabTestTemplate } from "../lib/models/LabTestTemplate";
import { User } from "../lib/models/User";

const urineRoutineTemplate = {
  testCode: "URINE_ROUTINE",
  testName: "Urine Routine Examination",
  category: "urinalysis",
  description: "Complete urine analysis includes physical, chemical, and microscopic examination of urine. Used to detect various conditions affecting the urinary system, kidneys, and metabolic disorders.",
  specimenType: ["urine"] as string[],
  containerType: ["Sterile container"],
  sampleVolume: "10-20 mL",
  fastingRequired: false,
  preparationInstructions: "Collect mid-stream urine in a sterile container. First morning sample is preferred.",
  turnaroundTime: 24,
  basePrice: 300,
  active: true,
  parameters: [
    // Physical Examination
    {
      parameterCode: "COLOR",
      parameterName: "Color",
      unit: "",
      normalRange: "Pale Yellow – Amber",
      group: "Physical Examination",
      methodology: "Visual examination"
    },
    {
      parameterCode: "APPEARANCE",
      parameterName: "Appearance",
      unit: "",
      normalRange: "Clear",
      group: "Physical Examination",
      methodology: "Visual examination"
    },
    {
      parameterCode: "SG",
      parameterName: "Specific Gravity",
      unit: "",
      normalRange: "1.005 – 1.030",
      group: "Physical Examination",
      methodology: "Refractometer"
    },
    {
      parameterCode: "PH",
      parameterName: "pH",
      unit: "",
      normalRange: "4.5 – 8.0",
      group: "Physical Examination",
      methodology: "Dipstick"
    },
    // Chemical Examination
    {
      parameterCode: "PROTEIN",
      parameterName: "Protein",
      unit: "",
      normalRange: "Negative",
      group: "Chemical Examination",
      methodology: "Dipstick"
    },
    {
      parameterCode: "GLUCOSE",
      parameterName: "Glucose",
      unit: "",
      normalRange: "Negative",
      group: "Chemical Examination",
      methodology: "Dipstick"
    },
    {
      parameterCode: "KETONES",
      parameterName: "Ketones",
      unit: "",
      normalRange: "Negative",
      group: "Chemical Examination",
      methodology: "Dipstick"
    },
    {
      parameterCode: "NITRITE",
      parameterName: "Nitrite",
      unit: "",
      normalRange: "Negative",
      group: "Chemical Examination",
      methodology: "Dipstick"
    },
    {
      parameterCode: "UROBILINOGEN",
      parameterName: "Urobilinogen",
      unit: "",
      normalRange: "Normal (Trace)",
      group: "Chemical Examination",
      methodology: "Dipstick"
    },
    // Microscopic Examination
    {
      parameterCode: "PUS_CELLS",
      parameterName: "Pus Cells (WBC)",
      unit: "/HPF",
      normalRange: "0 – 5 /HPF",
      group: "Microscopic Examination",
      methodology: "Microscopic examination"
    },
    {
      parameterCode: "RBC",
      parameterName: "Red Blood Cells (RBC)",
      unit: "/HPF",
      normalRange: "0 – 3 /HPF",
      group: "Microscopic Examination",
      methodology: "Microscopic examination"
    },
    {
      parameterCode: "EPITHELIAL",
      parameterName: "Epithelial Cells",
      unit: "/HPF",
      normalRange: "Few",
      group: "Microscopic Examination",
      methodology: "Microscopic examination"
    },
    {
      parameterCode: "HYALINE_CASTS",
      parameterName: "Hyaline Casts",
      unit: "/HPF",
      normalRange: "Nil",
      group: "Microscopic Examination",
      methodology: "Microscopic examination"
    },
    {
      parameterCode: "GRANULAR_CASTS",
      parameterName: "Granular Casts",
      unit: "/HPF",
      normalRange: "Nil",
      group: "Microscopic Examination",
      methodology: "Microscopic examination"
    },
    {
      parameterCode: "MUCUS_THREADS",
      parameterName: "Mucus Threads",
      unit: "/HPF",
      normalRange: "Nil",
      group: "Microscopic Examination",
      methodology: "Microscopic examination"
    },
    {
      parameterCode: "BACTERIA",
      parameterName: "Bacteria",
      unit: "/HPF",
      normalRange: "Nil",
      group: "Microscopic Examination",
      methodology: "Microscopic examination"
    },
    // Crystals
    {
      parameterCode: "CALCIUM_OXALATE",
      parameterName: "Calcium Oxalate Crystals",
      unit: "/HPF",
      normalRange: "Nil",
      group: "Crystals",
      methodology: "Microscopic examination"
    },
    {
      parameterCode: "TRIPLE_PHOSPHATE",
      parameterName: "Triple Phosphate",
      unit: "/HPF",
      normalRange: "Nil",
      group: "Crystals",
      methodology: "Microscopic examination"
    },
    {
      parameterCode: "AMORPHOUS_URATES",
      parameterName: "Amorphous Urates",
      unit: "/HPF",
      normalRange: "Nil",
      group: "Crystals",
      methodology: "Microscopic examination"
    }
  ]
};

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable");
}

async function addUrineRoutineTemplate() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB successfully");

    const adminUser = await User.findOne({ role: "admin" });
    if (!adminUser) {
      console.error("No admin user found. Please create an admin user first.");
      process.exit(1);
    }

    const existingTemplate = await LabTestTemplate.findOne({
      testCode: "URINE_ROUTINE"
    });

    if (existingTemplate) {
      console.log("Template 'Urine Routine Examination' already exists. Updating...");
      await LabTestTemplate.findByIdAndUpdate(existingTemplate._id, {
        $set: {
          ...urineRoutineTemplate,
          createdBy: adminUser._id,
        },
      });
      console.log("Template updated successfully!");
    } else {
      console.log("Creating new template 'Urine Routine Examination'...");
      await LabTestTemplate.create({
        ...urineRoutineTemplate,
        createdBy: adminUser._id,
      });
      console.log("Template created successfully!");
    }

    const totalTemplates = await LabTestTemplate.countDocuments({});
    console.log(`\nTotal templates in database: ${totalTemplates}`);

  } catch (error) {
    console.error("Error adding urine routine template:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
    process.exit(0);
  }
}

addUrineRoutineTemplate();