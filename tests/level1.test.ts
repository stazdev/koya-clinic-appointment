import { beforeEach, describe, expect, it } from "vitest";
import { api, book, futureSlot, reset, uniqueEmail } from "./helpers";

const slots = [
  futureSlot("s3", 72, "Dr Bello"),
  futureSlot("s1", 24),
  futureSlot("s2", 48),
  { id: "s4", provider: "Dr Ade", start: "2099-12-10T09:00:00Z", end: "2099-12-10T09:30:00Z" },
];

describe("Level 1", () => {
  beforeEach(() => reset(slots));

  it("lists every slot, earliest first, available, with timestamps echoed exactly", async () => {
    const res = await api("/slots");
    expect(res.status).toBe(200);
    expect(res.body.slots.map((s: { id: string }) => s.id)).toEqual(["s1", "s2", "s3", "s4"]);
    for (const slot of res.body.slots) expect(slot.available).toBe(true);
    expect(res.body.slots[3]).toEqual({
      id: "s4",
      provider: "Dr Ade",
      start: "2099-12-10T09:00:00Z",
      end: "2099-12-10T09:30:00Z",
      available: true,
    });
  });

  it("filters by provider with an exact match", async () => {
    const ade = await api(`/slots?provider=${encodeURIComponent("Dr Ade")}`);
    expect(ade.body.slots.map((s: { id: string }) => s.id)).toEqual(["s1", "s2", "s4"]);
    const lower = await api(`/slots?provider=${encodeURIComponent("dr ade")}`);
    expect(lower.body.slots).toEqual([]);
  });

  it("books a slot and returns the booking", async () => {
    const email = uniqueEmail();
    const res = await book({ slot_id: "s1", name: "Ada Obi", email });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ slot_id: "s1", name: "Ada Obi", email, status: "confirmed" });
    expect(typeof res.body.id).toBe("string");
    expect(Number.isNaN(Date.parse(res.body.created_at))).toBe(false);

    const fetched = await api(`/bookings/${res.body.id}`);
    expect(fetched.status).toBe(200);
    expect(fetched.body).toEqual(res.body);
  });

  it("marks a booked slot unavailable", async () => {
    await book({ slot_id: "s2", name: "Ada Obi", email: uniqueEmail() });
    const res = await api("/slots");
    const byId = Object.fromEntries(res.body.slots.map((s: { id: string; available: boolean }) => [s.id, s.available]));
    expect(byId).toEqual({ s1: true, s2: false, s3: true, s4: true });
  });

  it("returns 404 for an unknown booking", async () => {
    const res = await api("/bookings/does-not-exist");
    expect(res.status).toBe(404);
    expect(typeof res.body.error).toBe("string");
  });

  it("also serves the API under /api", async () => {
    const res = await api("/api/slots");
    expect(res.status).toBe(200);
    expect(res.body.slots).toHaveLength(4);
  });

  it("reset deletes all bookings", async () => {
    const created = await book({ slot_id: "s1", name: "Ada Obi", email: uniqueEmail() });
    await reset(slots);
    expect((await api(`/bookings/${created.body.id}`)).status).toBe(404);
    expect((await api("/slots")).body.slots.every((s: { available: boolean }) => s.available)).toBe(true);
  });

  it("reset rejects a malformed body", async () => {
    expect((await api("/reset", { method: "POST", body: { nope: [] } })).status).toBe(400);
    expect((await api("/reset", { method: "POST", body: { slots: [{ id: "x" }] } })).status).toBe(400);
  });
});
