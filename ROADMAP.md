# HomeLedger — Roadmap to v1.0.0

This is the living checklist we use to drive HomeLedger from **v0.1.0** to a
stable **v1.0.0**. It's grounded in a full codebase audit, not assumptions.

**What v1.0.0 means here:** a promise of stability for people running the app
with real financial data — the database schema and backup format won't break
existing installs, the `/api/v1` and Home Assistant contracts are stable, and
the app can be deployed, backed up, restored and upgraded without surprises.

**How we work this list:** tackle phases roughly in order (P0 → P3). Check items
off as they land (`[x]`). Keep the "Status" note current. Do not mark a box
until it's verified (typecheck + build + test + Docker where relevant).

**Legend:** ✅ done · 🟡 partial · ❌ missing/broken · ⛔ blocker for 1.0.0

---

## Product principles (guide every decision)

**Local-first, offline by default.** HomeLedger runs entirely on the user's own
machine/server and makes **no outbound internet connections** to function.
Verified today: the backend has zero external HTTP calls, and the frontend loads
no CDNs, fonts, or analytics — everything is self-contained and served from the
same origin. The only time HomeLedger is reachable from the internet is if the
**user themselves** chooses to expose it (reverse proxy, VPN, tunnel). No
telemetry, no phone-home, ever.

Implications for the feature list:
- **Data in = manual entry + local file import** (CSV / OFX / QIF / XLSX / CFDI
  XML). This is the primary, first-class path — no cloud dependency.
- **On-device OCR** (tesseract / poppler) stays fully offline.
- **Automatic bank sync (Plaid/SimpleFIN/etc.) is explicitly OUT of the core.**
  It's an inherently cloud service that transmits financial data off-device,
  which conflicts with local-first. If ever added, it must be a clearly optional,
  off-by-default plugin the user opts into — never required, never default.
- **Anything needing live external data** (FX rates, stock/crypto prices) must be
  **manual-entry-first**; any auto-fetch is optional and user-enabled only.
- **PWA / offline mode and Home Assistant (local network)** fit this model well.

---

## Status snapshot

- Current version: **0.1.0** (published; amd64-only Docker image)
- Test suite: **429 passing, 0 failing** ✅ · lint 0 errors · CI gates in place
- **ALL P0 BLOCKERS DONE** (P0.1–P0.5), merged to `main`
- P1 in progress on branch `p1-release-quality`: **P1.2 (lint + CI) done**
- Next P1: P1.1 arm64, P1.3/P1.4 i18n, P1.8 backups, P1.10 multi-user, etc.

---

## Phase P0 — Blockers (must be done before 1.0.0)

### P0.1 — Green test suite ✅ (done)
The tests now pass and reflect the real balance model (balances are computed
dynamically in `AccountService.calculateBalance`; `TransactionService` never
mutates `accounts.initialBalance`). Went from 154 failing → **409 passing, 0 failing.**

- [x] Rewrite `transaction.service.test.ts` balance assertions to use `AccountService.calculateBalance` (async) instead of stored `initialBalance`; add `transfers` table+import to its setup
- [x] Fix `categories.type` schema drift in 7 service test setups (was ~123 failures)
- [x] Bucket A: fix mojibake in `toThrow('...')` expected strings across backup/category/goal/loan/rules/subscription tests (shortened to ASCII substrings)
- [x] Bucket B: subscription `create()` tests now expect "startDate = first charge date" (weekly asserts startDate; monthly uses a future startDate for determinism)
- [x] Bucket C: subscription autocharge tests now assert computed balance via `AccountService.calculateBalance` (added `transfers` table + import)
- [x] Bucket D: fixed mojibake in seeded account `type` (`'Débito'`/`'Crédito'`) and category (`'Corrección'`) across alert/rules/import/etc.; fixed alert "marcar como leída" test (was calling `markAsRead(id)` without the required `userId` — real signature change from the IDOR fix)
- [x] **DECISION:** deleting a **system category** IS blocked — restored the `isSystem` guard in `CategoryService.delete()` (matches doc-comment + test)
- [x] `npm run test` → 0 failing (409 passing)
- [x] `npm run typecheck -w packages/backend` clean
- [x] Clean up temp files (`.vitest.json`, `.vitest-*.log`)
- [ ] (Optional, low priority) Cosmetic: remaining mojibake in `it(...)` titles/comments only — no functional impact, all data/assertion mojibake is fixed
- [ ] (Follow-up) Add tests + lint to CI so regressions are caught (also tracked in P1.2)

