import { test, expect } from "@playwright/test";
import { generateSync } from "otplib";

test.describe("Security Settings & 2FA Flow", () => {
  // Test 1: Redirect to login
  test("unauthenticated access to settings redirects to login", async ({ page }) => {
    await page.goto("/settings/security");
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain("/login");
  });

  // Test 2: Change password flow
  test("should change user password successfully and verify login with new password", async ({ page }) => {
    const email = `pwd-change-${Date.now()}@example.com`;
    const oldPassword = "password123";
    const newPassword = "newpassword123";

    // Register via API
    await page.request.post("/api/auth/register", {
      data: { email, password: oldPassword }
    });

    // Clear cookies & Login manually
    await page.context().clearCookies();
    await page.goto("/login");
    await page.locator("#login-email").fill(email);
    await page.locator("#login-password").fill(oldPassword);
    await page.locator("#login-submit").click();
    await page.waitForURL("/dashboard");

    // Go to settings
    await page.goto("/settings/security");
    await expect(page.locator("h1")).toHaveText("Security Settings");

    // Attempt change with wrong current password
    await page.locator("#current-password").fill("wrongpassword");
    await page.locator("#new-password").fill(newPassword);
    await page.locator("#confirm-new-password").fill(newPassword);
    await page.locator("#password-submit").click();
    await expect(page.locator("#password-error")).toHaveText("Incorrect current password.");

    // Attempt change with correct current password
    await page.locator("#current-password").fill(oldPassword);
    await page.locator("#password-submit").click();
    await expect(page.locator("#password-success")).toHaveText("Password updated successfully.");

    // Logout
    await page.goto("/dashboard");
    await page.locator("#dashboard-logout").click();
    await page.waitForURL(/\/login/);

    // Try login with old password (should fail)
    await page.locator("#login-email").fill(email);
    await page.locator("#login-password").fill(oldPassword);
    await page.locator("#login-submit").click();
    await expect(page.locator("#login-error")).toHaveText("Invalid email or password.");

    // Try login with new password (should succeed)
    await page.locator("#login-password").fill(newPassword);
    await page.locator("#login-submit").click();
    await page.waitForURL("/dashboard");
    expect(page.url()).toContain("/dashboard");
  });

  // Test 3: Enable 2FA, Login with 2FA, and Disable 2FA
  test("should enable 2FA, require 2FA on next login, verify, and support disabling", async ({ page }) => {
    const email = `twofa-flow-${Date.now()}@example.com`;
    const password = "password123";

    // Register via API
    await page.request.post("/api/auth/register", {
      data: { email, password }
    });

    // Clear cookies & Login
    await page.context().clearCookies();
    await page.goto("/login");
    await page.locator("#login-email").fill(email);
    await page.locator("#login-password").fill(password);
    await page.locator("#login-submit").click();
    await page.waitForURL("/dashboard");

    // Go to security settings
    await page.goto("/settings/security");

    // Start 2FA Setup
    await page.locator("#twofa-enable-trigger").click();

    // Retrieve secret key from UI
    await expect(page.locator("ol")).toBeVisible();
    const secretKeyElement = page.locator(".bg-accent");
    const secretKey = (await secretKeyElement.innerText()).trim();
    expect(secretKey.length).toBeGreaterThan(0);

    // Generate valid TOTP code
    const validCode = generateSync({ secret: secretKey });

    // Submit invalid code first
    await page.locator("#twofa-code").fill("000000");
    await page.locator("#twofa-verify-submit").click();
    await expect(page.locator("#twofa-error")).toHaveText("Invalid verification code. Please try again.");

    // Submit valid code
    await page.locator("#twofa-code").fill(validCode);
    await page.locator("#twofa-verify-submit").click();
    await expect(page.locator("#twofa-success")).toHaveText("Two-factor authentication has been enabled.");

    // Logout
    await page.goto("/dashboard");
    await page.locator("#dashboard-logout").click();
    await page.waitForURL(/\/login/);

    // Login (requires password)
    await page.locator("#login-email").fill(email);
    await page.locator("#login-password").fill(password);
    await page.locator("#login-submit").click();

    // Verify redirected to 2FA page
    await page.waitForURL("/auth/verify-2fa");
    expect(page.url()).toContain("/auth/verify-2fa");

    // Verify typing wrong code
    await page.locator("#verify-2fa-code").fill("999999");
    await page.locator("#verify-2fa-submit").click();
    await expect(page.locator("#verify-2fa-error")).toHaveText("Invalid code — please try again.");

    // Generate fresh valid code
    const freshCode = generateSync({ secret: secretKey });
    await page.locator("#verify-2fa-code").fill(freshCode);
    await page.locator("#verify-2fa-submit").click();

    // Redirected to dashboard
    await page.waitForURL("/dashboard");
    expect(page.url()).toContain("/dashboard");

    // Disable 2FA
    await page.goto("/settings/security");
    await page.locator("#twofa-disable-trigger").click();

    // Confirm with wrong password
    await page.locator("#twofa-disable-password").fill("wrongpassword");
    await page.locator("#twofa-disable-submit").click();
    await expect(page.locator("#twofa-error")).toHaveText("Incorrect password.");

    // Confirm with correct password
    await page.locator("#twofa-disable-password").fill(password);
    await page.locator("#twofa-disable-submit").click();
    await expect(page.locator("#twofa-success")).toHaveText("Two-factor authentication has been disabled.");
  });
});
