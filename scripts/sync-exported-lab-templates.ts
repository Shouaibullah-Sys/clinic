import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import { LabTestTemplate } from "../lib/models/LabTestTemplate";
import { User } from "../lib/models/User";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("Missing MONGODB_URI in .env.local");
}

const VALID_CATEGORIES = new Set([
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

const VALID_SPECIMENS = new Set([
  "blood",
  "urine",
  "stool",
  "csf",
  "sputum",
  "tissue",
  "swab",
  "other",
]);

function getArgValue(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx >= 0 && process.argv[idx + 1]) {
    return process.argv[idx + 1];
  }
  return undefined;
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function normalizeCategory(category: unknown): string {
  if (typeof category !== "string") return "other";
  const normalized = category.trim().toLowerCase().replace(/\s+/g, "_");
  if (VALID_CATEGORIES.has(normalized)) return normalized;
  if (normalized === "stool" || normalized === "stooltest") return "stool_test";
  if (normalized === "urine") return "urinalysis";
  return "other";
}

function normalizeSpecimenType(specimenType: unknown): string[] {
  const values = Array.isArray(specimenType) ? specimenType : [];
  const normalized = values
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().toLowerCase())
    .map((item) => {
      if (item === "serum" || item === "plasma") return "blood";
      return item;
    })
    .filter((item) => VALID_SPECIMENS.has(item));

  if (normalized.length > 0) {
    return [...new Set(normalized)];
  }
  return ["other"];
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function sanitizeParameters(
  parameters: unknown,
  testCode: string,
  testName: string,
) {
  if (!Array.isArray(parameters) || parameters.length === 0) {
    return [
      {
        parameterCode: testCode,
        parameterName: testName,
        unit: "",
        normalRange: "N/A",
      },
    ];
  }

  return parameters.map((param, index) => {
    const p = (param ?? {}) as Record<string, unknown>;
    const parameterCode = asString(p.parameterCode).trim() || `${testCode}_P${index + 1}`;
    const parameterName = asString(p.parameterName).trim() || testName;
    const normalRange = asString(p.normalRange).trim() || "N/A";

    const out: Record<string, unknown> = {
      parameterCode,
      parameterName,
      normalRange,
    };

    const unit = asString(p.unit).trim();
    if (unit) out.unit = unit;

    const group = asString(p.group).trim();
    if (group) out.group = group;

    const methodology = asString(p.methodology).trim();
    if (methodology) out.methodology = methodology;

    const criticalLow = asNumber(p.criticalLow, Number.NaN);
    if (Number.isFinite(criticalLow)) out.criticalLow = criticalLow;

    const criticalHigh = asNumber(p.criticalHigh, Number.NaN);
    if (Number.isFinite(criticalHigh)) out.criticalHigh = criticalHigh;

    return out;
  });
}

function sanitizeTemplate(raw: Record<string, unknown>) {
  const testCode = asString(raw.testCode).trim().toUpperCase();
  const testName = asString(raw.testName).trim();
  const category = normalizeCategory(raw.category);

  const basePrice = Math.max(0, asNumber(raw.basePrice, 0));
  const turnaroundTime = Math.max(1, asNumber(raw.turnaroundTime, 24));

  return {
    testCode,
    testName,
    category,
    description: asString(raw.description).trim(),
    specimenType: normalizeSpecimenType(raw.specimenType),
    containerType: Array.isArray(raw.containerType)
      ? raw.containerType.filter((item): item is string => typeof item === "string")
      : [],
    sampleVolume: asString(raw.sampleVolume).trim(),
    fastingRequired: asBoolean(raw.fastingRequired, false),
    preparationInstructions: asString(raw.preparationInstructions).trim(),
    turnaroundTime,
    basePrice,
    active: asBoolean(raw.active, true),
    parameters: sanitizeParameters(raw.parameters, testCode, testName),
  };
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function resolveOwnerId() {
  const admin = (await User.findOne({ role: "admin" })
    .select("_id")
    .lean()) as { _id?: mongoose.Types.ObjectId } | null;
  if (admin?._id) return admin._id;
  const firstUser = (await User.findOne({})
    .select("_id")
    .lean()) as { _id?: mongoose.Types.ObjectId } | null;
  if (firstUser?._id) return firstUser._id;
  throw new Error("No users found. Create at least one user before syncing templates.");
}

async function syncTemplates() {
  const dryRun = hasFlag("--dry-run");
  const fileArg = getArgValue("--file");
  const filePath = fileArg
    ? path.resolve(process.cwd(), fileArg)
    : path.join(__dirname, "../exports/lab-test-templates.json");

  console.log("Sync source file:", filePath);
  console.log("Dry run:", dryRun ? "yes" : "no");

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const rawData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  if (!Array.isArray(rawData)) {
    throw new Error("Expected an array in lab-test-templates JSON file");
  }

  const cleaned = rawData
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map(sanitizeTemplate)
    .filter((item) => item.testCode && item.testName);

  const deduped = new Map<string, (typeof cleaned)[number]>();
  for (const template of cleaned) {
    deduped.set(template.testCode, template);
  }
  const uniqueTemplates = [...deduped.values()];
  const duplicateCount = cleaned.length - uniqueTemplates.length;

  console.log("Templates in file:", rawData.length);
  console.log("Templates valid for sync:", cleaned.length);
  console.log("Duplicate test codes skipped:", duplicateCount);

  await mongoose.connect(MONGODB_URI!);
  console.log("Connected to MongoDB");

  const ownerId = await resolveOwnerId();
  console.log("Using owner user id:", String(ownerId));

  let created = 0;
  let updated = 0;
  let unchanged = 0;
  let skipped = duplicateCount;

  for (const template of uniqueTemplates) {
    const byCode = (await LabTestTemplate.findOne({
      testCode: template.testCode,
    })
      .select("_id")
      .lean()) as { _id?: mongoose.Types.ObjectId } | null;

    let existingId: mongoose.Types.ObjectId | null = null;
    if (byCode?._id) {
      existingId = byCode._id;
    } else {
      const byName = (await LabTestTemplate.findOne({
        testName: { $regex: new RegExp(`^${escapeRegex(template.testName)}$`, "i") },
      })
        .select("_id")
        .lean()) as { _id?: mongoose.Types.ObjectId } | null;
      existingId = byName?._id ?? null;
    }

    if (dryRun) {
      if (existingId) {
        updated++;
      } else {
        created++;
      }
      continue;
    }

    if (existingId) {
      const res = await LabTestTemplate.updateOne(
        { _id: existingId },
        { $set: template },
        { runValidators: true },
      );
      if (res.modifiedCount > 0) updated++;
      else unchanged++;
    } else {
      await LabTestTemplate.create({
        ...template,
        createdBy: ownerId,
      });
      created++;
    }
  }

  console.log("\nSync summary");
  console.log("Created:", created);
  console.log("Updated:", updated);
  console.log("Unchanged:", unchanged);
  console.log("Skipped (duplicate file codes):", skipped);

  const total = await LabTestTemplate.countDocuments({});
  console.log("Total templates in DB:", total);
}

syncTemplates()
  .then(async () => {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("Sync failed:", error);
    await mongoose.disconnect();
    process.exit(1);
  });
