import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { getPool, isPgError, withTransaction } from "./db";
import { hashBody, lockAndLookup, storeResponse } from "./idempotency";
import { checkAndRecordAttempt } from "./rateLimit";
import { fail, ok, type ApiResult } from "./result";
import { decodeCursor, encodeCursor, normaliseEmail, parseLimit, validateNewBooking } from "./validation";

export type Booking = {
  id: string;
  slot_id: string;
  name: string;
  email: string;
  status: "confirmed" | "cancelled";
  created_at: string;
};

type BookingRow = Omit<Booking, "created_at"> & { seq: string; created_at: Date };

const BOOKING_COLUMNS = "seq, id, slot_id, name, email, status, created_at";

function toBooking(row: BookingRow): Booking {
  return {
    id: row.id,
    slot_id: row.slot_id,
    name: row.name,
    email: row.email,
    status: row.status,
    created_at: row.created_at.toISOString(),
  };
}

async function bookSlot(client: PoolClient, body: Record<string, unknown>): Promise<ApiResult<Booking>> {
  const validated = validateNewBooking(body);
  if (!validated.ok) return fail(400, validated.error);
  const { slot_id, name, email } = validated.value;

  const slot = await client.query<{ started: boolean }>(
    "SELECT start_at <= now() AS started FROM slots WHERE id = $1",
    [slot_id],
  );
  if (slot.rows.length === 0) return fail(404, "slot not found");
  if (slot.rows[0].started) return fail(400, "slot has already started");

  await client.query("SAVEPOINT book");
  try {
    const { rows } = await client.query<BookingRow>(
      `INSERT INTO bookings (id, slot_id, name, email, status)
       VALUES ($1, $2, $3, $4, 'confirmed')
       RETURNING ${BOOKING_COLUMNS}`,
      [randomUUID(), slot_id, name, email],
    );
    await client.query("RELEASE SAVEPOINT book");
    return ok(toBooking(rows[0]), 201);
  } catch (err) {
    await client.query("ROLLBACK TO SAVEPOINT book");
    if (isPgError(err) && err.code === "23505" && err.constraint === "one_confirmed_booking_per_slot") {
      return fail(409, "slot already booked");
    }
    if (isPgError(err) && err.code === "23503") return fail(404, "slot not found");
    throw err;
  }
}

export async function createBooking(
  body: Record<string, unknown>,
  idempotencyKey: string | null,
): Promise<ApiResult<Booking>> {
  const email = normaliseEmail(body.email);
  const bodyHash = idempotencyKey ? hashBody(body) : null;

  return withTransaction(async (client) => {
    if (idempotencyKey) {
      const stored = await lockAndLookup(client, idempotencyKey);
      if (stored) {
        if (stored.bodyHash !== bodyHash) {
          return fail(422, "Idempotency-Key reused with a different body");
        }
        return stored.result as ApiResult<Booking>;
      }
    }

    if (email) {
      const decision = await checkAndRecordAttempt(client, email);
      if (!decision.allowed) {
        return fail(429, "too many booking attempts, try again later", {
          "Retry-After": String(decision.retryAfter),
        });
      }
    }

    const result = await bookSlot(client, body);
    if (idempotencyKey) await storeResponse(client, idempotencyKey, bodyHash!, result);
    return result;
  });
}

export async function getBooking(id: string): Promise<Booking | null> {
  const { rows } = await getPool().query<BookingRow>(
    `SELECT ${BOOKING_COLUMNS} FROM bookings WHERE id = $1`,
    [id],
  );
  return rows.length ? toBooking(rows[0]) : null;
}

export async function cancelBooking(id: string): Promise<ApiResult<Booking>> {
  const { rows } = await getPool().query<BookingRow>(
    `UPDATE bookings SET status = 'cancelled'
     WHERE id = $1 AND status = 'confirmed'
     RETURNING ${BOOKING_COLUMNS}`,
    [id],
  );
  if (rows.length) return ok(toBooking(rows[0]));
  const existing = await getBooking(id);
  if (!existing) return fail(404, "booking not found");
  return fail(409, "booking already cancelled");
}

export type BookingPage = { bookings: Booking[]; next_cursor: string | null };

export async function listBookings(params: {
  email: string | null;
  limit: string | null;
  cursor: string | null;
}): Promise<ApiResult<BookingPage>> {
  const email = normaliseEmail(params.email);
  if (!email) return fail(400, "email is required");
  const limit = parseLimit(params.limit);
  if (!limit.ok) return fail(400, limit.error);
  const cursor = decodeCursor(params.cursor);
  if (!cursor.ok) return fail(400, cursor.error);

  const { rows } = await getPool().query<BookingRow>(
    `SELECT ${BOOKING_COLUMNS} FROM bookings
     WHERE email = $1 AND ($2::bigint IS NULL OR seq > $2::bigint)
     ORDER BY seq
     LIMIT $3`,
    [email, cursor.value, limit.value + 1],
  );
  const page = rows.slice(0, limit.value);
  const hasMore = rows.length > limit.value;
  return ok({
    bookings: page.map(toBooking),
    next_cursor: hasMore ? encodeCursor(page[page.length - 1].seq) : null,
  });
}
