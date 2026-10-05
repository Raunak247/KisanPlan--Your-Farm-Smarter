import { readStored, writeStored } from "./storage";

export type CacheSource = "network" | "cache";
export type CachedValue<T> = { value: T; fetchedAt: string; source: CacheSource };

export const CACHE_MAX_AGE_MS = 6 * 60 * 60 * 1000;

export function coordinateCacheKey(kind: string, latitude: number, longitude: number): string {
  return `kisanplan:cache:${kind}:${latitude.toFixed(4)}:${longitude.toFixed(4)}`;
}

export async function readCache<T>(key: string): Promise<CachedValue<T> | null> {
  return readStored<CachedValue<T>>(key);
}

export async function writeCache<T>(key: string, value: T): Promise<CachedValue<T>> {
  const fetchedAt =
    typeof value === "object" &&
    value !== null &&
    "fetchedAt" in value &&
    typeof value.fetchedAt === "string"
      ? value.fetchedAt
      : new Date().toISOString();
  const cached: CachedValue<T> = { value, fetchedAt, source: "network" };
  await writeStored(key, cached);
  return cached;
}

export function cacheFreshness(fetchedAt: string | null): "fresh" | "stale" | "none" {
  if (!fetchedAt) return "none";
  return Date.now() - Date.parse(fetchedAt) <= CACHE_MAX_AGE_MS ? "fresh" : "stale";
}
