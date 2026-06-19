import { test, expect } from "@playwright/test";

test("should import db schema without runtime syntax errors", async () => {
  const schema = await import("../../src/db/schema");
  expect(schema.users).toBeDefined();
  expect(schema.sessions).toBeDefined();
  expect(schema.verificationTokens).toBeDefined();
  expect(schema.users.googleId).toBeDefined();
  expect(schema.users.githubId).toBeDefined();
  expect(schema.users.facebookId).toBeDefined();
});
