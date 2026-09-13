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

**Resolved in P2.6 ✅:** receipts (`receipt_analyses` / `receipt_items`) and
attachments (binary files on disk) are now included in the backup and restore
with remapped FKs. Attachment binaries are inlined as base64 in the JSON so the
backup stays a single self-contained file. See P2.6 below for details.

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
- [x] (Follow-up → done in P3.A) The hardcoded Spanish `aria-label`s (Cerrar, Volver, view/list labels, etc.) were batch-translated to `$t()` via a new `a11y.*` namespace as part of the P3.A accessibility pass.

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
- [x] Created language registry `packages/frontend/src/lib/i18n/registry.ts` — each language declares `{ dictionary, label, intlTag }` in one `locales` map
- [x] `SupportedLocale` now derived from registry keys (`keyof typeof locales`); removed the hand-maintained `'es' | 'en'` union in `preferences.ts`
- [x] `dictionaries` map, `supportedLocales`, and the Settings dropdown `localeOptions` are all built from the registry (no hardcoded lists)
- [x] **Compile-time key parity:** `es` is the canonical dictionary (`export type TranslationKey = keyof typeof es`); `en` is typed `Record<TranslationKey, string>`, so a missing/extra key is a compile error. Verified: typecheck 0/0 and script parity 819/819.
- [x] Fallback now uses `DEFAULT_LOCALE` (registry) instead of hardcoded `dictionaries.es`; `loadFromStorage` validates the stored locale via `isSupportedLocale` (corrupt/removed locale → default)
- [x] Added `getIntlTag(locale)` helper; replaced the 4 ad-hoc `locale === 'en' ? 'en-US' : 'es-MX'` ternaries (dashboard, calendario, reportes, DatePicker). `reportes` also stopped reading `localStorage` directly / hardcoded month arrays — now uses the `preferences` store + `Intl` reactively.
- [ ] (Deferred) Document "how to add a language" in README/CONTRIBUTING — the JSDoc in `registry.ts` already spells out the 2-step process; a README section can follow with the docs pass.
- [ ] (Deferred) Manual end-to-end test with a throwaway 3rd language — the compile-time parity type already guarantees a new dict must cover every key; a full runtime smoke test can pair with P1.6.

Note: `DEFAULT_LOCALE` is currently `'es'`; **P1.6** makes it host-configurable with an English fallback chain.

### P1.5 — Better-defined, localized system categories
Today `packages/backend/src/db/seed.ts` seeds a fixed set of **Spanish-only**,
**global** (`userId: null`, `isSystem: true`) system categories from a legacy
Notion export (`Comida`, `Compras`, `Corrección`, `Despensa`, `Dividendos`,
`Educación`, `Entretenimiento`, `Gasolina`, `ISP`, `Limpieza`, `Luz`, `MX-5`,
`Nómina`, `Préstamo`, `Renta`, `Salud`, `Telefonía`, `Transporte`, `Vales`).
Problems: English users see Spanish names; the list contains personal/legacy
junk (`MX-5`); and the rules engine depends on the magic name `Corrección` for
uncategorized transactions.

**Goal:** a clean, sensible default category set that appears in the host's
primary language, seeded once at launch, with English when nothing else applies.

**Decision (user-confirmed):** The admin/host picks ONE primary language at
launch (`DEFAULT_LOCALE`). System categories are seeded **once, globally, in that
language** — they are shared, fixed text. If an individual user switches their
own UI language, category names do **not** change. Users can delete the system
categories and create their own. This means we did **not** need Option A's
per-category i18n display layer — the category name is just real text in the
host language. We added one stable `key` per system category purely so backend
logic (default/"uncategorized" lookup) is language-independent.

- [x] Curated default set of **16** categories with es/en names + correct `type`: 1 Ingreso (`income`), 10 Gasto (housing, groceries, dining, transportation, utilities, health, entertainment, shopping, personal, education), 5 Ambos (`savings`, `debt`, `gifts`, `other`, `uncategorized`). Dropped legacy junk (`MX-5`, `ISP`, `Vales`, `Limpieza`, `Comida`); folded `Luz`/`ISP`/`Telefonía` → Utilities, `Gasolina` → Transportation, `Nómina`/`Dividendos` → Income, `Renta` → Housing, `Préstamo` → Debt. Default set researched against mainstream budgeting guidance (Ramsey/SoFi/WalletHub/Monarch).
- [x] Added a stable `key` column to `categories` (schema.ts) via **migration `0003_add_category_key.sql`** (+ `categories_key_idx`); null for user categories. Chose a real migration (not the connection.ts reconcile pattern) since `key` is brand-new and no install has it yet — this also fixes the migration-only test setups.
- [x] Replaced BOTH magic-string `Corrección` lookups with `key = 'uncategorized'`: `ImportService.getDefaultCategoryId()` and `RulesEngineService.applyToUncategorized()`. `UNCATEGORIZED_KEY` exported from seed.ts.
- [x] Seed is idempotent by `key` (skips keys already present); one-time legacy backfill adopts a pre-existing `Corrección` row as `key='uncategorized'` so upgrades don't lose the default and don't duplicate. Existing user data preserved (FKs are `restrict`).
- [x] Seed reads `DEFAULT_LOCALE` (see P1.6) and inserts the name for that language.
- [x] Updated all 9 backend test suites (7 inline `CREATE TABLE` + 2 `Corrección` fixtures) for the new column/key.
- [x] Verified: full suite **429/429**; end-to-end seed run with `DEFAULT_LOCALE=en` → 16 cats, `Uncategorized`/`Income`; with `=es` → `Sin categoría`/`Ingresos`; `key` column present; all 16 keys seeded.

