import { test, expect } from "@playwright/test";

test.describe("Auth flow", () => {
  test("login page loads with email field", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.locator('input[type="email"], input[name="email"]'),
    ).toBeVisible({ timeout: 10000 });
  });

  test("signup page loads", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.locator("h1, h2, form")).toBeVisible({
      timeout: 10000,
    });
  });

  test("dashboard redirects to login when unauthenticated", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await page.waitForURL(/\/(login|signup)/, { timeout: 10000 });
    expect(page.url()).toMatch(/\/(login|signup)/);
  });
});
