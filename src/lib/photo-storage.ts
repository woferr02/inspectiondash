"use client";

import { ref, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";

/** Cache resolved URLs to avoid re-fetching the same path */
const urlCache = new Map<string, string>();

/**
 * Resolve a Firebase Storage path (e.g. "inspections/abc/photos/img1.jpg")
 * to a full download URL.  Falls back gracefully if the path doesn't exist.
 */
export async function resolvePhotoUrl(path: string): Promise<string | null> {
  if (urlCache.has(path)) return urlCache.get(path)!;
  try {
    const storageRef = ref(storage, path);
    const url = await getDownloadURL(storageRef);
    urlCache.set(path, url);
    return url;
  } catch {
    // File doesn't exist or permission denied — return null
    return null;
  }
}

/**
 * Resolve multiple photo paths in parallel.
 * Returns only successfully resolved URLs (nulls filtered out).
 */
export async function resolvePhotoUrls(paths: string[]): Promise<string[]> {
  const results = await Promise.all(paths.map(resolvePhotoUrl));
  return results.filter((url): url is string => url !== null);
}
