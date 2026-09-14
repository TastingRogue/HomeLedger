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

- Target version: **1.0.0** — the P0–P3 hardening is complete (see "Definition of
  Done for v1.0.0" below); tagging/release is the maintainer's step.
- Test suite: **549 passing, 0 failing** ✅ (499 backend/shared + 50 frontend) · lint 0 errors · CI gates in place
- **ALL P0 BLOCKERS DONE** (P0.1–P0.5) and P1–P3 substantially complete, merged to `main`.
- **Now working:** the **v1.x incremental depth** track (`P4.x` — see the horizon map).

---

## Roadmap horizons & execution order (read this first)

The rest of this file is long. This map removes all ambiguity about **what comes
after 1.0.0 and what constitutes a v2**. Three horizons, executed in this order:

| Horizon | Prefix | What it is | Ships as | Status |
| --- | --- | --- | --- | --- |
| **1.0.0** | `P0`–`P3` | Correctness, release quality, feature completeness, polish. The stability promise. | **1.0.0** | ✅ Done (tag pending) |
| **v1.x — incremental depth** | `P4.x` | Makes the *finance* app deeper without changing its scope. Merchant/tags, credit-card modeling, envelope budgeting, smarter import, forecasting, reports, multi-currency, PWA, etc. Local-first, no scope change. | **1.1, 1.2, …** | 🔜 **Active track** |
| **v2 — Personal Life & Finance OS** | `L1`–`L5` | Expands *scope* from "finance app" to "life + finance OS": assets as things, warranties, documents, reminders, maintenance, cross-entity search. | **2.0** | 🌿 Planning (L1 built on branch `p4-assets`, parked) |
| **Out of scope / far future** | — | Bank sync, investments w/ live prices, multi-user households, Postgres, plugins, AI. Conflicts with local-first or is a separate initiative. | — | Vision only |

**Execution rule (agreed with the maintainer):**
1. **Finish the v1.x depth track (`P4.x`) first** — ship it as 1.1/1.2/… These keep
   HomeLedger a great *finance* app.
2. **Then start v2 (`L1`–`L5`)** — the scope-expanding Life-OS. `L1` (assets
   first-class) is already implemented on the parked `p4-assets` branch; it gets
   rebased + merged **only when the v2 track officially starts**, never before.
3. **Out-of-scope items** stay vision-only unless there's real demand and they can
   be done without breaking local-first.

> ⚠️ **Label discipline (this bit caused a mistake once):** a bare "P4"/"P5" ALWAYS
> means the **v1** phase of that number (`## Phase P4 — v1.x incremental depth`),
> **never** a Life-OS phase. The Life-OS track uses `L#`. See
> `.kiro/steering/roadmap-phases.md`.

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
- [x] (Done in the P3 docs pass) Documented "how to add a language" — CONTRIBUTING.md has a two-step **Adding a language** section (create `<code>.ts` typed as `Record<TranslationKey,string>` so the compiler forces full coverage, then add one `locales` entry in `registry.ts`), noting es is canonical and en parity is enforced at compile time + by the i18n parity test.
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

> **⚠️ SUPERSEDED by the per-user category model (see below).** The
> "global, shared, admin-curated system categories" decision above (and the
> P1.10 "system-category edit/delete is admin-only" wiring) caused a real
> contradiction: a regular user could not edit or delete the shared categories,
> so they couldn't switch them to their own language. We changed to a
> **per-user** model: every user gets their OWN copy of the default set (in the
> instance language, keyed by `key`) at sign-up, and can freely rename/retype/
> delete them without affecting anyone else. No shared/system categories remain.
> See **P3 — Per-user categories** below.

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
- [x] Frontend UI for snapshots ✅: admin-only **Backups** tab in `/configuracion` — lists snapshots (name, size, timestamp), a **Create backup now** button (shows how many old ones rotated out), and per-snapshot **Restore** with a destructive-action confirm modal (type `RESTORE`, warns it replaces the whole DB for all users, notes the `.pre-restore` copy, offers reload after). New `lib/api/backup.ts` fns `listSnapshots`/`createSnapshot`/`restoreSnapshot` + `SnapshotInfo` type.

### P1.9 — Restore safety (dry-run / validation)
Import currently wipes all data on confirm. Make it safer.

- [x] Dry-run preview: `BackupService.previewImport(userId, backup)` validates the backup (reusing `validateBackup`) then returns a **non-destructive** summary — `backupCounts` per entity, `currentCounts` per entity (what would be replaced), and `warnings[]` for rows the import would silently skip (orphaned FKs: transactions/subscriptions referencing an account/category absent from the backup). Zero writes. Exposed at `POST /api/v1/backup/preview` (auth'd, per-user, read-only).
- [x] Verified atomic rollback with a test: a validation-passing backup that fails mid-insert (NOT NULL `amount`) leaves the user's original data **fully intact** — no half-restore (the delete+insert are wrapped in one `sqlite.transaction`).
- [x] Destructive-replace guard confirmed: `import` without `confirmed:true` throws `CONFIRMATION_REQUIRED` (409 at the route), covered by an existing test.
- [x] Verified: backend typecheck 0/0, full suite **433/433** (added 4 tests: preview reports+no-writes, orphan warnings, invalid-backup throw, atomicity rollback), frontend build clean.
- [x] Frontend preview ✅: the `/respaldo` import flow now calls `POST /backup/preview` when a file is selected and shows a **dry-run** inside the confirm dialog — a per-entity table of "in backup" vs "current (to be replaced)" counts (zero-rows hidden, replaced counts highlighted) plus the `warnings[]` list — before the destructive confirm. A preview that fails validation surfaces the error and aborts instead of letting the user confirm a bad file. New `lib/api/backup.ts` `previewImport` + `ImportPreview` type.

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
- [x] Frontend admin user-management view ✅: admin-only **Users** tab in `/configuracion` — lists users (name, email, `admin`/`disabled` pills, created), with enable/disable toggle, a reset-password modal (min-8), and a delete-user confirm modal. Backend safety errors (`CANNOT_DISABLE_SELF`/`CANNOT_DELETE_SELF`/`LAST_ADMIN`) surface as inline messages. New `lib/api/users.ts` client. All admin tabs are gated on `userRole === 'admin'` (from `/auth/me`); non-admins never see them.

### P1.11 — Registration control (admin-managed + allowlist)
Registration is currently fully open (anyone can register; confirmed in
`AuthService.register`). On an exposed instance, randoms can create accounts.

- [x] Admin-controlled registration via a persisted `registration_mode` (in a new idempotent `app_settings` table + `SettingsService`): `first_user_only` (safe default), `open`, or `closed`. Admin can change it live; the very first user is always allowed (bootstraps the admin).
- [x] Optional **email allowlist** (`registration_allowlist`): when set and mode is `open`, only listed emails may register (case-insensitive). Enforced in `AuthService.register`.
- [x] **Safe default on fresh install:** `first_user_only` — an exposed instance can't be registered on by randoms out of the box. New error codes `REGISTRATION_CLOSED` / `EMAIL_NOT_ALLOWED` (403).
- [x] Controls surfaced both ways: **env bootstrap** `REGISTRATION_MODE` / `REGISTRATION_ALLOWLIST` seeds settings on first run (never overrides a later admin change), and **admin API** `GET/PUT /api/v1/users/registration` (`requireRole(['admin'])`) to read/update at runtime. Documented across `.env.example`/README/Dockerfile/compose/HA.
- [x] Verified: 4 policy tests (first-user allowed + second blocked under `first_user_only`; `closed` blocks; `open`+allowlist enforces listed-only, case-insensitive; `open` w/o allowlist allows any). Full suite 438/438, typecheck 0/0, build clean.
- [x] Frontend admin settings UI for registration ✅: admin-only **Registration** tab in `/configuracion` — a radio group for the mode (`first_user_only` / `open` / `closed`) each with a description, plus an allowlist editor (one email per line, split on newline/comma → `string[]`) shown only in `open` mode, saved via `PUT /users/registration`. The same tab also makes the **instance currency** admin-editable (a `<select>` of supported currencies → `PUT /users/currency`, applied to the UI immediately) — this upgrades the P1.13 read-only picker to editable for admins (regular users still see it read-only in their profile tab).

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

> **Real multi-currency (per-currency totals and/or FX conversion) is explicitly a post-1.0 feature** — tracked as **P4.11** in the v1.x depth track. It requires a currency dimension on every aggregation plus assets/liabilities, and (for conversion) exchange-rate sourcing, which conflicts with local-first defaults (so any auto-fetch stays optional/off-by-default).

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

- [~] Frontend test suite — **foundation done** (was ZERO tests). Set up Vitest for the frontend: `packages/frontend/vitest.config.ts` (SvelteKit Vite plugin so `$lib/*`/`$app/*` resolve + `jsdom` for `window`/`localStorage`, pinned `root`), and converted the root `vitest.config.ts` to **projects** (`backend` = node env, `frontend` = its own config) so `npm run test` runs the whole monorepo correctly (**475 tests: 447 backend + 28 frontend**) and `npm run test -w packages/frontend` runs it standalone. Added `test`/`test:watch` scripts to the frontend package and `jsdom` dev-dep. Initial tests cover the highest-value pure/near-pure logic: `format.ts` (currency grouping/negatives/zero/2dp, currency-from-localStorage + fallbacks, `formatDateShort` local-parse-no-UTC-shift, days-remaining, datetime-local), the i18n registry (locale guard/Intl-tag fallback/picker options) **and a permanent es↔en key-parity + placeholder-consistency guard** (replaces the throwaway parity script), and the API client token management + `ApiError` (mocking `$app/environment` `browser`). 
  - [x] (Follow-on) Component/DOM smoke tests ✅ — added `@testing-library/svelte@5` (+ `jest-dom`, `user-event`) and covered the highest-value user flows by mounting the real components and driving them through the DOM: **login** (7 tests — field render, client-side validation gating the API call, email trim, success → tokens stored + `getMe` + `goto('/dashboard')`, `INVALID_CREDENTIALS` message, non-`ApiError` connection error), **quick register / create transaction** (5 tests — no-accounts empty state, invalid-amount gating, the full 3-step keypad→selectors→confirm flow posting to `/transactions/quick`, the named-transaction path posting to `/transactions`, and API-error surfacing), **backup** (6 tests — export builds a blob URL + success toast, export error, file-select opens the confirm dialog with the dry-run preview counts + warnings, confirm calls `importBackup(_, true)` + reloads history, cancel closes without importing), and the reusable **`Dropdown`** (4 tests — label, open/list options, select updates bound value + closes, Escape closes). **22 new tests → 50 frontend / 508 total.**
    - Test-infra work this needed (documented so it's reproducible): jsdom lacks `matchMedia`, the Web Animations API (`element.animate`), and object-URL plumbing → polyfilled in `vitest-setup.ts`; Svelte components must load their **client** build under Vitest (`resolve.conditions: ['browser']`) or mounting throws `lifecycle_function_unavailable`; `@testing-library/svelte`'s `.svelte` scaffold must be inlined (`server.deps.inline`); css-based motion transitions are mocked to instant no-ops in dialog/dropdown tests so unmount is synchronous; and jest-dom matchers are surfaced to `svelte-check` via `src/vitest.d.ts`. **The SvelteKit Vite plugin can't be nested as a Vitest project from the repo root** (it resolves `$lib/*` + `src/app.html` against `process.cwd()`), so the root `test` script now runs backend/shared from the root then the frontend suite from `packages/frontend` (`vitest run && npm run test -w packages/frontend`).
    - Playwright e2e still deferred (needs a running instance + browser binaries); the mount-and-drive coverage above exercises the same flows headlessly.
- [x] Receipt OCR accuracy review ✅ (regex/heuristic best-effort — audited, pinned with tests, one real bug fixed). The parse pipeline is: CFDI/XML → structured attribute extraction (confidence 1); PDF → `pdftotext -layout` embedded text; scanned PDF/image → `tesseract.js` (spa+eng) OCR; then a shared plain-text heuristic pass. Reviewed each heuristic and made the pure parsers (`numberValue`, `moneyValue`, `ocrDroppedDecimals`, `parseDate`, `parseCfdi`, `parsePlainText`) exportable + covered them with **35 unit tests** (`receipt.parser.test.ts`) across realistic receipt/CFDI/OCR inputs.
  - **Bug fixed:** the `TOTAL` regex matched item-count lines like `TOTAL ARTICULOS: 3` / `TOTAL DE PIEZAS 5`, capturing the count (3) as the receipt total. Now it prefers the explicit money forms (`TOTAL A PAGAR` / `IMPORTE TOTAL` / `GRAN TOTAL`) and the plain-`TOTAL` fallback uses a negative lookahead to skip count nouns (ARTÍCULOS/ITEMS/PIEZAS/PRODUCTOS). Still avoids matching the `TOTAL` inside `SUBTOTAL`.
  - **Confirmed-correct heuristics (documented via tests):** separator disambiguation (`1.234,56` EU vs `1,234.56` US vs bare `1,234`/`1.234` thousands vs `114,75` decimal), OCR dropped-decimal recovery (`11475`→`114.75` only when no sizable token carries a separator, gated to ≥3-digit separator-less integers), date normalization (ISO / dd-mm-yyyy / 2-digit-year → ISO, zero-padding), CFDI attribute + entity decoding + line items, and the confidence tiers (cfdi 1.0 > pdf_text 0.65 > ocr 0.5, dropping to 0.2 when no total is found).
  - **Known tradeoff (left as-is, documented):** the dropped-decimal recovery can misread a genuinely separator-less round amount (e.g. OCR text `500` meaning 500 pesos) as `5.00`. This is inherent ambiguity with no reliable signal; users can correct any field via the existing `PATCH /receipts/:id`. A full accuracy overhaul (layout-aware parsing / an OCR model) is out of scope for 1.0.
  - Verified: backend typecheck 0/0, full suite **543 passing** (493 backend + 50 frontend), backend build clean.
- [~] Accessibility pass — **static pass done ✅; manual assistive-tech verification remains.**
  - [x] aria-label i18n (deferred from P1.3) — done in **P3.A** (~40 labels → `a11y.*`/`common.*`).
  - [x] Reduced-motion / transparency / contrast foundations — done in **P3.A**.
  - [x] **Label semantics** — fixed 6 mis-used `<label>` elements that labelled a group/listbox/custom component instead of a form control (`a11y_label_has_associated_control`): registro-rapido account/category selectors (the `role="listbox"` already carries its own `aria-label`), presupuestos allocations header, and the dashboard edit-tx/edit-tf date + attachments headings → converted to `<span>` (styling preserved via classes). All 6 `svelte-ignore` suppressions removed; svelte-check stays 0/0, confirming they were real fixes, not re-suppressed.
  - [x] **Discernible button names** — added `aria-label` to ~13 icon/symbol-only buttons that had none (the `×`/`&times;` modal-close and alert-dismiss buttons in transferencias, transacciones, and dashboard; the `↓` attachment-download buttons, which also swapped a hardcoded Spanish `title` for `$t('common.download')`). Reused `common.close`/`common.download` (added `common.download`, es/en parity 1030).
  - [x] **Keyboard Escape-to-close** — audited every modal: several relied on backdrop-click dismiss with **no** Escape path (transferencias ×2, dashboard ×5, patrimonio, recibos ×2, configuracion password + the 3 admin modals, and 4 of transacciones' 5 modals). Added `<svelte:window onkeydown>` Escape handlers so every modal is keyboard-dismissable (matching the existing reglas/prestamos pattern). The backdrop-click `svelte-ignore` suppressions are **intentional and justified** — every such modal now has both an Escape path and a labelled visible close button.
  - [x] **Color-contrast measured against WCAG AA (against the running instance)** ✅ — computed real contrast ratios for every text/surface/accent token pair in both themes (relative-luminance / WCAG 2.1 formula). **Fixed the clear failure:** `--text-muted` was below AA for small text on cards/elevated surfaces in **both** themes (dark 3.3–4.0:1, light 2.8–3.2:1; AA needs 4.5:1). Retuned to `#7c8ba3` (dark → 4.6–5.5:1 on all surfaces) and `#616e88` (light → 4.5–5.1:1 on surface/elevated/card), preserving the muted look. Also fixed stale `app.html` shell metadata surfaced during the audit (description/apple-title `Smart Finance`→`HomeLedger`, `theme-color` `#191919`→ the real dark canvas `#0b1118`).
    - **Documented, NOT auto-fixed (needs a design decision, flagged for the user):** (a) white text on the **solid green/orange action buttons** (`.btn-submit`/`.btn-green`/`.btn-export`, import button, toast) is ~2.2–2.6:1 vs the 3:1 UI-component minimum — fixing means either deepening those accents (which also darkens the many progress-bars/dots/indicators that share the token and read fine) or adding a scoped "on-solid" button color; (b) `--accent-orange`/`--accent-yellow` used as **small text** on plain card surfaces (eyebrows, warn stat-values, progress %s, import/backup warnings) sit at ~2.6:1 — most orange/yellow text is on tinted `--tag-*-bg` chips (fine), but these few on-surface usages miss AA. Both are palette-level decisions best made deliberately rather than reshading the brand mid-polish.
  - [ ] **Remaining (manual, needs assistive tech I can't drive):** full **focus management** (move focus into a dialog on open, trap it, return it to the trigger on close — needs runtime testing), screen-reader walkthrough (NVDA/VoiceOver), and full keyboard-only navigation. Semantic structure and the live-served markup (`<html lang>`, landmarks, labelled controls, `role="alert"`/`status`) were verified statically + against the running instance.
  - Verified: frontend typecheck **0 errors / 0 warnings** (svelte-check a11y lint), build clean, i18n parity 1030/1030.
- [x] Performance check with a large dataset ✅. Built a repeatable benchmark harness (`packages/backend/scripts/perf-bench.ts`, run `npx tsx scripts/perf-bench.ts [N]`) that seeds N transactions over ~2 years into a throwaway DB and times the real service methods + dumps `EXPLAIN QUERY PLAN`.
  - **Baseline @ 20k transactions** (avg ms/op): calculateBalance 1.08, accounts-list (10 balances) 9.1, dashboard 9.8, net-worth 9.0, tx list+route N+1 1.07, category analysis 5.1, cashflow(2y) 11.4, trends 5.3, budgetVsActual 9.0, CSV export(16k rows) 24.5. **Everything was already well under ~25ms** — for a local-first single-household app, 20k transactions is years of data, so nothing was a user-perceptible problem. Resisted over-engineering.
  - **One targeted fix (data-justified):** `EXPLAIN` confirmed `AccountService.calculateBalance`'s per-account income/expense SUMs (filter `account_id AND type`) used only `transactions_account_id_idx` and filtered `type` row-by-row. Added a composite **`transactions(account_id, type)`** index (migration `0006` + `schema.ts`, `CREATE INDEX IF NOT EXISTS`, purely additive). Since `calculateBalance` runs in N+1 loops on the three hottest endpoints, the win compounds — **@ 20k: calculateBalance 1.08→0.73ms (−32%), accounts-list 9.1→5.8 (−36%), dashboard 9.8→6.8 (−31%), net-worth 9.0→6.0 (−33%)**; EQP now shows `USING INDEX transactions_account_id_type_idx (account_id=? AND type=?)`. The `list`, monthly-sum, and category GROUP BY queries already used the right indexes (`transactions_user_id_date_idx`), so no change needed.
  - **Deliberately NOT changed (documented follow-ups, not 1.0 blockers):** (a) the per-account N+1 in dashboard/accounts/net-worth (calling `calculateBalance` in a loop) — a single set-based query summing all accounts at once would cut it further, but 6–7ms for a full dashboard at 20k doesn't justify rewriting working, well-tested balance logic now; (b) the transaction-list route's per-row account/category name lookups (2×pageSize queries) — negligible at pageSize ≤ 100 (~1ms); (c) `strftime`-based month grouping in cashflow/trends isn't index-friendly for the grouping step but the range filter is indexed and totals stay <12ms. Revisit only if a real deployment reports slowness.
  - Verified: backend typecheck 0/0, full suite **486/486** (migration 0006 applies cleanly on fresh DBs), balances unchanged (pure index addition).
- [x] End-to-end docs: deployment, backup/restore, upgrade, HA setup ✅. README already covered install/env/recovery/upgrade/HA thoroughly; added a dedicated **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** for the production-operations gaps and linked it from the README (new "Deployment & operations" section). Covers reverse-proxy+HTTPS (below), the **three backup mechanisms** (per-user JSON export/import with preview, admin automated gzip whole-DB snapshots + in-app destructive restore with `.pre-restore` safety copy, and volume-level tar) with a "which one when" table, and upgrade/rollback + account-recovery pointers.
- [x] Reverse-proxy deployment examples with HTTPS (Nginx / Traefik / Caddy) ✅. Copy-pasteable TLS configs in docs/DEPLOYMENT.md: Caddy (automatic HTTPS), Nginx (+ Let's Encrypt/certbot, `client_max_body_size` for attachments, `X-Forwarded-Proto`), Traefik (compose labels with cert resolver), plus the `TRUST_PROXY=true` / `CORS_ORIGIN` wiring and the anti-IP-spoofing caveat. DOCKER.md's old HTTP-only snippet now points to the fuller doc.
- [x] `CONTRIBUTING.md` + issue/PR templates ✅. Added **CONTRIBUTING.md** (prereqs, setup, dev servers, the verify commands, project layout, conventions incl. migrations/backup-import/env-var rules, and a two-step **"Adding a language"** guide) + `.github/ISSUE_TEMPLATE/` (bug_report, feature_request, config.yml) + `.github/pull_request_template.md` (with the verify checklist). Linked from the README ("Contributing" section). Also fixed stale `github.com/irving1flores/homeledger` repo URLs in DOCKER.md → `TastingRogue/HomeLedger` (Docker Hub image name left as-is).
- [x] CSV export of transactions ✅ (spreadsheet-friendly, separate from the JSON backup). **Server-side** so the FULL filtered dataset exports (not just the paginated page): `GET /api/v1/transactions/export.csv` (per-user auth, literal path so it never collides with `/:id`) reuses the same query filters as the list route via a new `TransactionService.listAllForExport` (all matching rows, account/category names via joins, date desc). CSV is built with a pure, unit-tested `utils/csv.ts` (`toCsv`) doing RFC-4180 escaping (quote fields with comma/quote/CR/LF, double internal quotes, CRLF rows), columns `Date,Name,Type,Amount,Account,Category,Notes`, served as `text/csv; charset=utf-8` with a `Content-Disposition` attachment filename and a **UTF-8 BOM** so Excel renders accents. Frontend: `exportTransactionsCsv(filters)` (via `apiFetchBlob`) + an **Export CSV** button in the transactions filter bar that respects the current active filters and downloads the file (disabled when there are no rows). i18n `transactions.export_csv`/`export_error` (es/en parity 1029). Verified: backend typecheck 0/0 + suite 486/486 (10 CSV-helper tests + a route-wiring 401 test), frontend typecheck 0/0 + build clean.
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
- [x] **P3.F — Typography scale (size-specific tracking/leading) ✅ (done).** Added a tracking/leading token set to `app.css` `:root` (theme-agnostic) per apple-design §15: `--tracking-display: -0.02em`, `--tracking-heading: -0.01em`, `--tracking-body: 0`, `--tracking-label: 0.04em`, `--tracking-wide: 0.06em`; `--leading-tight: 1.1`, `--leading-heading: 1.2`, `--leading-body: 1.5`. Applied as **base element defaults** (low specificity, so per-page styles still win): `h1` gets display tracking (`-0.02em`) + tight leading, `h2` heading tracking + `1.2` leading, `h3/h4` heading tracking; `body` uses the body leading/tracking tokens; the shared uppercase `.form-field/.field label` rule now uses `--tracking-label` instead of a hardcoded `0.03em`. Result: larger text is tighter, body sits at `0`, uppercase micro-labels get a positive bump — applied app-wide (previously only reglas/prestamos/layout hand-rolled tracking on a couple of elements; those values remain compatible). Layout scaling with text is preserved (font-size stays the responsive `rem` clamp; only spacing-neutral tracking/leading changed). Verified: frontend typecheck 0/0, build clean, i18n untouched.
- [ ] (Optional / post-1.0) **P3.G — Gesture layer.** Swipe-to-dismiss mobile sidebar, swipe actions on transaction/list rows, calendar swipe — 1:1 pointer tracking + velocity handoff + rubber-banding. Pure "feel" polish; explicitly a nice-to-have, not a 1.0 blocker.

> Priority: **P3.A is 1.0-worthy** (reduced-motion is a genuine accessibility gap). P3.B–P3.F are 1.0-if-time / 1.1 craft. P3.G is post-1.0. All are additive polish on an already-functional UI.

- [x] **P3.H — Runtime visual-craft review (from live screenshots) ✅ (done).** A pass over all app views running in Docker against the apple-design skill, fixing what static analysis couldn't surface:
  - **Bug — "NaN días" in Subscriptions:** `getDaysRemaining` did `new Date(nextPaymentDate + 'T00:00:00')`, which produced an invalid date (→ `NaN días`) when `nextPaymentDate` was a full ISO datetime rather than a bare `YYYY-MM-DD` (Internet Izzi/Gym showed "Nañ días"). Now splits off the date part first and guards `NaN`. (apple-design §16 Craft — broken data display erodes trust.)
  - **Tabular figures:** added a global `font-variant-numeric: tabular-nums` rule to `app.css` scoped to the app's established money-value class hooks (`.sc-value`, `.amount`, `.month-total`, `.a-value`, `.stat-value`, `.item-amount`, `.num`, `.card-balance`, etc.) so digits align in lists/columns/stat cards and don't jitter in width as values change — the right default for a finance app (§16 Craft).
  - Verified: frontend typecheck 0/0, build clean.
  - **Flagged, NOT auto-changed (need your call — they're data/product decisions, not code bugs):**
    - **Categories show mixed es/en names** (e.g. "Supermercado" *and* "Groceries", "Salud" *and* "Health") — the demo backup was imported into an instance seeded in a different language, so both the seeded English system set and the imported Spanish set coexist. Not a rendering bug; it's overlapping data. Fix is a data decision (dedupe/delete one set), not a UI change.
    - **Alerts header stray "ℹ" bubble** — a small info affordance next to the title reads as visually loose; worth confirming intent before restyling.

- [x] **Per-user categories ✅ (done) — supersedes the P1.5/P1.10 shared-category model.** Fixed the contradiction where users couldn't edit/delete the shared "system" categories (so couldn't localize them). Now **every user gets their own copy** of the default category set (in the instance language, keyed by `key`) at account creation, and can freely rename/retype/delete their own — no shared/system categories exist.
  - `seed.ts`: replaced global `seedCategories()` with `seedCategoriesForUser(userId, locale?)` (inserts the set with `userId`, `isSystem:false`, key preserved). Wired into **all** user-creation paths: `AuthService.register`, the env-bootstrap admin (`seedAdminUser`), and the CLI `create-admin`.
  - Uncategorized lookups (`ImportService.getDefaultCategoryId`, `RulesEngineService.applyToUncategorized`) now resolve the **user's own** `uncategorized` by `(userId, key)`.
  - FK-ownership checks in transaction/subscription/budget services simplified from "system OR owned" to just **owned** (`categories.userId = ?`).
  - `CategoryService`: `list` returns only the user's; `update`/`delete` dropped the `isSystem`/admin-only guard (any owned category is freely editable/deletable; the has-transactions delete block stays); dup-name checks scoped to the user. Removed the `role` plumbing and dead `CANNOT_EDIT/DELETE_SYSTEM_CATEGORY`/`FORBIDDEN` paths. Frontend `categorias` page: removed the "System" badge + dead `systemCategories`/`userCategories` split — every category is now editable.
  - **Schema/migration 0007:** `categories.user_id` is now `NOT NULL` + a unique `(user_id, key)` index (prevents duplicate seeding). SQLite table-rebuild migration; verified it applies clean on a fresh DB producing the right schema.
  - **Backup compatibility:** import forces `isSystem:false`; child rows (transactions/splits/subscriptions/budget-categories) whose `categoryId` isn't in the backup now fall back to the user's `uncategorized` category (auto-created if absent) instead of being silently dropped — so old global-model backups keep their rows.
  - **Data note:** the existing demo DB was **reset** (Camino 2 — no legacy data migration; it held demo data only). Fresh installs and new users get the per-user model directly.
  - Verified: backend typecheck 0/0, **full suite 486/486** (reframed the category/subscription/rules/auth tests off the shared model to per-user), frontend typecheck 0/0, build clean, i18n parity 1029/1029.

---

## Phase P4 — v1.x incremental depth (the active post-1.0 track)

> **Horizon: v1.x** (ships as 1.1, 1.2, …). This is the **current active track** —
> do these before starting the v2 / Life-OS (`L#`) work. These make HomeLedger a
> *deeper finance app* **without changing its scope** — it's still a personal-finance
> app, just more powerful. None require internet; all operate on local data /
> user-provided files. Status marks are vs. current code.
>
> The sub-items (`P4.1`…`P4.14`) are **independent** and can ship in any order across
> point releases; pick by value/effort. They are NOT a strict sequence.

### P4.1 — Richer transaction model
Today a transaction has name, amount, type (`Ingreso`/`Gasto`), date, notes,
account, category, optional subcategory. Missing the fields that make ledgers
powerful.

Shipped in **3 phases** (branch `p4.1-richer-transactions`). ✅ **All phases done.**
- [x] `merchant` / payee, separate from the free-text name/notes ✅ (Phase 1)
- [x] Tags (many-to-many) ✅ (Phase 2) — real `tags` + `transaction_tags` tables (migration `0009`), reusable per-user catalog, `addTag` rule action now writes to the M2M (was concatenating into `notes`), tag CRUD + `PUT /transactions/:id/tags`, list filter by tag, chip UI in the form + detail panel, backup round-trips both tables
- [x] `reconciled` / cleared flag (per transaction) ✅ (Phase 1)
- [x] `pending` vs `posted` status ✅ (Phase 1, default `posted`)
- [x] External transaction id (for import matching) ✅ (Phase 1; importers now map the bank `reference` → `externalId`)
- [x] **Duplicate detection** ✅ (Phase 1; dedupe on `externalId` when present, else the date+amount+name heuristic)
- [x] Transaction audit history (who/when changed what) ✅ (Phase 3) — `transaction_audit` table (migration `0010`) records created/updated/deleted with a JSON field-level diff; `GET /transactions/:id/audit` + collapsible history in the detail panel
- [x] More types beyond Ingreso/Gasto: refund, reimbursement, adjustment ✅ (Phase 1) — resolved as a `subtype` **flag** (not a new `type`), so balance sums by `type` are unaffected

Phase 1 details (migration `0008_richer_transactions`, additive `ALTER TABLE`):
added `merchant`, `subtype`, `reconciled`, `status`, `external_id` to `transactions`
(+ a `(user_id, external_id)` index); validators, service create/update + new list
filters (reconciled/status/subtype), CSV export gains a Merchant column, importer
wires `reference`→`externalId` + `description`→`merchant` and dedupes on `externalId`;
frontend form gets a collapsible "more details" section + detail-panel display + es/en
i18n. Backup round-trips the new scalars automatically (full-row export + spread import).

Phase 2 details (migration `0009_tags`): `tags` (per-user catalog, unique name per
user) + `transaction_tags` (M2M, composite PK). New `TagService` (get-or-create,
set/attach/detach, bulk-map for lists). Rules-engine `addTag` rewritten to use the
M2M. New `tagRoutes` (`/api/v1/tags` CRUD) + `PUT /transactions/:id/tags`; list gains
a `tagId` filter and enriches each row with its tags (bulk, no N+1). Frontend: tag-chip
input in the form, chips in the detail panel, `Tag` type + API client. Backup: both
tables exported/imported with FK remap (txMap + new tagMap); backup version → 1.1.0.

Phase 3 details (migration `0010_transaction_audit`): `transaction_audit` (nullable
`transaction_id` with **ON DELETE SET NULL** so a `deleted` row survives its
transaction; `action` created/updated/deleted; JSON `changes` diff). `TransactionService`
create/update/delete each write an audit row inside their existing atomic tx (update
logs only the changed fields; delete snapshots before removal). `GET /transactions/:id/audit`
+ a lazily-loaded, collapsible "change history" in the detail panel (from→to per field).
Backup exports/imports the audit table (transactionId remapped via txMap, null kept null).
**P4.1 is now complete.**

### P4.2 — Credit card modeling
Credit accounts exist (`type: 'Crédito'` + `creditLimit`, and utilization shows
on the dashboard/alerts 🟡), but statement-cycle modeling is missing.

✅ **Done** (branch `p4.2-credit-cards`, migration `0011_credit_statement`).
- [x] Statement balance, minimum payment, payment due date, statement closing date ✅ — added `statementDay`, `paymentDueDay`, `apr`, `minimumPayment` to `accounts`; `GET /accounts/:id/statement` derives owed / available credit / utilization / next statement + due dates
- [x] APR / interest tracking ✅ — `apr` field, surfaced in the statement summary (informational)
- [x] Payment handling that never double-counts ✅ — **fixed a real balance bug**: the credit branch of `calculateBalance` inverted transfer signs, so a payment (transfer into the card) was recorded as MORE debt. Unified the formula (negative balance = debt for all types) in both `account.service.ts` and the mirror in `transfer.service.ts`; a CC payment is a transfer (checking ↓, card debt ↓), never an expense
- [x] Payment history + available credit surfaced clearly ✅ — the account detail drawer shows amount owed, available credit, utilization, next statement/due dates, APR, min payment, and the payment history (transfers into the card)

### P4.3 — Envelope budgeting (Actual-style)
Budgets exist (monthly/weekly, per-category, progress 🟡). Upgrade toward
envelope budgeting.

Built in phases on `p4-feature-depth`.
- [x] "Available to spend" / assign-what-you-have model ✅ (Phase B, light) — `getSummary` now aggregates period income (`type='Ingreso'` in the budget range) and exposes `totalIncome` + `unassigned` (income − allocated); the budgets summary row shows Income and an "Unassigned" indicator (negative = over-allocated). Kept as an informative indicator, not a full YNAB pool (per the "simplicity outranks features" principle)
- [x] Rollover / carry-over of unspent budget ✅ (Phase A) — persisted `rolloverEnabled` + `alertThreshold` on `budgets` (migration `0012`; were accepted by the API but silently dropped before); rollover is no longer wiped to 0 on edit; the monthly cron only rolls over budgets with the flag on; form gets a rollover toggle + threshold field + a card badge
- [x] Budget by tag (in addition to category) ✅ (Phase C) — new `budget_tags` table (migration `0013`, mirrors `budget_categories`) keyed by the P4.1 tags; spent-per-tag computed by joining `transaction_tags`; a budget can allocate by category and/or tag; totals, rollover, and backup all include tags; form gains a "tag allocations" section and the card shows per-tag progress
- [ ] Overspending indicators + alerts _(Phase D — wire `evaluateAlerts` to a job/route, align with AlertService)_

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

## Out of scope / far future — big, optional, NOT in the local-first core

> **Horizon: out of scope / far future** (NOT the same as "v2" — the real v2 is the
> `L#` Life-OS track below). Tracked for vision, but these either conflict with
> local-first or are large separate initiatives. Not required for 1.0.0, not part of
> the v1.x depth track, and not part of the planned v2. Build only on real demand and
> only if it can be done without breaking local-first.

- **Automatic bank sync** (Plaid / SimpleFIN / per-bank): OUT of the core — it
  transmits financial data to a cloud service, conflicting with local-first. If
  ever built, it MUST be an opt-in, off-by-default plugin the user enables, with
  the manual/file-import path remaining the default. (Note: Plaid does not cover
  Mexican Transactions, so it can't be "the" solution anyway.)
- **Investments / portfolio** (brokerage, retirement, crypto, ETFs, FIBRAs,
  CETES, dividends, allocation, performance): large separate initiative. If
  built, must be **manual-entry-first**; any live price fetch is optional and
  user-enabled only. A strong differentiator, but a separate initiative beyond the
  planned v2 (Life-OS) — not a 1.0 or v1.x item.

### Explicitly NOT doing (scope guard)
Trading / buying-selling securities · payment processing · issuing loans · own
banking · credit scoring · crypto exchange · full business accounting · payroll ·
full business invoicing. These turn HomeLedger into a fintech/accounting company
instead of an excellent personal-finance app.

---

## Definition of Done for v1.0.0

All P0 checked, and P1 substantially done:

- [x] All tests pass (backend green; basic frontend coverage) ✅ — **549 passing** (499 backend/shared + 50 frontend). Frontend has real coverage: pure-logic tests (format/i18n/API-client) **plus** component/DOM smoke tests on the critical flows (login, create-transaction, backup, Dropdown). Backend includes the receipt-parser suite, the backup multi-table isolation test, and the `parseTrustProxy` suite. `npm run test` runs the whole monorepo green.
- [x] Backup export/import round-trips reliably, multi-user safe, includes receipts ✅ — audited the full path. **Per-user & multi-user safe:** `BackupService.import` runs inside one `sqlite.transaction`, deletes only the caller's rows (`WHERE user_id = ?` on every table, child-first) and re-inserts with **fresh autoincrement ids + full FK remapping** (old→new id maps for categories/subcats/accounts/tx/transfers/subs/budgets/loans/attachments/analyses), so a backup whose ids overlap another user's rows can't collide or clobber them; the caller's `userId` always comes from the auth token (`request.user.userId`). The truly global whole-DB restore is a *separate* admin-only snapshot route (`requireRole(['admin'])` + confirm + `.pre-restore` copy). **Receipts included:** attachments carry the binary inline as base64 (rewritten to disk under a fresh UUID on import), `receipt_analyses` + `receipt_items` exported/re-inserted column-aware with `attachment_id`/`transaction_id`/`analysis_id` remapped. **Versioned:** backup carries `version`/`exportedAt`; `validateBackup` rejects a mismatched **major** version and non-array data fields; `previewImport` is a non-destructive dry-run. **Tests (26 in `backup.service.test.ts`):** empty/populated export, export isolation (no other-user data), atomic replace, plain round-trip, **attachment+binary-file+receipt round-trip with remapped FKs**, id-collision isolation (other user's colliding row survives), **new multi-table isolation test** (a bystander user's category/account/transaction/goal all survive intact after another user imports), atomic rollback on mid-import failure, and full `validateBackup`/version/preview coverage.
- [x] Verified upgrade path from a prior version with no data loss ✅ (mechanism verified; note: 1.0.0 is the first public release, so "prior version" = an existing dev/self-hosted DB on an earlier migration). Migrations run automatically at startup via Drizzle's `migrate()` (tracked in `__drizzle_migrations`, so only *pending* ones apply, in order), plus a guarded, `table_info`-checked additive reconciliation for the `attachments` `transfer_id`/`original_name` columns + index that is safe whether they already exist or not. **Verified locally:** ran startup twice against a populated throwaway DB — 8 migrations applied on the first run, **0 re-applied** on the second (idempotent), and a seeded user row survived the second `migrate()` pass; all 24 expected tables present. The one intentionally non-preserving step was `0007_per_user_categories` (drops the old shared/global categories), a deliberate pre-1.0 clean-slate decision documented under "Per-user categories" — accepted because there is no prior *released* version whose category data must migrate.
- [x] Production refuses/loudly warns on insecure defaults; rate limiting correct behind proxy ✅ — `assertSecureStartup` (in `security-check.ts`, called at the top of `start()` **before** building the app or touching the DB) **throws and aborts boot** in `NODE_ENV=production` when `JWT_SECRET`/`ADMIN_PASSWORD` are a known demo value / too short / unset, unless `ALLOW_INSECURE_DEFAULTS=true` (the zero-config demo image's opt-in), in which case it logs a loud ⚠️ warning; outside production it always warns-only. Rate limiting (`@fastify/rate-limit`: 1000/min global, 10/min on auth) keys on `request.ip`, and `request.ip` is derived from `X-Forwarded-For` only when the operator sets `TRUST_PROXY` — parsed by `parseTrustProxy` (extracted to `config/trust-proxy.ts`), **OFF by default** so a direct client can't spoof its IP. Tested: `security-check.test.ts` (4 branches: prod-throws, prod+flag-warns, dev-warns, secure-passes + `collectSecurityIssues` cases) and new `config/trust-proxy.test.ts` (5: default-off, false/0, true/1, hop-count/CIDR passthrough, trimming).
- [~] Multi-arch image (amd64 + arm64) actually runs on target hardware — **build pipeline verified, runtime-on-hardware still needs a maintainer check.** `.github/workflows/docker-build.yml` builds each arch **natively** (`ubuntu-latest` for amd64, `ubuntu-24.04-arm` for arm64) and pushes by digest, then a `merge` job assembles the multi-arch manifest and runs `imagetools inspect` — this is the correct pattern that sidesteps the QEMU-hangs-on-`better-sqlite3` problem. **Remaining (needs the maintainer, can't be done from here):** actually `docker pull` + run the arm64 image on real arm64 hardware (e.g. a Raspberry Pi / HA OS on arm64) and confirm it boots + serves.
- [x] API `/api/v1` and backup format explicitly frozen as stable ✅ — added **[docs/STABILITY.md](docs/STABILITY.md)** declaring, as of 1.0.0 under SemVer: the `/api/v1` routes/methods, the `{success,data}`/`{success,error:{code,message}}` envelope, existing field names/types and `error.code` values, and the backup format (`{version,exportedAt,userId,data}` + its entity arrays, self-contained base64 attachments) are **stable — no breaking changes within `1.x`**. It spells out what's additive/non-breaking (new endpoints/fields/codes, wording), what forces a `2.0.0` (removals/renames/type changes; a backup a `1.x` importer can't read), and the parallel-namespace policy (`/api/v2`). Enforced in code by `validateBackup`'s major-version gate; linked from the README API section.
- [x] CHANGELOG updated; version bumped to 1.0.0 across all manifests ✅ — bumped **all 8 locations** from the checklist below: root `package.json`, `packages/{backend,frontend,shared}/package.json`, `APP_VERSION` in `backup.service.ts` (now exported + referenced by the backup tests so it never drifts), `ha-addon/config.yaml`, HA `manifest.json`, and `sw_version` in HA `sensor.py`/`binary_sensor.py`. Added a `## [1.0.0]` CHANGELOG section (Added/Changed/Fixed/Security summarizing the P0–P3 hardening) + its release link. Verified: backend+frontend typecheck 0/0, full suite **549 passing** (backup tests updated to the new major so old `0.1.0` fixtures don't trip the compatibility gate), all three workspaces build clean. **Left to the maintainer:** `git tag v1.0.0`, push, confirm the CI multi-arch build is green, and cut the GitHub Release.

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

---

## v2 — Personal Life & Finance OS (`L#` track — vision + phased plan)

> **Horizon: v2** (ships as **2.0**). This is the scope-expanding track: HomeLedger
> grows from a *finance app* into a *life + finance OS*. **Start this only after the
> v1.x depth track (`P4.x`) is shipped** — see the horizon map at the top.
>
> Status: **planning** (not started, except `L1` which is built and parked on branch
> `p4-assets`). Direction agreed with the maintainer. Every phase below is
> **additive** — it extends the stable `/api/v1` surface and the versioned backup
> without breaking Finance, and keeps the product's principles: local-first,
> self-hosted, **no AI required**, deterministic logic, privacy-first.

> ⚠️ **Naming — read before starting any work here.** The phases in THIS section are
> **v2 / post-1.0** and are labeled **`L1…L5`** (L = Life-OS). They are a **separate
> track** from the v1 phases labeled **`P0…P5`** (see `## Phase P0`…`## Phase P5`
> above). A bare "P4"/"P5" ALWAYS means the **v1** phase of that number, never a
> Life-OS phase. **Do not start any `L#` work unless the maintainer asks for it by its
> `L#` name.** (This section previously reused `P4…P8`, which collided with v1's `P4`
> and caused work to start on the wrong track — hence the `L#` renumber.)

### ⭐ Non-negotiable: Finance is the core; Home/Life are opt-in

The maintainer's explicit position, and the hard constraint on every phase below:

- **Finance is and stays the heart of HomeLedger.** Dashboard, accounts,
  transactions, budgets, goals are the default experience. A user who only wants to
  track money must never feel the app got heavier or more complicated.
- **Home/Life are optional and non-intrusive.** They must not clutter the primary UI.
  Follow **progressive disclosure** (UX §17): a user who never touches Assets/
  Documents/Warranties should barely know they exist. Prefer surfacing them **inside
  the object they belong to** (e.g. a "Warranty" tab on an asset, an "asset" link on
  a transaction) over adding top-level noise. Any new top-level nav must be
  hideable/collapsible, and ideally off or minimized by default.
- **Every relationship is optional.** You can use transactions forever without ever
  creating an asset. Nothing in Money depends on Home or Life.
- **Simplicity outranks features** (`Privacy > Simplicity > Ownership > Reliability >
  Features`). If a phase makes the finance experience feel busier, it's wrong —
  redesign it or drop it.
- **Ship incrementally and re-evaluate.** Treat L1+L2 as a candidate **1.1** and
  test with real users whether the app still *feels* simple **before** doing L3+.
  Stopping after net-worth-grade Assets (and never shipping full Life Admin) is a
  legitimate, on-brand outcome. Documenting the vision is **not** a commitment to
  build all of it.

### The idea, in one line

Evolve HomeLedger from a personal-finance tracker into a **Personal Life & Finance OS**:
one private place for your **Money**, your **Home** (the things you own) and your
**Life** (documents, renewals, maintenance, subscriptions). These are **not three
separate apps** — they are **three views of one data graph whose central node is the
Asset (the thing you own / the responsibility you have)**.

The differentiator (no competitor does all three around the object): the same
purchase can be a **transaction** (Money), an **asset** with a value (Home →
net worth), and carry a **document/warranty/maintenance/renewal** (Life). Example
— one car touches all three:

```
                        CAR  (Asset · Home)
                          │
   ┌──────────────┬───────┼────────┬──────────────┐
 Purchase       Insurance  Registration Services   Current value
 (Money:tx)    (Life:doc   (Life:        (Life:mant. (→ Net Worth)
                +expiry)     reminder)     +cost→tx)
```

### Governing rules (from the design discussion — keep these in the spec)

1. **Entities exist independently, relate optionally.** No module requires another
   to function. A document/reminder/maintenance record MAY link to an Asset, but
   doesn't have to (a passport expiry has no asset; a car insurance doc links to
   the car). Every cross-link is a nullable FK.
2. **"Upcoming / Vencimientos" is an aggregated *view*, not a stored entity.** It
   unions everything that has a due date — warranty expirations, subscription
   `nextPaymentDate`, reminders, document expiries, scheduled maintenance — sorted
   by days-remaining. This is the visible glue between the three faces; it reuses
   the existing alerts engine + scheduler, and stores no duplicate data.
3. **Search-first is the "magic moment."** Global search ("Samsung", "car") returns
   the asset + its receipt + warranty + transactions + maintenance. Without it the
   relationships live only in the DB; with it the user *feels* the unification.
   Implement with SQLite FTS5 over the user's own rows.
4. **Documents don't require a file.** A document can be a pure record ("car
   insurance, GNP, policy ABC123, expires 15/03/2027, file: not attached") and get
   its PDF later. Life Admin is for *remembering*, not just *storing*.
5. **Maintenance links a cost, never auto-doubles a spend.** A maintenance record
   holds its own cost + provider; the user chooses **"Create transaction"** (or opts
   into "record as expense automatically"). Default is *not* to auto-create, to
   avoid duplicate expenses.
6. **Subscriptions stay their own entity** (they carry finance-specific fields:
   account, category, cycle, next charge). They *feed* the Upcoming view but are
   not collapsed into generic reminders.

### What we already have (the bricks — this is an extension, not a rewrite)

- `assets` table exists but is **flat** (`name`, `value`, `type`, `notes`) — used
  only for net worth. This is the seed to **extend** into a first-class Asset.
- `attachments` (per-user file + optional `transactionId`/`transferId`) — the base
  for **Documents**.
- `receipt_analyses`/`receipt_items` + OCR — already link a document to a transaction.
- `subscriptions` with `nextPaymentDate` + `SubscriptionService.calculateDaysRemaining`
  — already "recurring + calendar + days-remaining"; feeds Upcoming as-is.
- `alerts` (generic `type`/`severity`/`hash`/`data` JSON) + the scheduler (daily
  net-worth snapshots, auto-charge processing) — the engine that powers Upcoming
  reminders. New due-date alerts reuse this with new `type` values + a dedup `hash`.
- `networthSnapshots` — net worth already computed; adding asset value to the total
  is a small change once Assets carry a value.

### Navigation (reflects the unification)

```
Dashboard   ← "Coming Up" (due items from all 3 faces) + net worth + financial health
Money       ← accounts, transactions, budgets, goals, (later) investments   [EXISTS]
Home        ← Assets (value → net worth), inventory by location, warranties
Life        ← Documents, Reminders/Renewals, Maintenance, Subscriptions [EXISTS]
Search      ← global: "Samsung" → asset + receipt + warranty + transaction
Reports · Settings
```

The Asset lives under **Home** but links out to **Money** (its transactions) and
**Life** (its documents/reminders/maintenance). Those tabs are windows onto one graph.

**UI constraint (per the non-negotiable above):** Money must remain the default,
uncluttered experience. **Home** and **Life** should be collapsible/hideable
top-level sections (ideally hidden or minimized until the user opts in), and the
richest relationships should be reachable *contextually* (a "Warranty"/"Documents"
tab on an asset; an optional "link to asset" on a transaction) rather than forcing
the user through new top-level areas. If any of this makes the finance UI feel
heavier, that's the signal to redesign — not to push through.

### Data model (landed on the real Drizzle schema)

All new tables follow the existing conventions: `userId` FK `onDelete: cascade`,
`user_id` index, ISO-string timestamps, per-user ownership. All cross-links nullable.

- **Extend `assets`** (additive columns, guarded migration): `brand`, `model`,
  `serialNumber`, `category` (appliance/vehicle/electronics/furniture/property/other),
  `purchaseDate`, `purchasePrice`, `currentValue` (rename/keep `value`), `location`,
  `status` (active/sold/disposed), `purchaseTransactionId` → `transactions` (set null),
  `receiptAttachmentId` → `attachments` (set null). Net worth uses `currentValue`.
- **`documents`**: `userId`, `type` (insurance/deed/contract/warranty/id/tax/other),
  `name`, `provider`, `reference` (policy/RFC/folio), `issueDate`, `expiryDate` (nullable),
  `attachmentId` → `attachments` (nullable — file optional), `assetId` → `assets`
  (nullable), `notes`.
- **`reminders`**: `userId`, `title`, `dueDate`, `recurrence` (once/monthly/yearly/
  everyN), `leadDays` (e.g. 90/30/7 window), `assetId` (nullable), `documentId`
  (nullable), `status` (open/done), `notes`. Drives Upcoming + emits an alert when
  inside the lead window.
- **`warranties`**: `userId`, `assetId` (nullable but usually set), `provider`,
  `durationMonths` OR explicit `startDate`+`expiryDate` (compute expiry
  deterministically), `serialNumber`, `documentId` (nullable), `status`
  (active/expired/claimed), + a lightweight `warranty_claims` history (date, note,
  cost, optional transaction link).
- **`maintenance`**: `userId`, `assetId` (nullable), `title`, `date`, `cost` (nullable),
  `provider`, `transactionId` → `transactions` (nullable — the "Create transaction"
  link), `recurrence` (nullable, for scheduled), `nextDueDate` (nullable), `notes`.

Backup: each phase adds its arrays to the export/import with FK remapping (same
pattern as attachments/receipts), and bumps the backup minor version (importers
tolerate unknown arrays; the major-version gate stays intact).

### Phased roadmap (by value/effort; each phase ships independently)

- [~] **L1 — Assets as a first-class entity** (foundational). 🌿 **Built on branch
  `p4-assets`, NOT merged (parked for v2).** Extended `assets` (renamed
  `value`→`currentValue`; added brand/model/serial/category/purchaseDate/
  purchasePrice/location/status + optional `purchaseTransactionId` and
  `receiptAttachmentId` FKs), migration `0008` (12-step rebuild), UI to create/edit
  an asset with all fields + optional link to a transaction and a receipt/attachment;
  net worth uses `currentValue`. Inventory-by-location is a *view* over assets (list ↔
  by-location toggle). Backups bumped to 1.1.0 with backward-compatible
  `value`→`currentValue` remap. **Status: complete + tests green on the branch; do
  NOT merge to `main` until the v2 track officially starts.** See "Parked branches"
  below.
- [ ] **L2 — Warranty + the Upcoming view** (the differentiator, low effort — reuses
  alerts + scheduler). Warranty = asset + purchase date + duration → expiry →
  reminders (90/30/7, configurable) via the existing alerts engine. Build the
  aggregated **Upcoming** view here (unions warranties + subscription next charges +
  reminders + document expiries) — it's the visible payoff of the graph.
- [ ] **L3 — Documents + Reminders (Life Admin core)**. Documents (file optional) with
  expiry; generic reminders (renewals, important dates) with optional asset/document
  link. Both feed Upcoming. Subscriptions stay as-is and simply appear in Upcoming.
- [ ] **L4 — Maintenance**. Records with cost + provider + optional "Create
  transaction"; optional recurrence → scheduled maintenance feeds Upcoming. Links to
  an asset (car service) or a property (roof waterproofing).
- [ ] **L5 — Global search (FTS5)**. Cross-entity search so "car" surfaces the asset,
  its receipt, warranty, transactions and maintenance in one result set.

### 🌿 Parked branches (built ahead of schedule — do not lose, do not merge yet)

Work that was implemented but belongs to a later track. Listed here so it stays
**visible** and gets picked up when its track starts, instead of rotting as a
forgotten branch:

- **`p4-assets`** → implements **L1 (Assets as a first-class entity)**. Complete,
  full test suite green on the branch, pushed to `origin/p4-assets`. **Not merged to
  `main`** (it carries DB migration `0008` renaming `assets.value`→`current_value`
  and bumps the backup format to 1.1.0 — v2-track changes). **Action when v2 starts:**
  rebase on `main`, re-run the full verification (migration on a populated DB, backup
  round-trip incl. legacy `value` import), then merge. Until then `main` must never
  see migration `0008`.

### Explicitly deferred / out of scope (documented decisions)

- **Rebranding** — HomeLedger just shipped 1.0.0 (GitHub Release, Docker Hub, HACS,
  HA add-on, docs, STABILITY.md). Renaming now burns that SEO/links/image/package and
  confuses early users; "HomeLedger" still fits money + home + things. Revisit only if
  the product truly outgrows the name; the *tagline* can evolve without a rename.
- **Multi-user / households / permissions** — large architectural change vs. the
  strict per-user model (reinforced in backup). High risk, conflicts with simplicity.
  Only if there's real demand.
- **PostgreSQL** — the app is deeply tied to SQLite (better-sqlite3, PRAGMA, raw-SQL
  receipt tables, planned FTS5). Supporting Postgres doubles the maintenance/test
  surface for little gain in a single-user local-first app. Not planned near-term.
- **Investments with market prices** — needs an external price source (breaks the
  no-cloud-dependency principle). Defer; keep manual-value assets for now.
- **Plugins / open ecosystem** — far off; over-engineering for the current stage.
- **AI** — not required and not planned. Deterministic logic covers warranties,
  reminders, maintenance. If ever added: optional, modular, local, never required.
