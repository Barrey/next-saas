import { test, expect } from "@playwright/test";

test("should handle user registration and login successfully", async ({ request }) => {
  const email = `test-${Date.now()}@example.com`;
  const password = "securePassword123";

  // 1. Register User
  const registerRes = await request.post("/api/auth/register", {
    data: { email, password }
  });
  expect(registerRes.ok()).toBe(true);
  const registerJson = await registerRes.json();
  expect(registerJson.success).toBe(true);
  expect(registerJson.userId).toBeDefined();

  // 2. Try registering same user -> should fail
  const duplicateRes = await request.post("/api/auth/register", {
    data: { email, password }
  });
  expect(duplicateRes.status()).toBe(400);

  // 3. Login User with correct password
  const loginRes = await request.post("/api/auth/login", {
    data: { email, password }
  });
  expect(loginRes.ok()).toBe(true);
  const loginJson = await loginRes.json();
  expect(loginJson.success).toBe(true);

  // 4. Try logging in with wrong password -> should fail
  const badLoginRes = await request.post("/api/auth/login", {
    data: { email, password: "wrongPassword" }
  });
  expect(badLoginRes.status()).toBe(400);
  const badLoginJson = await badLoginRes.json();
  expect(badLoginJson.error).toBe("Invalid credentials.");
});
