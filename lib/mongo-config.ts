/**
 * MongoDB configuration - DEPRECATED.
 * This project uses Prisma/SQLite now. These functions are kept as no-ops.
 */

export function normalizeMongoUri(_uri?: string): string | undefined {
  return undefined;
}

export function getAppMode(): string {
  return process.env.APP_MODE || "offline";
}

export function isOfflineMode(): boolean {
  return getAppMode() === "offline";
}

export function isLocalMongoUri(_uri?: string): boolean {
  return true;
}

export function assertOfflineMongoUri(_name: string, _uri: string | undefined): string {
  return "";
}