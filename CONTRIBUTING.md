# Contributing to HomeLedger

Thanks for your interest in improving HomeLedger! This guide covers local setup,
the checks to run before opening a PR, and a few project conventions.

By participating in this project, you agree to abide by our
[Code of Conduct](.github/CODE_OF_CONDUCT.md). Found a security issue? Please
follow the [Security Policy](.github/SECURITY.md) instead of opening a public
issue.

## Prerequisites

- **Node.js ≥ 22.13** (Docker images build on Node 22)
- **npm ≥ 9**

## Setup

```bash
git clone https://github.com/TastingRogue/HomeLedger.git
cd HomeLedger
npm install
npm run build -w packages/shared

# Configure environment (JWT_SECRET is required, min 32 chars)
cp .env.example .env
# edit .env
```

## Running in development

```bash
npm run dev:backend    # API on http://localhost:3000
npm run dev:frontend   # Frontend on http://localhost:5173 (proxies /api to 3000)
```

The first user you register becomes the admin. The SQLite database is created
automatically on first run under `packages/backend/data/` (or `DATA_DIR`).

## Before you open a PR — verify

Run these from the repo root and make sure they all pass:

```bash
npm run typecheck -w packages/backend    # tsc --noEmit
npm run typecheck -w packages/frontend   # svelte-check (expect 0 errors, 0 warnings)
npm run test                             # full monorepo test suite (Vitest, backend + frontend)
npm run build                            # build shared + backend + frontend
npm run lint                             # ESLint
```

If you touched translations, the test suite includes an **all-locale key-parity**
check that will fail on any missing or mismatched key (see below).

