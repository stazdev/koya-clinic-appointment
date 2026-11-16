import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import type { ApiResult } from "./result";

const IDEMPOTENCY_LOCK = 2;

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const entries = Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonicalJson((value as Record<string, unknown>)[k])}`);
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value);
}

export function hashBody(body: unknown): string {
  return createHash("sha256").update(canonicalJson(body)).digest("hex");
}

export type StoredResponse = { bodyHash: string; result: ApiResult };

export async function lockAndLookup(client: PoolClient, key: string): Promise<StoredResponse | null> {
  await client.query("SELECT pg_advisory_xact_lock($1, hashtext($2))", [IDEMPOTENCY_LOCK, key]);
  const { rows } = await client.query<{ body_hash: string; status_code: number; response: unknown }>(
    "SELECT body_hash, status_code, response FROM idempotency_keys WHERE key = $1",
    [key],
  );
  if (rows.length === 0) return null;
  return { bodyHash: rows[0].body_hash, result: { status: rows[0].status_code, body: rows[0].response } };
}

export async function storeResponse(client: PoolClient, key: string, bodyHash: string, result: ApiResult) {
  await client.query(
    "INSERT INTO idempotency_keys (key, body_hash, status_code, response) VALUES ($1, $2, $3, $4)",
    [key, bodyHash, result.status, JSON.stringify(result.body)],
  );
}
