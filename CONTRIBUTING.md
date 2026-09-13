# Contributing to HomeLedger

Thanks for your interest in improving HomeLedger! This guide covers local setup,
the checks to run before opening a PR, and a few project conventions.

## Prerequisites

- **Node.js ≥ 20** (Docker images build on Node 22)
- **npm ≥ 9**

## Setup

```bash
git clone https://github.com/TastingRogue/HomeLedger.git
cd HomeLedger
npm install

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

If you touched translations, the test suite includes an **es ↔ en key-parity**
check that will fail on any missing or mismatched key (see below).

If you changed backend or frontend code and run via Docker, remember the images
bake the source at build time — rebuild the image to see your changes (see
[README → Applying code changes](README.md#applying-code-changes-docker-rebuild)).

## Project layout

A monorepo with three workspaces under `packages/`:

- `packages/backend` — Fastify API, Drizzle/SQLite, services, migrations, cron jobs
- `packages/frontend` — SvelteKit 5 app (routes, `lib/api` clients, i18n, components)
- `packages/shared` — shared TypeScript types

The full structure is documented in the
[README → Project structure](README.md#project-structure).

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
  zero-config run) and document them in the README environment table.
- Keep the app **local-first**: no outbound network calls or cloud dependencies
  by default.

## Adding a language

The i18n system is built so the compiler forces a new language to be complete.
There are exactly **two** steps:

1. **Create the dictionary.** Add `packages/frontend/src/lib/i18n/<code>.ts`
   (e.g. `fr.ts`) and type it as `Record<TranslationKey, string>`:

   ```ts
   import type { TranslationKey } from './es';

   export const fr: Record<TranslationKey, string> = {
     'nav.dashboard': 'Tableau de bord',
     // ...every key the compiler asks for
   };
   ```

   `es.ts` is the **canonical** dictionary — its keys define the
   `TranslationKey` union, so TypeScript will error until you translate **every**
   key. (The test suite also has a parity + placeholder-consistency guard.)

2. **Register it.** Add one entry to `locales` in
   `packages/frontend/src/lib/i18n/registry.ts`:

   ```ts
   export const locales = {
     es: { dictionary: es, label: 'Español', intlTag: 'es-MX' },
     en: { dictionary: en, label: 'English (US)', intlTag: 'en-US' },
     fr: { dictionary: fr, label: 'Français', intlTag: 'fr-FR' },
   } satisfies Record<string, LocaleConfig>;
   ```

That's it — the supported-locale type, the settings language picker, the
translation fallback, and `Intl` date/number formatting all derive from that
map. Run `npm run typecheck -w packages/frontend` and `npm run test` to confirm
full coverage.

## Reporting bugs & requesting features

Use the issue templates (Bug report / Feature request). For bugs, include your
deploy method (Docker image, Compose, HA add-on) and the app version.

## License

By contributing, you agree that your contributions are licensed under the
project's [MIT License](LICENSE).
