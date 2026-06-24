import { test, expect } from "@playwright/test";

test.describe("REST API Endpoints", () => {
  test("unauthorized requests receive 401 status", async ({ request }) => {
    const resOrg = await request.get("/api/v1/org");
    expect(resOrg.status()).toBe(401);

    const resMembers = await request.get("/api/v1/org/members");
    expect(resMembers.status()).toBe(401);

    const resInvite = await request.post("/api/v1/org/invitations", {
      data: { email: "test@example.com" }
    });
    expect(resInvite.status()).toBe(401);
  });

  test("GET /api/v1/org returns correct details with valid key", async ({ request }) => {
    // 1. Register Owner
    const ownerEmail = `rest-owner-${Date.now()}@example.com`;
    const password = "securePassword123";
    const regOwner = await request.post("/api/auth/register", {
      data: { email: ownerEmail, password }
    });
    expect(regOwner.ok()).toBe(true);
    const ownerCookie = regOwner.headers()["set-cookie"];

    // 2. Setup an Org
    const createOrg = await request.post("/api/auth/organization", {
      headers: { Cookie: ownerCookie },
      data: { name: "REST API Inc" }
    });
    expect(createOrg.ok()).toBe(true);

    // 3. Generate an API Key via settings backend call (Task 4 endpoint)
    const genKeyRes = await request.post("/api/settings/api-keys", {
      headers: { Cookie: ownerCookie },
      data: { name: "Production Key" }
    });
    expect(genKeyRes.ok()).toBe(true);
    const keyJson = await genKeyRes.json();
    const rawKey = keyJson.rawKey;
    expect(rawKey).toBeDefined();

    // 4. Retrieve Org Details
    const resOrg = await request.get("/api/v1/org", {
      headers: { Authorization: `Bearer ${rawKey}` }
    });
    expect(resOrg.status()).toBe(200);
    const orgDetails = await resOrg.json();
    expect(orgDetails.name).toBe("REST API Inc");

    // 5. Retrieve Org Members List
    const resMembers = await request.get("/api/v1/org/members", {
      headers: { Authorization: `Bearer ${rawKey}` }
    });
    expect(resMembers.status()).toBe(200);
    const membersData = await resMembers.json();
    expect(membersData.members.length).toBe(1);
    expect(membersData.members[0].email).toBe(ownerEmail);

    // 6. Create Member Invitation Token
    const inviteEmail = `invitee-${Date.now()}@example.com`;
    const resInvite = await request.post("/api/v1/org/invitations", {
      headers: { Authorization: `Bearer ${rawKey}` },
      data: { email: inviteEmail }
    });
    expect(resInvite.status()).toBe(200);
    const inviteData = await resInvite.json();
    expect(inviteData.success).toBe(true);
    expect(inviteData.email).toBe(inviteEmail);
    expect(inviteData.token).toBeDefined();
  });
});
