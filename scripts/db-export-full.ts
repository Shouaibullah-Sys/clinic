import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { MongoClient, BSON } from "mongodb";
import { fileURLToPath } from "url";

dotenv.config({ path: ".env.local" });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function requireEnv(name: string, value?: string): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function main() {
  const sourceUri = requireEnv(
    "EXPORT_MONGODB_URI",
    process.env.EXPORT_MONGODB_URI || process.env.MONGODB_URI,
  );
  const outputRoot =
    process.env.FULL_EXPORT_DIR || path.join(__dirname, "../exports/full-backup");

  fs.mkdirSync(outputRoot, { recursive: true });

  const client = new MongoClient(sourceUri);
  await client.connect();

  try {
    const db = client.db();
    const dbName = db.databaseName;
    const collections = await db
      .listCollections({}, { nameOnly: true })
      .toArray();

    const exportedCollections: Array<{ name: string; count: number }> = [];

    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      if (collectionName.startsWith("system.")) {
        continue;
      }

      const docs = await db.collection(collectionName).find({}).toArray();
      const filePath = path.join(outputRoot, `${collectionName}.json`);
      fs.writeFileSync(filePath, BSON.EJSON.stringify(docs, undefined, 2));
      exportedCollections.push({ name: collectionName, count: docs.length });
      console.log(`Exported ${collectionName}: ${docs.length} documents`);
    }

    const metadata = {
      exportedAt: new Date().toISOString(),
      databaseName: dbName,
      collections: exportedCollections,
    };

    fs.writeFileSync(
      path.join(outputRoot, "metadata.json"),
      JSON.stringify(metadata, null, 2),
    );

    console.log(`\nFull database export complete: ${outputRoot}`);
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error("Full database export failed:", error);
  process.exit(1);
});
