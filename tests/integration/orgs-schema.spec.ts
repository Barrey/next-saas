import { test, expect } from "@playwright/test";

test("should load organizations and invitations schemas successfully", async () => {
  const schema = await import("../../src/db/schema");
  expect(schema.organizations).toBeDefined();
  expect(schema.invitations).toBeDefined();
});
