# Changelog

All notable changes to HomeLedger are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.1] - 2026-09-16

Patch release focused on **receipt OCR accuracy** for English and Spanish
documents. No breaking changes; the `/api/v1` surface and backups are unchanged
(backup metadata version bumped to `1.1.1`).

### Added

- **Image pre-processing before OCR** using `sharp` (auto-orient, grayscale,
  contrast normalize, upscale small photos, sharpen, and binarize) plus a
  receipt-oriented Tesseract page-segmentation mode, to improve recognition on
  phone photos and scans.
- **Raw OCR text panel** in the receipt detail view (collapsible), so the exact
  recognized text is visible for review and correction.

### Fixed

- **Date detection (EN + ES).** Textual months are now parsed in both languages
  and both orderings — e.g. `02 June, 2030`, `June 2, 2030`,
  `02 de junio de 2030` — alongside numeric dates. Ambiguous numeric dates are
  disambiguated by range (so US `mm/dd/yyyy` like `02/15/16` is read correctly),
  and unparseable/garbled dates now leave the field empty and editable instead
  of showing `NaN`.
- **Amounts read from the correct column.** Totals, subtotals and tax are now
  extracted from the value column on the label's line, ignoring decoys such as a
  `(3.8 %)` tax rate; OCR-split cents (`125 00` → `125.00`) are repaired and a
  dropped-decimal tax larger than the subtotal is recovered (`475` → `4.75`).
- **English field keywords.** `TAX` / `VAT` / `GST` and `TOTAL DUE` /
  `AMOUNT DUE` / `BALANCE DUE` / `GRAND TOTAL` are recognized alongside the
  Spanish forms; RFC (tax id) and UUID are now also extracted from OCR/plain
  text, and the confidence score reflects how many fields were recovered.

### Changed

- **Dependabot cadence** reduced to quarterly (every 3 months) to cut PR noise.

## [1.1.0] - 2026-08-31

Feature-depth release (the **P4** track). A large batch of additive features on
top of `1.0.0`, with **no breaking changes** — the `/api/v1` surface stays
compatible and existing backups still import (backup metadata bumped to `1.1.0`;
only the MAJOR version gates import compatibility, so `1.0.x` backups restore
fine). Migrations `0008`–`0017`.

### Added

- **Richer transactions (P4.1)** — merchant, subtype, reconciled, status and
  `externalId`; tags as a first-class many-to-many entity; per-transaction audit
  history.
- **Credit-card statement modeling (P4.2)** — statement/payment-due days, APR
  and minimum payment, with a corrected balance sign.
- **Budgets depth (P4.3)** — persisted rollover + alert thresholds, an
  available-to-spend indicator, budgets by tag, and overspend alerts wired to
  the scheduler.
- **Smart importer (P4.4)** — merchant/date/currency normalization, per-account
  dedupe in the preview, pending→posted matching, account auto-detect, and an
  import history with undo.
- **Rules & auto-categorization UX (P4.5)** — rule-learning suggestions, a
  merchant condition, and flag-for-review / mark-recurring / ignore actions.
- **CFDI invoices (P4.6)** — extract IVA, create a transaction from a receipt
  with UUID dedupe, plus item-level categorization and splits.
- **Subscription intelligence (P4.7)** and **forecasting (P4.8)** — goal
  completion forecast and a net-worth history chart (1m/6m/1y/5y/all).
- **Global search (P4.9)** across transactions, receipts and subscriptions.
- **Reports depth (P4.10)** — savings rate, debt and credit-utilization
  reports, a merchant report, and custom saved reports.
- **Manual-first multi-currency (P4.11)** — per-account currency with a
  user-entered exchange rate, base-currency aggregation, and cross-currency
  transfers that record both legs.
- **Two-factor authentication (P4.12)** — offline TOTP (RFC 6238, no cloud) with
  one-time backup codes, plus session history and per-session revocation.
- **API maturity (P4.13)** — OpenAPI 3 spec + Swagger UI at `/api/docs`, scoped
  API keys, and user-configured outbound webhooks (HMAC-SHA256 signed) for
  `transaction.created`, `budget.exceeded`, `goal.completed` and
  `subscription.upcoming`.
