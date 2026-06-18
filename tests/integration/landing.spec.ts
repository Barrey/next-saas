import { test, expect } from "@playwright/test";

test("should render the landing page and have correct title", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toHaveText("NextSaas Boilerplate");
});

test("should support toggling themes globally via buttons", async ({ page }) => {
  await page.goto("/");
  
  // Set light mode
  await page.click('button[aria-label="Light theme"]');
  await expect(page.locator("html")).toHaveClass(/light/);

  // Set dark mode
  await page.click('button[aria-label="Dark theme"]');
  await expect(page.locator("html")).toHaveClass(/dark/);

  // Set cyberpunk mode
  await page.click('button[aria-label="Cyberpunk theme"]');
  await expect(page.locator("html")).toHaveClass(/theme-cyberpunk/);
});