### P1.6 — Host-configurable default language
Let the person deploying the app choose the default UI language; fall back to
**English** when nothing is configured. Currently the fallback is hardcoded to
Spanish in `packages/frontend/src/lib/stores/preferences.ts` (`loadFromStorage`
returns `{ locale: 'es' }`), and there is no host-level setting.

- [x] Added a `DEFAULT_LOCALE` env var (backend) via `packages/backend/src/config/locale.ts` — `getDefaultLocale()` validates against supported locales, normalizes `en-US`→`en`, defaults to **English** when unset/invalid. Consumed by the category seed.
- [x] Exposed the configured default to the frontend via a **public** `GET /api/v1/config` → `{ defaultLocale }` (added to `PUBLIC_ROUTES`). Verified: `DEFAULT_LOCALE=es` → `{"defaultLocale":"es"}`, unset → `{"defaultLocale":"en"}`.
- [x] Frontend resolution chain is now **stored user choice → host `DEFAULT_LOCALE` → English**. Changed the registry ultimate fallback `'es'`→`'en'`; added `applyHostDefaultLocale()` in `preferences.ts` that, on a genuine first run only (tracked via `localeWasStored`, captured before the auto-save subscription), fetches `/api/v1/config` and adopts the host default. A user's saved choice always wins.
- [x] Wired the bootstrap into the root `+layout.svelte` `onMount`. (Because `t` is a derived store, the first-run language applies reactively; the login screen may paint in English for one frame before swapping to the host default — acceptable, avoids SSR plumbing for this client-heavy local-first app.)
- [x] Documented `DEFAULT_LOCALE` in `.env.example`, README env table, `Dockerfile`, `docker-compose.yml`, and the HA add-on (`config.yaml` options+schema `list(es|en)`, `run.sh`, `DOCS.md`, `translations/es.yaml`).
- [x] Verified: backend+frontend typecheck 0/0, build clean, full suite 429/429; config endpoint returns es/en correctly; a user's saved choice is never overridden (`localeWasStored` guard).

### P1.7 — Health & observability
- [x] Deepened `GET /api/v1/health` with a real DB probe (`SELECT 1`): returns `{ status, db, version, timestamp }` and **HTTP 503** when the DB is unreachable so Docker/HA healthchecks detect it (was a static `ok`).
- [x] Confirmed consistent structured error responses: `middleware/error-handler.ts` already returns `{ success:false, error:{ code, message[, details] } }` for Zod (422), Auth (401/403), rate-limit (429), client (4xx), and the generic 500 fallback. No change needed.
- [x] Surfaced scheduler job status via an in-memory registry (`scheduler/status.ts`): each of the 3 jobs (auto-charge, alert-evaluation, budget-reset) reports `lastRunAt / lastStatus / lastDurationMs / lastMessage` (including their startup catch-up runs). Exposed at **admin-only** `GET /api/v1/health/scheduler` (`requireRole(['admin'])`) → `{ startedAt, healthy, jobs[] }`. A silently-failed cron run is now visible. (This is the first live use of `requireRole` — leads into P1.10.)
- [x] Configurable logging: `LOG_LEVEL` (pino) is honored in `server.ts`; now documented in `.env.example` + README env table. Jobs keep `console.*` (they run outside request context) but also report structured status to the registry.
- [x] Verified: backend typecheck 0/0, full suite 429/429, build clean; `app.inject` smoke test → `/health` 200 `db:ok`, `/health/scheduler` 401 without auth (guard wired), registry records job runs correctly.

Note: intentionally did **not** add a metrics/Prometheus stack — out of scope for a local-first v1. In-memory status resets on restart, which is the right scope for single-process operational telemetry.

### P1.8 — Automated backups with retention
Manual JSON export exists, but a finance app needs scheduled backups so a DB
corruption isn't catastrophic. Keep storage bounded — a fixed number of backups,
rotating out the oldest.

**Decision (user-confirmed):** minimize disk use → **gzip-compressed whole-DB snapshots** (SQLite files compress ~70–90%, beating both raw `.db` copies and uncompressed per-user JSON, while capturing everything in one consistent file). The per-user JSON export/import stays as the user-facing "export my data" feature; these snapshots are the separate disaster-recovery mechanism.

