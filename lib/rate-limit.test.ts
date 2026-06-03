import { describe, expect, it } from "vitest";
import { rateLimit } from "./rate-limit";

describe("rateLimit", () => {
  it("allows up to max requests then rejects further ones", () => {
    const key = `test:${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      expect(rateLimit(key, 5, 60_000).allowed).toBe(true);
    }
    const sixth = rateLimit(key, 5, 60_000);
    expect(sixth.allowed).toBe(false);
    if (!sixth.allowed) expect(sixth.retryAfterMs).toBeGreaterThan(0);
  });

  it("keys are independent", () => {
    const a = `a:${Math.random()}`;
    const b = `b:${Math.random()}`;
    expect(rateLimit(a, 1, 60_000).allowed).toBe(true);
    expect(rateLimit(a, 1, 60_000).allowed).toBe(false);
    expect(rateLimit(b, 1, 60_000).allowed).toBe(true);
  });
});
