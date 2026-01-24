// scripts/migrate-labtest-statuses.ts
import dbConnect from "@/lib/dbConnect";
import { LabTest } from "@/lib/models/LabTest";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function migrateLabTestStatuses() {
  try {
    await dbConnect();
    console.log("Database connected");

    console.log("Starting migration of lab test statuses...");

    // Fix existing tests with null collectionStatus
    const collectionStatusResult = await LabTest.updateMany(
      {
        $or: [
          { collectionStatus: { $exists: false } },
          { collectionStatus: null },
          { collectionStatus: "" }
        ]
      },
      { $set: { collectionStatus: "pending" } }
    );

    console.log(`Updated collectionStatus for ${collectionStatusResult.modifiedCount} documents`);

    // Also fix other status fields if needed
    const statusResult = await LabTest.updateMany(
      { status: { $exists: false } },
      { $set: { status: "ordered" } }
    );

    console.log(`Updated status for ${statusResult.modifiedCount} documents`);

    const processingStatusResult = await LabTest.updateMany(
      { processingStatus: { $exists: false } },
      { $set: { processingStatus: "pending" } }
    );

    console.log(`Updated processingStatus for ${processingStatusResult.modifiedCount} documents`);

    const verificationStatusResult = await LabTest.updateMany(
      { verificationStatus: { $exists: false } },
      { $set: { verificationStatus: "pending" } }
    );

    console.log(`Updated verificationStatus for ${verificationStatusResult.modifiedCount} documents`);

    console.log("Migration completed successfully!");
    console.log(`Total documents updated: ${
      collectionStatusResult.modifiedCount +
      statusResult.modifiedCount +
      processingStatusResult.modifiedCount +
      verificationStatusResult.modifiedCount
    }`);

    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrateLabTestStatuses();