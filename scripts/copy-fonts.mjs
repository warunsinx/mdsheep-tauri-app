import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pairs = [
  ["node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2", "public/fonts/geist-sans/Geist-Variable.woff2"],
  ["node_modules/geist/dist/fonts/geist-mono/GeistMono-Variable.woff2", "public/fonts/geist-mono/GeistMono-Variable.woff2"],
];
for (const [from, to] of pairs) {
  mkdirSync(dirname(join(root, to)), { recursive: true });
  copyFileSync(join(root, from), join(root, to));
}
