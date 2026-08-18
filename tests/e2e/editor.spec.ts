import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { installNativeMock, primeOpenFile } from "./support/native-mock";

const isMobileProject = (projectName: string) => projectName.startsWith("mobile-");

test.beforeEach(async ({ page }) => {
  await installNativeMock(page);
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("desktop snaps the divider, collapses to endpoint rails, reopens, and persists", async ({ page }, testInfo) => {
  test.skip(isMobileProject(testInfo.project.name), "desktop behavior");
  const separator = page.getByRole("separator", { name: "Resize editor and preview panes" });
  await expect(separator).toBeVisible();
  await expect(separator).toHaveAttribute("aria-valuenow", "50");

  const dividerBox = await separator.boundingBox();
  const layoutBox = await page.locator("main").boundingBox();
  expect(dividerBox).not.toBeNull();
  expect(layoutBox).not.toBeNull();
  await page.mouse.move(dividerBox!.x + dividerBox!.width / 2, dividerBox!.y + 80);
  await page.mouse.down();
  await page.mouse.move(layoutBox!.x + layoutBox!.width * 0.26, dividerBox!.y + 80, { steps: 8 });
  await page.mouse.up();
  await expect(separator).toHaveAttribute("aria-valuenow", "25");

  const quarterDivider = (await separator.boundingBox())!;
  await page.mouse.move(quarterDivider.x + quarterDivider.width / 2, quarterDivider.y + 80);
  await page.mouse.down();
  await page.mouse.move(layoutBox!.x + layoutBox!.width * 0.74, dividerBox!.y + 80, { steps: 8 });
  await page.mouse.up();

  await expect(separator).toHaveAttribute("aria-valuenow", "75");
  await page.reload();
  await expect(separator).toHaveAttribute("aria-valuenow", "75");
  await page.locator("main.pane-layout").evaluate((layout) =>
    Promise.all(layout.getAnimations().map((animation) => animation.finished)),
  );

  const refreshedLayout = (await page.locator("main").boundingBox())!;
  const refreshedDivider = (await separator.boundingBox())!;
  await page.mouse.move(refreshedDivider.x + refreshedDivider.width / 2, refreshedDivider.y + 80);
  await page.mouse.down();
  await page.mouse.move(refreshedLayout.x + refreshedLayout.width * 0.98, refreshedDivider.y + 80, { steps: 8 });
  await page.mouse.up();
  await expect(separator).toHaveAttribute("aria-valuenow", "100");
  const previewRail = page.getByRole("button", { name: "Reopen Preview pane" });
  await expect(previewRail).toBeVisible();
  await expect(previewRail.locator(".pane-rail-label")).toHaveCSS("writing-mode", "vertical-rl");
  await previewRail.click();
  await expect(separator).toHaveAttribute("aria-valuenow", "75");
  await page.locator("main.pane-layout").evaluate((layout) =>
    Promise.all(layout.getAnimations().map((animation) => animation.finished)),
  );

  const reopenedDivider = (await separator.boundingBox())!;
  await page.mouse.move(reopenedDivider.x + reopenedDivider.width / 2, reopenedDivider.y + 80);
  await page.mouse.down();
  await page.mouse.move(refreshedLayout.x + refreshedLayout.width * 0.02, refreshedDivider.y + 80, { steps: 8 });
  await page.mouse.up();
  await expect(separator).toHaveAttribute("aria-valuenow", "0");
  const markdownRail = page.getByRole("button", { name: "Reopen Markdown editor" });
  await expect(markdownRail).toBeVisible();
  const markdownRailLabel = markdownRail.locator(".pane-rail-label");
  await expect(markdownRailLabel).toHaveCSS("writing-mode", "vertical-rl");
  const paneBox = (await page.locator(".editor-pane").boundingBox())!;
  const railBox = (await markdownRail.boundingBox())!;
  const labelBox = (await markdownRailLabel.boundingBox())!;
  expect(railBox.y + railBox.height / 2).toBeCloseTo(paneBox.y + paneBox.height / 2, 0);
  expect(labelBox.y + labelBox.height / 2).toBeCloseTo(railBox.y + railBox.height / 2, 0);
  await expect(page.locator("#markdown-editor")).toHaveCount(1);
  await expect(page.locator("#markdown-editor")).toBeHidden();
  await markdownRail.click();
  await expect(separator).toHaveAttribute("aria-valuenow", "25");

  await page.reload();
  await expect(separator).toHaveAttribute("aria-valuenow", "25");
});

test("desktop drags smoothly through frosted collapse ranges and snaps on release", async ({ page }, testInfo) => {
  test.skip(isMobileProject(testInfo.project.name), "desktop behavior");
  await page.setViewportSize({ width: 1200, height: 720 });
  const separator = page.getByRole("separator", { name: "Resize editor and preview panes" });
  const layout = page.locator("main.pane-layout");
  await separator.press("Home");
  await layout.evaluate((node) => Promise.all(node.getAnimations().map((animation) => animation.finished)));
  const editor = page.locator("#markdown-editor");
  await editor.evaluate((node) => { (window as typeof window & { __endpointEditor?: Element }).__endpointEditor = node; });
  const layoutBox = (await layout.boundingBox())!;
  const dividerBox = (await separator.boundingBox())!;

  await page.mouse.move(dividerBox.x + dividerBox.width / 2, dividerBox.y + 80);
  await page.mouse.down();
  await page.mouse.move(layoutBox.x + layoutBox.width * 0.05, dividerBox.y + 80, { steps: 2 });
  await expect(separator).toHaveAttribute("aria-valuenow", "5");
  await page.screenshot({ path: testInfo.outputPath("collapse-05.png") });
  await page.mouse.move(layoutBox.x + layoutBox.width * 0.12, dividerBox.y + 80);
  await expect(separator).toHaveAttribute("aria-valuenow", "12");
  expect(await editor.evaluate((node) => node === (window as typeof window & { __endpointEditor?: Element }).__endpointEditor)).toBe(true);
  await expect(layout).toHaveClass(/pane-is-dragging/);
  const editorOverlay = await page.locator(".editor-pane").evaluate((pane) => {
    const style = getComputedStyle(pane, "::after");
    return { opacity: Number(style.opacity), backdropFilter: style.backdropFilter, background: style.backgroundColor };
  });
  expect(editorOverlay.opacity).toBeGreaterThan(0.95);
  expect(editorOverlay.background).toMatch(/0\.99/);
  expect(editorOverlay.backdropFilter).toContain("blur(2px)");
  await page.screenshot({ path: testInfo.outputPath("collapse-12.png") });
  await page.mouse.move(layoutBox.x + layoutBox.width * 0.25, dividerBox.y + 80, { steps: 6 });
  await page.mouse.up();
  await expect(separator).toHaveAttribute("aria-valuenow", "25");

  const reopenedDivider = (await separator.boundingBox())!;
  await page.mouse.move(reopenedDivider.x + reopenedDivider.width / 2, reopenedDivider.y + 80);
  await page.mouse.down();
  await page.mouse.move(layoutBox.x + layoutBox.width * 0.88, reopenedDivider.y + 80);
  await expect(separator).toHaveAttribute("aria-valuenow", "88");
  const previewOverlay = await page.locator(".preview-pane").evaluate((pane) => {
    const style = getComputedStyle(pane, "::after");
    return { opacity: Number(style.opacity), backdropFilter: style.backdropFilter };
  });
  expect(previewOverlay.opacity).toBeGreaterThan(0.85);
  await page.screenshot({ path: testInfo.outputPath("collapse-88.png") });
  await page.mouse.up();
  await expect(separator).toHaveAttribute("aria-valuenow", "100");
  await expect(page.getByRole("button", { name: "Reopen Preview pane" })).toBeVisible();
  await layout.evaluate((node) => Promise.all(node.getAnimations().map((animation) => animation.finished)));
  const collapsedPreviewDivider = (await separator.boundingBox())!;
  await page.mouse.move(collapsedPreviewDivider.x + collapsedPreviewDivider.width / 2, collapsedPreviewDivider.y + 80);
  await page.mouse.down();
  await page.mouse.move(layoutBox.x + layoutBox.width * 0.95, collapsedPreviewDivider.y + 80, { steps: 2 });
  await expect(separator).toHaveAttribute("aria-valuenow", "95");
  await page.screenshot({ path: testInfo.outputPath("collapse-95.png") });
  await page.mouse.move(layoutBox.x + layoutBox.width * 0.75, collapsedPreviewDivider.y + 80, { steps: 6 });
  await page.mouse.up();
  await expect(separator).toHaveAttribute("aria-valuenow", "75");
});

test("desktop endpoint content scrolls with explicit geometry", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1200, height: 720 });
  const separator = page.getByRole("separator", { name: "Resize editor and preview panes" });
  await expect(separator).toBeVisible();
  const layout = page.locator("main.pane-layout");
  const layoutBox = (await layout.boundingBox())!;
  const dividerBox = (await separator.boundingBox())!;

  await page.mouse.move(dividerBox.x + dividerBox.width / 2, dividerBox.y + 80);
  await page.mouse.down();
  await page.mouse.move(layoutBox.x + layoutBox.width * 0.27, dividerBox.y + 80);
  await expect(separator).toHaveAttribute("aria-valuenow", "27");
  await expect(layout).toHaveClass(/pane-is-dragging/);
  await page.mouse.up();
  await expect(separator).toHaveAttribute("aria-valuenow", "25");
  await expect(layout).not.toHaveClass(/pane-is-dragging/);

  const longMarkdown = Array.from({ length: 160 }, (_, index) => `## Section ${index}\n\nScrollable paragraph ${index}.`).join("\n\n");
  const editor = page.getByLabel("Markdown editor");
  await editor.fill(longMarkdown);
  const scrollDown = async (locator: typeof editor) => {
    if (testInfo.project.name === "mobile-webkit") {
      await locator.evaluate((node) => node.scrollBy(0, 900));
    } else {
      await locator.hover();
      await page.mouse.wheel(0, 900);
    }
  };

  await separator.press("Home");
  const previewScroller = page.locator(".preview-scroll");
  await expect(previewScroller).toBeVisible();
  await scrollDown(previewScroller);
  await expect.poll(() => previewScroller.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);

  await separator.press("End");
  await expect(editor).toBeVisible();
  await scrollDown(editor);
  await expect.poll(() => editor.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);

  const geometry = await page.evaluate(() => {
    const layoutNode = document.querySelector<HTMLElement>(".pane-layout")!;
    const editorPane = document.querySelector<HTMLElement>(".editor-pane")!;
    const editorNode = document.querySelector<HTMLElement>(".editor-scroll")!;
    return {
      layoutOverflow: getComputedStyle(layoutNode).overflow,
      paneMinWidth: getComputedStyle(editorPane).minWidth,
      paneMinHeight: getComputedStyle(editorPane).minHeight,
      paneHeight: editorPane.getBoundingClientRect().height,
      layoutHeight: layoutNode.getBoundingClientRect().height,
      paneOverflow: getComputedStyle(editorPane).overflow,
      editorOverflowY: getComputedStyle(editorNode).overflowY,
      editorOverscroll: getComputedStyle(editorNode).getPropertyValue("overscroll-behavior-y")
        || getComputedStyle(editorNode).getPropertyValue("overscroll-behavior"),
    };
  });
  expect(geometry.layoutOverflow).toBe("hidden");
  expect(geometry.paneMinWidth).toBe("0px");
  expect(geometry.paneMinHeight).toBe("0px");
  expect(geometry.paneHeight).toBeCloseTo(geometry.layoutHeight, 0);
  expect(geometry.paneOverflow).toBe("hidden");
  expect(geometry.editorOverflowY).toBe("auto");
  if (testInfo.project.name !== "mobile-webkit") {
    expect(geometry.editorOverscroll).toBe("contain");
  }
});

