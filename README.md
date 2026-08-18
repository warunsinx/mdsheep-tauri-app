# MdSheep Tauri

> **In active preparation:** this is the new home of MdSheep. I am preparing this version to run natively across multiple devices and operating systems. The original web repository, [mdsheep-app](https://github.com/warunsinx/mdsheep-app), will be deprecated in favor of this native application.

MdSheep is a small, local-first Markdown reader and editor with live Mermaid support. This edition is built with Tauri v2, React, TypeScript, Vite, and Rust so it can become a native multi-device, multi-OS application without giving up the simple editor experience.

![MdSheep running on desktop and mobile](assets/github/mdsheep-dark-responsive-features.png)

## Web version

Try MdSheep in your browser at **[mdsheep-tauri-app.vercel.app](https://mdsheep-tauri-app.vercel.app/)**.

## Project status

This repository is the successor to [`mdsheep-app`](https://github.com/warunsinx/mdsheep-app). Native desktop support is working on Windows, while broader operating-system and device packaging is being prepared and tested.

The previous web implementation remains available during the transition, but it is planned for deprecation. New native and cross-platform work belongs here.

## Features

- Live GitHub Flavored Markdown preview
- Mermaid diagrams rendered as you type
- Native `.md` and `.markdown` Open and Export dialogs
- Local autosave using the original MdSheep storage keys
- Light and dark themes
- Resizable and collapsible desktop panes with keyboard controls and snap points
- Responsive Edit and Preview views down to mobile-sized layouts
- Adjustable typography, line spacing, wrapping, spellcheck, and document statistics
- External HTTP(S) and mail links opened through the operating system
- Sanitized Markdown and strict-mode Mermaid rendering

## Development

Requirements: Node.js/npm, Rust, and the [Tauri v2 platform prerequisites](https://v2.tauri.app/start/prerequisites/).

```bash
git clone https://github.com/warunsinx/mdsheep-tauri-app.git
cd mdsheep-tauri-app
npm install
npm run tauri dev
```

The frontend alone is available with `npm run dev` at `http://127.0.0.1:5173`. Native Open, Export, and external-link operations require the Tauri runtime.

## Verification

```bash
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
npm run tauri build
```

Playwright browsers can be installed with:

```bash
npx playwright install chromium webkit
```

Windows bundles are emitted under `src-tauri/target/release/bundle/`.

## Releases

Pushing a semantic-version tag such as `v1.0.0` runs
`.github/workflows/release.yml`. The workflow validates the tag against the
versions in `package.json`, `src-tauri/tauri.conf.json`, and
`src-tauri/Cargo.toml`, runs the quality gate, and builds:

- Windows NSIS (`.exe`) and MSI (`.msi`) installers
- One universal macOS disk image for both Apple Silicon and Intel Macs
- Linux `.deb`, `.rpm`, and `.AppImage` packages

Only after every platform succeeds does the final job upload the complete set
of assets and publish the draft GitHub Release.

To cut a release, first update all three version files to the same version,
commit that change, then create and push the matching tag:

```bash
git tag -a v1.0.0 -m "MdSheep v1.0.0"
git push origin v1.0.0
```

To test the full hosted-runner matrix without touching GitHub Releases, run
the **Release** workflow manually from the Actions tab, enter an existing tag,
and leave `dry_run` at its default of `true`. The installers are retained as
downloadable workflow artifacts for 14 days. A manual run with `dry_run` set
to `false` creates and publishes a release, so use it only for an intentional
release or recovery of an incomplete draft.

### Unsigned binary warnings

No signing secrets are required by the release workflow. Until the project has
Apple and Windows signing credentials, downloads have these expected platform
behaviors:

- **Windows:** NSIS and MSI installers are not Authenticode-signed. Microsoft
  Defender SmartScreen may show “Windows protected your PC.” Verify that the
  download came from this repository before choosing **More info → Run anyway**.
- **macOS:** the app is not Developer ID-signed or notarized. Gatekeeper may
  report an unidentified developer or refuse the downloaded app. After
  verifying the download, right-click the app and choose **Open**. If macOS
  still quarantines it, run `xattr -cr /Applications/MdSheep.app` once.
- **Linux:** packages are not repository-signed. AppImages may need their
  executable bit enabled with `chmod +x MdSheep_*.AppImage`.

These warnings are a consequence of unsigned distribution, not evidence that
the build failed. Signing and macOS notarization can be added later without
changing the release lifecycle.

## Security and privacy

MdSheep does not upload your documents to a server. Markdown raw HTML is not rendered; output is restricted by `rehype-sanitize`. Mermaid uses strict security mode and its SVG is sanitized with DOMPurify. Native file access is limited to explicit user-selected paths, and the Tauri capability grants only the operations the application uses.

## Previous web version

The original Next.js implementation is at [`warunsinx/mdsheep-app`](https://github.com/warunsinx/mdsheep-app). It is retained temporarily for the hosted web version and migration history, but this repository is its intended replacement.
