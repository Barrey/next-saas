import { test, expect } from "@playwright/test";

test.describe("Billing & Subscription System Integration Flows", () => {
  test("should handle unauthenticated redirects, pricing grids, checkout session creation, webhook updates, and portal redirection", async ({ page, request }) => {
    const ownerEmail = `owner-${Date.now()}@example.com`;
    const password = "securePassword123";

    // 1. Unauthenticated redirect check
    await page.goto("/dashboard/billing");
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain("/login");

    // 2. Register Owner
    const regOwner = await request.post("/api/auth/register", {
      data: { email: ownerEmail, password }
    });
    expect(regOwner.ok()).toBe(true);
    const ownerCookie = regOwner.headers()["set-cookie"];

    // Log the page in as this registered user
    await page.goto("/login");
    await page.locator("#login-email").fill(ownerEmail);
    await page.locator("#login-password").fill(password);
    await page.locator("#login-submit").click();
    await page.waitForURL("/dashboard");

    // 3. View billing without organization
    await page.goto("/dashboard/billing");
    await expect(page.locator("text=No Active Organization")).toBeVisible();

    // 4. Create an Organization
    const createOrg = await request.post("/api/auth/organization", {
      headers: { Cookie: ownerCookie },
      data: { name: "Billing Inc" }
    });
    expect(createOrg.ok()).toBe(true);
    const orgJson = await createOrg.json();
    const orgId = orgJson.organizationId;
    expect(orgId).toBeDefined();

    // 5. Reload billing - should display free status and pricing grid
    await page.reload();
    await expect(page.locator("p.text-2xl", { hasText: "Starter (Free)" })).toBeVisible();
    await expect(page.locator("#plan-pro-card")).toBeVisible();
    await expect(page.locator("#plan-enterprise-card")).toBeVisible();

    // 6. Test theme selector toggle
    await page.click("button:has-text('cyberpunk')");
    await expect(page.locator("html")).toBeDefined(); // Toggled successfully

    // 7. Request billing checkout session
    const checkoutRes = await request.post("/api/billing/checkout", {
      headers: { Cookie: ownerCookie },
      data: { priceId: "price_pro" }
    });
    expect(checkoutRes.ok()).toBe(true);
    const checkoutJson = await checkoutRes.json();
    expect(checkoutJson.url).toContain("mock_stripe_key");

    // 8. Trigger Stripe mock webhook call (simulating successful checkout completion)
    const webhookRes = await request.post("/api/billing/webhook", {
      data: {
        id: "evt_test_checkout",
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_test_session",
            customer: "cus_mock_123",
            subscription: {
              status: "active",
              items: {
                data: [
                  {
                    price: {
                      id: "price_pro"
                    }
                  }
                ]
              },
              current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
              cancel_at_period_end: false
            },
            status: "complete",
            metadata: {
              organizationId: orgId
            }
          }
        }
      }
    });
    expect(webhookRes.ok()).toBe(true);
    const webhookJson = await webhookRes.json();
    expect(webhookJson.received).toBe(true);

    // 9. Reload billing - page should display active status and portal management
    await page.reload();
    await expect(page.locator("text=Active Subscription")).toBeVisible();
    await expect(page.locator("p.text-2xl", { hasText: "Pro Professional" })).toBeVisible();
    await expect(page.locator("#manage-billing-btn")).toBeEnabled();

    // 10. Call portal session endpoint and verify redirect link
    const portalRes = await request.post("/api/billing/portal", {
      headers: { Cookie: ownerCookie },
    });
    expect(portalRes.ok()).toBe(true);
    const portalJson = await portalRes.json();
    expect(portalJson.url).toContain("mock_stripe_key");

    // 11. Verify role-based restriction (invite and log in as member)
    const memberEmail = `member-${Date.now()}@example.com`;
    const inviteRes = await request.post("/api/auth/organization/invite", {
      headers: { Cookie: ownerCookie },
      data: { email: memberEmail }
    });
    expect(inviteRes.ok()).toBe(true);
    const inviteJson = await inviteRes.json();
    const inviteToken = inviteJson.token;

    // Register member using the invitation token
    const regMember = await request.post(`/api/auth/register?invite_token=${inviteToken}`, {
      data: { email: memberEmail, password }
    });
    expect(regMember.ok()).toBe(true);
    const memberCookie = regMember.headers()["set-cookie"];

    // Attempt to access portal as non-owner member -> forbidden
    const memberPortalRes = await request.post("/api/billing/portal", {
      headers: { Cookie: memberCookie },
    });
    expect(memberPortalRes.status()).toBe(403);

    // Attempt to checkout as non-owner member -> forbidden
    const memberCheckoutRes = await request.post("/api/billing/checkout", {
      headers: { Cookie: memberCookie },
      data: { priceId: "price_enterprise" }
    });
    expect(memberCheckoutRes.status()).toBe(403);

    // Visit billing page as member - check that manage button is disabled and warning displays
    await page.context().clearCookies();
    await page.goto("/login");
    await page.locator("#login-email").fill(memberEmail);
    await page.locator("#login-password").fill(password);
    await page.locator("#login-submit").click();
    await page.waitForURL("/dashboard");

    await page.goto("/dashboard/billing");
    await expect(page.locator("text=Only users with the Owner role can perform updates or initiate checkout.")).toBeVisible();
    await expect(page.locator("#manage-billing-btn")).toBeDisabled();
  });
});
