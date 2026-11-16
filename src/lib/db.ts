import { Pool, type PoolClient } from "pg";

const globalForPool = globalThis as unknown as { pgPool?: Pool; pgPoolUrl?: string };

function createPool(connectionString: string | undefined) {
  const pool = new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 10_000,
  });
  pool.on("error", (err) => console.error("pg pool error", err));
  return pool;
}

export function getPool(): Pool {
  const url = process.env.DATABASE_URL;
  if (!globalForPool.pgPool || globalForPool.pgPoolUrl !== url) {
    globalForPool.pgPool?.end().catch(() => {});
    globalForPool.pgPool = createPool(url);
    globalForPool.pgPoolUrl = url;
  }
  return globalForPool.pgPool;
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export function isPgError(err: unknown): err is { code: string; constraint?: string } {
  return typeof err === "object" && err !== null && typeof (err as { code?: unknown }).code === "string";
}
