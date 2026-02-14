import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";
import { LabTestTemplate } from "../lib/models/LabTestTemplate";
import { User } from "../lib/models/User";

dotenv.config({ path: ".env.local" });

type SourceParameter = {
  id: string;
  name: string;
  unit: string;
  normalRange: string;
  result: string;
};

type SourceTest = {
  id: string;
  name: string;
  price: number;
  parameters: SourceParameter[];
};

type SourceCategory = {
  name: string;
  tests: SourceTest[];
};

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable");
}

const categoryMap: Record<string, string> = {
  "Clinical Chemistry": "biochemistry",
  "Clinical Pathology": "urinalysis",
  Hematology: "hematology",
  "ICT/ELISA/Rapid Tests": "serology",
  "Molecular Biology": "molecular",
  "Immunology & Tumor Markers": "immunology",
  "Special Hematology": "hematology",
};

const inferSpecimenType = (testName: string): string => {
  const name = testName.toLowerCase();
  if (name.includes("urine")) return "urine";
  if (name.includes("stool")) return "stool";
  if (name.includes("sputum")) return "sputum";
  if (name.includes("csf")) return "csf";
  if (name.includes("swab")) return "swab";
  if (name.includes("tissue") || name.includes("biopsy")) return "tissue";
  return "blood";
};

const parseHardcodedTests = (): SourceCategory[] => {
  const filePath = path.join(
    process.cwd(),
    "app/laboratory/tests/[id]/collect/page.tsx",
  );
  const source = fs.readFileSync(filePath, "utf8");
  const startMarker = "const labTests: LabTestCategory[] = [";
  const endMarker = "// Default parameters for each specimen type";
  const startIndex = source.indexOf(startMarker);
  if (startIndex === -1) {
    throw new Error("Unable to find hardcoded labTests block in collect page");
  }
  const arrayStartIndex = source.indexOf("[", startIndex);
  const endIndex = source.indexOf(endMarker, arrayStartIndex);
  if (arrayStartIndex === -1 || endIndex === -1) {
    throw new Error("Unable to parse hardcoded labTests array block");
  }

  const rawArrayLiteral = source.slice(arrayStartIndex, endIndex).trim();
  const arrayLiteral = rawArrayLiteral.endsWith(";")
    ? rawArrayLiteral.slice(0, -1)
    : rawArrayLiteral;
  const parsed = Function(
    `"use strict"; return (${arrayLiteral});`,
  )() as SourceCategory[];
  return parsed;
};

async function seedCollectHardcodedTestsToTemplates() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("Connected");

  try {
    const createdByUser: any =
      (await User.findOne({ role: "admin" }).lean()) ||
      (await User.findOne({ role: "lab_technician" }).lean()) ||
      (await User.findOne({ role: "doctor" }).lean()) ||
      (await User.findOne({}).lean());

    if (!createdByUser?._id) {
      throw new Error(
        "No user found to set createdBy. Create at least one user first.",
      );
    }

    const categories = parseHardcodedTests();
    const allTests = categories.flatMap((category) =>
      category.tests.map((test) => ({ ...test, sourceCategory: category.name })),
    );

    let created = 0;
    let updated = 0;

    for (const test of allTests) {
      const mappedCategory = categoryMap[test.sourceCategory] || "other";
      const testCode = test.id.toUpperCase();
      const specimenType = inferSpecimenType(test.name);
      const parameters = (test.parameters || []).map((parameter, index) => ({
        parameterCode: `P${String(index + 1).padStart(2, "0")}`,
        parameterName: parameter.name || `Parameter ${index + 1}`,
        unit: parameter.unit || "",
        normalRange: parameter.normalRange || "",
      }));

      const payload = {
        testCode,
        testName: test.name,
        category: mappedCategory,
        description: `${test.sourceCategory} test template`,
        specimenType: [specimenType],
        containerType: [],
        sampleVolume: "",
        fastingRequired: false,
        preparationInstructions: "",
        turnaroundTime: 24,
        basePrice: Number(test.price) || 0,
        active: true,
        parameters,
        createdBy: createdByUser._id,
      };

      const existing: any = await LabTestTemplate.findOne({
        $or: [{ testCode }, { testName: test.name }],
      }).lean();

      if (existing?._id) {
        await LabTestTemplate.findByIdAndUpdate(existing._id, { $set: payload });
        updated += 1;
      } else {
        await LabTestTemplate.create(payload);
        created += 1;
      }
    }

    console.log(`Done. Created: ${created}, Updated: ${updated}`);
    console.log(`Total processed: ${allTests.length}`);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected");
  }
}

seedCollectHardcodedTestsToTemplates().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
