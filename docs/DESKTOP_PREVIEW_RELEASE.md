# HomeLedger Desktop — Windows preview 1

Release tag: `v1.2.0-desktop-preview.1`

**Unsigned Windows prerelease for testing with synthetic data.** Native dependency notices and corresponding source materials accompany this installer. See [the dependency inventory](DESKTOP_LICENSES.md).

## What this preview contains

- Windows x64 installer with a bundled local backend, database and English/Spanish OCR. No separate Docker server or Node installation is required.
- Existing Normal and Cyberpunk interfaces, with financial data stored on this computer.
- Manual updates, pre-upgrade database snapshots and recovery dialogs for backend/window failures or a conflicting local port.
- Fixes found during desktop validation: transaction deletion refresh, overlapping budget income, localized budget dates, validated JSON restore review and generic CSV detection/signs.
- Standard application menus; no crash-simulation or QA menu.

## Downloads

- `HomeLedger-1.2.0-win-x64.exe`
- `SHA256SUMS.txt`
- `HomeLedger-1.2.0-windows-source-materials.zip` — native dependency sources, license texts, SBOM and hash manifest; optional for installing the app.

The application/installer version remains `1.2.0`; the separate desktop preview tag identifies this experimental distribution. This is not a replacement for the stable web/server release `v1.2.0`.

## Test status and limitations

- Use a separate local account and synthetic data. Do not migrate your only copy of financial data into this preview.
- **Unsigned:** Windows publisher verification/SmartScreen reputation is not established. Signing remains pending; no OS security bypass is required or recommended by these notes.
- Tested locally on Windows11 x64. Windows10 has not been certified by these tests.
- 742 backend/shared,145 frontend and9desktop tests passed. Packaged Windows runtime tests and external backend/renderer/port-conflict recovery passed with synthetic data.
- Some functional UI paths remain pending; consult [the exact QA matrix](DESKTOP_QA.md). Scheduled jobs only run while the app is open.
- Linux and macOS downloads are excluded from this release. Linux graphical installation and macOS native builds/QA remain pending.
- Installer updates are manual; there is no automatic updater or cloud synchronization.

## Installation and feedback

After publication, compare the downloaded installer's SHA-256 with `SHA256SUMS.txt`, install for the current Windows user and create a new local account. There is no default login. Read [the desktop guide](desktop.md) for storage, backups and removal.

When reporting a problem, include Windows version, application version, theme, reproduction steps and sanitized diagnostics. Do not attach your database, receipts, credentials or private financial details.

## Distribution checks

- Windows native source materials contain494hash-verified upstream archives, build recipes/patches and license texts. The package includes native notices and a binary/source manifest; staging rejects changes to the reviewed binary hashes.
- Checksums identify the rebuilt installer and accompanying source-material ZIP.
- This release is marked **prerelease**, not latest, with Windows assets only.