### P0.2 — Backup import is robust (no ID collisions) ✅ (done)
`BackupService.import()` used to preserve original primary keys and only delete
the current user's rows, so restoring collided with other users' `categories.id`
/ `accounts.id` (broke multi-user installs). Now fixed via full FK remapping.

- [x] On import, strip original `id`s and remap all foreign-key references via old→new id maps (categories, subcategories, accounts, transactions, splits, transfers, subscriptions, creditSubscriptions, recurringTransactions, budgets+budgetCategories, goals, rules, alerts, assets, liabilities, loans+payments, networthSnapshots)
- [x] Orphaned rows (whose required FK isn't in the backup) are skipped rather than inserted with a broken reference
- [x] Add a backup round-trip integration test with a **2nd user whose ids collide** (500) — import no longer throws; FKs remapped; other user's rows untouched
- [x] `npm run test` → 0 failing (410 passing); `typecheck` clean
- [ ] Verify end-to-end in Docker (export → import with 2 users) — pending Docker run

**Deferred to P2.6 (needs binary-file handling):** receipts (`receipt_analyses`
/ `receipt_items`) and attachments are NOT in the backup export. Receipts
reference attachments, which are binary files on disk not captured by the JSON
backup. Exporting receipt metadata alone would leave dangling `attachment_id`
references after restore — worse than the current honest behavior (import clears
them). Proper fix = include attachment binaries (base64/zip) + receipts together.

### P0.3 — Safe upgrades & schema/migration integrity ✅ (done)
Fresh installs built only from Drizzle migrations now match `schema.ts`, and
upgrades from an existing DB apply additively without data loss. Verified in
Docker (fresh boot + restart-on-existing-DB).

- [x] Fixed drift: `attachments.transfer_id` + `original_name` + the `attachments_transfer_id_idx` index. Applied idempotently in `initializeDatabase()` (guarded by `table_info` + `CREATE INDEX IF NOT EXISTS`) rather than an ADD COLUMN migration — because the runtime patch predates this and a plain ADD COLUMN migration would fail on installs that already have the columns
- [x] Verified with `drizzle-kit generate` that attachments columns/index were the only real drift; the `categories.type` "drift" it reported is a snapshot-metadata lag (the column IS applied by migration 0002) — the generated 0003 was **deleted** (would break existing DBs with "duplicate column") and the journal/meta reverted to a clean 0000–0002 state
- [x] Test upgrade path in Docker: fresh install → `attachments` has all columns + index; restart against existing DB → boots cleanly, no "duplicate column", migrations/seed skip, health ok
- [x] Documented the upgrade procedure + "back up before upgrading" in README
- **Decision (recorded):** runtime `ensureTable` tables (`receipt_analyses`, `receipt_items`, `backup_history`, `alert_settings`) are kept as idempotent `CREATE TABLE IF NOT EXISTS` — they self-create safely on upgrade, which satisfies the data-safety goal. Converting them to formal migrations is a nice-to-have follow-up, not a blocker.
- [ ] (Follow-up, low priority) Resync drizzle-kit snapshots so `generate` stops reporting the phantom `categories.type` drift; optionally formalize the runtime tables as migrations

### P0.4 — Production security hardening ✅ (done)
The image shipped insecure demo defaults (`JWT_SECRET`, `ADMIN_PASSWORD`) with no
guard. Now there's a startup security check + configurable proxy trust.

- [x] Startup security check (`packages/backend/src/security-check.ts`, wired in `server.ts` before DB init): in `NODE_ENV=production`, **refuses to start** if `JWT_SECRET` is a known demo value / <32 chars, or `ADMIN_PASSWORD` is a known demo value — unless `ALLOW_INSECURE_DEFAULTS=true` (then loud warning). Outside production: warning only.
- [x] Demo Docker image sets `ALLOW_INSECURE_DEFAULTS=true` so zero-config demo still boots (with warning); any real deploy that sets its own secrets — or drops the flag — is protected by default
- [x] Added configurable `TRUST_PROXY` env → Fastify `trustProxy`, so `request.ip` (rate limiting/logging) is the real client behind a reverse proxy; OFF by default (avoids IP spoofing without a proxy)
- [x] Verified auth middleware: global `onRequest` hook default-denies every `/api/*` route except 4 public ones (login/register/refresh/health), JWT Bearer or API key. `requireRole` exists but is unused — no admin-only routes yet; wiring it is tracked in **P1.10** (multi-user), not a hole today
- [x] Re-verified: register password `.min(8)`, auth rate limit 10/min, CORS via `CORS_ORIGIN`
- [x] Documented `ALLOW_INSECURE_DEFAULTS` + `TRUST_PROXY` in README env table
- [x] 9 unit tests for the security check; verified the 3 scenarios against the **compiled** module (refuse / warn+boot / clean). Suite: 419 passing. (Docker end-to-end deferred — Docker daemon was down; logic proven via compiled-module run)

### P0.5 — Money correctness (floats) ✅ (done)
Monetary columns stay SQLite `real`, but float drift on aggregation/persistence
is now eliminated by consistent cent-rounding (Option B — chosen over integer
cents to avoid a schema+API+backup migration for a personal-finance app whose
amounts are validated to 2 decimals).

- [x] Audited every money aggregation (via context-gatherer): `calculateBalance`, reports (dashboard/cashflow/trends/category/budget-vs-actual), budgets (spent/remaining/totals + persisted rollover), net worth, goals (fund/withdraw), loans/splits (already rounded)
- [x] **Strategy: consistent cent-rounding.** Added `packages/backend/src/utils/money.ts` (`roundMoney`, `sumMoney`, `hasAtMostTwoDecimals`); applied `roundMoney` at every aggregation point and — critically — before persisting `goals.savedAmount` (fund/withdraw) and `budgetCategories.rollover` (which compounds across periods)
- [x] Closed the input edge: added the 2-decimal `.refine` to goal/loan/budget/account/transfer + quickTransaction schemas (previously only createTransaction enforced it), so non-cent values can't enter
- [x] No schema/API/backup change — amounts stay decimal numbers; API contract and frontend `formatCurrency` unaffected
- [x] Tests: `money.test.ts` (10) + a transaction drift test that sums drift-prone amounts (0.1, 0.2, 0.7, 5.55, 19.99, 0.01…) and asserts an **exact** balance via strict `.toBe`. Suite: **429 passing**, typecheck clean
- Note: `loan.remainingAmount`, split validation, and the amortization schedule already used `Math.round(x*100)/100` — left as-is (correct)

---

## Phase P1 — Release quality (strongly recommended for 1.0.0)

### P1.1 — arm64 / multi-arch (real) ✅ (done)
Rewrote `docker-build.yml` to build each arch natively and merge into a
multi-arch manifest — no QEMU (which hung on `better-sqlite3`).

- [x] Matrix build on native runners: `linux/amd64` on `ubuntu-latest`, `linux/arm64` on `ubuntu-24.04-arm` (official Docker pattern, confirmed against docs)
- [x] Each arch builds and pushes **by digest** (`push-by-digest=true,name-canonical=true`), with per-platform GHA cache scopes; PRs build-only (no push)
- [x] `merge` job combines the digests via `docker buildx imagetools create` with the semver/latest/branch tags, inspects the result, and updates the Docker Hub description (main only)
- [x] Removed `armv7` from `ha-addon/config.yaml` and the README (we build arm64/aarch64, not 32-bit armv7 — declaring it would fail on HA); README already says "multi-arch"
- [x] Both workflow YAMLs validated
- [ ] (Verify on real hardware) Confirm the arm64 image actually runs on a Raspberry Pi / arm64 host once the workflow publishes — can't test arm64 execution from this dev machine

### P1.2 — Lint clean + CI gates ✅ (done)
- [x] Added a real CI workflow (`.github/workflows/ci.yml`): on push/PR to main/develop runs `npm ci` → build shared → typecheck (backend+frontend) → lint → test → build. This protects `main` (the Docker workflow only built the image; it never ran tests).
- [x] Calibrated `eslint.config.js` to the project's conventions instead of blindly "fixing" 398 problems: `no-extraneous-class` off (services are intentional static-method classes), `no-non-null-assertion` → warn (off in tests), `no-explicit-any` → warn; tests relax `!`/`any`; `app.d.ts` empty ambient interfaces allowed (SvelteKit convention)
- [x] Fixed the 32 real bugs the calibrated config surfaced: unused vars, empty catches (added intent comments), `no-useless-catch` wrapper, `require()`→ESM imports in tests, useless regex escapes, `no-case-declarations` (braced `addTag` case), and `void` generic args in frontend API clients (`apiDelete<void>` → `await apiDelete(...)`)
- [x] `npm run lint` → **0 errors** (85 `any` warnings remain as tracked, non-blocking debt); typecheck 0/0; **429 tests passing**
- [ ] (Follow-up) Extend lint to `.svelte` files — needs `eslint-plugin-svelte` + parser; deferred to avoid pulling a new dep + a fresh batch of findings mid-phase. `.ts` across backend + frontend (api/stores/utils) is linted and gated.
- [ ] (Follow-up) Chip away at the 85 `no-explicit-any` warnings over time

### P1.3 — i18n completeness ✅ (done)
- [x] Key-level parity verified between `es.ts` and `en.ts` — 819 keys each, zero keys missing on either side, no duplicates
- [x] Fixed the untranslated **visible** strings: 5 hardcoded `<title>` tags (login, register, backup/respaldo, quick-register, receipts) now use a new `page_title.*` namespace; register's confirm-password placeholder now uses `auth.confirm_password_placeholder`. Numeric `placeholder="0.00"` left as-is (language-neutral).
- [x] typecheck 0/0, build clean, parity re-confirmed (813 → 819 keys, both dicts)
- [ ] (Follow-up → P3 accessibility) Many hardcoded Spanish `aria-label`s remain (Cerrar, Volver, view/list labels, etc.). These are accessibility strings, not directly visible; batch-translating them fits the P3 accessibility pass rather than expanding this item.

### P1.4 — Standardize i18n so new languages are easy to add
Adding a language today means editing several hardcoded spots. Refactor to a
single **language registry** so a new language = one dictionary file + one
registry entry, with type-safety and no hardcoded fallbacks.

Current friction (all must be removed):
- `SupportedLocale` is a hardcoded union `'es' | 'en'` in `packages/frontend/src/lib/stores/preferences.ts`
- The dictionaries map `{ es, en }` is hardcoded in `packages/frontend/src/lib/i18n/index.ts`
- Fallback is hardcoded to `es` in two places in `index.ts` (`?? dictionaries.es[key]`, `?? dictionaries.es`)
- No enforced key parity between dictionaries (we've been counting keys manually)
- Locale options hardcoded in the Settings dropdown; calendar/currency locale tags mapped ad-hoc

Tasks:
- [ ] Create a language registry (e.g. `i18n/languages.ts`) where each language declares `{ code, label, dictionary, dateLocale }`
- [ ] Derive `SupportedLocale` from the registry keys (no hand-maintained union)
- [ ] Build the `dictionaries` map and the Settings dropdown options from the registry (no hardcoded lists)
- [ ] Make the base/reference dictionary (English) the single source of truth; type the other dictionaries so **missing keys are a compile error** (enforced parity)
- [ ] Replace hardcoded `es` fallbacks with the configured default → English chain (ties into P1.6)
- [ ] Derive the calendar/`Intl` locale tag from the registry instead of the ad-hoc `es === 'en' ? 'en-US' : 'es-MX'` logic in `DatePicker.svelte`
- [ ] Document "how to add a language" in the README/CONTRIBUTING (one file + one registry line)
- [ ] Verify: adding a throwaway 3rd language works end to end with only a dictionary + registry entry

### P1.5 — Better-defined, localized system categories
Today `packages/backend/src/db/seed.ts` seeds a fixed set of **Spanish-only**,
**global** (`userId: null`, `isSystem: true`) system categories from a legacy
Notion export (`Comida`, `Compras`, `Corrección`, `Despensa`, `Dividendos`,
`Educación`, `Entretenimiento`, `Gasolina`, `ISP`, `Limpieza`, `Luz`, `MX-5`,
`Nómina`, `Préstamo`, `Renta`, `Salud`, `Telefonía`, `Transporte`, `Vales`).
Problems: English users see Spanish names; the list contains personal/legacy
junk (`MX-5`); and the rules engine depends on the magic name `Corrección` for
uncategorized transactions.

**Goal:** a clean, sensible default category set that appears in the user's
language, chosen when the app/user is first set up, and English when nothing
else applies.

- [ ] Define a curated default category set (name + type Gasto/Ingreso/Ambos + suggested icon/color), with **English and Spanish** names; drop legacy junk like `MX-5`
- [ ] Decide the mechanism (record the choice here):
  - **Option A** — store a stable language-independent *key* per system category and translate the display name via `$t()` (works per-user, cleanest)
  - **Option B** — on first setup / user registration, seed a **per-user** copy of the defaults in that user's chosen language
- [ ] Replace the magic-string dependency on `Corrección` in the rules engine with a stable key/flag so it survives translation
- [ ] Ensure the seed is idempotent and doesn't duplicate categories across languages
- [ ] Migration/backfill plan for existing installs that already have the old Spanish global categories
- [ ] i18n keys for all default category names (es/en parity)
- [ ] Verify: first launch in English → English categories; in Spanish → Spanish; switching language behaves per the chosen option

### P1.6 — Host-configurable default language
Let the person deploying the app choose the default UI language; fall back to
**English** when nothing is configured. Currently the fallback is hardcoded to
Spanish in `packages/frontend/src/lib/stores/preferences.ts` (`loadFromStorage`
returns `{ locale: 'es' }`), and there is no host-level setting.

- [ ] Add a `DEFAULT_LOCALE` env var (backend), validated against `SupportedLocale`; default to `en` when unset/invalid
- [ ] Expose the configured default to the frontend (e.g. small public endpoint or value injected at page load) so SSR and first paint use it
- [ ] Change the preferences fallback chain to: **stored user choice → host `DEFAULT_LOCALE` → English (`en`)** (replace the hardcoded `'es'` default)
- [ ] Do the same for the theme/pre-paint path so the login screen renders in the configured language before any user preference exists
- [ ] Document `DEFAULT_LOCALE` in the README env table, `.env.example`, `Dockerfile`, `docker-compose.yml`, and the HA add-on options (`ha-addon/config.yaml`)
- [ ] Verify: fresh install with no config → English; with `DEFAULT_LOCALE=es` → Spanish; a user's saved choice always wins

### P1.7 — Health & observability
- [ ] Deepen `/api/v1/health` to include a DB connectivity check
- [ ] Confirm consistent structured error responses across routes
- [ ] Surface scheduler job status (auto-charge, alert evaluation, budget reset) so a silently-failed cron job is visible to the user/admin
- [ ] Consistent, configurable structured logging levels

### P1.8 — Automated backups with retention
Manual JSON export exists, but a finance app needs scheduled backups so a DB
corruption isn't catastrophic. Keep storage bounded — a fixed number of backups,
rotating out the oldest.

- [ ] Scheduled automatic backups (cron job; interval configurable, e.g. daily)
- [ ] **Retention/rotation:** keep a fixed maximum number of backups (configurable, e.g. keep last 7); when a new one is created, delete the oldest so backups never pile up
- [ ] Store backups under `DATA_DIR` (e.g. `/data/backups`) so they persist with the volume
- [ ] Restore from an automatic backup via the UI
- [ ] Verify: backups rotate correctly at the limit; restore works

### P1.9 — Restore safety (dry-run / validation)
Import currently wipes all data on confirm. Make it safer.

- [ ] Validate and preview a backup **before** it replaces current data (a dry-run that reports counts and any problems)
- [ ] Confirm the atomic transaction rolls back cleanly on any failure mid-import (no half-restored state)
- [ ] Clear warning + explicit confirm before destructive replace (already partially present — verify)

### P1.10 — Multi-user hardening (decide the model)
The app supports multiple users (first registrant becomes admin, rest become
`user` — confirmed in `auth.service.ts`), but multi-user behavior isn't clearly
locked down. Decide explicitly whether HomeLedger is single-user or multi-user
and enforce it.

- [ ] Decide: single-user, or fully-supported multi-user? Document the decision
- [ ] Audit every data route to confirm strict per-user isolation (no cross-user reads/writes) — the backup bug proved multi-user paths exist
- [ ] Wire `requireRole` where admin-only actions live (user management, etc.) — it exists but may be unused
- [ ] If multi-user: a basic admin user-management view (list/disable/delete users, reset a user's password)

### P1.11 — Registration control (admin-managed + allowlist)
Registration is currently fully open (anyone can register; confirmed in
`AuthService.register`). On an exposed instance, randoms can create accounts.

- [ ] Registration is controlled by the **admin** (not a hardcoded "first user only" rule): admin can open or close public registration
- [ ] Optional **email allowlist**: when set, only listed emails may register, even if registration is otherwise open
- [ ] Default posture on a fresh install should be safe (closed or first-user-only), with the admin able to open it as needed
- [ ] Surface these controls in an admin settings area, and/or via env for headless setups
- [ ] Verify: with registration closed, the register endpoint refuses; with an allowlist, only allowed emails succeed

### P1.12 — Password reset / account recovery
Login and register exist, but there's no way to recover a forgotten password.

- [ ] At minimum: an **admin CLI / script** to reset a user's password (works headless, no email needed)
- [ ] Optional: email-based reset flow (requires SMTP config — document it as optional)
- [ ] Verify a locked-out admin can regain access without wiping the DB

### P1.13 — Multi-currency correctness
Users can pick from 8 currencies, but it's unclear how accounts in *different*
currencies are handled in aggregates.

- [ ] Determine current behavior: are consolidated balance / net worth / reports summing across different-currency accounts as if they were the same number? (That would be wrong.)
- [ ] Decide the model: single currency per install, per-account currency with conversion, or clearly separate per-currency totals
- [ ] Apply and document the chosen model; avoid presenting a meaningless mixed-currency total

---

## Phase P2 — Feature completeness (nice-to-have for 1.0.0, can slip to 1.1)

These have backend support but no frontend UI, or are incomplete.

### P2.1 — Rules (auto-categorization) UI
- [ ] Backend is complete (`RulesEngineService`, `rules.routes.ts`) ✅
- [ ] Add frontend API client `lib/api/rules.ts`
- [ ] Add `reglas` route + UI (list/create/edit/delete/test/apply)
- [ ] i18n es/en

### P2.2 — Loans UI + delete
- [ ] Add missing DELETE route + `LoanService.delete()`
- [ ] Add GET single loan
- [ ] Add frontend API client `lib/api/loans.ts`
- [ ] Add `prestamos` route + UI (loans, payments, schedule)
- [ ] i18n es/en

### P2.3 — Subcategories & splits in the UI
- [ ] Subcategory management UI (currently schema-only, indirect)
- [ ] Transaction split editor UI (service `split()` exists, no dedicated UI)

### P2.4 — Recurring transactions (decide: implement or remove)
- [ ] Table exists but there's NO service/route/scheduler — either build it (service + route + scheduler consumer + UI) or remove the schema to avoid dead surface
- [ ] Note: subscriptions with `autoCharge` already cover most "recurring" needs

### P2.5 — HA webhook processing
- [ ] `POST /api/v1/ha/webhook` is a stub (only logs) — implement automation trigger processing, or document as intentionally minimal
- [ ] Make HA sensors currency-aware (currently hardcoded `MXN`) and fix hardcoded `sensor.smart_finance_*` entity ids → `homeledger`

### P2.6 — Include receipts & attachments in backup (deferred from P0.2)
Attachments (binary files on disk) and receipts (`receipt_analyses` /
`receipt_items`, which reference attachments) are not captured by the JSON
backup, so a restore clears them. Fix requires bundling binary attachment files.

- [ ] Include attachment binaries in the backup (base64 inline, or a zip container alongside the JSON)
- [ ] Export/import `receipt_analyses` + `receipt_items` with FK remapping (attachment_id, transaction_id) consistent with the P0.2 remap
- [ ] Round-trip test covering an attachment + its receipt + linked transaction
- [ ] Until done, document that restore does not preserve receipts/attachments

---

## Phase P3 — Polish & confidence

- [ ] Frontend test suite (currently ZERO tests) — at least smoke/e2e on critical flows (login, create tx, dashboard, backup)
- [ ] Receipt OCR accuracy review (currently regex/heuristic best-effort)
- [ ] Accessibility pass (WCAG basics: labels, contrast, keyboard nav) — includes translating the many hardcoded Spanish `aria-label`s across the app to `$t()` (deferred from P1.3)
- [ ] Performance check with a large dataset (thousands of transactions)
- [ ] End-to-end docs: deployment, backup/restore, upgrade, HA setup
- [ ] Reverse-proxy deployment examples with HTTPS (Nginx / Traefik / Caddy)
- [ ] `CONTRIBUTING.md` + issue/PR templates (supports community growth)
- [ ] CSV export of transactions (spreadsheet-friendly, separate from the JSON backup)
- [ ] (Optional) Real dashboard customization — the non-functional "Customize" button was removed; only revisit if it becomes a wanted feature

---

## Phase P4 — Feature depth (post-1.0, local-first compatible)

These make HomeLedger *great* rather than just correct. None require internet;
all operate on local data / user-provided files. Not blockers for 1.0.0 — they
come after the P0 correctness/safety work. Status marks are vs. current code.

### P4.1 — Richer transaction model
Today a transaction has name, amount, type (`Ingreso`/`Gasto`), date, notes,
account, category, optional subcategory. Missing the fields that make ledgers
powerful.

- [ ] `merchant` / payee, separate from the free-text description
- [ ] Tags (many-to-many) — schema table + UI; rules already have an `addTag` action but there's no tags table yet
- [ ] `reconciled` / cleared flag (per transaction)
- [ ] `pending` vs `posted` status
- [ ] External transaction id (for import matching)
- [ ] **Duplicate detection** (by external id / date+amount+merchant heuristic)
- [ ] Transaction audit history (who/when changed what)
- [ ] More types beyond Ingreso/Gasto: refund, reimbursement, adjustment (decide if these are types or flags)

### P4.2 — Credit card modeling
Credit accounts exist (`type: 'Crédito'` + `creditLimit`, and utilization shows
on the dashboard/alerts 🟡), but statement-cycle modeling is missing.

- [ ] Statement balance, minimum payment, payment due date, statement closing date
- [ ] APR / interest tracking
- [ ] Payment handling that never double-counts (a CC payment is a transfer: checking ↓, card ↓ — not an expense)
- [ ] Payment history + available credit surfaced clearly

### P4.3 — Envelope budgeting (Actual-style)
Budgets exist (monthly/weekly, per-category, progress 🟡). Upgrade toward
envelope budgeting.

- [ ] "Available to spend" / assign-what-you-have model
- [ ] Rollover / carry-over of unspent budget
- [ ] Budget by tag (in addition to category)
- [ ] Overspending indicators + alerts

### P4.4 — Smart importer (local files only)
Parsers exist (BBVA/Santander/Nu; CSV/XLSX/OFX/QIF/JSON 🟡). Make the pipeline
robust — all on the uploaded file, no network.

- [ ] Duplicate detection against existing transactions
- [ ] Merchant normalization
- [ ] Pending → posted matching
- [ ] Currency + date normalization, debit/credit detection
- [ ] Automatic account detection
- [ ] Import history + **undo import**

### P4.5 — Rules & auto-categorization UX (builds on P2.1)
Rules engine + UI already tracked in P2.1. Add the "feels smart without AI" bits.

- [ ] "Rule learning": after the user categorizes e.g. AMAZON → Shopping, offer "apply to future AMAZON transactions?"
- [ ] More trigger/action coverage (amount ranges, flag-for-review, mark recurring, ignore)

### P4.6 — CFDI / Mexican invoice flow (local file, MX differentiator)
OCR already parses some CFDI XML 🟡. Make it a first-class local flow.

- [ ] Upload CFDI XML → extract RFC, merchant, date, subtotal, IVA, total, UUID → create transaction + receipt
- [ ] Item-level categorization from receipts (line items → categories)

### P4.7 — Subscription intelligence
Subscriptions + auto-charge exist. Add insight (all computed locally).

- [ ] Annual cost projection + last-12-months total
- [ ] Price-increase detection ("Netflix went from $269 to $299")

### P4.8 — Forecasting & net-worth history
Net worth + goals exist. Add projection + history (from local data).

- [ ] Goal completion forecast (target, current, monthly contribution → estimated date)
- [ ] Net-worth history chart (1m / 6m / 1y / 5y / all) from `networth_snapshots`

### P4.9 — Global search
- [ ] Cross-entity search (transactions, receipts, subscriptions) with filters (date, account, category, merchant, amount, tag, type)

### P4.10 — Reports depth + custom reports
Several reports exist 🟡. Extend and allow user-defined reports (rendered locally).

- [ ] Add: cash flow, savings rate, debt, credit utilization, merchant, custom reports

### P4.11 — Multi-currency, manual-first (aligns with local-first)
- [ ] Per-account currency with a **user-entered** exchange rate (no auto-fetch by default); show converted value in base currency
- [ ] Optional, user-enabled FX auto-fetch only (off by default) — ties to P1.13

### P4.12 — Auth depth: 2FA / passkeys
Baseline hardening is P0.4. This is the deeper account-security layer.

- [ ] TOTP 2FA (offline authenticator apps — no cloud)
- [ ] Passkeys / WebAuthn
- [ ] Login history + revoke individual session

### P4.13 — API maturity (local endpoints)
`/api/v1` + API keys exist. Make it a real platform surface.

- [ ] OpenAPI spec + Swagger UI
- [ ] Webhooks to a **user-configured** endpoint (e.g. Home Assistant, local script): `transaction.created`, `budget.exceeded`, `goal.completed`, `subscription.upcoming`
- [ ] Scoped API keys

### P4.14 — PWA / mobile (offline-capable)
Frontend is responsive. A local-first PWA is the natural mobile story.

- [ ] Installable PWA + offline mode (service worker already present — verify/extend)
- [ ] Quick-add expense (sub-5-second flow), mobile dashboard
- [ ] Camera receipt capture (on-device), optional biometric unlock

---

## FUTURE / v2 — big, optional, explicitly NOT in the local-first core

Tracked for vision, but these either conflict with local-first or are large
separate initiatives. Not required for 1.0.0 and not assumed for v1.x.

- **Automatic bank sync** (Plaid / SimpleFIN / per-bank): OUT of the core — it
  transmits financial data to a cloud service, conflicting with local-first. If
  ever built, it MUST be an opt-in, off-by-default plugin the user enables, with
  the manual/file-import path remaining the default. (Note: Plaid does not cover
  Mexican Transactions, so it can't be "the" solution anyway.)
- **Investments / portfolio** (brokerage, retirement, crypto, ETFs, FIBRAs,
  CETES, dividends, allocation, performance): large separate initiative. If
  built, must be **manual-entry-first**; any live price fetch is optional and
  user-enabled only. Great v2 differentiator, not a 1.0 item.

### Explicitly NOT doing (scope guard)
Trading / buying-selling securities · payment processing · issuing loans · own
banking · credit scoring · crypto exchange · full business accounting · payroll ·
full business invoicing. These turn HomeLedger into a fintech/accounting company
instead of an excellent personal-finance app.

---

## Definition of Done for v1.0.0

All P0 checked, and P1 substantially done:

- [ ] All tests pass (backend green; basic frontend coverage)
- [ ] Backup export/import round-trips reliably, multi-user safe, includes receipts
- [ ] Verified upgrade path from a prior version with no data loss
- [ ] Production refuses/loudly warns on insecure defaults; rate limiting correct behind proxy
- [ ] Multi-arch image (amd64 + arm64) actually runs on target hardware
- [ ] API `/api/v1` and backup format explicitly frozen as stable
- [ ] CHANGELOG updated; version bumped to 1.0.0 across all manifests

---

## Version bump checklist (when cutting any release)

Keep these in sync (all currently `0.1.0`):
- [ ] root `package.json`
- [ ] `packages/{backend,frontend,shared}/package.json`
- [ ] `packages/backend/src/services/backup.service.ts` → `APP_VERSION`
- [ ] `ha-addon/config.yaml` → `version`
- [ ] `ha-integration/custom_components/homeledger/manifest.json` → `version`
- [ ] `sw_version` in HA `sensor.py` / `binary_sensor.py`
- [ ] `CHANGELOG.md` new section
- [ ] Tag `vX.Y.Z`, push, verify CI build green, then create GitHub Release

---

## Notes / decisions log

- **Balance model:** account balances are computed dynamically from transactions/transfers (`AccountService.calculateBalance`); `initialBalance` is never mutated. Tests must follow this.
- **Raw-SQL tables:** `receipt_analyses`, `receipt_items`, `backup_history`, `alert_settings` are created at runtime outside Drizzle (via `ensureTable` patterns). Formalizing them is a P0.3 item.
- **arm64:** must be built on native arm64 runners; QEMU emulation hangs compiling `better-sqlite3`.
- **Naming:** app is "HomeLedger"; internal package scope was renamed from `@smart-finance/*` to `@homeledger/*` (done — all package.json names, imports, and the lockfile updated; verified with typecheck + build + 410 tests).
