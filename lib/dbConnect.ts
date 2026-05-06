/**
 * dbConnect - Compatibility shim.
 * This project has been migrated from MongoDB/Mongoose to Prisma/SQLite.
 * Prisma auto-connects on first query, so this function is now a no-op.
 */
import { prisma } from "@/lib/prisma";

async function dbConnect(): Promise<void> {
  try {
    await prisma.$connect();
  } catch (error) {
    console.error("Database connection failed:", error);
    throw error;
  }
}

export default dbConnect;