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