If you changed backend or frontend code and run via Docker, remember the images
bake the source at build time — rebuild the image to see your changes (see
[Applying code changes](#applying-code-changes-docker-rebuild)).

## Project layout

A monorepo with three workspaces under `packages/`:

- `packages/backend` — Fastify API, Drizzle/SQLite, services, migrations, cron jobs
- `packages/frontend` — SvelteKit 5 app (routes, `lib/api` clients, i18n, components)
- `packages/shared` — shared TypeScript types

The full structure is documented in the
[Project structure](#project-structure).

## Conventions

- **TypeScript everywhere**; keep `typecheck` clean (no new errors/warnings).
- **Tests**: add or update tests for backend logic changes; run `npm run test`.
  Backend tests use a temp SQLite DB; frontend tests run under jsdom via the
  SvelteKit Vite plugin.
- **Migrations**: schema changes go through Drizzle migrations
  (`npm run db:generate -w packages/backend`) **and** the matching `index()` /
  column in `schema.ts`. Keep them additive and idempotent where practical
  (`CREATE INDEX IF NOT EXISTS`) so upgrades on existing databases are safe.
- **New tables created outside Drizzle** (raw SQL): also clear them in
  `BackupService.import()` so a restore wipes them like the rest.
- **New env vars**: give them a sensible default in the `Dockerfile` (for the
  zero-config run) and document them in the [installation environment table](docs/INSTALLATION.md#environment-variables).
- Keep the app **local-first**: no outbound network calls or cloud dependencies
  by default.

## Adding a UI theme

Themes are self-contained folders with a typed manifest and scoped CSS. Settings,
previews and the pre-paint script discover them automatically. See
[Creating and contributing UI themes](docs/THEMES.md) for the two-file example,
token contract, chart palettes and validation steps.

## Adding a language

Languages are self-contained JSON packs in `locales/<code>.json`. One pack
contains metadata, interface text (both themes), default category names,
receipt-processing messages, native desktop text, and built-in theme metadata.
There are no language-specific branches to add to application code.

1. Create a pack from the English template:

   ```sh
   npm run locales:add -- fr "Français" fr-FR
   ```

   This creates `locales/fr.json` without overwriting existing files. The pack is
   marked `meta.draft: true` so an untranslated template cannot accidentally ship.

2. Translate every string in `ui`, `categories`, `receipts`, `desktop`, and
   `themes`. Keep keys and `{placeholders}` unchanged. Configure `meta.label`,
   `intlTag`, `aliases` (such as `pt` for `pt-BR`), display `order`, and
   `currencySpace` (`""`, a space, or `"\u00a0"`). Do not change category keys or
   persisted enum values. Remove `meta.draft` when the translation is ready.

3. Generate the integrations and validate them:

   ```sh
   npm run locales:sync
   npm run build -w packages/shared
   npm run typecheck -w packages/backend
   npm run typecheck -w packages/frontend
   npm test
   npm test --prefix packages/desktop
   npm run build
   ```

   The generator discovers packs by filename. It updates frontend dictionaries
   and registration, shared backend metadata, category/receipt translations,
   desktop registration and dictionaries, built-in theme metadata, and the Home
   Assistant language selector. Commit the pack **and** generated files.
   Generated files have a header; never edit them directly. `locales:check`, CI,
   and desktop staging reject stale output. English is the fallback and Spanish
   remains the existing UI key-type compatibility baseline; keep both packs.

4. Review actual screens in Normal and Cyberpunk, date/number formats, validation
   messages and desktop dialogs. Automated checks verify keys, nonempty strings,
   placeholders and integration; a fluent speaker must review translation quality.
   Add your credit to the README's supported-language table.

To change existing wording, edit the pack and run `npm run locales:sync`.
When adding a UI key, add it to all packs. `locales/categories.json` contains only
language-independent default-category keys/types. Existing custom category names
and stored data are never rewritten when the language changes.

Unknown locale tags fall back to English. Exact codes and explicit aliases are
matched first; regional tags may fall back to a registered base language (for
example `en-GB` to `en`). Aliases must not overlap across packs.

Community themes may supply extra translations in their own manifests; English
is required as their fallback, so adding a language does not break existing themes.
This system covers text and locale formats. Adding a right-to-left language also
requires a separate RTL layout review; registration alone cannot validate that UI.

## Reporting bugs & requesting features

Use the issue templates (Bug report / Feature request). For bugs, include your
deploy method (Docker image, Compose, HA add-on) and the app version.

## Development commands

```bash
npm run dev:backend       # Backend with hot-reload (tsx watch)
npm run dev:frontend      # Frontend with Vite HMR
npm run build             # Build shared + backend + frontend
npm run test              # Run all tests (Vitest, backend + frontend)
npm run lint              # Lint all packages
npm run format            # Format with Prettier
npm run db:generate -w packages/backend   # Generate a migration
npm run db:migrate  -w packages/backend   # Apply migrations
```

## Applying code changes (Docker rebuild)

> :warning: **The Docker images bake the source at build time — they do not
> mount your working copy.** After changing backend or frontend code you **must
> rebuild the image**, or the container keeps running the old code. (Compose only
> mounts `/data`, never the source.)

```bash
# Docker Compose (dev): rebuild + recreate with the new code.
# --force-recreate replaces the running containers; the homeledger-data volume
# (your DB) is preserved. No need to stop/remove anything first.
docker compose up -d --build --force-recreate
docker compose ps            # confirm both containers are healthy

# Standalone image: first create/preserve homeledger.env as described in
# docs/INSTALLATION.md. Back up the instance before replacing its container.
docker build -t homeledger:standalone .
docker rm -f homeledger
docker run -d --name homeledger -p 3000:3000 -v homeledger-data:/data \
  --env-file homeledger.env homeledger:standalone
```

**Publishing to Docker Hub:** commit to `main` and push — the GitHub Actions
workflow (`.github/workflows/docker-build.yml`) rebuilds and pushes automatically.

**Notes for specific changes:**

- **Receipt OCR:** results are cached in the DB. After changing the parser,
  existing receipts keep their old values until you press **Re-analyze** in the
  receipt popup (or restore a backup).
- **New tables created outside Drizzle** (raw SQL, like `receipt_analyses`): also
  clear them in `BackupService.import()` so a restore wipes them like the rest.
- **New env vars:** add a sensible default in the `Dockerfile` (for zero-config
  run) and document them in the [Environment Variables](docs/INSTALLATION.md#environment-variables) table.

## Project structure

```
homeledger/
├── packages/
│   ├── backend/          # Fastify API — routes/v1, services, db (schema/
│   │   │                 #   migrations), middleware, scheduler, importers
│   │   └── data/         # SQLite DB + attachments (DATA_DIR)
│   ├── frontend/         # SvelteKit 5 — routes, lib/api, lib/stores,
│   │   │                 #   lib/components, lib/i18n (generated language registry), app.css
│   │   └── ...
│   └── shared/           # Shared TypeScript types
├── locales/              # Modular language packs (JSON)
├── ha-addon/             # Home Assistant Add-on
├── ha-integration/       # HA Custom Integration (Python)
├── docs/                 # USER_MANUAL.md, DEPLOYMENT.md, STABILITY.md, screenshots
├── Dockerfile            # Single self-contained image (app + API)
├── docker-compose.yml    # Deployment config
└── .env.example          # Environment template
```

## License

By contributing, you agree that your contributions are licensed under the
project's [MIT License](LICENSE).
