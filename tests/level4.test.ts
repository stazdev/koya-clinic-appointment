import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { api, book, futureSlot, type ApiResponse, reset, uniqueEmail } from "./helpers";

const slots = Array.from({ length: 12 }, (_, i) => futureSlot(`s${i + 1}`, 24 + i));

function withKey(key: string) {
  return { "Idempotency-Key": key };
}

describe("Level 4: idempotency", () => {
  beforeEach(() => reset(slots));

  it("replays the same response for the same key and body", async () => {
    const key = randomUUID();
    const body = { slot_id: "s1", name: "Ada", email: uniqueEmail() };
    const first = await book(body, withKey(key));
    const second = await book(body, withKey(key));
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body).toEqual(first.body);
    const list = await api(`/bookings?email=${encodeURIComponent(body.email)}`);
    expect(list.body.bookings).toHaveLength(1);
  });

  it("creates one booking when retries arrive at the same moment", async () => {
    const key = randomUUID();
    const body = { slot_id: "s2", name: "Ada", email: uniqueEmail() };
    const results = await Promise.all(Array.from({ length: 10 }, () => book(body, withKey(key))));
    expect(results.map((r) => r.status)).toEqual(Array(10).fill(201));
    expect(new Set(results.map((r) => r.body.id)).size).toBe(1);
    const list = await api(`/bookings?email=${encodeURIComponent(body.email)}`);
    expect(list.body.bookings).toHaveLength(1);
  });

  it("does not count replays towards the rate limit", async () => {
    const key = randomUUID();
    const body = { slot_id: "s8", name: "Ada", email: uniqueEmail() };
    for (let i = 0; i < 8; i++) {
      const res = await book(body, withKey(key));
      expect(res.status, `retry ${i + 1}`).toBe(201);
    }
  });

  it("returns 422 when a key is reused with a different body", async () => {
    const key = randomUUID();
    const email = uniqueEmail();
    expect((await book({ slot_id: "s3", name: "Ada", email }, withKey(key))).status).toBe(201);
    const res = await book({ slot_id: "s4", name: "Ada", email }, withKey(key));
    expect(res.status).toBe(422);
    expect(typeof res.body.error).toBe("string");
  });

  it("treats the same JSON with a different key order as the same body", async () => {
    const key = randomUUID();
    const email = uniqueEmail();
    const first = await book({ slot_id: "s5", name: "Ada", email }, withKey(key));
    const second = await book({ email, name: "Ada", slot_id: "s5" }, withKey(key));
    expect(second.status).toBe(201);
    expect(second.body.id).toBe(first.body.id);
  });

  it("replays a stored error response", async () => {
    await book({ slot_id: "s6", name: "First", email: uniqueEmail() });
    const key = randomUUID();
    const body = { slot_id: "s6", name: "Ada", email: uniqueEmail() };
    expect((await book(body, withKey(key))).status).toBe(409);
    expect((await book(body, withKey(key))).status).toBe(409);
  });

  it("does not replay across different keys", async () => {
    const email = uniqueEmail();
    expect((await book({ slot_id: "s7", name: "Ada", email }, withKey(randomUUID()))).status).toBe(201);
    expect((await book({ slot_id: "s7", name: "Ada", email }, withKey(randomUUID()))).status).toBe(409);
  });
});

describe("Level 4: listing a person's bookings", () => {
  beforeEach(() => reset(slots));

  it("pages through bookings oldest first, ignoring email case", async () => {
    const email = uniqueEmail("pager");
    const casings = [email, email.toUpperCase(), ` ${email} `, email, email.replace("pager", "PAGER")];
    const ids: string[] = [];
    for (const [i, variant] of casings.entries()) {
      const res = await book({ slot_id: `s${i + 1}`, name: "Ada", email: variant });
      expect(res.status).toBe(201);
      ids.push(res.body.id);
    }
    await book({ slot_id: "s9", name: "Someone else", email: uniqueEmail() });

    const seen: string[] = [];
    const pageSizes: number[] = [];
    let cursor: string | null = null;
    do {
      const query: string = `email=${encodeURIComponent(email.toUpperCase())}&limit=2${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;
      const res: ApiResponse = await api(`/bookings?${query}`);
      expect(res.status).toBe(200);
      pageSizes.push(res.body.bookings.length);
      seen.push(...res.body.bookings.map((b: { id: string }) => b.id));
      cursor = res.body.next_cursor;
    } while (cursor);

    expect(pageSizes).toEqual([2, 2, 1]);
    expect(seen).toEqual(ids);
  });

  it("uses a default limit of 10 and returns null next_cursor on the last page", async () => {
    const email = uniqueEmail();
    await book({ slot_id: "s1", name: "Ada", email });
    const res = await api(`/bookings?email=${encodeURIComponent(email)}`);
    expect(res.status).toBe(200);
    expect(res.body.bookings).toHaveLength(1);
    expect(res.body.next_cursor).toBeNull();
  });

  it("includes cancelled bookings", async () => {
    const email = uniqueEmail();
    const created = await book({ slot_id: "s1", name: "Ada", email });
    await api(`/bookings/${created.body.id}`, { method: "DELETE" });
    const res = await api(`/bookings?email=${encodeURIComponent(email)}`);
    expect(res.body.bookings.map((b: { status: string }) => b.status)).toEqual(["cancelled"]);
  });

  it("returns an empty page for an email with no bookings", async () => {
    const res = await api(`/bookings?email=${encodeURIComponent(uniqueEmail())}`);
    expect(res.body).toEqual({ bookings: [], next_cursor: null });
  });

  it("rejects an invalid limit, cursor or missing email", async () => {
    const email = encodeURIComponent(uniqueEmail());
    for (const limit of ["0", "51", "-1", "abc", "1.5", ""]) {
      const res = await api(`/bookings?email=${email}&limit=${encodeURIComponent(limit)}`);
      expect(res.status, `limit=${limit}`).toBe(400);
      expect(typeof res.body.error).toBe("string");
    }
    for (const limit of ["1", "50"]) {
      expect((await api(`/bookings?email=${email}&limit=${limit}`)).status).toBe(200);
    }
    expect((await api(`/bookings?email=${email}&cursor=garbage`)).status).toBe(400);
    expect((await api("/bookings")).status).toBe(400);
    expect((await api("/bookings?email=")).status).toBe(400);
  });
});
