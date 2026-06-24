import { test, expect } from "@playwright/test";

test("should import db schema containing apiKeys successfully", async () => {
  const schema = await import("../../src/db/schema");
  expect(schema.apiKeys).toBeDefined();
});
