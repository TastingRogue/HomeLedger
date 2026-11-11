# Feature and technical reference

[← HomeLedger](../README.md) · [User manual](USER_MANUAL.md) · [Installation](INSTALLATION.md)

## Features

- **Interface themes**: Normal (light/dark) and modular Cyberpunk 2077, selected in Settings
- **Multi-account**: Debit, Credit, Investment, Vouchers, Cash — with dynamic balance tracking
- **Transactions**: Full income/expense recording with split by type, subcategories, per-transaction category splits, month grouping, card grid + table views, and **CSV export**
- **Transfers**: Movements between accounts with fund validation and edit support
- **Subscriptions**: Recurring payment management with auto-charge, catch-up after downtime, and visual calendar
- **Budgets**: Category and tag-based spending control with progress bars and dashboard integration
- **Savings Goals**: Objective tracking with fund/withdraw actions and progress visualization
- **Loans**: Track principal, interest and term with an amortization schedule, payment recording, and payoff progress
- **Credit Monitoring**: Utilization bars, health status, and linked subscriptions
- **Bank Import**: CSV/XLSX/OFX/QIF/JSON with parsers for BBVA, Santander, and Nu Mexico
- **Rules**: Auto-categorization engine — condition/action rules with test + apply-to-uncategorized
- **Categories**: Per-user — each user gets their own editable default set (in the instance language) at sign-up, with subcategories and type classification (Expense/Income/Both)
- **Alerts**: Auto-generated (low balance, high credit, due payments, completed goals) with manual evaluation trigger
- **Reports**: 6-month trends, category donut, savings rate ring, monthly comparison bars
- **Backup**: Full JSON export/import (with dry-run preview and validation) plus scheduled admin gzip whole-DB snapshots with in-app restore
- **Attachments**: Upload receipts/invoices (images, PDFs) and link to transactions/transfers
- **Dashboard**: Complete financial summary with editable items, combo charts, period dropdowns
- **Receipts**: Analyze uploaded receipts/attachments to extract transaction details
- **Admin**: User management, registration control (first-user/open/closed + allowlist), and instance settings — admin-gated
- **Currency**: base currency per install (MXN, USD, EUR, GBP, COP, ARS, CLP, PEN, BRL), with per-account currencies and manual exchange rates
- **Language**: Spanish, English, and Brazilian Portuguese with interface translations
- **Responsive**: Scales to any screen resolution with dynamic font sizing
- **Home Assistant**: Addon + Custom Integration with sensors and services
- **API REST**: All endpoints under `/api/v1` with JWT + API key auth
- **MCP server (opt-in)**: Let AI assistants such as Claude Desktop read your finances and record transactions at `/api/v1/mcp`. Off by default; each user must confirm before enabling (see [User Manual](USER_MANUAL.md#mcp-ai-assistants))

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend | SvelteKit 5 (SSR + SPA) |
| Backend API | Fastify 5 |
| Database | SQLite (better-sqlite3) + Drizzle ORM |
| Language | TypeScript (full-stack) |
| Validation | Zod |
| Auth | JWT + bcrypt + refresh tokens |
| Scheduler | node-cron (auto-charges, alerts, budget resets, backups) |
| Charts | Chart.js (dynamic import for SSR compat) |
| Testing | Vitest + fast-check |
| Packaging | Docker multi-arch |
| Icons | Custom SVG Icon component (Lucide-style) |

## API Endpoints

Base URL: `/api/v1` — Auth via `Authorization: Bearer <token>` or `X-API-Key: <key>`.

| Resource | Methods |
|----------|---------|
| `/auth` | register, login, refresh, logout, me (GET/PUT), change-password, revoke-all-sessions |
| `/users` *(admin)* | list, enable/disable, delete, reset-password, registration policy (GET/PUT), instance currency (GET/PUT) |
| `/accounts` | CRUD + deactivate |
| `/transactions` | CRUD + quick create + split + **CSV export** (`/export.csv`) |
| `/transfers` | CRUD (create, list, update, delete) |
| `/subscriptions` | CRUD + delete + calendar |
| `/goals` | CRUD + fund + withdraw |
| `/budgets` | CRUD + summary |
| `/loans` | CRUD + record payment + amortization schedule + payments |
| `/categories` | CRUD + subcategories + analysis |
| `/alerts` | list, mark read, mark all read, evaluate, delete, settings |
| `/reports` | dashboard, cashflow, trends, categories, budget-vs-actual |
| `/networth` | current, history, assets/liabilities CRUD |
| `/attachments` | upload, list, download, link, delete |
| `/receipts` | list, get, analyze attachment |
| `/imports` | upload, preview, confirm |
| `/backup` | export, import, preview (dry-run); snapshots list/create/restore *(admin)*; history |
| `/ha` | status, webhook, sensors |
| `/health` · `/config` | liveness probe (+ `/health/scheduler`, admin) · public runtime config |

> [!NOTE]
> As of **v1.0.0**, the `/api/v1` surface and the backup file format are
> **stable** under [Semantic Versioning](https://semver.org/): no breaking
> changes within `1.x`. See **[docs/STABILITY.md](STABILITY.md)** for
> exactly what's covered, what counts as an additive (non-breaking) change, and
> what would require a `2.0.0`.

## Scheduler Jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| Auto-charge | Daily 00:05 + on startup | Processes due subscriptions, catches up missed charges |
| Alert evaluation | Every hour + on startup | Evaluates all alert conditions for all users |
| Budget reset | Monthly (day 1, 00:10) | Resets budget periods |
| Backup snapshot | `BACKUP_CRON` (default daily 03:00) | Gzip whole-DB snapshot under `$DATA_DIR/backups` + retention rotation. Toggle with `BACKUP_ENABLED`. |

All four report into an in-memory status registry, visible to admins at
`GET /api/v1/health/scheduler`.

## Currency and timezone

- **Currency:** an administrator chooses the base currency. Each account can use
  a supported currency and a manually maintained exchange rate to base.
  Consolidated totals convert account amounts using those rates; amounts on
  individual accounts remain in their native currency. Cross-currency transfers
  require a destination amount. Rates are not fetched automatically and default
  to 1 when omitted, so set them explicitly for foreign-currency accounts.
- **Timezone:** America/Mexico_City by default, configurable in the environment.
