// Fix for E11000 duplicate key error on batchNumber.
// Run this once to drop legacy unique batchNumber indexes and normalize data.

const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/test";

async function fixBatchNumberIndex() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db();
    const collection = db.collection("medicinestocks");

    // Check existing indexes
    const indexes = await collection.indexes();
    console.log("Current indexes:", indexes);

    // Drop any unique index on batchNumber (name can vary between environments)
    const uniqueBatchIndexes = indexes.filter(
      (idx) => idx.key?.batchNumber === 1 && idx.unique === true,
    );

    for (const idx of uniqueBatchIndexes) {
      await collection.dropIndex(idx.name);
      console.log(`Dropped unique index: ${idx.name}`);
    }

    // Normalize null/missing/empty batch numbers to a deterministic value per document.
    // This avoids future duplicate-null issues and keeps all documents queryable.
    const updateResult = await collection.updateMany(
      {
        $or: [
          { batchNumber: null },
          { batchNumber: { $exists: false } },
          { batchNumber: "" },
        ],
      },
      [
        {
          $set: {
            batchNumber: {
              $concat: ["AUTO-BATCH-", { $toString: "$_id" }],
            },
          },
        },
      ],
    );
    console.log(
      `Updated ${updateResult.modifiedCount} documents with invalid batchNumber`,
    );

    // Ensure a non-unique index for query performance
    const hasBatchNumberIndex = (await collection.indexes()).some(
      (idx) => idx.key?.batchNumber === 1 && !idx.unique,
    );
    if (!hasBatchNumberIndex) {
      await collection.createIndex({ batchNumber: 1 });
      console.log("Created non-unique batchNumber index");
    } else {
      console.log("Non-unique batchNumber index already exists");
    }

    console.log("Fix completed successfully!");
  } catch (error) {
    console.error("Error fixing batchNumber index:", error);
  } finally {
    await client.close();
  }
}

fixBatchNumberIndex();
