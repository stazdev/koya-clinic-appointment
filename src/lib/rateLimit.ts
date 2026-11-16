import type { PoolClient } from "pg";
import { getPool } from "./db";

const RATE_LIMIT_LOCK = 1;
export const MAX_ATTEMPTS = 5;

export type RateLimitDecision = { allowed: true } | { allowed: false; retryAfter: number };

export async function checkAndRecordAttempt(client: PoolClient, email: string): Promise<RateLimitDecision> {
  await client.query("SELECT pg_advisory_xact_lock($1, hashtext($2))", [RATE_LIMIT_LOCK, email]);
  const { rows } = await client.query<{ count: number; retry_after: number | null }>(
    `SELECT count(*)::int AS count,
            ceil(extract(epoch FROM (min(at) + interval '60 seconds' - clock_timestamp())))::int AS retry_after
     FROM booking_attempts
     WHERE email = $1 AND at > clock_timestamp() - interval '60 seconds'`,
    [email],
  );
  const { count, retry_after } = rows[0];
  if (count >= MAX_ATTEMPTS) {
    return { allowed: false, retryAfter: Math.min(60, Math.max(1, retry_after ?? 1)) };
  }
  await client.query("INSERT INTO booking_attempts (email) VALUES ($1)", [email]);

  if (Math.random() < 0.02) {
    getPool()
      .query("DELETE FROM booking_attempts WHERE at < clock_timestamp() - interval '10 minutes'")
      .catch((err) => console.error("attempt cleanup failed", err));
  }

  return { allowed: true };
}
