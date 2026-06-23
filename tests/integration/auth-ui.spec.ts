import { test, expect } from "@playwright/test";

test.describe("Auth UI Pages", () => {
  // --- Login Page ---

  test("login page renders and shows correct elements", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("h2")).toHaveText("Welcome back");
    await expect(page.locator("#login-email")).toBeVisible();
    await expect(page.locator("#login-password")).toBeVisible();
    await expect(page.locator("#login-submit")).toHaveText("Sign in");
  });

  test("login page toggles to magic link mode", async ({ page }) => {
    await page.goto("/login");
    await page.getByText("Or, send me a magic link").click();
    await expect(page.locator("#login-password")).not.toBeVisible();
    await expect(page.locator("#login-submit")).toHaveText("Send magic link");
  });

  test("login redirects to dashboard on success", async ({ page }) => {
    const email = `ui-login-${Date.now()}@example.com`;
    await page.request.post("/api/auth/register", {
      data: { email, password: "password123" },
    });
    // Clear cookies so the session from setup doesn't redirect us away from /login
    await page.context().clearCookies();

    await page.goto("/login");
    await page.locator("#login-email").fill(email);
    await page.locator("#login-password").fill("password123");
    await page.locator("#login-submit").click();
    await page.waitForURL("/dashboard");
    expect(page.url()).toContain("/dashboard");
  });

  test("login shows error on bad credentials", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#login-email").fill("nobody@example.com");
    await page.locator("#login-password").fill("wrongpassword");
    await page.locator("#login-submit").click();
    await expect(page.locator("#login-error")).toBeVisible();
  });

  // --- Register Page ---

  test("register page renders correctly", async ({ page }) => {
    await page.goto("/register");
    await expect(page.locator("h2")).toHaveText("Create an account");
    await expect(page.locator("#register-email")).toBeVisible();
    await expect(page.locator("#register-password")).toBeVisible();
    await expect(page.locator("#register-submit")).toHaveText("Create account");
  });

  test("register page shows invite banner when invite_token is present", async ({ page }) => {
    await page.goto("/register?invite_token=sometoken123");
    await expect(page.locator("#register-invite-banner")).toBeVisible();
  });

  test("register page shows error on duplicate email", async ({ page }) => {
    const email = `dup-${Date.now()}@example.com`;
    await page.request.post("/api/auth/register", {
      data: { email, password: "password123" },
    });
    // Clear cookies so the session from setup doesn't redirect us away from /register
    await page.context().clearCookies();

    await page.goto("/register");
    await page.locator("#register-email").fill(email);
    await page.locator("#register-password").fill("password123");
    await page.locator("#register-submit").click();
    await expect(page.locator("#register-error")).toBeVisible();
  });

  // --- 2FA Verify Page ---

  test("verify-2fa page renders correctly", async ({ page }) => {
    await page.goto("/auth/verify-2fa");
    await expect(page.locator("h2")).toHaveText("Two-factor verification");
    await expect(page.locator("#verify-2fa-code")).toBeVisible();
    await expect(page.locator("#verify-2fa-submit")).toBeDisabled();
  });

  test("verify-2fa submit button enables when 6 digits entered", async ({ page }) => {
    await page.goto("/auth/verify-2fa");
    await page.locator("#verify-2fa-code").fill("123456");
    await expect(page.locator("#verify-2fa-submit")).toBeEnabled();
  });

  // --- Dashboard ---

  test("unauthenticated access to dashboard redirects to login", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain("/login");
  });

  test("dashboard shows user info after login", async ({ page }) => {
    const email = `dash-${Date.now()}@example.com`;
    await page.request.post("/api/auth/register", {
      data: { email, password: "password123" },
    });

    await page.request.post("/api/auth/login", {
      data: { email, password: "password123" },
    });

    await page.goto("/dashboard");
    await expect(page.locator("#dashboard-user-card")).toBeVisible();
    await expect(page.locator("#dashboard-email")).toHaveText(email);
  });

  test("logout button redirects to login", async ({ page }) => {
    const email = `logout-${Date.now()}@example.com`;
    await page.request.post("/api/auth/register", {
      data: { email, password: "password123" },
    });
    await page.request.post("/api/auth/login", {
      data: { email, password: "password123" },
    });

    await page.goto("/dashboard");
    await page.locator("#dashboard-logout").click();
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain("/login");
  });

  test("login page displays social oauth login options", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("a[href*='/oauth/google/redirect']")).toBeVisible();
    await expect(page.locator("a[href*='/oauth/github/redirect']")).toBeVisible();
    await expect(page.locator("a[href*='/oauth/facebook/redirect']")).toBeVisible();
  });

  test("register page displays social oauth registration options", async ({ page }) => {
    await page.goto("/register");
    await expect(page.locator("a[href*='/oauth/google/redirect']")).toBeVisible();
    await expect(page.locator("a[href*='/oauth/github/redirect']")).toBeVisible();
    await expect(page.locator("a[href*='/oauth/facebook/redirect']")).toBeVisible();
  });
});
