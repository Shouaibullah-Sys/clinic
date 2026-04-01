// lib/dbConnect.ts
import mongoose from "mongoose";

function normalizeMongoUri(uri?: string): string | undefined {
  if (!uri) return undefined;
  // Handle accidental quotes/newlines/spaces from env dashboards.
  const normalized = uri.trim().replace(/^['"]|['"]$/g, "");
  return normalized || undefined;
}

const MONGODB_URI = normalizeMongoUri(process.env.MONGODB_URI);
const MONGODB_FALLBACK_URI = normalizeMongoUri(process.env.MONGODB_FALLBACK_URI);

if (!MONGODB_URI) {
  throw new Error(
    "Please define the MONGODB_URI environment variable inside .env.local"
  );
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseCache;
}

const cached: MongooseCache = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = { conn: null, promise: null };
}

async function dbConnect(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      connectTimeoutMS: 5000, // Connection timeout
      maxPoolSize: 10, // Maintain up to 10 socket connections
      family: 4, // Use IPv4, skip trying IPv6
      retryWrites: true,
      retryReads: true,
    };

    cached.promise = (async () => {
      try {
        const connection = await mongoose.connect(MONGODB_URI!, opts);
        console.log("Database connected successfully");
        return connection;
      } catch (primaryError) {
        const canTryFallback =
          !!MONGODB_FALLBACK_URI && MONGODB_FALLBACK_URI !== MONGODB_URI;

        if (!canTryFallback) {
          throw new Error(
            [
              "Primary MongoDB connection failed.",
              "If you're using MongoDB Atlas, make sure your current IP is allowed in Atlas Network Access.",
              "Optional local fallback: set MONGODB_FALLBACK_URI=mongodb://127.0.0.1:27017/sajad_barakzai_hospital",
              `Original error: ${primaryError instanceof Error ? primaryError.message : String(primaryError)}`,
            ].join(" "),
          );
        }

        try {
          const fallbackConnection = await mongoose.connect(
            MONGODB_FALLBACK_URI!,
            opts,
          );
          console.warn(
            "Primary MongoDB connection failed; connected with MONGODB_FALLBACK_URI instead.",
          );
          return fallbackConnection;
        } catch (fallbackError) {
          throw new Error(
            [
              "Primary and fallback MongoDB connections both failed.",
              "If you're using MongoDB Atlas, make sure your current IP is allowed in Atlas Network Access.",
              "If using local MongoDB, ensure mongodb is running on the fallback URI host/port.",
              `Primary error: ${primaryError instanceof Error ? primaryError.message : String(primaryError)}`,
              `Fallback error: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
            ].join(" "),
          );
        }
      }
    })();
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error("Database connection failed:", e);
    throw e;
  }

  return cached.conn;
}

export default dbConnect;
