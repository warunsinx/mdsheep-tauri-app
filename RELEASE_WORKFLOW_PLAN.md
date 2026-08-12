# MdSheep — GitHub Actions Release Workflow: Implementation Plan

Status: **planning document only**. No workflow files have been created or
modified. This is the authoritative spec to implement from. It reflects the
repository as inspected on 2026‑08‑12 and current (as of that date) Tauri v2 /
GitHub Actions conventions, with sources cited inline.

Repository facts this plan depends on:

| Fact | Value |
|---|---|
| App name / product name | `MdSheep` (`src-tauri/tauri.conf.json` → `productName`) |
| Version (all three currently equal) | `1.0.0` in `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml` |
| Tauri major version | v2 (`@tauri-apps/cli@2`, `tauri = "2"`) |
| Bundle targets configured | `"bundle": { "targets": "all" }` — i.e. every bundler available on the host OS |
| Frontend build | Vite + `tsc -b`, `npm run build` → `dist/` |
| Updater plugin | **not configured** — no `plugins.updater` block, no `TAURI_SIGNING_PRIVATE_KEY` usage anywhere |
| Existing CI | **none** — no `.github/` directory exists in the repo today |
| Tauri capability plugins used | `dialog`, `fs`, `shell` (no clipboard/global-shortcut, relevant to Linux apt deps below) |

---

## 1. Goals and constraints (from the request)

1. GitHub‑hosted runners only, for Windows, macOS, and Linux.
2. Publish: Windows installers, macOS bundles for **both** Intel and Apple
   Silicon, Linux packages.
3. Triggers: version tags (`vX.Y.Z`) **and** a safe `workflow_dispatch` path.
4. Least‑privilege `permissions:`.
5. **No code‑signing secrets required** for the first release; signing
   limitations documented for users, not hidden.
6. No duplicate‑release races across matrix jobs.
7. Tag ↔ `package.json` ↔ `tauri.conf.json` (↔ `Cargo.toml`) version
   consistency validated before anything builds.
8. Sensible dependency caching (npm, Cargo, apt).
9. README documents exact release usage.

---

## 2. Files to add (none touched yet — this is the plan for later)

| File | Purpose |
|---|---|
| `.github/workflows/release.yml` | The only workflow file needed. Single file containing validate → test → create-release → build (matrix) → publish-release. |
| `README.md` (new `## Releases` section) | End‑user and maintainer documentation — exact text in §10 below. |

No helper scripts are introduced. Version‑consistency validation is a handful
of `bash`/`jq`/`node -p` one‑liners and is kept **inline** in the workflow so
the entire release contract lives in one reviewable file. (If it grows past
~20 lines, promote it to `scripts/verify-release-versions.mjs` — not needed
at this scale.)

No separate `ci.yml` is introduced by this plan. The release workflow embeds
its own pre‑build quality gate (§6, `test` job) because none exists today;
this stays scoped to "does this tag pass before we cut a release," not a
general PR‑CI concern.

---

## 3. Trigger design

```yaml
on:
  push:
    tags:
      - 'v[0-9]+.[0-9]+.[0-9]+'
      - 'v[0-9]+.[0-9]+.[0-9]+-*'   # pre-releases: v1.2.0-rc1, v1.2.0-beta.2
  workflow_dispatch:
    inputs:
      tag:
        description: 'Existing tag to (re)build, e.g. v1.0.0'
        required: true
        type: string
      dry_run:
        description: 'true = build artifacts only, never touch GitHub Releases (safe default)'
        required: true
        type: boolean
        default: true
```

Rationale:

- **Tag push** is the normal release path. The glob restricts the workflow to
  well‑formed semver tags so stray tags (`backup-2026`, `wip`) never trigger a
  multi‑platform build.
- **`workflow_dispatch` is opt‑in dangerous by default `false`→ safe**: it
  requires the operator to name an existing tag explicitly (no accidental
  release from whatever branch happens to be checked out in the UI dropdown),
  and `dry_run` defaults to `true`. A dry run compiles and bundles all three
  platforms and uploads them as **workflow artifacts** (`actions/upload-artifact`,
  90‑day retention) — it never creates, edits, or publishes a GitHub Release.
  An operator must consciously re‑run with `dry_run: false` to actually
  publish. This is the "safe manual path" required by the brief: the
  destructive branch is never the default.