- [x] Scheduled automatic backups: new `scheduler/backup.job.ts` (4th cron job, reports into the P1.7 status registry). Schedule via `BACKUP_CRON` (default daily 03:00), toggle via `BACKUP_ENABLED`.
- [x] **Retention/rotation:** `SnapshotService.applyRetention()` keeps the newest `BACKUP_RETENTION` (env, default 7, min 1) and deletes the oldest after each run. Verified: with retention=2, creating 3 snapshots rotates out exactly 1, oldest deleted.
- [x] Snapshots stored under `DATA_DIR/backups` (persists with the volume). `SnapshotService.createSnapshot()` uses better-sqlite3's online backup API (WAL-safe, consistent) → gzip → `homeledger-<ISO-ts>.db.gz`. Verified gzip magic bytes.
- [x] Backend restore API (admin-only, `requireRole(['admin'])`): `GET /api/v1/backup/snapshots` (list), `POST /api/v1/backup/snapshots` (create now), `POST /api/v1/backup/snapshots/:name/restore` (requires `confirmed:true`). Restore validates the SQLite header, writes a `.pre-restore` safety copy of the current DB, clears stale WAL/SHM sidecars, swaps the file, and reopens the connection. Verified: full restore round-trip; path-traversal/invalid names rejected; `.pre-restore` written.
- [x] Env + docs: `BACKUP_ENABLED`/`BACKUP_RETENTION`/`BACKUP_CRON` in `.env.example`, README, Dockerfile, docker-compose.yml, and the HA add-on (config.yaml options+schema, run.sh, DOCS.md, translations). `data/` (incl. `data/backups`) is gitignored.
- [x] Verified: backend typecheck 0/0, full suite 429/429, frontend build clean; real snapshot→rotate→restore cycle + safety/validation paths.
- [ ] (Follow-up) Frontend UI for snapshots: an admin panel to list snapshots and trigger restore. The backend API is done; this is a thin UI layer that can pair with the P1.10 admin views.

### P1.9 — Restore safety (dry-run / validation)
Import currently wipes all data on confirm. Make it safer.

- [x] Dry-run preview: `BackupService.previewImport(userId, backup)` validates the backup (reusing `validateBackup`) then returns a **non-destructive** summary — `backupCounts` per entity, `currentCounts` per entity (what would be replaced), and `warnings[]` for rows the import would silently skip (orphaned FKs: transactions/subscriptions referencing an account/category absent from the backup). Zero writes. Exposed at `POST /api/v1/backup/preview` (auth'd, per-user, read-only).
- [x] Verified atomic rollback with a test: a validation-passing backup that fails mid-insert (NOT NULL `amount`) leaves the user's original data **fully intact** — no half-restore (the delete+insert are wrapped in one `sqlite.transaction`).
- [x] Destructive-replace guard confirmed: `import` without `confirmed:true` throws `CONFIRMATION_REQUIRED` (409 at the route), covered by an existing test.
- [x] Verified: backend typecheck 0/0, full suite **433/433** (added 4 tests: preview reports+no-writes, orphan warnings, invalid-backup throw, atomicity rollback), frontend build clean.
- [ ] (Follow-up) Frontend: show the preview (counts + warnings) in the import UI before the user confirms the replace — pairs with the P1.8 snapshot admin UI.

### P1.10 — Multi-user hardening (decide the model)
The app supports multiple users (first registrant becomes admin, rest become
`user` — confirmed in `auth.service.ts`), but multi-user behavior isn't clearly
locked down. Decide explicitly whether HomeLedger is single-user or multi-user
and enforce it.

**Decision (user-confirmed): multi-user, admin-controlled.** HomeLedger is a
self-hosted **household** app. The first registrant is the admin and controls the
instance (default language, registration, backups, user management). Additional
users can be allowed in; each user's financial data is strictly isolated from the
others. This matches the existing first-user-admin code and the local-first
principle (it's your household's server, not public SaaS).

- [x] Decision documented (above): multi-user, admin-controlled.
- [x] Full per-user isolation audit (delegated deep audit of every route/service). Result: **no currently-exploitable cross-user IDOR** — every user-supplied `:id` mutation is guarded either in-service (`AND userId = ?`) or at the route layer. Fixed the latent defense-in-depth gaps it found:
  - **`AccountService`** was the main gap — `update/deactivate/getById/...` filtered only by `id`, relying entirely on route guards. Threaded `userId` into these and filter `AND userId = ?` in-query (route guards kept as defense-in-depth).
  - **`AuthService.revokeApiKey`** was unscoped by user (landmine if ever routed) — now scoped to the caller's own keys.
  - **FK ownership on create** — `categoryId` in transactions/subscriptions/budgets was existence-only; now must be a system category or owned by the user (a user can't reference another user's private category).
  - **`AttachmentService` link** — `transactionId`/`transferId` are now verified to belong to the user before linking.
- [x] Wired `requireRole` for admin actions: system-category edit/delete is now **admin-only** (users manage their own categories; only the admin curates the shared system set); plus the P1.7 scheduler status and P1.8 snapshot routes.
- [x] Admin user-management **backend** (all `requireRole(['admin'])`): list users, enable/disable, delete, reset a user's password (`users.routes.ts` + `UserService`). First-admin safety: can't disable/delete/demote the last admin or yourself into lockout.
- [ ] (Follow-up) Frontend admin user-management view — pairs with the deferred P1.8/P1.9 admin UI.

### P1.11 — Registration control (admin-managed + allowlist)
Registration is currently fully open (anyone can register; confirmed in
`AuthService.register`). On an exposed instance, randoms can create accounts.

- [x] Admin-controlled registration via a persisted `registration_mode` (in a new idempotent `app_settings` table + `SettingsService`): `first_user_only` (safe default), `open`, or `closed`. Admin can change it live; the very first user is always allowed (bootstraps the admin).
- [x] Optional **email allowlist** (`registration_allowlist`): when set and mode is `open`, only listed emails may register (case-insensitive). Enforced in `AuthService.register`.
- [x] **Safe default on fresh install:** `first_user_only` — an exposed instance can't be registered on by randoms out of the box. New error codes `REGISTRATION_CLOSED` / `EMAIL_NOT_ALLOWED` (403).
- [x] Controls surfaced both ways: **env bootstrap** `REGISTRATION_MODE` / `REGISTRATION_ALLOWLIST` seeds settings on first run (never overrides a later admin change), and **admin API** `GET/PUT /api/v1/users/registration` (`requireRole(['admin'])`) to read/update at runtime. Documented across `.env.example`/README/Dockerfile/compose/HA.
- [x] Verified: 4 policy tests (first-user allowed + second blocked under `first_user_only`; `closed` blocks; `open`+allowlist enforces listed-only, case-insensitive; `open` w/o allowlist allows any). Full suite 438/438, typecheck 0/0, build clean.
- [ ] (Follow-up) Frontend admin settings UI for registration — pairs with the deferred admin UI.

### P1.12 — Password reset / account recovery
Login and register exist, but there's no way to recover a forgotten password.

- [x] Admin recovery **CLI** (`packages/backend/src/cli/admin.ts`, `npm run admin -w packages/backend -- <cmd>`; Docker: `docker exec ... node dist/cli/admin.js <cmd>`). Runs migrations first, respects `DATA_DIR`, works headless. Commands: `list-users`, `reset-password <email> [password]` (generates + prints a strong password once if omitted), `create-admin`, `promote`, `enable`. Never prints stored hashes.
- [x] (Complements the CLI) Admin API `POST /api/v1/users/:id/reset-password` (from P1.10) for when an admin *can* log in.
- [ ] Email-based reset: **explicitly deferred as optional** — HomeLedger is local-first with no SMTP dependency; the CLI is the supported recovery path. Documented as such in the README. Can be added later behind optional SMTP config.
- [x] Verified end-to-end: created an admin, reset its password via the CLI, and confirmed `AuthService.login` succeeds with the new password — a locked-out admin regains access without wiping the DB. Full suite 438/438, typecheck 0/0, build compiles the CLI to `dist/cli/admin.js`.

### P1.13 — Multi-currency correctness
Users can pick from 8 currencies, but it's unclear how accounts in *different*
currencies are handled in aggregates.

- [x] Investigated (deep audit): confirmed there was **no** currency model — all totals (dashboard consolidated balance, monthly summary, net worth, cashflow, trends, category analysis, budgets) sum amounts directly with no currency dimension; `accounts.currency` was never set by the UI and never read by any calculation; no FX/conversion anywhere; assets/liabilities have no currency. So mixing currencies would have produced silently-wrong totals.
- [x] **Decision (user-confirmed): Option A — single currency per install.** Matches how the app already behaves, fits local-first (no outbound FX calls), and closes the silent-mixing bug.
- [x] Applied: instance currency stored in `app_settings` (`config/currency.ts`), seeded from `DISPLAY_CURRENCY` env (default MXN, validated against the 8 supported), admin-editable (`GET/PUT /api/v1/users/currency`), exposed via `GET /api/v1/config`. `AccountService.create/update` now **reject a mismatched currency** (`CURRENCY_MISMATCH` → 400) and default to the instance currency, so totals can never mix currencies. Frontend applies the instance currency from `/config` (authoritative); the Settings currency picker is now a read-only display (currency is instance-wide, not per-user). Documented as single-currency in README + `.env.example`/Docker/compose/HA.
- [x] Verified: backend+frontend typecheck 0/0, full suite passing, build clean.

> **Real multi-currency (per-currency totals and/or FX conversion) is explicitly a post-1.0 feature** — see the FUTURE/v2 section. It requires a currency dimension on every aggregation plus assets/liabilities, and (for conversion) exchange-rate sourcing, which conflicts with local-first defaults.

---

## Phase P2 — Feature completeness (nice-to-have for 1.0.0, can slip to 1.1)

These have backend support but no frontend UI, or are incomplete.

### P2.1 — Rules (auto-categorization) UI ✅ (done)
- [x] Backend was already complete (`RulesEngineService`, `rules.routes.ts`)
- [x] Frontend API client `lib/api/rules.ts` (list/create/update/delete/test/apply + `Rule`/`RuleCondition`/`RuleAction` types mirroring the backend)
- [x] `/reglas` route + UI: rules table (priority, name, condition/action chips, match count, inline enable toggle), create/edit modal with dynamic **condition** rows (field + operator + value; `between` shows min/max; numeric fields use number inputs) and **action** rows (setCategory → category picker, setType → Income/Expense, addTag → text), delete confirm, per-form **Test** (dry-run) and header **Apply to uncategorized**. Escape-to-close, backdrop dismiss, instant press feedback + `prefers-reduced-motion` guard (apple-design).
- [x] Nav entry under Analysis (`zap` icon)
- [x] i18n es/en: `nav.rules`, `page_title.rules`, full `rules.*` namespace (fields/operators/action-types included). Parity verified: **874 keys each**, 0 mismatches.
- [x] Verified: frontend typecheck 0 errors / 0 warnings, build clean, full suite still 438/438.

### P2.2 — Loans UI + delete ✅ (done)
- [x] Backend: added `LoanService.delete(id, userId)` (ownership-checked; `loan_payments` cascade via FK) + 2 tests (delete cascades payments; throws for non-existent). Exposed missing routes: `GET /loans/:id`, `GET /loans/:id/payments`, `DELETE /loans/:id` (getById/listPayments already existed in the service).
- [x] Frontend API client `lib/api/loans.ts` (list/get/create/update/delete/recordPayment/getSchedule/getPayments + `Loan`/`LoanPayment`/`AmortizationRow` types).
- [x] `/prestamos` route + UI: loan cards (name, rate, term, remaining vs principal, progress bar, active/paid status), create/edit modal (principal locked after creation), **record-payment** modal (principal/interest auto-sum to total, validated), **amortization schedule + payment-history** detail modal, delete confirm. Escape-close, press feedback + `prefers-reduced-motion` guard.
- [x] Nav entry under Planning (`credit-card` icon).
- [x] i18n es/en: `nav.loans`, `page_title.loans`, full `loans.*` namespace. Parity **917 keys each**, 0 mismatches.
- [x] Verified: backend + frontend typecheck 0/0, full suite **440/440** (added 2 loan-delete tests), build clean.

### P2.3 — Subcategories & splits in the UI ✅ (done)
Backend seams that were missing are now added:
- [x] `DELETE /categories/:id/subcategories/:subId` (ownership-checked; transactions' `subcategoryId` set null via FK) + `deleteSubcategory` client. (Create already existed.)
- [x] `subcategoryId` now accepted by transaction **create + update** (schema + `TransactionService`), validated to belong to the chosen category; cleared automatically when the category changes or explicitly set to null. (Previously only the rules engine could set it.)
- [x] `DELETE /transactions/:id/split` (clear splits) + `TransactionService.clearSplits`; `splitTransaction`/`clearSplits` clients; `Transaction.splits`/`subcategoryId` types (shared + api client).
- [x] **Subcategory management UI** in the categories Edit modal: list existing, add, delete.
- [x] **Subcategory picker** in the transaction create/edit form (appears when the selected category has subcategories; resets on category change).
- [x] **Split editor** modal from the transaction detail: dynamic category+amount+note rows, live "remaining" indicator (green at 0, warns otherwise), Save disabled until it balances (mirrors backend `SPLITS_SUM_MISMATCH`), loads existing splits, and Clear-splits.
- [x] i18n es/en (parity **932 keys**), press feedback + `prefers-reduced-motion`, Escape-close.
- [x] Verified: backend + frontend typecheck 0/0, full suite **446/446** (added 6 tests: subcategory persist/reject/clear ×2 + clearSplits ×2), shared rebuilt, build clean.

### P2.4 — Recurring transactions ✅ (done — removed)
**Decision (user-confirmed): removed.** The `recurring_transactions` table had no
service, route, scheduler, or UI — pure dead schema — and subscriptions with
`autoCharge` already cover recurring needs. Keeping it would be confusing unused surface.
- [x] Migration `0005_drop_recurring_transactions.sql` (`DROP TABLE IF EXISTS`) + journal entry; verified end-to-end that a fresh DB ends with no `recurring_transactions` table after all migrations.
- [x] Removed the table from `schema.ts` (and the "& RECURRING TRANSACTIONS" section header).
- [x] Removed every reference from `backup.service.ts` (import, `BackupData` field, export select, delete-in-import, import re-insert loop, `validateBackup` expected fields + defaults, `previewImport` count) and `backup.service.test.ts` (inline table, cleanup, fixtures). Old backups that still contain a `recurringTransactions` key are simply ignored on import (extra keys aren't rejected) — no error.
- [x] Verified: backend typecheck 0/0, full suite **446/446** (backup round-trip unaffected), build clean.

### P2.5 — HA integration ✅ (done)
Auditing this uncovered a bigger issue than the note implied: the HACS integration's
sensors were effectively **broken** — the coordinator returned the raw `{ success, data }`
envelope but `sensor.py` read keys off the top level, and it expected keys `/status`
never returned. Fixed the whole contract:
- [x] **Webhook decision: documented as intentionally minimal.** `POST /api/v1/ha/webhook` acknowledges + logs but does no automation processing (no concrete use case; local-first — building speculative event→action handling would be unused surface). To drive HomeLedger from HA, the integration's `create_transaction`/`create_quick_expense` services use the normal endpoints. Made the intent explicit in code + response (`processed: false`).
- [x] **Fixed `/api/v1/ha/status` contract** so sensors actually work: added `currency` (from `getInstanceCurrency()`), `monthly_savings`, `net_worth` (NetWorthService), `total_balance`, `credit_card_utilization`, `remaining_budget` (BudgetService summary, null when no budget), `accounts[]` (id/name/balance), `top_categories[]` (top 5 for the month), and an `alerts{}` object (over_budget / high_credit_utilization / payment_due_soon / low_balance) for the binary sensors. Kept all original keys for back-compat.
- [x] **Fixed the coordinator** to unwrap `{ data }` so `sensor.py`/`binary_sensor.py` read the right shape (this was the core "sensors show nothing" bug).
- [x] **Currency-aware sensors:** Python monetary sensors (main + per-account + per-category) now take their unit from the payload `currency` (fallback MXN) instead of hardcoded `MXN`. Backend `/sensors` unit is `getInstanceCurrency()`.
- [x] **Renamed** `sensor.smart_finance_*` → `sensor.homeledger_*` in the backend `/sensors` endpoint. (The Python integration derives its own entity ids, so no rename needed there; the folder/domain was already `homeledger`.)
- [x] Verified: backend typecheck 0/0, full suite 446/446, build clean; `app.inject` on `/status` (authed) returns 200 with `currency`, all new keys, the `alerts` object, and per-account balances.

Note: HACS polls `/status`; the backend `/sensors` endpoint is a convenience/alt shape kept correct but not consumed by the integration.

### P2.6 — Include receipts & attachments in backup (deferred from P0.2) ✅ (done)
Attachments (binary files on disk) and receipts (`receipt_analyses` /
`receipt_items`, which reference attachments) are now captured by the backup and
survive a restore with fully remapped foreign keys.

- [x] Include attachment binaries in the backup — inlined as base64 in the single JSON (`data.attachments[].fileBase64`), keeping the existing single-file export/import format + frontend flow intact rather than introducing a zip container. Attachment volume for a personal finance app is modest, so base64 is the least-friction, self-contained choice.
- [x] Export `attachments[]` (full row + `fileBase64` read from disk, `null` when the file is missing), `receiptAnalyses[]` (raw `SELECT * WHERE user_id`), `receiptItems[]` (scoped to the user's analyses via join). Receipt tables guarded by existence (raw-SQL `ensureTables`).
- [x] Import re-inserts all three with FK remapping consistent with the P0.2 remap: added a `transferMap` (transfers now capture new ids since `attachments.transferId` references them); attachments remap `transactionId`/`transferId` and rewrite the base64 to disk under a fresh UUID filename + updated `path` (build `attMap`); `receipt_analyses` remap `attachment_id`→attMap (skip orphans; it's a NOT NULL UNIQUE FK) + `transaction_id`→txMap (build `analysisMap`); `receipt_items` remap `analysis_id`→analysisMap. Receipt inserts are column-aware (PRAGMA `table_info`) to tolerate schema drift, guarded by table existence.
- [x] `validateBackup` (expected-array fields + defaults) and `previewImport` (`currentCounts`) extended for attachments/receiptAnalyses/receiptItems.
- [x] Round-trip test: attachment + binary file on disk + receipt analysis + line item survive export → wipe → import, asserting remapped `transaction_id`, the rewritten file's bytes match, and the receipt/item FKs point at the fresh ids.
- [x] Verified: backend typecheck 0/0, full suite **447 passing** (+1), backend build clean.

---

## Phase P3 — Polish & confidence

- [ ] Frontend test suite (currently ZERO tests) — at least smoke/e2e on critical flows (login, create tx, dashboard, backup)
- [ ] Receipt OCR accuracy review (currently regex/heuristic best-effort)
- [ ] Accessibility pass (WCAG basics: labels, contrast, keyboard nav) — includes translating the many hardcoded Spanish `aria-label`s across the app to `$t()` (deferred from P1.3). **Reduced-motion / transparency / contrast is broken out as P3.A below.**
- [ ] Performance check with a large dataset (thousands of transactions)
- [ ] End-to-end docs: deployment, backup/restore, upgrade, HA setup
- [ ] Reverse-proxy deployment examples with HTTPS (Nginx / Traefik / Caddy)
- [ ] `CONTRIBUTING.md` + issue/PR templates (supports community growth)
- [ ] CSV export of transactions (spreadsheet-friendly, separate from the JSON backup)
- [ ] (Optional) Real dashboard customization — the non-functional "Customize" button was removed; only revisit if it becomes a wanted feature

### Design craft (from the `apple-design` skill)

A UI audit against the vendored `apple-design` skill (`.kiro/skills/apple-design/`)
found the app is functionally solid with a real token system, but motion is
fixed-duration CSS (no springs, nothing interruptible), there's **no**
reduced-motion/transparency/contrast handling, press feedback is inconsistent,
surfaces are opaque (no translucent materials), modals just pop (no origin,
no materialize, no symmetric enter/exit), and typography tracking is
size-agnostic. Stack: **SvelteKit + Svelte 5** — use `svelte/motion`
(`Spring`/`Tween`) + `svelte/transition` + CSS; no new heavy dependency needed.
House spring style: critically damped `damping 1.0, response 0.3–0.4` by default;
add bounce (`~0.8`) only for momentum-driven (flick/drag-release) interactions.

- [x] **P3.A — Reduced-motion / transparency / contrast foundations + deferred aria-label i18n ✅ (done).** Added a global accessibility-foundations block at the end of `app.css` (the single global sheet imported by the root layout) so it applies app-wide instead of the previous scattered per-page rules:
  - `@media (prefers-reduced-motion: reduce)` — collapses all `animation-duration`/`transition-duration` to ~0, forces `scroll-behavior: auto`, drops `:active`/`:hover` `transform` (press-scale/lift) app-wide, and freezes indefinite spinners. Keeps opacity/color changes (they aid comprehension). Supersedes the 4 pre-existing per-page reduced-motion blocks (transacciones/reglas/categorias/prestamos) — correction to the earlier "none exist" note: reduced-motion **did** exist per-page in those 4 files; it was just never global. Left the per-page blocks in place (harmless duplicates).
  - `@media (prefers-reduced-transparency: reduce)` — neutralizes `backdrop-filter` blur and raises the scrim to `rgba(0,0,0,0.8)` across the shared modal backdrops **and** any page-scoped `[class*='overlay']`/`[class*='backdrop']` (covers the dashboard/cuentas/categorias page-local backdrops via attribute match + `!important`).
  - `@media (prefers-contrast: more)` — strengthens `--border-default`/`--border-subtle`, firms up `--text-secondary`/`--text-muted`/`--bg-hover` for both `:root` (dark) and `:root[data-theme='light']`, and gives form controls a defined 1px border. Accent hues preserved so charts/status colors stay meaningful.
  - **aria-label i18n (deferred from P1.3):** created an `a11y.*` namespace (27 keys) in `es.ts`/`en.ts` and translated ~40 hardcoded Spanish `aria-label`s across 9 files (app layout + suscripciones, respaldo, registro-rapido, presupuestos, metas, cuentas, categorias, alertas). Plain "Cerrar" → existing `common.close`, "Eliminar" → `common.delete`; descriptive region/list/step labels → new `a11y.*` keys; 3 interpolated labels use `$t(key, { param })` (budget category/amount `{n}`, goal progress `{pct}%`).
  - Verified: frontend typecheck **0 errors / 0 warnings**, i18n parity **959 keys each** (932 → 959, +27), no missing/duplicate keys, frontend build clean.
- [x] **P3.B — Spring-based motion primitives ✅ (done).** Created a reusable `lib/motion/index.ts` module with house motion tokens (`MOTION`: modal 260ms / scrim 200ms / reduced 140ms, `cubicOut` easing — the web mapping of the skill's critically-damped `response 0.3–0.4` defaults) and two `css`-based Svelte transitions:
  - `modalPanel` — a **materialize**: scale `0.96→1` + opacity + a resolving blur (`8px→0`) on one eased curve, so the surface reads as a real material arriving rather than a flat fade (apple-design §12). Because it's a `css` transition, Svelte plays it forward on enter and reversed on exit, giving the **symmetric enter/exit path** for free (§7).
  - `scrim` — the backdrop opacity fade (a hair faster so the dim leads the panel).
  - Both read `prefersReducedMotion` (from `svelte/motion`) at build time and collapse to a plain, quick **opacity cross-fade** with no transform/blur under reduced motion (§14).
  - Wired into **all ~30 shared modals across 14 pages** (transferencias, transacciones, suscripciones, respaldo, reglas, recibos, presupuestos, prestamos, patrimonio, metas, cuentas, categorias, dashboard, configuracion): `transition:scrim` on the `.overlay`/`.modal-backdrop`, `transition:modalPanel` on the `.modal`/`.modal-content`. This is the app's **first** modal enter/exit animation — before, modals popped instantly via `{#if}`. Dismiss handlers (backdrop click / Escape) are untouched; the transition directive coexists.
  - **Decision — toggle switches left on their existing critically-damped CSS transition.** The switches (`.switch`/`.toggle-switch`) flip on click, not by drag; a spring earns its keep for *gesture-driven, interruptible* motion (flick/drag-release), and a JS `Spring` refactor of a working click-toggle (one instance per table row) adds churn for negligible feel gain. Their CSS `transition: transform var(--transition-base)` already matches the house critically-damped style. Revisit only if the toggles become drag-interactive.
  - Verified: frontend typecheck 0/0, build clean, i18n untouched.
- [x] **P3.C — Consistent press feedback ✅ (done).** Added a global press-feedback block to `app.css`: `button:active:not(:disabled) { transform: scale(0.97) }` plus `a.nav-link` and the clickable card classes (`.account-card`, `.upcoming-item`). Buttons are consistently real `<button>` across the app, so the bare `button` selector is the reliable hook; the global button reset already carries `transition: all var(--transition-fast)`, so the scale eases at 0.1s (reads as instant on press, smooth on release, per apple-design §1). Nav anchors got a `transform` transition added (their base rule only transitioned `color`). Deliberately **not** targeted: `<tr>` rows (scaling breaks table layout), `<input>/<select>/<textarea>` (caret/value + custom select-arrow distortion), toggle switches (their knob uses `translateX` — a scale would fight it; explicitly zeroed as a safety), and the centered toast (`translateX` positioning). Disabled excluded via `:not(:disabled)`. Reduced-motion is already handled by the P3.A global block (`*:active { transform: none !important }`, which wins via `!important`) — no extra guard needed. The pre-existing per-page rules with an intentionally different feel (`.icon-btn` 0.9, `.key` 0.96) stay Svelte-scoped and override this baseline. Verified: frontend typecheck 0/0, build clean.
- [x] **P3.D — Translucent materials & depth ✅ (done).** Added theme-aware translucent-material tokens to `app.css` (`--sidebar-bg-glass`, `--surface-glass`, `--material-blur: blur(20px) saturate(180%)`) for both dark and light, so each theme tunes its own opacity and the reduced-transparency guard swaps them in one place.
  - **Sidebar** → translucent `backdrop-filter` material (a heavier structural-chrome material per apple-design §12); the canvas reads faintly through. Border + mobile scrim kept.
  - **Modal panels** → a *light* glass (high-opacity `--surface-glass` + blur) — deliberately restrained because modals hold forms/text and must stay legible (the skill's "never stack light translucent surfaces" / legibility caveat). Applied to the shared `.modal`/`.modal-content` in `app.css` + the `shared.css` `:global` duplicates + `.sf-modal`, and the per-page `.modal-content` in dashboard/categorias.
  - **Size-aware shadows** (bigger surface = thicker): `.modal-sm` shallow (`0 10px 32px`), base `.modal` medium (`0 16px 48px`), `.modal-wide` deepest (`0 24px 68px`).
  - **Modal "materialize" (blur + scale together) on enter** was already delivered in P3.B (the `modalPanel` transition), so it's not duplicated here.
  - **Guards:** extended the P3.A `prefers-reduced-transparency` block to explicitly solidify the sidebar (`--sidebar-bg`) and the modal panels (`--bg-surface`) — they aren't `overlay`/`backdrop` elements so the existing attribute match didn't cover them.
  - **Scope note:** page headers are **not** `position: sticky` anywhere in the app, so there was no sticky-chrome scroll-edge-fade target to build — documented rather than inventing sticky headers (a layout change beyond polish). The wide receipt-preview modal (`recibos`) was intentionally left opaque (document viewer where preview legibility matters most).
  - Verified: frontend typecheck 0/0, build clean, i18n untouched; both themes have the glass tokens.
- [~] **P3.E — Modal/sheet spatial consistency (trigger-anchoring done ✅; bottom-sheet deferred).**
  - [x] **Trigger-anchored popover.** Added a reusable `popover` transition to `lib/motion` (scale `0.92→1` + opacity, snappy ~170ms, symmetric via Svelte's css reversal, reduced-motion → opacity cross-fade) and wired it into `Dropdown.svelte`, with `transform-origin: top right` on the menu so it **grows out of its trigger's corner** (matching the menu's `top:100%/right:0` anchor) rather than popping (apple-design §7). Symmetric enter/exit + mirrored easing come for free from the css transition.
  - **Decision — centered modals keep `transform-origin: center`.** The app's modals are flex-centered dialogs, and for a centered dialog the center origin *is* the spatially-correct one (it materializes where it is, via the P3.B `modalPanel`). Anchoring a centered form dialog to a corner trigger button would make it fly diagonally — worse, not better. The skill's anchor-to-trigger guidance is about popovers/menus, which is exactly the `Dropdown` target handled above.
  - [ ] **Reusable bottom-sheet (drag-to-dismiss + momentum projection + rubber-band) — deferred follow-on.** Deliberately not built speculatively: it's real gesture code (Pointer Events, velocity history, momentum projection, velocity handoff to a spring) and the ROADMAP frames it as infrastructure for the not-yet-built admin panels. It should be built **alongside its first real consumer** (the deferred P1 admin panels, or a deliberate mobile modal→sheet conversion) so it's exercised by actual usage rather than shipped as an untested abstraction.
  - Verified: frontend typecheck 0/0, build clean.
- [ ] **P3.F — Typography scale (size-specific tracking/leading).** Add tracking/leading tokens: negative letter-spacing on display/large numbers, near-`0` on body, slightly positive on the uppercase micro-labels; tight leading on headings, looser on body. Verify layout scales with text (spacing already mostly in `rem`).
- [ ] (Optional / post-1.0) **P3.G — Gesture layer.** Swipe-to-dismiss mobile sidebar, swipe actions on transaction/list rows, calendar swipe — 1:1 pointer tracking + velocity handoff + rubber-banding. Pure "feel" polish; explicitly a nice-to-have, not a 1.0 blocker.

> Priority: **P3.A is 1.0-worthy** (reduced-motion is a genuine accessibility gap). P3.B–P3.F are 1.0-if-time / 1.1 craft. P3.G is post-1.0. All are additive polish on an already-functional UI.

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
- [ ] Builds on P1.13 (v1 shipped single-currency-per-install). Add a currency dimension to every aggregation (dashboard/net worth/reports/budgets) **and** to assets/liabilities.
- [ ] Per-account currency with a **user-entered** exchange rate (no auto-fetch by default); show converted value in base currency, and/or per-currency separate totals
- [ ] Optional, user-enabled FX auto-fetch only (off by default) — keeps local-first default

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
