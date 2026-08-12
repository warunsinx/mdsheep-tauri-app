import { open as openExternal } from "@tauri-apps/plugin-shell";

export function isExternalHref(href: string) {
  return /^(https?:|mailto:)/i.test(href);
}

export async function openInSystemBrowser(href: string) {
  const state = globalThis.__MDSHEEP_TEST_STATE__;
  if (state) state.openedExternal.push(href);
  else await openExternal(href);
}