test("desktop supports live editing, persistence, and accessible UI", async ({ page }, testInfo) => {
  test.skip(isMobileProject(testInfo.project.name), "desktop behavior");
  const editor = page.getByLabel("Markdown editor");
  await expect(page.getByText("[MD]", { exact: true })).toBeVisible();
  await expect(page.getByText("Sheep", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Mermaid diagram")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByLabel("Mermaid diagram").locator("svg text").filter({ hasText: "Write Markdown" })).toBeVisible();
  await editor.fill("```mermaid\nthis is not valid mermaid\n```");
  await expect(page.getByLabel("Rendered preview").getByRole("alert")).toContainText("Unable to render diagram", { timeout: 10_000 });
  await editor.fill("# Playwright draft\n\n**Live** preview");
  await expect(page.getByRole("heading", { name: "Playwright draft" })).toBeVisible();
  await expect(page.getByLabel("Rendered preview")).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const saved = localStorage.getItem("md-editor:content:v1");
    return saved ? JSON.parse(saved).content : "";
  })).toContain("Playwright draft");
  await page.reload();
  await expect(editor).toHaveValue(/Playwright draft/);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((v) => ["critical", "serious"].includes(v.impact || ""))).toEqual([]);
});

test("unrelated editing keeps an unchanged Mermaid diagram mounted", async ({ page }, testInfo) => {
  test.skip(isMobileProject(testInfo.project.name), "desktop behavior");
  const editor = page.getByLabel("Markdown editor");
  const source = "# Draft\n\nParagraph\n\n```mermaid\nflowchart LR\n  A[Write] --> B[Preview]\n```";
  await editor.fill(source);
  const diagram = page.getByLabel("Mermaid diagram");
  await expect(diagram.locator("svg text").filter({ hasText: "Write" })).toBeVisible({ timeout: 10_000 });
  const originalDiagram = await diagram.elementHandle();
  expect(originalDiagram).not.toBeNull();

  await editor.evaluate((element: HTMLTextAreaElement) => {
    const position = element.value.indexOf("Paragraph") + "Paragraph".length;
    element.focus();
    element.setSelectionRange(position, position);
  });
  await page.keyboard.type(" updated", { delay: 35 });

  expect(await page.evaluate((node) => document.querySelector("[aria-label='Mermaid diagram']") === node, originalDiagram)).toBe(true);
  await expect(page.getByLabel("Rendering Mermaid diagram")).toHaveCount(0);
});

