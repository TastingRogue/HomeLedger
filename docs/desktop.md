# HomeLedger Desktop (development preview)

HomeLedger Desktop runs the existing HomeLedger interface and database on your own computer. It does not need a separate server, Docker or a Node.js installation. Both themes and English/Spanish are shared with the web application.

**Status:** [Windows x64 preview](https://github.com/TastingRogue/HomeLedger/releases/tag/v1.2.0), unsigned and intended for testing with synthetic data. Linux/macOS installer validation and stable-release signing remain pending. See [implementation status](DESKTOP_PLAN.md#17-registro-de-avances).

## Target downloads

| Platform | Architecture | Format |
| --- | --- | --- |
| Windows | x64 | `.exe` installer, per user |
| macOS | Apple Silicon / Intel | Separate `.dmg` files |
| Linux | x64 | `.AppImage` or `.deb` |

Download the Windows installer from the prerelease linked above. The native source-material ZIP and checksum file are provided on the same release; the source ZIP is optional for installation. Other test artifacts are built by the **Desktop builds (preview)** Actions workflow. No build is uploaded to a public release automatically. Do not use real financial data in an unverified preview. Minimum supported OS versions and signed downloads will be listed once validated; compiling on a runner alone is not installer certification.

The current toolchain targets Windows10/11 x64, macOS13+ (Ventura) on Intel/Apple Silicon, and Linux x64 with a compatible glibc desktop. Windows11 and a Debian12 Linux runtime are the local test environments; older/minimum versions and Linux graphical installation remain QA tasks. See [Electron's supported platforms](https://github.com/electron/electron#platform-support).

## First use

1. Install the package for your operating system and architecture, then open HomeLedger.
2. Create your local account. The first account is the administrator; there is no default password.
3. Choose your language, currency and appearance in Settings and create your accounts.

The local backend opens automatically and is accessible only to the application's own window. It is not a server for your phone, Home Assistant or another browser. The regular Docker/HA installations remain available for those uses.

Core finance operations and the bundled English/Spanish OCR are designed to work offline. Existing features that explicitly call external services, links and webhooks still need a connection. Scheduled tasks only run while HomeLedger is open. On macOS, closing the last window leaves the application running; use **Quit HomeLedger** to stop it.

If a PDF replaces the main view, use **View → Back** (Alt+Left on Windows/Linux, Cmd+[ on macOS). **View → Return to HomeLedger** (Ctrl/Cmd+Shift+H) returns to the dashboard.

## Your data

Use **File → Open data folder** to see the exact location. The stable profile name is `HomeLedger` in the OS application-data directory, typically:

- Windows: `%APPDATA%\HomeLedger`
- macOS: `~/Library/Application Support/HomeLedger`
- Linux: `$XDG_CONFIG_HOME/HomeLedger` (usually `~/.config/HomeLedger`)

Contents:

- `data/homeledger.db`: financial database.
- `data/attachments/`: receipts and attachments.
- `data/backups/`: scheduled database snapshots and pre-upgrade snapshots.
- `desktop.json`: installation secret, stable local port and window bounds. Keep private.
- `data/desktop-runtime.json`: last successfully opened runtime/schema fingerprint.
- `logs/desktop.log`: bounded lifecycle diagnostics without receipt contents or credentials.
- Chromium profile/cache directories: theme preferences, login cookies and related local state.

The database is not encrypted by HomeLedger. Protect your OS account and disk. There is no automatic cloud upload or device synchronization.

## Backups and moving data

Use the existing **Backup** screen to export/import a JSON backup, including attachments. Import replaces the applicable data: read the confirmation before proceeding. Register a local account before importing a backup from another installation.

The import review validates the JSON before enabling restoration and shows the replacement warning and record counts. CSV imports are separate: check the detected bank and target account before confirming, especially because bank exports can use different amount signs.

SQLite snapshots are different from JSON exports: they contain instance database state and accounts, but do not embed the attachment files. An upgrade snapshot alone is not a complete replacement for a JSON export or a full profile backup. Before an upgrade, export JSON and/or copy the entire profile **after quitting HomeLedger**. Never copy just a live `.db` while WAL sidecars may contain recent writes.

Desktop never automatically opens your existing Docker or Home Assistant volume. Use export/import to move application data; do not point two running installations at the same SQLite file.

## Updating and uninstalling

Updates are manual: export a backup, quit HomeLedger, install a newer compatible version and reopen. There is no automatic updater in this version. Data live outside the installation directory and are retained across updates and reinstalls. Uninstalling the application does not deliberately delete the profile.

Before changing the packaged database schema/runtime fingerprint, desktop creates a consistent `pre-upgrade-*.db` snapshot using SQLite's backup API. Failure to create that snapshot prevents migration. A database known to a newer schema/version is rejected rather than silently downgraded.

To remove all local data deliberately, first export any needed backup, quit HomeLedger, uninstall it, then remove the profile directory shown by **Open data folder**. This cannot be undone without a backup.

## Troubleshooting

- **Startup failed:** use Retry after checking free space and permissions, or open the data folder/logs. Do not delete the database to fix a startup error.
- **Local port is in use:** close the conflicting program and Retry. The port is saved to keep browser preferences stable; HomeLedger never attaches to an unknown server on that port.
- **Newer data:** reinstall the same/newer application version or restore a backup compatible with the version you intend to run. Do not edit the schema marker to bypass the guard.
- **Configuration damaged:** preserve the whole profile and restore `desktop.json` from a known backup. Desktop does not silently regenerate an invalid secret.
- **Failed migration:** quit all HomeLedger processes and preserve the complete profile before recovery. Restore the compatible pre-upgrade SQLite snapshot and its matching application version while stopped; remove stale WAL/SHM only as part of a deliberate restore. Keep attachments and configuration. Prefer the supported JSON import workflow for moving data to a fresh instance.
- **PDF unreadable:** damaged/password-protected documents may require an unlocked export. Scanned PDF processing is limited to the first three pages, matching the existing workflow.
- **Unsigned preview:** Windows/macOS may block or warn about test artifacts. Preview builds are not equivalent to signed stable installers; do not disable OS protections globally. Signing/notarization are release prerequisites.

## Development

From the repository root (Node 22.23.4 recommended):

```sh
npm ci
npm ci --prefix packages/desktop
npm run build
npm run prepare:runtime --prefix packages/desktop
npm test --prefix packages/desktop
npm run smoke --prefix packages/desktop
npm start --prefix packages/desktop
npm run dist --prefix packages/desktop
node packages/desktop/scripts/checksums.mjs
```

Build natively for each supported OS/architecture. The staging script downloads a pinned official Node archive, verifies the committed SHA-256, installs a separate production dependency tree from `runtime-lock.json`, copies migrations and bundles local OCR models. It does not rebuild the repository's native modules for Electron or alter Docker dependencies. PDF.js and a canvas backend provide desktop PDF text/rasterization; server builds continue using Poppler.

To intentionally update the isolated production dependency lock, review `runtime-package.json`, then run `node packages/desktop/scripts/stage.mjs --update-lock`; inspect the diff and rerun runtime/native/PDF/OCR tests. Do not use that option for ordinary reproducible builds.

### Linux artifact checks from a Windows development machine

These commands use a separate Linux Docker build context without profiles, databases or development node_modules. They do not replace testing the GUI in a real Linux desktop:

```sh
node packages/desktop/scripts/linux-context.mjs
docker build -t homeledger-desktop-linux-qa packages/desktop/.staging/linux-context
```

The QA image builds AppImage/deb and runs the isolated runtime checks. For an offline test, mount the current smoke script read-only and execute it with `--network none` and `DESKTOP_RUNTIME_PATH=/app/packages/desktop/dist/linux-unpacked/resources/runtime`. Only loopback is needed for the tests.

### Signed CI builds and release gate

The workflow's default is unsigned preview artifacts. Its explicit `signed_preview` option requires a trusted manual run from `main` or a version tag and these repository secrets:

- Windows: `DESKTOP_WINDOWS_CSC_LINK`, `DESKTOP_WINDOWS_CSC_PASSWORD`.
- macOS: `DESKTOP_MAC_CSC_LINK`, `DESKTOP_MAC_CSC_PASSWORD`, `DESKTOP_APPLE_ID`, `DESKTOP_APPLE_PASSWORD`, `DESKTOP_APPLE_TEAM_ID`.

Certificate links use electron-builder's supported secret representation, such as a base64-encoded PFX/P12. Apple password means an app-specific notarization password. The owner must provision certificates/accounts; the build never purchases them or stores them in the repository. Missing inputs fail the signed gate. Windows Authenticode and macOS codesign/Gatekeeper/stapling are verified after signed builds.

Signing does not replace QA. Publish a new release only after the matrix in `DESKTOP_QA.md` is complete, with reviewed version, compatible schema, checksums, notices and accurate release notes. No workflow in this change creates tags or publishes a release automatically.

Development UI testing may use `HOMELEDGER_DESKTOP_TEST_DIR` to isolate a synthetic profile. Packaged apps ignore it unless launched explicitly with `--desktop-qa`; in that mode it must name a direct child of the OS temp directory starting with `homeledger-desktop-qa-`. This allows installed-app QA without touching a normal profile. No test data or profile should be committed. Installed resources include Node's license and generated `THIRD-PARTY-NOTICES.txt` with installed dependency metadata/licenses. Review this inventory before distribution.

The isolated test profile does not add menus or crash-simulation controls to the application. Recovery tests are performed by the development tooling; users are never asked to crash the application.
