import { beforeEach, describe, expect, it } from "vitest";
import { api, book, futureSlot, pastSlot, reset, uniqueEmail } from "./helpers";

describe("Level 2", () => {
  beforeEach(() => reset([futureSlot("s1", 24), futureSlot("s2", 48), pastSlot("old")]));

  const endpoints: [string, string, unknown?][] = [
    ["POST", "/reset", { slots: [] }],
    ["GET", "/slots"],
    ["POST", "/bookings", { slot_id: "s1", name: "A", email: "a@example.com" }],
    ["GET", "/bookings?email=a@example.com"],
    ["GET", "/bookings/abc"],
    ["DELETE", "/bookings/abc"],
  ];

  for (const [method, path, body] of endpoints) {
    it(`${method} ${path} needs a valid API key`, async () => {
      for (const apiKey of [null, "wrong-key", ""]) {
        const res = await api(path, { method, body, apiKey });
        expect(res.status).toBe(401);
        expect(typeof res.body.error).toBe("string");
      }
    });
  }

  it("a request without a key changes nothing", async () => {
    await api("/reset", { method: "POST", body: { slots: [] }, apiKey: null });
    expect((await api("/slots")).body.slots).toHaveLength(3);
  });

  it("rejects missing, empty or whitespace-only fields", async () => {
    for (const field of ["slot_id", "name", "email"]) {
      for (const value of [undefined, "", "   ", 42, null]) {
        const res = await book({ slot_id: "s1", name: "Ada Obi", email: uniqueEmail(), [field]: value });
        expect(res.status, `${field}=${JSON.stringify(value)}`).toBe(400);
        expect(typeof res.body.error).toBe("string");
      }
    }
  });

  it("rejects an invalid email", async () => {
    for (const email of ["not-an-email", "a@b", "a b@example.com", "@example.com"]) {
      expect((await book({ slot_id: "s1", name: "Ada", email })).status).toBe(400);
    }
  });

  it("returns 404 for an unknown slot", async () => {
    const res = await book({ slot_id: "nope", name: "Ada", email: uniqueEmail() });
    expect(res.status).toBe(404);
    expect(typeof res.body.error).toBe("string");
  });

  it("returns 400 for a slot that has already started", async () => {
    const res = await book({ slot_id: "old", name: "Ada", email: uniqueEmail() });
    expect(res.status).toBe(400);
  });

  it("trims name and email and lower-cases email", async () => {
    const res = await book({ slot_id: "s1", name: "  Ada Obi  ", email: "  ADA@Example.COM " });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Ada Obi");
    expect(res.body.email).toBe("ada@example.com");
  });

  it("rejects invalid JSON", async () => {
    for (const rawBody of ["{not json", "[]", '"text"', ""]) {
      const res = await api("/bookings", { method: "POST", rawBody });
      expect(res.status).toBe(400);
      expect(typeof res.body.error).toBe("string");
    }
  });

  it("returns JSON 404 for unknown API routes", async () => {
    const res = await api("/api/unknown");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "not found" });
  });
});