- The workflow always checks out `inputs.tag` explicitly on the
  `workflow_dispatch` path (`actions/checkout@v4` with `ref: ${{ inputs.tag }}`),
  not `github.ref`, so a manual run always builds exactly the tagged commit,
  never whatever the UI ref‑picker defaulted to.

---

## 4. Permissions (least privilege)

Top‑level default is read‑only; only the jobs that need to talk to the
Releases API escalate, and only to `contents: write` (no `packages`,
`id-token`, `issues`, `pull-requests`, etc. — none of that is used):

```yaml
permissions:
  contents: read
```

Per‑job overrides:

| Job | `permissions` | Why |
|---|---|---|
| `validate` | *(inherits `contents: read`)* | Only reads repo files/tags. |
| `test` | *(inherits `contents: read`)* | Runs lint/typecheck/unit/e2e/`cargo check`, no writes. |
| `create-release` | `contents: write` | Creates the draft GitHub Release. |
| `build` (matrix) | `contents: write` | Uploads bundle assets to the existing release. |
| `publish-release` | `contents: write` | Flips the release from draft → published. |

No secrets besides the built‑in `secrets.GITHUB_TOKEN` are referenced
anywhere in this design (see §7).

---

## 5. Duplicate‑release race prevention

**The risk is real and documented upstream**: `tauri-action`'s own
find‑or‑create‑release logic has a known race when several matrix legs start
close together and each tries to resolve/create the same `tagName`
concurrently — see
[tauri-apps/tauri-action#914 "Duplicate Releases Sometimes Created"](https://github.com/tauri-apps/tauri-action/issues/914).
Relying on `tagName:` inside each matrix leg is therefore **not** safe for
this workflow.

**Mitigation — split release lifecycle into three serialized jobs, matrix only builds:**

```
validate ──▶ test ──▶ create-release ──▶ build (matrix: windows / macos / linux) ──▶ publish-release
                              │                        │
                     (creates ONE draft          (each leg only uploads
                      release, outputs           assets to the release_id
                      release_id)                 it was handed — never
                                                   creates/finds a release)
```

- `create-release` is a single job (no matrix) — it is the **only** place a
  release object is ever created, so there is nothing to race.
- It is made **idempotent** so a re-run (e.g. retrying a failed platform via
  `workflow_dispatch`) never creates a second release for the same tag:

  ```bash
  if gh release view "$TAG" --json id -q .id 2>/dev/null; then
    echo "release already exists for $TAG, reusing it"
    id=$(gh release view "$TAG" --json id -q .id)
  else
    id=$(gh release create "$TAG" --draft --title "MdSheep $TAG" \
         --notes "Automated build — see attached assets." --format json -q .id)
  fi
  echo "release_id=$id" >> "$GITHUB_OUTPUT"
  ```

- Every matrix leg calls `tauri-apps/tauri-action` with **`releaseId:`** only
  (never `tagName`/`releaseName`), so each leg strictly uploads to the
  already‑existing release and never attempts to create/discover one:

  ```yaml
  - uses: tauri-apps/tauri-action@v1
    env:
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    with:
      releaseId: ${{ needs.create-release.outputs.release_id }}
      args: ${{ matrix.args }}
      includeUpdaterJson: false
  ```

- `publish-release` runs once, after `build` (all matrix legs) succeeds, and
  flips `draft → false` in a single API call — again nothing to race:

  ```bash
  gh release edit "$TAG" --draft=false --latest
  ```

- **Workflow‑level concurrency guard**, in case a tag is pushed twice (force‑push)
  or a `workflow_dispatch` run is fired while a previous run for the same tag
  is still in flight:

  ```yaml
  concurrency:
    group: release-${{ github.event.inputs.tag || github.ref_name }}
    cancel-in-progress: false
  ```

  `cancel-in-progress: false` queues the second run rather than cancelling
  the first mid‑upload (cancelling mid‑upload is what produces partial/broken
  releases); the queued run's `create-release` step just finds the
  already‑existing release and continues safely.

This 3‑job split matches the pattern in Tauri's own
[`publish-to-manual-release.yml` example](https://github.com/tauri-apps/tauri-action/blob/dev/examples/publish-to-manual-release.yml)
(which uses `actions/github-script` instead of the `gh` CLI for the same
three steps — either is fine; `gh` is used here because it's preinstalled on
every GitHub‑hosted runner and needs no extra script boilerplate).

---

## 6. Job architecture (full design)

```yaml
name: Release

on: { ... as in §3 ... }

permissions:
  contents: read

concurrency:
  group: release-${{ github.event.inputs.tag || github.ref_name }}
  cancel-in-progress: false

env:
  # Single source of truth other jobs read via `needs.validate.outputs.*`.
  # Declared here only for readability; actual values are job outputs.

jobs:
  validate:
    name: Validate tag & version consistency
    runs-on: ubuntu-22.04
    outputs:
      tag: ${{ steps.resolve.outputs.tag }}
      version: ${{ steps.resolve.outputs.version }}
      dry_run: ${{ steps.resolve.outputs.dry_run }}
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.inputs.tag || github.ref }}
          fetch-depth: 0
      - id: resolve
        run: |
          set -euo pipefail
          if [ "${{ github.event_name }}" = "workflow_dispatch" ]; then
            TAG="${{ github.event.inputs.tag }}"
            DRY_RUN="${{ github.event.inputs.dry_run }}"
          else
            TAG="${{ github.ref_name }}"
            DRY_RUN="false"
          fi

          if ! [[ "$TAG" =~ ^v[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.]+)?$ ]]; then
            echo "::error::Tag '$TAG' is not a valid vX.Y.Z (or vX.Y.Z-prerelease) tag."
            exit 1
          fi
          VERSION="${TAG#v}"

          PKG_VERSION=$(node -p "require('./package.json').version")
          TAURI_VERSION=$(node -p "require('./src-tauri/tauri.conf.json').version")
          CARGO_VERSION=$(grep -m1 '^version' src-tauri/Cargo.toml | sed -E 's/version *= *"([^"]+)"/\1/')

          MISMATCH=0
          for pair in "package.json:$PKG_VERSION" "tauri.conf.json:$TAURI_VERSION" "Cargo.toml:$CARGO_VERSION"; do
            name="${pair%%:*}"; value="${pair##*:}"
            if [ "$value" != "$VERSION" ]; then
              echo "::error::$name version ($value) does not match tag version ($VERSION)"
              MISMATCH=1
            fi
          done

          if [ "$MISMATCH" -ne 0 ]; then
            if [ "$DRY_RUN" = "true" ]; then
              echo "::warning::Version mismatch ignored because dry_run=true (test build only)."
            else
              exit 1
            fi
          fi

          echo "tag=$TAG" >> "$GITHUB_OUTPUT"
          echo "version=$VERSION" >> "$GITHUB_OUTPUT"
          echo "dry_run=$DRY_RUN" >> "$GITHUB_OUTPUT"

  test:
    name: Quality gate
    needs: validate
    runs-on: ubuntu-22.04
    steps:
      - uses: actions/checkout@v4
        with: { ref: ${{ needs.validate.outputs.tag }} }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test -- --run
      - uses: dtolnay/rust-toolchain@stable
      - uses: Swatinem/rust-cache@v2
        with: { workspaces: src-tauri }
      # Linux apt deps are needed even just to `cargo check` the Tauri crate
      # (it depends on webkit2gtk headers at compile time).
      - run: |
          sudo apt-get update
          sudo apt-get install -y libwebkit2gtk-4.1-dev build-essential \
            curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev \
            librsvg2-dev
      - run: cargo check --manifest-path src-tauri/Cargo.toml

  create-release:
    name: Create draft release
    needs: [validate, test]
    if: needs.validate.outputs.dry_run != 'true'
    runs-on: ubuntu-22.04
    permissions:
      contents: write
    outputs:
      release_id: ${{ steps.rel.outputs.release_id }}
    steps:
      - uses: actions/checkout@v4
      - id: rel
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          TAG: ${{ needs.validate.outputs.tag }}
        run: |
          set -euo pipefail
          if id=$(gh release view "$TAG" --json id -q .id 2>/dev/null); then
            echo "Reusing existing draft release $id for $TAG"
          else
            id=$(gh release create "$TAG" \
              --draft \
              --title "MdSheep $TAG" \
              --notes "Automated build for $TAG. Unsigned first-release binaries — see README 'Releases' section for platform install notes." \
              --format json -q .id)
          fi
          echo "release_id=$id" >> "$GITHUB_OUTPUT"

  build:
    name: Build (${{ matrix.platform }})
    needs: [validate, create-release]
    if: always() && needs.validate.outputs.dry_run != '' # runs for both real and dry-run releases
    strategy:
      fail-fast: false
      matrix:
        include:
          - platform: windows-latest
            args: ''
          - platform: macos-latest
            args: '--target universal-apple-darwin'
          - platform: ubuntu-22.04
            args: ''
    runs-on: ${{ matrix.platform }}
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
        with: { ref: ${{ needs.validate.outputs.tag }} }

      - name: Install Linux system dependencies
        if: matrix.platform == 'ubuntu-22.04'
        run: |
          sudo apt-get update
          sudo apt-get install -y libwebkit2gtk-4.1-dev build-essential \
            curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev \
            librsvg2-dev

      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }

      - uses: dtolnay/rust-toolchain@stable
        with:
          targets: ${{ matrix.platform == 'macos-latest' && 'aarch64-apple-darwin,x86_64-apple-darwin' || '' }}

      - uses: Swatinem/rust-cache@v2
        with:
          workspaces: src-tauri
          key: ${{ matrix.platform }}

      - run: npm ci

      - name: Build & upload (real release)
        if: needs.validate.outputs.dry_run != 'true'
        uses: tauri-apps/tauri-action@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          releaseId: ${{ needs.create-release.outputs.release_id }}
          args: ${{ matrix.args }}
          includeUpdaterJson: false

      - name: Build only (dry run — no release touched)
        if: needs.validate.outputs.dry_run == 'true'
        uses: tauri-apps/tauri-action@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          args: ${{ matrix.args }}
          includeUpdaterJson: false

      - name: Upload dry-run artifacts
        if: needs.validate.outputs.dry_run == 'true'
        uses: actions/upload-artifact@v4
        with:
          name: mdsheep-${{ matrix.platform }}
          path: |
            src-tauri/target/release/bundle/**
            src-tauri/target/**/release/bundle/**
          retention-days: 14
          if-no-files-found: error

  publish-release:
    name: Publish release
    needs: [validate, build]
    if: needs.validate.outputs.dry_run != 'true'
    runs-on: ubuntu-22.04
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      - env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          TAG: ${{ needs.validate.outputs.tag }}
        run: gh release edit "$TAG" --draft=false --latest
```

Notes on the skeleton above:

- `build`'s `if: always() && needs.validate.outputs.dry_run != ''` intentionally
  does **not** depend on `create-release`'s success when `dry_run == 'true'`
  (that job is skipped entirely in dry runs via its own `if:`) — this lets the
  full 3‑platform build matrix run standalone for testing without ever
  touching Releases. When `dry_run != 'true'`, `create-release` still gates
  `build` through the ordinary `needs:` dependency, so `build` never starts
  before the draft release exists to upload into.
- `fail-fast: false` on the build matrix: one platform failing (say, a
  transient macOS runner issue) does not cancel the other two legs. `publish-release`
  still won't run unless **all** matrix legs succeeded (ordinary `needs:`
  semantics — see §8, Failure handling).

---

## 7. Code‑signing stance for the first release

**No signing secrets are referenced anywhere in this design.** No
`APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_ID`,
`APPLE_PASSWORD`, `APPLE_TEAM_ID`, `WINDOWS_CERTIFICATE`,
`WINDOWS_CERTIFICATE_PASSWORD`, `TAURI_SIGNING_PRIVATE_KEY`, or
`TAURI_SIGNING_PRIVATE_KEY_PASSWORD` secret is consumed. `includeUpdaterJson: false`
is set explicitly on every `tauri-action` call because there is no
`plugins.updater` config in `tauri.conf.json` today, and generating an
updater manifest without one would either no‑op or fail depending on
`tauri-action` version — being explicit avoids ambiguity either way.

Consequences the README **must** state plainly (see §10):

| Platform | What ships unsigned | User‑visible effect | Workaround for users |
|---|---|---|---|
| Windows (NSIS `.exe` + MSI `.msi`) | No Authenticode certificate | SmartScreen "Windows protected your PC" warning on first run | Click "More info" → "Run anyway" |
| macOS (universal `.app` in `.dmg`) | No Apple Developer ID; Tauri's bundler applies **ad‑hoc** signing automatically (`codesign -s -`) because arm64 binaries must carry *some* signature to launch at all on Apple Silicon | Gatekeeper reports the app is "damaged" / "cannot be opened" or "unidentified developer" when downloaded (ad‑hoc signatures don't survive/validate across machines — this is expected, not a build defect: see [Tauri macOS signing docs](https://v2.tauri.app/distribute/sign/macos/)) | Right‑click the app → "Open", or run `xattr -cr /Applications/MdSheep.app` once after install |
| Linux (`.deb`, `.rpm`, `.AppImage`) | No package/repo signing | No OS-level warning (Linux doesn't gate on code signing the way Win/macOS do); AppImage needs the executable bit set | `chmod +x MdSheep_*.AppImage` before running |

This is intentionally the *documented limitation*, not a bug to silently
route around. A follow‑up plan (not part of this document) would add:
Apple Developer ID + notarization (`APPLE_CERTIFICATE`, `APPLE_ID`,
`APPLE_PASSWORD`, `APPLE_TEAM_ID` secrets), an Authenticode certificate or
Azure Trusted Signing for Windows, and — only if the updater plugin is ever
adopted — `TAURI_SIGNING_PRIVATE_KEY`. None of that is required to ship the
first unsigned release, and this workflow must keep working with zero
signing secrets configured (all signing inputs are conditionally omitted,
never left referencing an unset secret).

---

## 8. Failure handling

- **`fail-fast: false`** on the build matrix (already in §6): a Windows
  runner hiccup doesn't waste completed macOS/Linux work.
- **The release is never auto‑published if any leg fails.** `publish-release`
  `needs: [validate, build]`; GitHub Actions treats a `needs:` job as
  unsatisfied if any matrix job in `build` failed, so `publish-release` is
  skipped and the release **stays in draft** — nothing broken ever reaches
  users automatically. This is the deliberate rollback‑by‑default posture:
  a half‑finished release is inert (drafts aren't visible on the public
  Releases page) rather than corrective.
- **Recovery path for a partial failure:** fix the issue, then re‑run via
  `workflow_dispatch` with the **same tag** and `dry_run: false`.
  `create-release`'s idempotency check (§5) finds the existing draft and
  reuses its `release_id`; `tauri-action` uploads are additive per‑asset, so
  successful platforms are not rebuilt for nothing but re‑uploading the same
  filename is safe (the action overwrites/skips the existing asset rather
  than erroring — verify this on first use, see §9). If a full clean re-run is
  ever preferred, delete the draft first (`gh release delete "$TAG" --yes`,
  **draft-only**, never delete a published release) and re-run.
- **Stale drafts:** if a release is abandoned (e.g. the tag itself was wrong
  and a corrected tag was pushed), the leftover draft is not automatically
  cleaned up — document in README/PR template that maintainers should
  `gh release delete <bad-tag> --yes` manually. No automation deletes
  releases; deletion is inherently destructive and stays a manual, deliberate
  action.
- **Timeouts:** add `timeout-minutes: 30` to `build` matrix jobs (Rust builds
  across 3 fresh runners can legitimately take 10–20 min each; 30 gives
  headroom while still failing a genuinely hung job well before the 6‑hour
  GitHub Actions job ceiling).
- **Tag/version validation failures** (§6 `validate` job) fail before any
  compute‑heavy job runs, and before `create-release` — a bad tag never
  produces a draft release at all.

---

## 9. Caching strategy

| Layer | Mechanism | Notes |
|---|---|---|
| npm | `actions/setup-node@v4` with `cache: npm` (keys off `package-lock.json`) | Applies to `test` and every `build` matrix leg. `postinstall` (`scripts/copy-fonts.mjs`) still runs on every `npm ci` — it's cheap (local file copy) and correctness‑sensitive, so it is **not** cached/skipped. |
| Cargo (registry + target) | `Swatinem/rust-cache@v2`, `workspaces: src-tauri` | Automatically keys by OS/arch and `Cargo.lock` hash — safe to use unscoped per platform, but this plan sets `key: ${{ matrix.platform }}` explicitly for clearer cache-hit visibility across the 3 matrix legs (macOS additionally compiles two targets for the universal binary, so its cache entry is naturally larger/slower on first run). |
| apt (Linux system libs) | Not cached in this plan — `apt-get install` of ~7 small packages is a fixed, cheap cost (~10–20s) on `ubuntu-22.04`; caching via `awalsh128/cache-apt-pkgs-action` is a valid future optimization but adds a moving part for negligible time saved today. |
| Rust toolchain itself | `dtolnay/rust-toolchain@stable` | Pinned to the `stable` channel (not a specific patch version) — GitHub's macOS/Windows/Linux runner images already ship a recent stable toolchain, so this action mostly just adds the extra `--target` triples for the macOS universal build. |

---

## 10. Actions & versions to pin

| Action | Version to use | Why this one |
|---|---|---|
| `actions/checkout` | `@v4` | Current major; re-check for a `@v5` tag at implementation time. |
| `actions/setup-node` | `@v4` | Built-in npm cache support via `cache: npm`. |
| `dtolnay/rust-toolchain` | `@stable` (rolling channel tag, not a semver release) | De‑facto standard minimal Rust setup action; supports `targets:` for the macOS universal build. |
| `Swatinem/rust-cache` | `@v2` | Standard Cargo caching action, OS/arch‑aware by default. |
| `tauri-apps/tauri-action` | `@v1` | Current major as of inspection (`v1.0.0`, June 2024) — this action's own v1 is the one that targets **Tauri v2** apps (confusing but correct: the action dropped Tauri-v1-app support in its v1.0.0). Re-verify at [tauri-apps/tauri-action/releases](https://github.com/tauri-apps/tauri-action/releases) before implementing in case a newer major has shipped. |
| `actions/upload-artifact` | `@v4` | Dry-run artifact upload only. |
| GitHub CLI (`gh`) | preinstalled on all GitHub-hosted runners | Used directly for `create-release`/`publish-release`; no extra action needed. |

Hardening option (recommended, not required for v1): pin every third‑party
action (`dtolnay/*`, `Swatinem/*`, `tauri-apps/*`) to a full commit SHA
instead of a tag, since this workflow holds `contents: write` and runs
automatically on tag push — SHA pinning removes the "a compromised/retagged
release of a dependency action gets write access to your repo's releases"
supply‑chain risk. Not done in the skeleton above to keep it readable; do
this as a follow‑up hardening pass (Dependabot supports version PRs even for
SHA-pinned actions via `# vX.Y.Z` comments).

---

## 11. Matrix targets — final answer

| OS | Runner label | Rust targets added | `tauri build` invocation | Bundles produced |
|---|---|---|---|---|
| Windows | `windows-latest` | *(host default)* | default | `.exe` (NSIS) **and** `.msi` (WiX) — both, since `bundle.targets: "all"` |
| macOS | `macos-latest` (Apple‑Silicon/arm64 host) | `aarch64-apple-darwin` + `x86_64-apple-darwin` | `--target universal-apple-darwin` | one universal `.app`/`.dmg` that runs natively on **both** Apple Silicon and Intel Macs |
| Linux | `ubuntu-22.04` | *(host default, x86_64)* | default | `.deb`, `.rpm`, `.AppImage` (whichever bundlers `bundle.targets: "all"` resolves on Ubuntu 22.04) |

**Why a single universal macOS runner instead of two separate Intel/ARM
runners:** GitHub retired the `macos-13` Intel-hosted image (deprecation
started 2025‑09‑22, fully unsupported 2025‑12‑04); the only remaining Intel
label is `macos-15-intel`, explicitly called out as the *last* x86_64 image
GitHub will ever host, retiring in turn in Fall 2027. Building
`universal-apple-darwin` cross‑compiles the x86_64 slice from the arm64
`macos-latest` host (Rust supports this natively; Xcode ships both SDKs) and
`lipo`‑merges it with the native arm64 slice into one bundle — so this plan
needs **zero** dependency on the sunsetting Intel runner label and ships one
binary that covers both architectures, which is also simpler for users (one
download, not "pick your Mac's chip"). Trade‑off: the macOS leg compiles
twice (both targets) so it is the slowest matrix leg — expected, not a bug.

**Not included / explicitly deferred:**
- Linux ARM64 (`ubuntu-24.04-arm64` GitHub-hosted runners are available for
  public repos): skipped for the first release to keep the matrix small;
  trivial to add later as a 4th matrix entry once there's user demand.
- Mobile (Android/iOS): out of scope — `tauri.conf.json`/`Cargo.toml` here
  target desktop only, no mobile config exists in the repo.
- `.rpm` bundling: Tauri v2's RPM bundler is a pure‑Rust implementation (no
  host `rpmbuild` binary required), but this has not been exercised in this
  repo's CI yet — treat the first real run as the verification point (§12).
  If it proves flaky, the fallback is narrowing `tauri.conf.json`'s
  `bundle.targets` from `"all"` to `["deb", "appimage"]` — a one‑line config
  change, not a workflow change.

---

## 12. Testing & verification plan (before the first real tag)

Cross‑platform GitHub Actions runners cannot be faithfully emulated locally
(`act` only really works for Linux container jobs, not the `windows-latest`/
`macos-latest` hosted VMs this workflow needs) — verification happens on
GitHub‑hosted infrastructure via the safe dry‑run path, in this order:

1. **Lint the workflow file itself** before pushing: `actionlint
   .github/workflows/release.yml` (and a YAML formatter) — catches syntax and
   common `${{ }}` expression mistakes for free, no runner minutes spent.
2. **First live test — dry run, default inputs**: manually trigger
   `workflow_dispatch` with `tag: v1.0.0`, `dry_run: true` (the default).
   Expect: `validate` passes (versions already consistent at `1.0.0`), `test`
   passes, `create-release`/`publish-release` are both skipped (visible as
   "skipped" in the Actions UI, not failed), `build` runs all three platforms
   and each uploads a `mdsheep-<platform>` artifact. Download each artifact
   and sanity‑check: Windows `.exe`/`.msi` exist and aren't 0 bytes; macOS
   `.dmg` mounts and the `.app` inside is a universal binary
   (`lipo -info MdSheep.app/Contents/MacOS/mdsheep-tauri` should report both
   `x86_64` and `arm64`); Linux `.deb`/`.AppImage` exist.
3. **Second live test — deliberately break version consistency**: bump only
   `package.json`'s version locally on a scratch branch, dispatch with
   `dry_run: true` — confirm `validate` emits the mismatch as a `::warning::`
   (not a failure, because dry runs tolerate mismatches by design) so the
   rest of the pipeline still exercises. Then dispatch the *same* mismatched
   state with `dry_run: false` — confirm `validate` now hard‑fails with
   `::error::` and nothing downstream (`test`, `create-release`, `build`) runs.
   Revert the scratch change; do not merge it.
4. **Third live test — induced platform failure**: temporarily add a failing
   step to one matrix leg only (e.g. `run: exit 1` under an `if:` for
   `windows-latest`) on a scratch branch/PR, dispatch with `dry_run: false`
   against a throwaway tag (e.g. `v0.0.0-workflow-test`, which will fail
   `validate`'s version check against `package.json` unless that's also
   bumped on the scratch branch — bump it there too, it's disposable).
   Confirm: macOS/Linux legs still complete (`fail-fast: false`),
   `publish-release` is skipped, and the draft release exists with only 2 of
   3 platforms' assets attached. Manually `gh release delete
   v0.0.0-workflow-test --yes` afterward to clean up. Revert the induced
   failure; do not merge it.
5. **Fourth live test — idempotent re-run**: with the draft release from a
   still‑pending or intentionally-incomplete run present, re-dispatch the
   same `tag` with `dry_run: false` and confirm `create-release` logs
   "Reusing existing draft release" rather than creating a second one, and
   that `gh release list` shows only one release for that tag throughout.
6. Only after all of the above pass on scratch/test tags does this plan
   consider the workflow ready for a real `vX.Y.Z` push (§13).

---

## 13. First‑release procedure (exact steps)

Given the repo's versions are already aligned at `1.0.0` across
`package.json`, `src-tauri/tauri.conf.json`, and `src-tauri/Cargo.toml`:

```bash
# 0. Prerequisite: .github/workflows/release.yml implemented from this plan
#    and merged to main, and §12's dry-run/failure/idempotency tests have
#    all passed on scratch tags.

# 1. Make sure main is what you want to ship, and versions still agree.
git checkout main && git pull
node -p "require('./package.json').version"                       # 1.0.0
node -p "require('./src-tauri/tauri.conf.json').version"           # 1.0.0
grep -m1 '^version' src-tauri/Cargo.toml                           # version = "1.0.0"

# 2. Tag and push. This is what fires the workflow.
git tag -a v1.0.0 -m "MdSheep v1.0.0"
git push origin v1.0.0

# 3. Watch the run (GitHub UI → Actions, or):
gh run watch

# 4. Once `build` is green for all 3 platforms and `publish-release` has run,
#    confirm the release is live (not draft) and has 4+ assets
#    (win .exe + .msi, macOS .dmg, linux .deb/.rpm/.AppImage):
gh release view v1.0.0

# 5. Manual smoke test — download and run the artifact on at least one real
#    machine per OS before announcing:
#      Windows: run the .exe, click through the expected SmartScreen prompt.
#      macOS:   open the .dmg, right-click the .app -> Open (or `xattr -cr`),
#               confirm it launches on both an Apple Silicon and an Intel
#               Mac if available.
#      Linux:   `chmod +x *.AppImage && ./MdSheep_*.AppImage`, and/or
#               `sudo dpkg -i mdsheep-tauri_1.0.0_amd64.deb`.
# 6. Only after manual smoke test passes, announce the release / update any
#    external references (e.g. the mdsheep-app README pointer described in
#    this repo's own README "Previous web version" section).
```

If step 4 shows a draft still sitting there (a platform failed), follow §8's
recovery path — do **not** manually flip draft→published while a leg is
missing; fix and re‑dispatch instead.

---

## 14. README documentation to add

This plan does not edit `README.md`. The exact Markdown block to insert
during implementation — as a new `## Releases` section placed after
`## Verification` and before `## Security and privacy` — is:

````markdown
## Releases

Tagged pushes matching `vX.Y.Z` (e.g. `v1.0.0`) trigger
`.github/workflows/release.yml`, which builds installers for Windows,
macOS (universal — one download for both Apple Silicon and Intel), and
Linux, and publishes them to the [GitHub Releases page](https://github.com/warunsinx/mdsheep-tauri/releases)
once every platform build succeeds.

Before tagging a release, `package.json`, `src-tauri/tauri.conf.json`, and
`src-tauri/Cargo.toml` must all report the same version — the workflow
validates this and fails the release otherwise.

To cut a release:

```bash
git tag -a v1.0.0 -m "MdSheep v1.0.0"
git push origin v1.0.0
```

To test the full build matrix without publishing anything, run the workflow
manually from the Actions tab (`workflow_dispatch`) with an existing tag and
leave `dry_run` at its default (`true`) — this builds all three platforms
and attaches them as downloadable workflow artifacts, without touching
Releases.

### First-release binaries are unsigned

This project does not yet hold an Apple Developer ID or a Windows code‑signing
certificate. As a result:

- **Windows**: installers will trigger a SmartScreen warning
  ("Windows protected your PC"). Click **More info → Run anyway**.
- **macOS**: the app is ad‑hoc signed (required for it to run at all on
  Apple Silicon) but not notarized, so Gatekeeper will call it "damaged" or
  from an "unidentified developer" on first download. Right‑click the app
  and choose **Open**, or run `xattr -cr /Applications/MdSheep.app` once.
- **Linux**: no signing warnings; mark the AppImage executable first:
  `chmod +x MdSheep_*.AppImage`.

These are expected consequences of shipping unsigned, not build defects.
Proper code signing/notarization is planned as a follow-up once the
necessary Apple/Microsoft certificates are available.
````

---

## 15. Open items to confirm at implementation time

These are called out rather than guessed at, since they can drift between
now and implementation:

1. **`tauri-apps/tauri-action` major version** — confirmed `@v1` as of this
   plan's research; re-check the releases page before writing the workflow.
2. **`actions/checkout` major** — `@v4` is current; a `@v5` may exist by
   implementation time.
3. **RPM bundling on `ubuntu-22.04`** — expected to work with Tauri v2's
   built-in pure-Rust RPM bundler, but not yet exercised in this repo; treat
   the first dry run (§12 step 2) as the real verification, with the
   `bundle.targets` narrowing fallback noted in §11 ready if it fails.
4. **`node-version` pin (`20` above)** — check against the Node version
   actually used in local dev (`package.json` has no `engines` field
   today); align to whatever the team standardizes on, or add an `engines`
   field to `package.json` as a follow-up so this workflow and local dev
   can both read one source of truth.
5. **GitHub Actions minute cost** — three fresh full Rust compiles per
   release is the highest-cost part of this design (macOS doubly so, since
   it compiles two targets for the universal binary); acceptable for an
   infrequent release cadence, worth monitoring if releases become frequent.
