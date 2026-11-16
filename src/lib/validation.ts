export type SlotInput = { id: string; provider: string; start: string; end: string };
export type NewBooking = { slot_id: string; name: string; email: string };

type Validated<T> = { ok: true; value: T } | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

export function normaliseEmail(value: unknown): string | null {
  return typeof value === "string" ? value.trim().toLowerCase() : null;
}

export function validateResetBody(body: unknown): Validated<SlotInput[]> {
  if (!isPlainObject(body) || !Array.isArray(body.slots)) {
    return { ok: false, error: "slots must be an array" };
  }
  const seen = new Set<string>();
  const slots: SlotInput[] = [];
  for (const [i, item] of body.slots.entries()) {
    if (!isPlainObject(item)) return { ok: false, error: `slots[${i}] must be an object` };
    for (const field of ["id", "provider", "start", "end"] as const) {
      if (!nonEmptyString(item[field])) {
        return { ok: false, error: `slots[${i}].${field} is required` };
      }
    }
    const slot = item as SlotInput;
    for (const field of ["start", "end"] as const) {
      if (Number.isNaN(Date.parse(slot[field]))) {
        return { ok: false, error: `slots[${i}].${field} must be a date-time` };
      }
    }
    if (seen.has(slot.id)) return { ok: false, error: `duplicate slot id: ${slot.id}` };
    seen.add(slot.id);
    slots.push({ id: slot.id, provider: slot.provider, start: slot.start, end: slot.end });
  }
  return { ok: true, value: slots };
}

export function validateNewBooking(body: Record<string, unknown>): Validated<NewBooking> {
  for (const field of ["slot_id", "name", "email"] as const) {
    if (!nonEmptyString(body[field])) return { ok: false, error: `${field} is required` };
  }
  const email = normaliseEmail(body.email)!;
  if (!EMAIL_RE.test(email)) return { ok: false, error: "email is invalid" };
  return {
    ok: true,
    value: {
      slot_id: body.slot_id as string,
      name: (body.name as string).trim(),
      email,
    },
  };
}

export function parseLimit(raw: string | null): Validated<number> {
  if (raw === null) return { ok: true, value: 10 };
  if (!/^\d+$/.test(raw)) return { ok: false, error: "limit must be an integer between 1 and 50" };
  const n = Number(raw);
  if (n < 1 || n > 50) return { ok: false, error: "limit must be an integer between 1 and 50" };
  return { ok: true, value: n };
}

export function encodeCursor(seq: string): string {
  return Buffer.from(JSON.stringify({ seq })).toString("base64url");
}

export function decodeCursor(raw: string | null): Validated<string | null> {
  if (raw === null) return { ok: true, value: null };
  try {
    const parsed: unknown = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (isPlainObject(parsed) && typeof parsed.seq === "string" && /^\d{1,18}$/.test(parsed.seq)) {
      return { ok: true, value: parsed.seq };
    }
  } catch {}
  return { ok: false, error: "invalid cursor" };
}
