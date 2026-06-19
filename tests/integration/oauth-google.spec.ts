import { test, expect } from "@playwright/test";

test.describe("Google OAuth Routes", () => {
  test("redirect route returns 302 and sets state cookie", async ({ request }) => {
    const res = await request.get("/api/auth/oauth/google/redirect", { maxRedirects: 0 });
    expect(res.status()).toBe(307);
    expect(res.headers()["location"]).toContain("accounts.google.com");
    expect(res.headers()["set-cookie"]).toContain("google_oauth_state");
    expect(res.headers()["set-cookie"]).toContain("google_oauth_code_verifier");
  });

  test("callback route returns 400 when code/state is missing", async ({ request }) => {
    const res = await request.get("/api/auth/oauth/google/callback");
    expect(res.status()).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid OAuth state or parameters.");
  });
});
