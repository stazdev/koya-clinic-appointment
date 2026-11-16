import { beforeEach, describe, expect, it } from "vitest";
import { api, book, futureSlot, reset, uniqueEmail } from "./helpers";

describe("Level 3", () => {
  beforeEach(() => reset([futureSlot("s1", 24), futureSlot("s2", 48)]));

  it("returns 409 for a slot that already has a confirmed booking", async () => {
    expect((await book({ slot_id: "s1", name: "A", email: uniqueEmail() })).status).toBe(201);
    const res = await book({ slot_id: "s1", name: "B", email: uniqueEmail() });
    expect(res.status).toBe(409);
    expect(typeof res.body.error).toBe("string");
  });

  it("allows exactly one booking when 50 requests arrive at once", async () => {
    const results = await Promise.all(
      Array.from({ length: 50 }, (_, i) => book({ slot_id: "s1", name: `P${i}`, email: uniqueEmail() })),
    );
    const statuses = results.map((r) => r.status);
    expect(statuses.filter((s) => s === 201)).toHaveLength(1);
    expect(statuses.filter((s) => s === 409)).toHaveLength(49);
    const slots = await api("/slots");
    expect(slots.body.slots.find((s: { id: string }) => s.id === "s1").available).toBe(false);
  });

  it("cancels a booking and frees the slot", async () => {
    const created = await book({ slot_id: "s1", name: "A", email: uniqueEmail() });
    const cancelled = await api(`/bookings/${created.body.id}`, { method: "DELETE" });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body).toEqual({ ...created.body, status: "cancelled" });
    expect((await api(`/bookings/${created.body.id}`)).body.status).toBe("cancelled");

    const slots = await api("/slots");
    expect(slots.body.slots.find((s: { id: string }) => s.id === "s1").available).toBe(true);
    expect((await book({ slot_id: "s1", name: "B", email: uniqueEmail() })).status).toBe(201);
  });

  it("returns 409 when cancelling twice and 404 for an unknown booking", async () => {
    const created = await book({ slot_id: "s1", name: "A", email: uniqueEmail() });
    expect((await api(`/bookings/${created.body.id}`, { method: "DELETE" })).status).toBe(200);
    const again = await api(`/bookings/${created.body.id}`, { method: "DELETE" });
    expect(again.status).toBe(409);
    expect(typeof again.body.error).toBe("string");
    expect((await api("/bookings/unknown", { method: "DELETE" })).status).toBe(404);
  });

  it("gives one 200 and one 409 for two simultaneous cancels", async () => {
    const created = await book({ slot_id: "s1", name: "A", email: uniqueEmail() });
    const statuses = (
      await Promise.all([1, 2].map(() => api(`/bookings/${created.body.id}`, { method: "DELETE" })))
    ).map((r) => r.status);
    expect(statuses.sort()).toEqual([200, 409]);
  });
});
