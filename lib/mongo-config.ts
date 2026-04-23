function stripQuotes(value: string): string {
  return value.replace(/^['"]|['"]$/g, "");
}

export function normalizeMongoUri(uri?: string): string | undefined {
  if (!uri) return undefined;
  const normalized = stripQuotes(uri.trim());
  return normalized || undefined;
}

export function getAppMode(): string {
  return (process.env.APP_MODE || "online").trim().toLowerCase();
}

export function isOfflineMode(): boolean {
  return getAppMode() === "offline";
}

export function isLocalMongoUri(uri?: string): boolean {
  if (!uri) return false;

  try {
    const parsed = new URL(uri);
    if (parsed.protocol !== "mongodb:") {
      return false;
    }

    return ["127.0.0.1", "localhost", "::1"].includes(parsed.hostname);
  } catch {
    return false;
  }
}

export function assertOfflineMongoUri(
  name: string,
  uri: string | undefined,
): string {
  const normalized = normalizeMongoUri(uri);

  if (!normalized) {
    throw new Error(`Missing required MongoDB setting: ${name}`);
  }

  if (isOfflineMode() && !isLocalMongoUri(normalized)) {
    throw new Error(
      [
        `${name} must point to a local MongoDB server when APP_MODE=offline.`,
        `Received: ${normalized}`,
        "Expected something like mongodb://127.0.0.1:27017/sajad_barakzai_hospital",
      ].join(" "),
    );
  }

  return normalized;
}

