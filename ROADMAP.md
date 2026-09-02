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

## Status snapshot

- Current version: **0.1.0** (published; amd64-only Docker image)
- Test suite: **~31 failing** (balance-model assertions outdated) ⛔
- Last audit: codebase-wide inventory completed (see phases below)

---

## Phase P0 — Blockers (must be done before 1.0.0)

### P0.1 — Green test suite ⛔
The tests must pass and reflect the real balance model (balances are computed
dynamically in `AccountService.calculateBalance`; `TransactionService` never
mutates `accounts.initialBalance`).

- [ ] Rewrite outdated assertions in `packages/backend/src/services/transaction.service.test.ts` (lines ~176, 196, 250, 273, 310, 314, 346, 366, 545) to assert the *computed* balance instead of stored `initialBalance`
- [ ] Fix mojibake/encoding corruption in test files (`Débito`→`D�bito`, `Corrección`→`Correcci�n`)
- [ ] `npm run test` → 0 failing
- [ ] Confirm no other test file assumes the stored-balance model

### P0.2 — Backup import is robust (no ID collisions) ⛔
`BackupService.import()` preserves original primary keys and only deletes the
current user's rows, so restoring collides with other users' `categories.id` /
`accounts.id` (fails in multi-user installs).

- [ ] On import, strip original `id`s and remap all foreign-key references (categories, accounts, transactions, transfers, subscriptions, budgets+budgetCategories, goals, splits, loans+payments, assets, liabilities, creditSubscriptions)
- [ ] Include **receipts** (`receipt_analyses` / `receipt_items`) in the backup export payload — they're deleted on import but never exported (data loss on restore)
- [ ] Verify: export → wipe → import round-trip preserves all data with a 2nd user present in the DB
- [ ] Add a backup round-trip integration test

### P0.3 — Safe upgrades & schema/migration integrity ⛔
Fresh installs built only from Drizzle migrations must match `schema.ts`, and
upgrades from an existing DB must not lose data.

- [ ] Fix drift: `attachments.transfer_id` is in `schema.ts` but missing from migration `0000` and never added — add a migration
- [ ] Move runtime raw-SQL tables into proper migrations (or document + guarantee they're safe): `receipt_analyses`, `receipt_items`, `backup_history`, `alert_settings`
- [ ] Test upgrade path: run an older DB, deploy new image, confirm migrations apply cleanly and no data is lost
- [ ] Document the upgrade procedure in README

### P0.4 — Production security hardening ⛔
The image ships insecure demo defaults (`JWT_SECRET`, `ADMIN_PASSWORD`) with no
guard.

- [ ] On boot with `NODE_ENV=production`, refuse to start (or loud warning) if `JWT_SECRET` is the known demo value or too weak, and if `ADMIN_PASSWORD` is `changeme123`
- [ ] Add `trustProxy` config to Fastify so IP-based rate limiting/logging works behind a reverse proxy (`server.ts` line ~26)
- [ ] Verify auth middleware covers all sensitive routes; confirm `requireRole` is wired where it should be
- [ ] Re-verify: password min length, auth rate limit (10/min), CORS via `CORS_ORIGIN`

---

## Phase P1 — Release quality (strongly recommended for 1.0.0)

### P1.1 — arm64 / multi-arch (real)
The HA add-on advertises `aarch64`/`armv7`; the published image is amd64-only.

- [ ] Build arm64 natively via GitHub arm64 runners (matrix), not QEMU (which hangs on `better-sqlite3`)
- [ ] Merge per-arch builds into a multi-arch manifest on Docker Hub
- [ ] Verify the image actually runs on a Raspberry Pi / arm64 host
- [ ] Update CHANGELOG/README to state real arch support

### P1.2 — Lint clean
- [ ] Resolve or intentionally scope the ~378 pre-existing ESLint problems
- [ ] Extend lint to `.svelte` files
- [ ] Add lint (and tests) to CI so regressions are caught

### P1.3 — i18n completeness
- [ ] Byte-level parity check between `es.ts` and `en.ts`
- [ ] Fix stray hardcoded strings (e.g. `recibos/+page.svelte` `<title>`, `register/+page.svelte` password placeholder)

### P1.6 — Better-defined, localized system categories
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

### P1.5 — Host-configurable default language
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

### P1.4 — Health & observability
- [ ] Deepen `/api/v1/health` to include a DB connectivity check
- [ ] Confirm consistent structured error responses across routes

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

---

## Phase P3 — Polish & confidence

- [ ] Frontend test suite (currently ZERO tests) — at least smoke/e2e on critical flows (login, create tx, dashboard, backup)
- [ ] Receipt OCR accuracy review (currently regex/heuristic best-effort)
- [ ] Accessibility pass (WCAG basics: labels, contrast, keyboard nav)
- [ ] Performance check with a large dataset (thousands of transactions)
- [ ] End-to-end docs: deployment, backup/restore, upgrade, HA setup

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
- **Naming:** app is "HomeLedger"; internal package scope is still `@smart-finance/*` (cosmetic, low priority — not user-facing).
