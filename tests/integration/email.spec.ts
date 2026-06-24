import { test, expect } from "@playwright/test";

test.describe("Transactional Email Integration", () => {
  
  test.beforeEach(async ({ request }) => {
    // Clear email history before each test runs
    await request.delete("/api/demo/email-history");
  });

  test("Magic Link sign-in request fires and records email transmission details", async ({ page, request }) => {
    const email = `email-test-magic-${Date.now()}@example.com`;

    // 1. Trigger Magic Link sign-in via UI form
    await page.goto("/login");
    await page.getByText("Or, send me a magic link").click();
    await page.locator("#login-email").fill(email);
    await page.locator("#login-submit").click();
    await expect(page.locator("#login-success")).toBeVisible();

    // 2. Fetch email history from test endpoint
    const res = await request.get("/api/demo/email-history");
    expect(res.ok()).toBe(true);
    const data = await res.json();
    
    // 3. Verify magic link email details are recorded in history
    const matching = data.emails.filter((m: any) => m.to === email);
    expect(matching.length).toBe(1);
    expect(matching[0].subject).toContain("Sign in to NextSaas");
    expect(matching[0].html).toContain("/api/auth/magic-link?token=");
  });

  test("Workspace invitation creation sends and logs an invitation email", async ({ request }) => {
    const adminEmail = `org-admin-email-${Date.now()}@example.com`;
    const inviteeEmail = `invitee-member-${Date.now()}@example.com`;

    // 1. Register organization owner
    const regRes = await request.post("/api/auth/register", {
      data: { email: adminEmail, password: "password123" },
    });
    expect(regRes.ok()).toBe(true);
    const adminCookie = regRes.headers()["set-cookie"];

    // 2. Setup an organization for the admin via API
    const createOrgRes = await request.post("/api/auth/organization", {
      headers: { Cookie: adminCookie },
      data: { name: "Alpha Corp" }
    });
    expect(createOrgRes.ok()).toBe(true);

    // 3. Clear any sign-up/creation emails from history
    await request.delete("/api/demo/email-history");

    // 4. Send organization invitation via API
    const inviteRes = await request.post("/api/auth/organization/invite", {
      headers: { Cookie: adminCookie },
      data: { email: inviteeEmail }
    });
    expect(inviteRes.ok()).toBe(true);

    // 5. Fetch email history and check invitation email exists
    const res = await request.get("/api/demo/email-history");
    expect(res.ok()).toBe(true);
    const data = await res.json();

    const inviteEmail = data.emails.find((m: any) => m.to === inviteeEmail);
    expect(inviteEmail).toBeDefined();
    expect(inviteEmail.subject).toContain("invited to join an organization");
    expect(inviteEmail.html).toContain("/api/invitations/accept?token=");
  });
});
