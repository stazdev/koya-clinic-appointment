import { createHash, timingSafeEqual } from "node:crypto";

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

export function isValidApiKey(provided: string | null): boolean {
  const expected = process.env.API_KEY;
  if (!expected) {
    console.error("API_KEY is not configured; rejecting all API requests");
    return false;
  }
  if (!provided) return false;
  return timingSafeEqual(digest(provided), digest(expected));
}