test("mobile defaults to edit and preserves content across view switches", async ({ page }, testInfo) => {
  test.skip(!isMobileProject(testInfo.project.name), "mobile behavior");
  const editor = page.getByLabel("Markdown editor");
  await expect(page.getByText("[MD]", { exact: true })).toBeVisible();
  await expect(page.getByText("Sheep", { exact: true })).toBeHidden();
  await expect(page.getByRole("separator")).toBeHidden();
  await expect(page.getByRole("button", { name: /Reopen (Markdown|Preview)/ })).toHaveCount(0);
  await expect(editor).toBeVisible();
  const fontSize = await editor.evaluate((element) =>
    Number.parseFloat(getComputedStyle(element).fontSize),
  );
  expect(fontSize).toBeGreaterThanOrEqual(16);
  await editor.fill("## Mobile thought");
  await editor.focus();
  await page.locator("label.pane-label-preview").tap();
  await expect(editor).toBeHidden();
  await expect(page.getByRole("heading", { name: "Mobile thought" })).toBeVisible();
  await page.locator("label.pane-label-edit").tap();
  await expect(editor).toHaveValue("## Mobile thought");
});

test("opens a selected local Markdown file on desktop and mobile", async ({ page }, testInfo) => {
  const exactMarkdown = "# Opened file\n\nExact trailing space  \n";
  const editor = page.getByLabel("Markdown editor");

  if (isMobileProject(testInfo.project.name)) {
    await page.locator("label.pane-label-preview").tap();
    await expect(editor).toBeHidden();
  }

  await primeOpenFile(page, "C:/fake/local.markdown", exactMarkdown);
  const openAction = page.getByRole("button", { name: "Open Markdown file" });
  if (isMobileProject(testInfo.project.name)) {
    await openAction.tap();
  } else {
    await openAction.click();
  }
  await expect(editor).toHaveValue(exactMarkdown);
  await expect.poll(() => page.evaluate(() => {
    const saved = localStorage.getItem("md-editor:content:v1");
    return saved ? JSON.parse(saved).content : null;
  })).toBe(exactMarkdown);
  if (isMobileProject(testInfo.project.name)) {
    await expect(page.getByRole("radio", { name: "Edit" })).toBeChecked();
    await expect(editor).toBeVisible();
    await page.locator("label.pane-label-preview").tap();
  }
  await expect(page.getByRole("heading", { name: "Opened file" })).toBeVisible();
});

