import { test, expect } from "@playwright/test";

test.describe("AI Travel Planner Integration", () => {
  
  test("unauthenticated access to /demo/planner redirects to login", async ({ page }) => {
    await page.goto("/demo/planner");
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain("/login");
  });

  test("authenticated user can navigate to planner and generate an itinerary", async ({ page }) => {
    // 1. Register and login
    const email = `planner-test-${Date.now()}@example.com`;
    await page.request.post("/api/auth/register", {
      data: { email, password: "password123" },
    });
    await page.request.post("/api/auth/login", {
      data: { email, password: "password123" },
    });

    // 2. Navigate to Dashboard and follow link
    await page.goto("/dashboard");
    await page.locator("#planner-demo-link").click();
    await page.waitForURL(/\/demo\/planner/);
    expect(page.url()).toContain("/demo/planner");

    // 3. Setup network intercept for AI streaming endpoint
    // Mock the Vercel AI SDK stream protocol
    await page.route("**/api/demo/planner", async (route) => {
      const responseData = [
        "# Mock Itinerary to Kyoto\n\n",
        "## Day 1: Exploring Kyoto\n",
        "- **Morning**: Visit the Fushimi Inari Shrine and walk under the red gates.\n",
        "- **Afternoon**: Enjoy a cup of green tea in a traditional teahouse.\n",
        "- **Evening**: Stroll through Gion and spot a geisha.\n",
      ].join("");

      await route.fulfill({
        status: 200,
        contentType: "text/plain; charset=utf-8",
        body: responseData,
      });
    });

    // Verify empty state is displayed before generation
    await expect(page.locator("#planner-empty-state")).toBeVisible();
    await expect(page.locator("#planner-output-container")).not.toBeVisible();

    // 4. Fill form
    await page.locator("#destination").fill("Kyoto, Japan");
    await page.locator("button:has-text('Mid-range')").click();
    await page.locator("button:has-text('Culture')").click();

    // 5. Submit form
    await page.locator("#generate-itinerary-btn").click();

    // Verify empty state disappears and output container is visible
    await expect(page.locator("#planner-empty-state")).not.toBeVisible();
    await expect(page.locator("#planner-output-container")).toBeVisible();

    // 6. Assert rendered content structure
    // H1 header
    await expect(page.locator("#planner-output-container h1")).toContainText("Mock Itinerary to Kyoto");
    // H2 header
    await expect(page.locator("#planner-output-container h2")).toContainText("Day 1: Exploring Kyoto");
    // Strong list bolding
    await expect(page.locator("#planner-output-container strong").first()).toContainText("Morning");
    // List item text
    await expect(page.locator("#planner-output-container li").first()).toContainText("Visit the Fushimi Inari Shrine");
  });
});
