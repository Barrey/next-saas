import { test, expect } from "@playwright/test";

test.describe("Facebook OAuth Routes", () => {
  test("redirect route returns 307 and sets state cookie", async ({ request }) => {
    const res = await request.get("/api/auth/oauth/facebook/redirect", { maxRedirects: 0 });
    expect(res.status()).toBe(307);
    expect(res.headers()["location"]).toContain("facebook.com");
    expect(res.headers()["set-cookie"]).toContain("facebook_oauth_state");
  });

  test("callback route returns 400 when code/state is missing", async ({ request }) => {
    const res = await request.get("/api/auth/oauth/facebook/callback");
    expect(res.status()).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid OAuth state or parameters.");
  });
});
