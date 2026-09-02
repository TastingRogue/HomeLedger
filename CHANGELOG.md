# Changelog

All notable changes to HomeLedger are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-09-01

First public release. HomeLedger is a self-hosted personal finance manager with a
SvelteKit 5 frontend and a Fastify + SQLite (Drizzle ORM) backend, packaged as a
single self-contained Docker image and available as a Home Assistant add-on and
HACS integration.

### Added

- **Accounts** — Debit, Credit, Investment, Vouchers and Cash accounts with
  dynamic balance tracking and credit-limit / utilization monitoring.
- **Transactions** — Income/expense recording with month grouping, card grid and
  table views, and filtering.
- **Transfers** — Movements between your own accounts with fund validation.
- **Subscriptions** — Recurring payments with auto-charge, catch-up after
  downtime, and a calendar view.
- **Budgets** — Category budgets with allocation-vs-spent progress and dashboard
  integration.
- **Savings goals** — Wishlist and debt goals with fund/withdraw actions and
  progress tracking.
- **Net worth (Patrimonio)** — Manual assets and liabilities on top of account
  balances, with a dedicated page and history.
- **Categories** — Fully editable categories (including system ones) with
  expense analysis and type classification (Expense / Income / Both).
- **Bank import** — CSV / XLSX / OFX / QIF / JSON with parsers for BBVA,
  Santander and Nu Mexico.
- **Receipts & attachments** — Upload receipts/invoices (images, PDFs), analyze
  them (OCR) with editable fields and a side-by-side preview, and link them to a
  new or existing transaction.
- **Alerts** — Auto-generated (low balance, high credit, due payments, completed
  goals) with persisted per-user settings and manual evaluation.
- **Reports** — 6-month trends, category breakdown, savings rate and monthly
  comparison.
- **Backup** — Full JSON export/import with preview, validation and history.
- **Light / dark theme** — Working theme toggle (dashboard header and Settings),
  persisted and applied before first paint.
- **Multi-currency** — MXN, USD, EUR, COP, ARS, CLP, PEN, BRL.
- **Bilingual UI** — Spanish and English, switchable from Settings and persisted.
- **Custom date picker** — Used consistently across all date inputs (forms and
  filters), localized to the active language.
- **Home Assistant add-on** — Runs the full app inside HA with an Ingress panel;
  multi-arch (amd64 / aarch64 / armv7).
- **Home Assistant integration (HACS)** — Exposes finance sensors, binary sensors
  and services (`homeledger.create_transaction`, `homeledger.create_quick_expense`,
  `homeledger.refresh_data`) via local polling.
- **Docker** — Self-contained image (app + API on port 3000) with zero-config
  demo defaults; `linux/amd64` images published to Docker Hub. (arm64 planned.)

### Security

- Ownership checks on alerts to prevent cross-user access (IDOR).
- Rate limiting on authentication endpoints.
- Minimum password length enforcement.
- Configurable CORS via `CORS_ORIGIN` (reflects request origin when unset).

### Notes

- SQLite database and uploaded attachments live under `DATA_DIR` (`/data` in
  Docker) and survive container rebuilds; deleting the volume wipes data.
- The backup format is versioned; importing a backup replaces all current data
  for the user after explicit confirmation.

### Known issues

- Part of the backend test suite is out of date with the current balance model
  (the app computes account balances dynamically from transactions rather than
  mutating a stored balance). These assertions are scheduled to be updated in a
  follow-up; they do not reflect a defect in the running application.
- ESLint reports pre-existing style issues in some backend source files. Linting
  is not yet enforced in CI and is planned to be cleaned up in a follow-up.

[0.1.0]: https://github.com/TastingRogue/HomeLedger/releases/tag/v0.1.0
