import { expect, test } from "@playwright/test";

test("home page offers a usable sample train search form", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /your next journey starts here/i })).toBeVisible();
  await expect(page.getByLabel("From")).toHaveValue("SBC");
  await expect(page.getByLabel("To")).toHaveValue("MYS");
  await expect(page.getByRole("button", { name: /search trains/i })).toBeVisible();
  await expect(page.getByText(/academic demonstration/i).first()).toBeVisible();
});

test("language and theme preferences remain usable on the landing page", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "हिं" }).click();
  await expect(page.getByRole("heading", { name: /आपकी अगली यात्रा/i })).toBeVisible();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "hi");
  await page.getByRole("button", { name: "Use dark theme" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
});
