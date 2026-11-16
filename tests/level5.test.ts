import { beforeEach, describe, expect, it } from "vitest";
import { book, futureSlot, reset, uniqueEmail } from "./helpers";

describe("Level 5: rate limiting", () => {
  beforeEach(() => reset([futureSlot("s1", 24), futureSlot("s2", 48)]));

  it("allows 5 attempts per email per minute, failed ones included, then returns 429", async () => {
    const email = uniqueEmail();
    const statuses = [];
    statuses.push((await book({ slot_id: "s1", name: "Ada", email })).status);
    statuses.push((await book({ slot_id: "s1", name: "Ada", email })).status);
    statuses.push((await book({ slot_id: "nope", name: "Ada", email })).status);
    statuses.push((await book({ slot_id: "s2", name: "", email })).status);
    statuses.push((await book({ slot_id: "s2", name: "Ada", email: email.toUpperCase() })).status);
    expect(statuses).toEqual([201, 409, 404, 400, 201]);

    const sixth = await book({ slot_id: "s2", name: "Ada", email });
    expect(sixth.status).toBe(429);
    expect(typeof sixth.body.error).toBe("string");
    const retryAfter = sixth.headers.get("Retry-After");
    expect(retryAfter).toMatch(/^\d+$/);
    expect(Number(retryAfter)).toBeGreaterThanOrEqual(1);
    expect(Number(retryAfter)).toBeLessThanOrEqual(60);
  });

  it("does not affect other emails", async () => {
    const limited = uniqueEmail();
    for (let i = 0; i < 6; i++) await book({ slot_id: "nope", name: "Ada", email: limited });
    expect((await book({ slot_id: "s1", name: "Ada", email: uniqueEmail() })).status).toBe(201);
  });

  it("is cleared by /reset", async () => {
    const email = uniqueEmail();
    for (let i = 0; i < 6; i++) await book({ slot_id: "nope", name: "Ada", email });
    await reset([futureSlot("s1", 24)]);
    expect((await book({ slot_id: "s1", name: "Ada", email })).status).toBe(201);
  });

  it("lets at most 5 of a simultaneous burst through", async () => {
    const email = uniqueEmail();
    const results = await Promise.all(
      Array.from({ length: 10 }, () => book({ slot_id: "nope", name: "Ada", email })),
    );
    const statuses = results.map((r) => r.status);
    expect(statuses.filter((s) => s === 404)).toHaveLength(5);
    expect(statuses.filter((s) => s === 429)).toHaveLength(5);
  });
});
