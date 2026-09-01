# HomeLedger

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)](https://hub.docker.com)
[![Home Assistant](https://img.shields.io/badge/Home%20Assistant-Integration-41BDF5?logo=homeassistant)](ha-integration/)

> Self-hosted personal finance management. Track accounts, transactions, budgets, goals, and subscriptions — all from your own server.

**[Features](#features)** · **[Quick Start](#quick-start)** · **[Docker](#docker-recommended-for-production)** · **[API](#api-endpoints)** · **[Support the Project](#support-the-project)**

---

Self-hosted personal finance management web application. Designed as a modular, open-source product that works completely independently. Optionally integrates with Home Assistant as an addon and custom integration.

## Features

- **Multi-account**: Debit, Credit, Investment, Vouchers, Cash — with dynamic balance tracking
- **Transactions**: Full income/expense recording with split by type, month grouping, card grid + table views
- **Transfers**: Movements between accounts with fund validation and edit support
- **Subscriptions**: Recurring payment management with auto-charge, catch-up after downtime, and visual calendar
- **Budgets**: Category-based spending control with progress bars and dashboard integration
- **Savings Goals**: Objective tracking with fund/withdraw actions and progress visualization
- **Credit Monitoring**: Utilization bars, health status, and linked subscriptions
- **Bank Import**: CSV/XLSX/OFX/QIF/JSON with parsers for BBVA, Santander, and Nu Mexico
- **Categories**: Fully editable (including system categories), with type classification (Expense/Income/Both)
- **Alerts**: Auto-generated (low balance, high credit, due payments, completed goals) with manual evaluation trigger
- **Reports**: 6-month trends, category donut, savings rate ring, monthly comparison bars
- **Backup**: Full JSON export/import with preview and validation
- **Attachments**: Upload receipts/invoices (images, PDFs) and link to transactions/transfers
- **Dashboard**: Complete financial summary with editable items, combo charts, period dropdowns
- **Receipts**: Analyze uploaded receipts/attachments to extract transaction details
- **Multi-currency**: MXN, USD, EUR, COP, ARS, CLP, PEN, BRL — switchable from settings
- **Language**: Spanish + English with full interface translation
- **Responsive**: Scales to any screen resolution with dynamic font sizing
- **Home Assistant**: Addon + Custom Integration with sensors and services
- **API REST**: All endpoints under `/api/v1` with JWT + API key auth

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend | SvelteKit 5 (SSR + SPA) |
| Backend API | Fastify 5 |
| Database | SQLite (better-sqlite3) + Drizzle ORM |
| Language | TypeScript (full-stack) |
| Validation | Zod |
| Auth | JWT + bcrypt + refresh tokens |
| Scheduler | node-cron (auto-charges, alerts, budget resets) |
| Charts | Chart.js (dynamic import for SSR compat) |
| Testing | Vitest + fast-check |
| Packaging | Docker multi-arch |
| Icons | Custom SVG Icon component (Lucide-style) |

## Requirements

- Node.js >= 20 (Docker images are built on Node 22)
- npm >= 9

## Quick Start

### Local Development

```bash
# Clone the repository
git clone https://github.com/TastingRogue/HomeLedger.git
cd HomeLedger

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your values (JWT_SECRET required, min 32 chars)

# Start in development mode
npm run dev:backend    # API on http://localhost:3000
npm run dev:frontend   # Frontend on http://localhost:5173
```

The first user registered automatically becomes admin. The database is created automatically on first run.

### Docker (recommended for production)

**Option 1 — Prebuilt image from Docker Hub**

A multi-arch image is published to Docker Hub on every push to `main`. The
image is self-contained: a single process serves both the web app and the API
on port 3000, so it runs with no extra command.

```bash
docker pull irving1flores/homeledger:latest

docker run -d \
  -p 3000:3000 \
  -v homeledger-data:/data \
  -e JWT_SECRET="your-strong-random-secret-min-32-chars" \
  -e ADMIN_EMAIL="admin@homeledger.local" \
  -e ADMIN_PASSWORD="your-strong-password" \
  --name homeledger \
  irving1flores/homeledger:latest

# App + API available at http://localhost:3000
```

### Run from Docker Desktop (no command line)

The image ships with built-in demo defaults, so you don't need to set any
environment variables — but you **must** map the port, otherwise the browser
will show `ERR_CONNECTION_REFUSED`.

1. Open the **Images** tab and click **Run** on `irving1flores/homeledger`.
2. Expand **Optional settings**.
3. Under **Ports**, set **Host port** to `3000` (the container listens on
   `3000`). Without this step the container runs but is not reachable from your
   browser.
4. *(Optional)* Add a volume so your data survives restarts: **Host path** a
   folder of your choice, **Container path** `/data`.
5. Click **Run**, then open <http://localhost:3000>.

Log in with the demo credentials:

- **Email:** `admin@homeledger.local`
- **Password:** `changeme123`

> :information_source: `EXPOSE 3000` in the image only documents the port; it
> does not publish it. Docker Desktop only maps it when you set a Host port
> (step 3), which is equivalent to `-p 3000:3000` on the command line.
>
> :warning: **These defaults are insecure and public.** For any real
> deployment, override `JWT_SECRET`, `ADMIN_EMAIL` and `ADMIN_PASSWORD` (in
> Optional settings → Environment variables, or with the `-e` flags shown
> above).

**Option 2 — Build from source with Docker Compose**

```bash
# Clone and configure
git clone https://github.com/TastingRogue/HomeLedger.git
cd HomeLedger
cp .env.example .env
# Edit .env with secure values

# Start with Docker Compose (backend on 3000, frontend on 5173)
docker compose up -d
```

## Environment Variables

The Docker image ships with insecure demo defaults so it runs out of the box.
Override these in production.

| Variable | Description | Default (Docker image) |
|----------|-------------|------------------------|
| `JWT_SECRET` | Secret key for signing tokens (min 32 chars) | insecure demo value — **change in production** |
| `ADMIN_EMAIL` | Admin user email | `admin@homeledger.local` |
| `ADMIN_PASSWORD` | Admin password | `changeme123` — **change in production** |
| `TZ` | Timezone | `America/Mexico_City` |
| `PORT` | Server port (app + API) | `3000` |
| `DATA_DIR` | Directory for the SQLite database | `/data` |
| `DATA_DIR` | Directory for SQLite database | `./data` |
| `PORT` | Server port | `3000` |

## Project Structure

```
homeledger/
├── packages/
│   ├── backend/          # Fastify API server
│   │   ├── src/
│   │   │   ├── server.ts         # Entry point
│   │   │   ├── routes/v1/        # API route handlers
│   │   │   ├── services/         # Business logic
│   │   │   ├── db/               # Schema, migrations, connection
│   │   │   ├── middleware/       # Auth, rate-limit, errors
│   │   │   ├── scheduler/        # Cron jobs (auto-charge, alerts, budgets)
│   │   │   ├── importers/        # Bank file parsers
│   │   │   └── validators/       # Zod schemas
│   │   └── data/                 # SQLite DB + attachments
│   ├── frontend/         # SvelteKit app
│   │   ├── src/
│   │   │   ├── routes/           # Pages (app layout + auth)
│   │   │   ├── lib/api/          # API client functions
│   │   │   ├── lib/stores/       # Preferences, user profile
│   │   │   ├── lib/components/   # Icon, Dropdown, DatePicker, Charts
│   │   │   ├── lib/i18n/         # Translation dictionaries (es/en)
│   │   │   ├── lib/utils/        # Currency formatting, date utils
│   │   │   └── app.css           # Global design system
│   │   └── package.json
│   └── shared/           # Shared TypeScript types
├── ha-addon/             # Home Assistant Add-on
├── ha-integration/       # HA Custom Integration (Python)
├── Dockerfile            # Multi-stage build
├── docker-compose.yml    # Deployment config
└── .env.example          # Environment template
```

## Available Scripts

```bash
# From monorepo root
npm run dev:backend       # Backend with hot-reload (tsx watch)
npm run dev:frontend      # Frontend with Vite HMR
npm run build             # Build shared + backend + frontend
npm run test              # Run all tests (vitest)
npm run lint              # Lint all packages
npm run format            # Format with Prettier

# Database
npm run db:generate -w packages/backend   # Generate migration
npm run db:migrate -w packages/backend    # Apply migrations
```

## Applying Code Changes (rebuild)

> :warning: **The Docker images bake the source code at build time — they do
> not mount your working copy.** After changing any backend or frontend code
> you **must rebuild the image**, or the container keeps running the old code.
> (Docker Compose only mounts `/data`, never the source.)

After editing code, pick the workflow that matches how you run the app:

**Running with Docker Compose (dev):**

```bash
# Rebuild images and recreate containers with the new code.
# No need to stop or remove anything first: --force-recreate replaces the
# running containers, and the `homeledger-data` volume (your DB) is preserved.
docker compose up -d --build --force-recreate

# Confirm both containers are healthy
docker compose ps
```

**Running the standalone image:**

```bash
docker build -t homeledger:standalone .
docker rm -f homeledger
docker run -d --name homeledger -p 3000:3000 -v homeledger-data:/data homeledger:standalone
```

**Publishing to Docker Hub:** commit to `main` and push. The GitHub Actions
workflow (`.github/workflows/docker-build.yml`) rebuilds and pushes the image
automatically.

### Verify before shipping

Run these from the repo root and make sure they pass before rebuilding or committing:

```bash
npm run typecheck -w packages/backend    # tsc --noEmit
npm run typecheck -w packages/frontend   # svelte-check (expect 0 errors, 0 warnings)
npm run build                            # full build
npm audit                                # expect 0 vulnerabilities
```

### Notes for specific changes

- **Receipt analysis / OCR:** results are cached in the database. After changing
  the parser, existing receipts keep their old values until you press
  **Re-analyze** in the receipt popup (or restore a backup).
- **New database tables created outside Drizzle** (raw SQL, like
  `receipt_analyses`): remember to also clear them in
  `BackupService.import()` so restoring a backup wipes them like the rest.
- **New env vars:** add sensible defaults in the `Dockerfile` (for zero-config
  run) and document them in the Environment Variables table above.

## API Endpoints

Base URL: `/api/v1` — Auth via `Authorization: Bearer <token>` or `X-API-Key: <key>`.

| Resource | Methods |
|----------|---------|
| `/auth` | register, login, refresh, logout, me (GET/PUT), change-password, revoke-all-sessions |
| `/accounts` | CRUD + deactivate |
| `/transactions` | CRUD + quick create |
| `/transfers` | CRUD (create, list, update, delete) |
| `/subscriptions` | CRUD + delete + calendar |
| `/goals` | CRUD + fund + withdraw |
| `/budgets` | CRUD + summary |
| `/categories` | CRUD + analysis |
| `/alerts` | list, mark read, mark all read, evaluate, delete, settings |
| `/reports` | dashboard, cashflow, trends, categories, budget-vs-actual |
| `/attachments` | upload, list, download, link, delete |
| `/receipts` | list, get, analyze attachment |
| `/imports` | upload, preview, confirm |
| `/backup` | export, import |
| `/ha` | status, webhook, sensors |

## Scheduler Jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| Auto-charge | Daily 00:05 + on startup | Processes due subscriptions, catches up missed charges |
| Alert evaluation | Every hour + on startup | Evaluates all alert conditions for all users |
| Budget reset | Monthly | Resets budget periods |

## Multi-currency & i18n

- **Currency**: Configurable per user (MXN, USD, EUR, COP, ARS, CLP, PEN, BRL)
- **Language**: Spanish / English — switchable from Settings, persisted in localStorage
- **Timezone**: America/Mexico_City (configurable in server environment)

Currency and language preferences are stored client-side and apply immediately without page reload.

## Custom Components

| Component | Purpose |
|-----------|---------|
| `Icon.svelte` | 20+ SVG icons inline (no external dependencies) |
| `Dropdown.svelte` | Custom dark-themed dropdown menu |
| `DatePicker.svelte` | Calendar with month navigation, time picker, dynamic positioning |
| `ComboChart.svelte` | Combined bar + line chart (reactive to data changes) |
| `DoughnutChart.svelte` | Donut with center text (reactive) |
| `LineChart.svelte` | Line chart with gradient fill |
| `BarChart.svelte` | Standard bar chart |

## Home Assistant

### Add-on

Install the addon from the HA addon repository. Configure `JWT_SECRET` and `ADMIN_PASSWORD` in addon options.

### Custom Integration (HACS)

Install via HACS to get sensors in Home Assistant:
- Monthly expenses/income
- Consolidated balance
- Credit utilization
- Next payment
- Pending alerts

## Support the Project

If HomeLedger is useful to you, consider supporting its development:

- ⭐ **Star this repo** — helps with visibility
- 🐛 **Report bugs** — open an issue
- 💡 **Suggest features** — discussions welcome
- ❤️ **Sponsor** — [GitHub Sponsors](https://github.com/sponsors/TastingRogue) | [Buy Me a Coffee](https://buymeacoffee.com/TastingRogue)

## License

MIT
