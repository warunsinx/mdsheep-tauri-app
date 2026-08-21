import { expect, test } from "@playwright/test";
import { installNativeMock } from "./support/native-mock";

const isMobileProject = (projectName: string) => projectName.startsWith("mobile-");

test.beforeEach(async ({ page }) => {
  await installNativeMock(page);
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("export menu floats inside the viewport without resizing the toolbar", async ({ page }, testInfo) => {
  const toolbar = page.locator(".editor-toolbar");
  const before = await toolbar.boundingBox();
  await page.getByRole("button", { name: "Export document" }).click();
  const menu = page.getByRole("menu", { name: "Export formats" });
  await expect(menu).toBeVisible();
  await expect(menu).toHaveCSS("position", "absolute");
  await expect(menu).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");

  const after = await toolbar.boundingBox();
  const box = await menu.boundingBox();
  const viewport = page.viewportSize();
  expect(before).not.toBeNull();
  expect(after).not.toBeNull();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(after!.height).toBeCloseTo(before!.height, 0);
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport!.width);

  if (isMobileProject(testInfo.project.name)) {
    const firstItem = page.getByRole("menuitem", { name: "Markdown (.md)" });
    expect((await firstItem.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
});

test("print and PDF media shows only the full rendered preview", async ({ page }) => {
  await page.emulateMedia({ media: "print" });

  await expect(page.locator(".editor-toolbar")).toBeHidden();
  await expect(page.locator(".editor-pane")).toBeHidden();
  await expect(page.locator(".preview-pane")).toBeVisible();
  await expect(page.getByLabel("Preview content")).toBeVisible();
});
