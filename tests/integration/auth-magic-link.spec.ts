import { test, expect } from "@playwright/test";

test.describe("Magic Link Authentication Flow", () => {
  test("should request token, authenticate, set session cookie, and redirect unauthenticated requests", async ({ request, page }) => {
    const email = `magic-user-${Date.now()}@example.com`;

    // 1. Request magic link token
    const resMagic = await request.post("/api/auth/magic-link", {
      data: { email }
    });
    expect(resMagic.status()).toBe(200);
    const magicJson = await resMagic.json();
    expect(magicJson.success).toBe(true);
    expect(magicJson.token).toBeDefined();

    const rawToken = magicJson.token;

    // 2. Access the magic link GET verification URL (inspect redirect)
    const resVerify = await page.goto(`/api/auth/magic-link?token=${rawToken}`);
    await page.waitForURL("/dashboard");
    expect(page.url()).toContain("/dashboard");

    // 3. Confirm session cookie is issued and active
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(c => c.name === "session_token");
    expect(sessionCookie).toBeDefined();

    // 4. Try to reuse the same token (should fail because it's single-use/deleted)
    await page.context().clearCookies();
    await page.goto(`/api/auth/magic-link?token=${rawToken}`);
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain("error=invalid_token");
  });

  test("should handle invalid token redirects", async ({ page }) => {
    // Access with non-existent token
    await page.goto("/api/auth/magic-link?token=this_token_does_not_exist");
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain("error=invalid_token");
  });

  test("should request magic link via the UI login form successfully", async ({ page }) => {
    const email = `magic-ui-${Date.now()}@example.com`;

    await page.goto("/login");
    
    // Toggle magic link mode
    await page.getByText("Or, send me a magic link").click();
    await expect(page.locator("#login-submit")).toHaveText("Send magic link");

    // Fill form and submit
    await page.locator("#login-email").fill(email);
    await page.locator("#login-submit").click();

    // Check success notification
    await expect(page.locator("text=Check your email — we sent a login link.")).toBeVisible();
  });
});
