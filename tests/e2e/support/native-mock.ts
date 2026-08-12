import type { Page } from "@playwright/test";

export async function installNativeMock(page: Page) {
  await page.addInitScript(() => {
    window.__MDSHEEP_TEST_STATE__ = {
      openResult: null,
      fileContents: {},
      saveResult: null,
      written: [],
      openedExternal: [],
    };
  });
}

export async function primeOpenFile(page: Page, path: string, content: string) {
  await page.evaluate(({ path, content }) => {
    const state = window.__MDSHEEP_TEST_STATE__!;
    state.openResult = path;
    state.fileContents[path] = content;
  }, { path, content });
}
