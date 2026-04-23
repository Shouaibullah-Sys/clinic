import dotenv from "dotenv";
import mongoose from "mongoose";
import {
  assertOfflineMongoUri,
  getAppMode,
  isLocalMongoUri,
  normalizeMongoUri,
} from "../lib/mongo-config";

dotenv.config({ path: ".env.local" });

async function main() {
  const appMode = getAppMode();
  const mongoUri = assertOfflineMongoUri("MONGODB_URI", process.env.MONGODB_URI);
  const fallbackUri = normalizeMongoUri(process.env.MONGODB_FALLBACK_URI);
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").trim();
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "").trim();
  const errors: string[] = [];

  if (appMode !== "offline") {
    errors.push(`APP_MODE must be 'offline'. Current value: ${appMode || "(empty)"}`);
  }

  if (fallbackUri && !isLocalMongoUri(fallbackUri)) {
    errors.push(
      `MONGODB_FALLBACK_URI must be local in offline mode. Received: ${fallbackUri}`,
    );
  }

  if (appUrl !== "http://localhost:3000") {
    errors.push(
      `NEXT_PUBLIC_APP_URL must be http://localhost:3000. Current value: ${appUrl || "(empty)"}`,
    );
  }

  if (apiUrl !== "http://localhost:3000/api") {
    errors.push(
      `NEXT_PUBLIC_API_URL must be http://localhost:3000/api. Current value: ${apiUrl || "(empty)"}`,
    );
  }

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    errors.push("JWT_SECRET must be set and at least 32 characters long.");
  }

  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    errors.push("SESSION_SECRET must be set and at least 32 characters long.");
  }

  if (errors.length > 0) {
    console.error("Offline configuration check failed:\n");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log("Offline configuration looks valid.");
  console.log(`APP_MODE=${appMode}`);
  console.log(`MONGODB_URI=${mongoUri}`);
  if (fallbackUri) {
    console.log(`MONGODB_FALLBACK_URI=${fallbackUri}`);
  }

  await mongoose.connect(mongoUri, {
    bufferCommands: false,
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
    family: 4,
  });

  await mongoose.connection.db!.admin().ping();
  console.log("Local MongoDB connection check passed.");
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error("Offline check failed:", error);
  process.exit(1);
});
