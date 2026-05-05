/* ─── Input sanitization ──────────────────────────────────────────────────── */

/** Strips HTML tags, null bytes, and control characters. Safe for display. */
export function sanitizeText(raw: string): string {
  return raw
    .replace(/\0/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/[<>"'`\\]/g, "")
    .slice(0, 2000)
    .trim();
}

/** Validates a Supabase storage path: only allow UUID/timestamp/alphanumeric paths. */
export function isValidStoragePath(path: string): boolean {
  if (!path || typeof path !== "string") return false;
  if (path.length > 500) return false;
  /* Allows: UUID, numbers, letters, hyphens, underscores, dots, forward slashes.
     Blocks: ../ traversal, null bytes, query strings, percent-encoded sequences. */
  return /^[a-zA-Z0-9/_\-\.]+$/.test(path) && !path.includes("../") && !path.includes("./");
}

/* ─── Signed URL helpers ──────────────────────────────────────────────────── */
import { supabase } from "@/lib/supabase";

const SIGNED_URL_TTL = 300; // 5 minutes

export async function getSignedUrl(bucket: string, path: string): Promise<string | null> {
  if (!isValidStoragePath(path)) return null;
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, SIGNED_URL_TTL);
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}

export async function getSignedUrls(
  bucket: string,
  paths: Record<string, string>
): Promise<Record<string, string | null>> {
  const entries = Object.entries(paths).filter(([, p]) => Boolean(p));
  const results = await Promise.all(
    entries.map(async ([key, path]) => [key, await getSignedUrl(bucket, path)] as const)
  );
  return Object.fromEntries(results);
}
