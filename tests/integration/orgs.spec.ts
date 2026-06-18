import { test, expect } from "@playwright/test";

test.describe("Organizations and Invitations Flow", () => {
  test("should handle organization setup, inviting with various expiry durations, and acceptance checks", async ({ request }) => {
    const ownerEmail = `owner-${Date.now()}@example.com`;
    const password = "securePassword123";

    // 1. Register Owner
    const regOwner = await request.post("/api/auth/register", {
      data: { email: ownerEmail, password }
    });
    expect(regOwner.ok()).toBe(true);
    const ownerCookie = regOwner.headers()["set-cookie"];

    // 2. Create organization (specifying a custom db-backed invitationExpiryDays of 5 days)
    const createOrg = await request.post("/api/auth/organization", {
      headers: { Cookie: ownerCookie },
      data: { name: "My Startup", invitationExpiryDays: 5 }
    });
    expect(createOrg.ok()).toBe(true);
    const orgJson = await createOrg.json();
    expect(orgJson.success).toBe(true);

    // 3. Generate invite 1: Should use the organization's db default expiry (5 days)
    const memberEmail1 = `member1-${Date.now()}@example.com`;
    const invite1Res = await request.post("/api/auth/organization/invite", {
      headers: { Cookie: ownerCookie },
      data: { email: memberEmail1 }
    });
    expect(invite1Res.ok()).toBe(true);
    const invite1Json = await invite1Res.json();
    expect(invite1Json.success).toBe(true);
    expect(invite1Json.token).toBeDefined();
    
    // Verify computed expiry is ~5 days from now
    const expiresAt1 = new Date(invite1Json.expiresAt);
    const diffDays1 = Math.round((expiresAt1.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    expect(diffDays1).toBe(5);

    // 4. Generate invite 2: Explicitly override duration via request body (3 days)
    const memberEmail2 = `member2-${Date.now()}@example.com`;
    const invite2Res = await request.post("/api/auth/organization/invite", {
      headers: { Cookie: ownerCookie },
      data: { email: memberEmail2, expiresInDays: 3 }
    });
    expect(invite2Res.ok()).toBe(true);
    const invite2Json = await invite2Res.json();
    expect(invite2Json.success).toBe(true);
    
    // Verify computed expiry is ~3 days from now
    const expiresAt2 = new Date(invite2Json.expiresAt);
    const diffDays2 = Math.round((expiresAt2.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    expect(diffDays2).toBe(3);

    // 5. Generate invite 3 from another user who has no db config (to verify fallback to global default: 7 days)
    const otherOwnerEmail = `other-${Date.now()}@example.com`;
    const regOther = await request.post("/api/auth/register", {
      data: { email: otherOwnerEmail, password }
    });
    expect(regOther.ok()).toBe(true);
    const otherCookie = regOther.headers()["set-cookie"];

    // Create org with no invitationExpiryDays in body
    const createOrgOther = await request.post("/api/auth/organization", {
      headers: { Cookie: otherCookie },
      data: { name: "Other Startup" }
    });
    expect(createOrgOther.ok()).toBe(true);

    const inviteFallbackRes = await request.post("/api/auth/organization/invite", {
      headers: { Cookie: otherCookie },
      data: { email: "fallback@example.com" }
    });
    expect(inviteFallbackRes.ok()).toBe(true);
    const inviteFallbackJson = await inviteFallbackRes.json();
    expect(inviteFallbackJson.success).toBe(true);
    
    // Verify computed expiry falls back to 7 days
    const expiresAtFallback = new Date(inviteFallbackJson.expiresAt);
    const diffDaysFallback = Math.round((expiresAtFallback.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    expect(diffDaysFallback).toBe(7);

    // 6. Test accepting invitation when not logged in -> should redirect to registration
    const acceptNotLoggedIn = await request.get(`/api/invitations/accept?token=${invite1Json.token}`, {
      headers: { Cookie: "" },
      maxRedirects: 0 // Do not follow redirects so we can inspect redirect location
    });
    expect(acceptNotLoggedIn.status()).toBe(307);
    expect(acceptNotLoggedIn.headers()["location"]).toContain(`/register?invite_token=${invite1Json.token}`);

    // 7. Register the user with the token to auto-link
    const regMember = await request.post(`/api/auth/register?invite_token=${invite1Json.token}`, {
      data: { email: memberEmail1, password }
    });
    expect(regMember.ok()).toBe(true);
    const memberCookie = regMember.headers()["set-cookie"];

    // 8. Try to accept the same invite again -> should be expired/consumed
    const acceptAgain = await request.get(`/api/invitations/accept?token=${invite1Json.token}`, {
      maxRedirects: 0
    });
    expect(acceptAgain.status()).toBe(307);
    expect(acceptAgain.headers()["location"]).toContain("error=expired_invite");

    // 9. Standard members cannot generate invites
    const nonOwnerInvite = await request.post("/api/auth/organization/invite", {
      headers: { Cookie: memberCookie },
      data: { email: "victim@example.com" }
    });
    expect(nonOwnerInvite.status()).toBe(403);

    // 10. Existing Owner cannot join another organization
    const ownerTryAccept = await request.get(`/api/invitations/accept?token=${invite2Json.token}`, {
      headers: { Cookie: otherCookie },
      maxRedirects: 0
    });
    expect(ownerTryAccept.status()).toBe(307);
    expect(ownerTryAccept.headers()["location"]).toContain("error=owner_cannot_join_team");
  });
});
