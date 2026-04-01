// scripts/backfill-labtest-template-parameters.js
// Backfill lab test template parameters into lab tests that are missing testParameters.

const mongoose = require("mongoose");
require("dotenv").config({ path: ".env.local" });

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is not set.");
  process.exit(1);
}

const DRY_RUN = process.env.DRY_RUN === "true";

const normalize = (value) => (value || "").trim().toLowerCase();

async function run() {
  await mongoose.connect(uri);
  const db = mongoose.connection;
  const labtests = db.collection("labtests");
  const templatesCollection = db.collection("labtesttemplates");

  const templates = await templatesCollection.find({ active: true }).toArray();
  const templatesByName = new Map();
  const templatesByNameCategory = new Map();

  for (const template of templates) {
    const nameKey = normalize(template.testName);
    const categoryKey = normalize(template.category);
    if (nameKey) {
      if (!templatesByName.has(nameKey)) {
        templatesByName.set(nameKey, template);
      }
      if (categoryKey) {
        const compositeKey = `${nameKey}::${categoryKey}`;
        if (!templatesByNameCategory.has(compositeKey)) {
          templatesByNameCategory.set(compositeKey, template);
        }
      }
    }
  }

  const query = {
    $and: [
      {
        $or: [{ testParameters: { $exists: false } }, { testParameters: { $size: 0 } }],
      },
      { $or: [{ isDirectTest: { $exists: false } }, { isDirectTest: false }] },
    ],
  };

  const cursor = labtests.find(query);

  let scanned = 0;
  let matched = 0;
  let updated = 0;
  let skippedNoTemplate = 0;
  let skippedNoParameters = 0;

  for await (const test of cursor) {
    scanned += 1;
    const nameKey = normalize(test.testName);
    const categoryKey = normalize(test.category);
    const compositeKey = `${nameKey}::${categoryKey}`;
    const template =
      templatesByNameCategory.get(compositeKey) || templatesByName.get(nameKey);

    if (!template) {
      skippedNoTemplate += 1;
      continue;
    }

    const parameters = Array.isArray(template.parameters)
      ? template.parameters
      : [];

    if (parameters.length === 0) {
      skippedNoParameters += 1;
      continue;
    }

    matched += 1;

    const testParameters = parameters.map((param) => ({
      parameterName: param.parameterName || param.parameterCode || "",
      unit: param.unit || "",
      normalRange: param.normalRange || "",
      description: param.methodology || "",
      group: param.group || "",
    }));

    if (DRY_RUN) {
      continue;
    }

    const result = await labtests.updateOne(
      { _id: test._id },
      { $set: { testParameters } },
    );
    if (result.modifiedCount > 0) updated += 1;
  }

  console.log("Backfill complete.");
  console.log({
    dryRun: DRY_RUN,
    scanned,
    matched,
    updated,
    skippedNoTemplate,
    skippedNoParameters,
  });

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Failed to backfill lab test parameters:", err);
  process.exit(1);
});
