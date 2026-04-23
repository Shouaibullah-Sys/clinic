import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { MongoClient, BSON } from "mongodb";
import { fileURLToPath } from "url";
import { assertOfflineMongoUri } from "../lib/mongo-config";

dotenv.config({ path: ".env.local" });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function ensureFile(pathname: string) {
  if (!fs.existsSync(pathname)) {
    throw new Error(`Required file not found: ${pathname}`);
  }
}

async function main() {
  if (process.env.ALLOW_DESTRUCTIVE_IMPORT !== "true") {
    throw new Error(
      "Import is destructive. Set ALLOW_DESTRUCTIVE_IMPORT=true to continue.",
    );
  }

  const targetUri = assertOfflineMongoUri(
    "IMPORT_MONGODB_URI",
    process.env.IMPORT_MONGODB_URI || process.env.MONGODB_URI,
  );
  const inputRoot =
    process.env.FULL_IMPORT_DIR || path.join(__dirname, "../exports/full-backup");
  const metadataPath = path.join(inputRoot, "metadata.json");

  ensureFile(metadataPath);

  const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf-8")) as {
    collections: Array<{ name: string; count: number }>;
  };

  const client = new MongoClient(targetUri);
  await client.connect();

  try {
    const db = client.db();
    const existingCollections = await db
      .listCollections({}, { nameOnly: true })
      .toArray();

    for (const collectionInfo of existingCollections) {
      if (collectionInfo.name.startsWith("system.")) {
        continue;
      }
      await db.collection(collectionInfo.name).drop().catch(() => undefined);
    }

    for (const { name } of metadata.collections) {
      const filePath = path.join(inputRoot, `${name}.json`);
      ensureFile(filePath);
      const docs = BSON.EJSON.parse(fs.readFileSync(filePath, "utf-8")) as any[];

      if (docs.length > 0) {
        await db.collection(name).insertMany(docs, { ordered: true });
      } else {
        await db.createCollection(name);
      }

      console.log(`Imported ${name}: ${docs.length} documents`);
    }

    console.log("\nVerification");
    for (const { name, count } of metadata.collections) {
      const actual = await db.collection(name).countDocuments();
      console.log(`- ${name}: expected ${count}, imported ${actual}`);
      if (actual !== count) {
        throw new Error(`Count mismatch for ${name}: expected ${count}, got ${actual}`);
      }
    }

    const usersCollection = metadata.collections.find((item) => item.name === "users");
    if (usersCollection) {
      const adminUser = await db.collection("users").findOne({ role: "admin" });
      if (!adminUser) {
        throw new Error("Verification failed: no admin user found after import.");
      }
      console.log("- admin user check passed");
    }

    const appointmentsCollection = metadata.collections.find(
      (item) => item.name === "appointments",
    );
    if (appointmentsCollection) {
      const sampleAppointment = await db.collection("appointments").findOne({});
      if (sampleAppointment?.patient) {
        const patientExists = await db
          .collection("patients")
          .countDocuments({ _id: sampleAppointment.patient });
        if (patientExists === 0) {
          throw new Error("Verification failed: sample appointment patient reference is missing.");
        }
      }

      if (sampleAppointment?.doctor) {
        const doctorExists = await db
          .collection("users")
          .countDocuments({ _id: sampleAppointment.doctor });
        if (doctorExists === 0) {
          throw new Error("Verification failed: sample appointment doctor reference is missing.");
        }
      }

      if (sampleAppointment) {
        console.log("- appointment reference spot check passed");
      }
    }

    const labTestsCollection = metadata.collections.find((item) => item.name === "labtests");
    if (labTestsCollection) {
      const sampleLabTest = await db.collection("labtests").findOne({});
      if (sampleLabTest?.patient) {
        const patientExists = await db
          .collection("patients")
          .countDocuments({ _id: sampleLabTest.patient });
        if (patientExists === 0) {
          throw new Error("Verification failed: sample lab test patient reference is missing.");
        }
      }
      console.log("- lab test reference spot check passed");
    }

    console.log("\nFull database import complete.");
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error("Full database import failed:", error);
  process.exit(1);
});
