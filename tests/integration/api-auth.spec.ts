import { test, expect } from "@playwright/test";
import { isRateLimited } from "../../src/lib/auth/rate-limiter";

test("should rate limit keys when threshold is hit", () => {
  const key = "test_key_limit";
  for (let i = 0; i < 60; i++) {
    expect(isRateLimited(key, 60, 5000)).toBe(false);
  }
  expect(isRateLimited(key, 60, 5000)).toBe(true);
});