- **PWA / mobile (P4.14)** — installable PWA with a dedicated offline page, a
  quick-add floating action button, on-device camera receipt capture, and an
  optional client-side app lock (WebAuthn platform authenticator or PIN).

### Changed

- Aggregations (dashboard, reports, net worth, budgets) convert foreign-currency
  amounts to the base currency; per-account and per-card views stay in native
  units.
- Accepted upload types now include CFDI XML (`application/xml` / `text/xml`).

### Security

- Optional offline 2FA (TOTP) and an optional local app lock; both are opt-in
  and do not weaken the existing JWT/session model.

## [1.0.0] - 2026-08-31

First stable release. The `/api/v1` HTTP API and the backup file format are now
**stable** under SemVer — no breaking changes within `1.x`
(see [docs/STABILITY.md](docs/STABILITY.md)). This release is the hardening pass
over the `0.1.0` groundwork: correctness, safety, accessibility, tests and docs.

### Added

- **Per-user categories** — every user gets their own editable copy of the
  default category set at sign-up; no more shared/system categories, so users
  can rename/delete freely without affecting anyone else (migration `0007`).
- **CSV export of transactions** — server-side `GET /api/v1/transactions/export.csv`
  exports the full filtered dataset (RFC-4180, UTF-8 BOM for Excel), respecting
  the active filters.
- **Import dry-run preview** — a non-destructive `POST /api/v1/backup/preview`
  reports per-entity counts and warnings before the destructive replace.
- **Receipts in backups** — attachments (binary inline as base64), receipt
  analyses and line items now export/import with foreign keys remapped.
- **Frontend test suite** — from zero to 50 tests: pure-logic coverage plus
  component/DOM smoke tests (login, create-transaction, backup, Dropdown).
- **Stability policy** — `docs/STABILITY.md` documenting the API/backup
  compatibility guarantees.
- **Deployment & operations docs** — `docs/DEPLOYMENT.md` (reverse-proxy + HTTPS
  for Nginx/Traefik/Caddy, the three backup mechanisms, upgrade/rollback) and
  `CONTRIBUTING.md` + issue/PR templates.

### Changed

- **Accessibility** — aria-labels across the UI, reduced-motion/contrast
  foundations, corrected label semantics and discernible button names,
  keyboard Escape-to-close on every modal, and a WCAG-AA contrast fix for muted
  text in both themes.
- **UI polish** — Apple-design motion primitives (spring-free CSS transitions),
  press feedback, translucent materials, popover anchoring, typography and
  tabular numerals; consistent account-card actions and transaction filter
  controls.
- **Receipt OCR** — audited heuristics; fixed a `TOTAL` regex that captured
  item-count lines (e.g. "TOTAL ARTICULOS: 3") as the receipt total.
- **Performance** — added a composite `transactions(account_id, type)` index
  (migration `0006`), cutting balance/dashboard/net-worth latency ~30% at 20k
  transactions.
- **Multi-arch Docker** — CI now builds `linux/amd64` **and** `linux/arm64`
  natively (no QEMU) and publishes a combined multi-arch manifest.

### Fixed

- Backup import is multi-user safe: it only touches the caller's rows and
  remaps foreign keys, so a backup whose ids overlap another user's data can't
  collide with or clobber it (covered by dedicated isolation tests).
- Assorted UI bugs (NaN "days remaining", stale `Smart Finance` shell metadata,
  misaligned card actions).

### Security

- Startup **refuses to boot in production** on insecure `JWT_SECRET`/
  `ADMIN_PASSWORD` defaults (override with `ALLOW_INSECURE_DEFAULTS=true` for
  the zero-config demo only); loud warning outside production.
- `TRUST_PROXY` wiring so rate limiting keys on the real client IP behind a
  reverse proxy, off by default to prevent IP spoofing.

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

[1.0.0]: https://github.com/TastingRogue/HomeLedger/releases/tag/v1.0.0
[0.1.0]: https://github.com/TastingRogue/HomeLedger/releases/tag/v0.1.0
