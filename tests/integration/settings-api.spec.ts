import { test, expect } from "@playwright/test";
import { generateSync } from "otplib";

function getCookieValue(setCookieHeader: string | undefined, name: string): string {
  if (!setCookieHeader) return "";
  const parts = setCookieHeader.split(/[\n;]/);
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith(`${name}=`)) {
      return trimmed;
    }
  }
  return "";
}

test.describe("Security Settings API Endpoints", () => {
  // Test 1: Password Change API
  test("should handle password changes securely", async ({ request }) => {
    const email = `api-pwd-${Date.now()}@example.com`;
    const oldPassword = "password123";
    const newPassword = "newpassword123";

    // 1. Unauthenticated check
    const unauthRes = await request.post("/api/settings/password", {
      data: { currentPassword: oldPassword, newPassword }
    });
    expect(unauthRes.status()).toBe(401);

    // 2. Register User
    const regRes = await request.post("/api/auth/register", {
      data: { email, password: oldPassword }
    });
    expect(regRes.ok()).toBe(true);
    const userCookie = getCookieValue(regRes.headers()["set-cookie"], "session_token");

    // 3. Missing fields check
    const missingRes = await request.post("/api/settings/password", {
      headers: { Cookie: userCookie },
      data: { newPassword }
    });
    expect(missingRes.status()).toBe(400);

    // 4. Too short password check
    const shortRes = await request.post("/api/settings/password", {
      headers: { Cookie: userCookie },
      data: { currentPassword: oldPassword, newPassword: "123" }
    });
    expect(shortRes.status()).toBe(400);

    // 5. Wrong current password check
    const wrongRes = await request.post("/api/settings/password", {
      headers: { Cookie: userCookie },
      data: { currentPassword: "wrongpassword", newPassword }
    });
    expect(wrongRes.status()).toBe(400);
    const wrongJson = await wrongRes.json();
    expect(wrongJson.error).toBe("Incorrect current password.");

    // 6. Correct password change
    const changeRes = await request.post("/api/settings/password", {
      headers: { Cookie: userCookie },
      data: { currentPassword: oldPassword, newPassword }
    });
    expect(changeRes.ok()).toBe(true);
    const changeJson = await changeRes.json();
    expect(changeJson.success).toBe(true);

    // 7. Try login with old password -> should fail
    const oldLoginRes = await request.post("/api/auth/login", {
      data: { email, password: oldPassword }
    });
    expect(oldLoginRes.status()).toBe(400);

    // 8. Try login with new password -> should succeed
    const newLoginRes = await request.post("/api/auth/login", {
      data: { email, password: newPassword }
    });
    expect(newLoginRes.ok()).toBe(true);
  });

  // Test 2: 2FA Lifecycle API
  test("should handle 2FA setup, enable, login verification, and disable cycle", async ({ request }) => {
    const email = `api-2fa-${Date.now()}@example.com`;
    const password = "password123";

    // 1. Setup 2FA (unauthenticated)
    const unauthSetup = await request.post("/api/settings/2fa/setup");
    expect(unauthSetup.status()).toBe(401);

    // 2. Register User
    const regRes = await request.post("/api/auth/register", {
      data: { email, password }
    });
    expect(regRes.ok()).toBe(true);
    const userCookie = getCookieValue(regRes.headers()["set-cookie"], "session_token");

    // 3. Setup 2FA (authenticated)
    const setupRes = await request.post("/api/settings/2fa/setup", {
      headers: { Cookie: userCookie }
    });
    expect(setupRes.ok()).toBe(true);
    const setupJson = await setupRes.json();
    expect(setupJson.secret).toBeDefined();
    expect(setupJson.qrCodeUrl).toBeDefined();

    const secret = setupJson.secret;

    // 4. Enable 2FA (invalid code)
    const badEnable = await request.post("/api/settings/2fa/enable", {
      headers: { Cookie: userCookie },
      data: { code: "000000" }
    });
    expect(badEnable.status()).toBe(400);

    // 5. Enable 2FA (valid code)
    const validCode = generateSync({ secret });
    const enableRes = await request.post("/api/settings/2fa/enable", {
      headers: { Cookie: userCookie },
      data: { code: validCode }
    });
    expect(enableRes.ok()).toBe(true);
    const enableJson = await enableRes.json();
    expect(enableJson.success).toBe(true);

    // 6. Login check: should return requiresTwoFactor and not set session_token directly
    const loginRes = await request.post("/api/auth/login", {
      data: { email, password }
    });
    expect(loginRes.ok()).toBe(true);
    const loginJson = await loginRes.json();
    expect(loginJson.requiresTwoFactor).toBe(true);

    const preAuthCookie = getCookieValue(loginRes.headers()["set-cookie"], "pre_auth_token");
    expect(preAuthCookie).toContain("pre_auth_token");

    // 7. Verify 2FA code (invalid)
    const badVerify = await request.post("/api/auth/verify-2fa", {
      headers: { Cookie: preAuthCookie },
      data: { code: "000000" }
    });
    expect(badVerify.status()).toBe(400);

    // 8. Verify 2FA code (valid)
    const freshCode = generateSync({ secret });
    const verifyRes = await request.post("/api/auth/verify-2fa", {
      headers: { Cookie: preAuthCookie },
      data: { code: freshCode }
    });
    expect(verifyRes.ok()).toBe(true);
    const sessionCookie = getCookieValue(verifyRes.headers()["set-cookie"], "session_token");
    expect(sessionCookie).toContain("session_token");

    // 9. Disable 2FA (wrong password)
    const badDisable = await request.post("/api/settings/2fa/disable", {
      headers: { Cookie: sessionCookie },
      data: { password: "wrongpassword" }
    });
    expect(badDisable.status()).toBe(400);

    // 10. Disable 2FA (correct password)
    const disableRes = await request.post("/api/settings/2fa/disable", {
      headers: { Cookie: sessionCookie },
      data: { password }
    });
    expect(disableRes.ok()).toBe(true);
    const disableJson = await disableRes.json();
    expect(disableJson.success).toBe(true);

    // 11. Login after disabling 2FA should directly succeed
    const finalLogin = await request.post("/api/auth/login", {
      data: { email, password }
    });
    expect(finalLogin.ok()).toBe(true);
    const finalLoginJson = await finalLogin.json();
    expect(finalLoginJson.requiresTwoFactor).toBeUndefined();
    expect(finalLogin.headers()["set-cookie"]).toContain("session_token");
  });
});
