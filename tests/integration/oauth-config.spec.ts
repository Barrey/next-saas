import { test, expect } from "@playwright/test";

test("should load oauth configurations correctly", async () => {
  const oauth = await import("../../src/lib/auth/oauth");
  expect(oauth.googleOAuth).toBeDefined();
  expect(oauth.githubOAuth).toBeDefined();
  expect(oauth.facebookOAuth).toBeDefined();
});
