import { test, expect } from "@playwright/test";
import { hashPassword, verifyPassword } from "../../src/lib/auth/crypto";

test("should securely hash and verify passwords using scrypt", () => {
  const password = "mySecurePassword123";
  const hash = hashPassword(password);
  
  expect(hash).toContain(".");
  expect(verifyPassword(password, hash)).toBe(true);
  expect(verifyPassword("wrongPassword", hash)).toBe(false);
});
