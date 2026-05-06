// lib/mongodb.ts - DEPRECATED
// This project uses Prisma/SQLite. This file is kept for backward compatibility.

export default async function dbConnect() {
  return;
}

export async function getMongoClient(): Promise<null> {
  return null;
}

export const client = getMongoClient;