test("settings apply live and persist after reload", async ({ page }) => {
  await page.getByRole("button", { name: "Settings" }).click();
  const dialog = page.getByRole("dialog", { name: "Settings" });
  await expect(dialog).toBeVisible();
  const editorSize = dialog.getByRole("slider", { name: "Editor font size" });
  await editorSize.focus();
  await editorSize.press("Home");
  for (let step = 0; step < 4; step += 1) await editorSize.press("ArrowRight");
  const previewSize = dialog.getByRole("slider", { name: "Preview font size" });
  await previewSize.focus();
  await previewSize.press("Home");
  for (let step = 0; step < 4; step += 1) await previewSize.press("ArrowRight");
  await dialog.getByRole("combobox", { name: "Line spacing" }).click();
  await page.getByRole("option", { name: "Compact" }).click();
  await dialog.getByRole("switch", { name: "Word wrap" }).click();
  await dialog.getByRole("switch", { name: "Spellcheck" }).click();
  await dialog.getByRole("switch", { name: "Show word and line stats" }).click();
  await dialog.getByRole("button", { name: "Close", exact: true }).click();

  const editor = page.getByLabel("Markdown editor");
  await expect(editor).toHaveCSS("font-size", "20px");
  await expect(editor).toHaveAttribute("wrap", "off");
  await expect(editor).toHaveAttribute("spellcheck", "false");
  await expect(page.getByLabel("Preview content")).toHaveCSS("font-size", "18px");
  await expect(page.locator("#document-count")).toHaveCount(0);

  await page.reload();
  await expect(editor).toHaveCSS("font-size", "20px");
  await expect(editor).toHaveAttribute("wrap", "off");
  await expect(page.getByLabel("Preview content")).toHaveCSS("font-size", "18px");
});

test("toolbar does not overflow a 320px viewport", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await expect(page.getByRole("button", { name: "Settings" })).toBeVisible();
  const overflow = await page.locator(".editor-toolbar").evaluate((toolbar) =>
    toolbar.scrollWidth > toolbar.clientWidth,
  );
  expect(overflow).toBe(false);
});
