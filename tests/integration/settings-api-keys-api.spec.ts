import { test, expect } from "@playwright/test";

test.describe("Settings API Keys Handlers", () => {
  test("POST /api/settings/api-keys returns 401 for guest", async ({ request }) => {
    const res = await request.post("/api/settings/api-keys");
    expect(res.status()).toBe(401);
  });

  test("should support listing, creating, and revoking API keys for organization Owner", async ({ request }) => {
    const ownerEmail = `api-owner-${Date.now()}@example.com`;
    const password = "securePassword123";

    // 1. Register Owner
    const regOwner = await request.post("/api/auth/register", {
      data: { email: ownerEmail, password }
    });
    expect(regOwner.ok()).toBe(true);
    const ownerCookie = regOwner.headers()["set-cookie"];

    // Try fetching keys without organization -> Forbidden (403)
    const emptyKeysRes = await request.get("/api/settings/api-keys", {
      headers: { Cookie: ownerCookie }
    });
    expect(emptyKeysRes.status()).toBe(403);

    // 2. Setup organization
    const createOrg = await request.post("/api/auth/organization", {
      headers: { Cookie: ownerCookie },
      data: { name: "API Management Inc" }
    });
    expect(createOrg.ok()).toBe(true);

    // 3. Fetch keys (should be empty list initially)
    const listRes = await request.get("/api/settings/api-keys", {
      headers: { Cookie: ownerCookie }
    });
    expect(listRes.status()).toBe(200);
    const listJson = await listRes.json();
    expect(listJson.keys.length).toBe(0);

    // 4. Generate key
    const genKeyRes = await request.post("/api/settings/api-keys", {
      headers: { Cookie: ownerCookie },
      data: { name: "Test Key 1" }
    });
    expect(genKeyRes.status()).toBe(200);
    const genJson = await genKeyRes.json();
    expect(genJson.success).toBe(true);
    expect(genJson.rawKey).toBeDefined();
    expect(genJson.keyId).toBeDefined();

    // 5. Fetch keys again (should contain the newly created key)
    const listRes2 = await request.get("/api/settings/api-keys", {
      headers: { Cookie: ownerCookie }
    });
    expect(listRes2.status()).toBe(200);
    const listJson2 = await listRes2.json();
    expect(listJson2.keys.length).toBe(1);
    expect(listJson2.keys[0].name).toBe("Test Key 1");
    expect(listJson2.keys[0].truncatedKey).toContain("sk_live_***");

    // 6. Revoke key
    const revokeRes = await request.post("/api/settings/api-keys/revoke", {
      headers: { Cookie: ownerCookie },
      data: { id: genJson.keyId }
    });
    expect(revokeRes.status()).toBe(200);
    const revokeJson = await revokeRes.json();
    expect(revokeJson.success).toBe(true);

    // 7. Verify empty list again
    const listRes3 = await request.get("/api/settings/api-keys", {
      headers: { Cookie: ownerCookie }
    });
    expect(listRes3.status()).toBe(200);
    const listJson3 = await listRes3.json();
    expect(listJson3.keys.length).toBe(0);
  });
});
