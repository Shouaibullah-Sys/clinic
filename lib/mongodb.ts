// lib/mongodb.ts
import mongoose from "mongoose";
import { MongoClient } from "mongodb";
import { assertOfflineMongoUri } from "@/lib/mongo-config";

declare global {
  var mongoose: {
    conn: mongoose.Mongoose | null;
    promise: Promise<mongoose.Mongoose> | null;
  };
  var mongoClient: MongoClient | null;
}

const MONGODB_URI = assertOfflineMongoUri("MONGODB_URI", process.env.MONGODB_URI);

if (!MONGODB_URI) {
  throw new Error("Please define MONGODB_URI environment variable");
}

let cached = global.mongoose;
let clientCached = global.mongoClient;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}
if (!clientCached) {
  clientCached = global.mongoClient = null;
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts);
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

// Export MongoDB client - lazily initialized
let mongoClientInstance: MongoClient | null = null;

export async function getMongoClient(): Promise<MongoClient> {
  if (mongoClientInstance) {
    return mongoClientInstance;
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  mongoClientInstance = client;
  return client;
}

// For backward compatibility
export default dbConnect;

// Export client as a getter function
export const client = (): Promise<MongoClient> => getMongoClient();
