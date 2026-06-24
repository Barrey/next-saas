import { test, expect } from "@playwright/test";

test.describe("Settings API Keys UI Controls", () => {
  test("unauthenticated access redirects to login", async ({ page }) => {
    await page.goto("/settings/api-keys");
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain("/login");
  });

  test("should support generating, displaying, and revoking keys in settings dashboard panel", async ({ page }) => {
    const email = `ui-owner-${Date.now()}@example.com`;
    const password = "password123";

    // 1. Register via API (cookie set automatically)
    await page.request.post("/api/auth/register", {
      data: { email, password }
    });

    // 2. Create organization via API
    await page.request.post("/api/auth/organization", {
      data: { name: "UI Integration Org" }
    });

    // 3. Go to settings API Keys page
    await page.goto("/settings/api-keys");
    await expect(page.locator("h1")).toHaveText("API Keys");

    // 4. Fill form and generate key
    await page.locator("#api-key-name-input").fill("Prod UI Key");
    await page.locator("#generate-key-btn").click();

    // 5. Verify raw key is displayed and copyable
    await expect(page.locator("#raw-key-output")).toBeVisible();
    const rawKey = await page.locator("#raw-key-output").innerText();
    expect(rawKey).toContain("sk_live_");

    // 6. Verify list has the new key with truncated representation
    await expect(page.locator("text=Prod UI Key")).toBeVisible();
    await expect(page.locator("text=sk_live_***")).toBeVisible();

    // 7. Accept the confirm dialog and click revoke
    page.on("dialog", async (dialog) => {
      expect(dialog.message()).toContain("Are you sure you want to revoke this API key?");
      await dialog.accept();
    });
    
    await page.locator(".revoke-key-btn").click();

    // 8. Verify the list becomes empty
    await expect(page.locator("text=No active API keys found.")).toBeVisible();
  });
});
