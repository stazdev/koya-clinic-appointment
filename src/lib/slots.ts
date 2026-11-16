import { getPool, withTransaction } from "./db";
import type { SlotInput } from "./validation";

export type Slot = { id: string; provider: string; start: string; end: string };
export type SlotWithAvailability = Slot & { available: boolean };
export type SlotView = SlotWithAvailability & { started: boolean };

type SlotRow = {
  id: string;
  provider: string;
  start_raw: string;
  end_raw: string;
  available: boolean;
  started: boolean;
};

function toView(row: SlotRow): SlotView {
  return {
    id: row.id,
    provider: row.provider,
    start: row.start_raw,
    end: row.end_raw,
    available: row.available,
    started: row.started,
  };
}

export function toPublicSlot({ id, provider, start, end, available }: SlotView): SlotWithAvailability {
  return { id, provider, start, end, available };
}

export async function resetSlots(slots: SlotInput[]): Promise<number> {
  await withTransaction(async (client) => {
    await client.query(
      "TRUNCATE bookings, slots, idempotency_keys, booking_attempts RESTART IDENTITY",
    );
    if (slots.length === 0) return;
    await client.query(
      `INSERT INTO slots (id, provider, start_raw, end_raw, start_at, end_at)
       SELECT * FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::timestamptz[], $6::timestamptz[])`,
      [
        slots.map((s) => s.id),
        slots.map((s) => s.provider),
        slots.map((s) => s.start),
        slots.map((s) => s.end),
        slots.map((s) => new Date(s.start).toISOString()),
        slots.map((s) => new Date(s.end).toISOString()),
      ],
    );
  });
  return slots.length;
}

const SLOT_SELECT = `
  SELECT s.id, s.provider, s.start_raw, s.end_raw,
         NOT EXISTS (SELECT 1 FROM bookings b WHERE b.slot_id = s.id AND b.status = 'confirmed') AS available,
         s.start_at <= now() AS started
  FROM slots s`;

export async function listSlots(provider: string | null): Promise<SlotView[]> {
  const { rows } = await getPool().query<SlotRow>(
    `${SLOT_SELECT}
     WHERE ($1::text IS NULL OR s.provider = $1)
     ORDER BY s.start_at, s.id`,
    [provider],
  );
  return rows.map(toView);
}

export async function getSlotsByIds(ids: string[]): Promise<Map<string, SlotView>> {
  if (ids.length === 0) return new Map();
  const { rows } = await getPool().query<SlotRow>(`${SLOT_SELECT} WHERE s.id = ANY($1::text[])`, [ids]);
  return new Map(rows.map((row) => [row.id, toView(row)]));
}

export async function listProviders(): Promise<string[]> {
  const { rows } = await getPool().query<{ provider: string }>(
    "SELECT DISTINCT provider FROM slots ORDER BY provider",
  );
  return rows.map((r) => r.provider);
}
