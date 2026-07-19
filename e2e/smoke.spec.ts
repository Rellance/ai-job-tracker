import { expect, test, type Page } from "@playwright/test";

/**
 * Smoke flows against the seeded demo account. Each test cleans up what it
 * creates so the suite stays idempotent.
 */

const EMAIL = "demo@aijobtracker.dev";
const PASSWORD = "demo1234";

async function login(page: Page) {
  await page.goto("/login", { waitUntil: "networkidle" });
  // Dev-mode hydration lags behind first paint; the Next.js dev-tools portal
  // mounts client-side, so its presence means client JS is up.
  await page
    .waitForSelector("nextjs-portal", { state: "attached", timeout: 30_000 })
    .catch(() => undefined); // absent in prod builds — fall through
  await page.waitForTimeout(500);
  await page.fill("#email", EMAIL);
  await page.fill("#password", PASSWORD);
  await Promise.all([
    page.waitForURL("**/dashboard", { timeout: 45_000 }),
    page.getByRole("button", { name: /Sign in/ }).click(),
  ]);
}

test("auth: protected routes redirect, demo login lands on dashboard", async ({
  page,
}) => {
  await page.goto("/applications");
  await page.waitForURL("**/login**");

  await login(page);
  await expect(page.getByText("Your job search at a glance.")).toBeVisible();
  await expect(page.getByText("Total applications")).toBeVisible();
});

test("applications: create, find via search, open detail, delete", async ({
  page,
}) => {
  const company = `SmokeTest-${Date.now()}`;
  await login(page);

  await page.goto("/applications", { waitUntil: "networkidle" });
  await page
    .getByRole("button", { name: /New application/ })
    .first()
    .click();
  await page.fill("#company", company);
  await page.fill("#title", "QA Engineer");
  await page.getByRole("button", { name: /Add application/ }).click();
  await expect(page.getByText("Application added")).toBeVisible({
    timeout: 15_000,
  });

  // search finds it
  await page.fill('input[aria-label="Search applications"]', company);
  await expect(page.getByRole("link", { name: company })).toBeVisible({
    timeout: 15_000,
  });

  // detail opens
  await page.getByRole("link", { name: company }).click();
  await expect(page.getByRole("heading", { name: company })).toBeVisible();

  // delete from the list menu
  await page.goto(`/applications?q=${company}`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Row actions" }).first().click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByText("Application deleted")).toBeVisible({
    timeout: 15_000,
  });
});

test("board: five columns render with seeded cards", async ({ page }) => {
  await login(page);
  await page.goto("/board", { waitUntil: "networkidle" });

  for (const col of ["Wishlist", "Applied", "Interview", "Offer", "Rejected"]) {
    await expect(
      page.getByRole("heading", { name: col, exact: true }),
    ).toBeVisible();
  }
  await expect(
    page.locator('button[aria-label^="Drag"]').first(),
  ).toBeVisible();
});

test("ai workspace: hub lists tools, JD analyzer validates input", async ({
  page,
}) => {
  await login(page);
  await page.goto("/ai", { waitUntil: "networkidle" });
  await expect(
    page.getByRole("heading", { name: "JD Analyzer" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Cover Letter" }),
  ).toBeVisible();

  await page.goto("/ai/analyze-jd", { waitUntil: "networkidle" });
  // Run stays disabled until the JD is long enough — quota-safe check
  const runButton = page.getByRole("button", { name: /Run JD Analyzer/ });
  await expect(runButton).toBeDisabled();
  await page.fill("#jd", "short");
  await expect(runButton).toBeDisabled();
});

test("settings: all four tabs render", async ({ page }) => {
  await login(page);
  await page.goto("/settings", { waitUntil: "networkidle" });

  await expect(page.getByLabel("Name")).toBeVisible();
  await page.getByRole("tab", { name: "Security" }).click();
  await expect(page.getByText("Change password").first()).toBeVisible();
  await page.getByRole("tab", { name: "Billing" }).click();
  await expect(page.getByText("AI actions this month")).toBeVisible();
  await page.getByRole("tab", { name: "Audit log" }).click();
  await expect(page.getByText("Recent activity")).toBeVisible();
});
