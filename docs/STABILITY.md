# Stability & compatibility guarantees

As of **v1.0.0**, HomeLedger follows [Semantic Versioning](https://semver.org/).
Two contracts are declared **stable** and are covered by that guarantee:

1. the versioned HTTP API under **`/api/v1`**, and
2. the **backup file format** produced by the per-user JSON export.

This means: within a major version (`1.x.y`), these two surfaces will not change
in a way that breaks existing clients or existing backup files. Breaking changes
require a **new major version** (`2.0.0`) and a documented migration path.

---

## What "stable" covers

### The `/api/v1` HTTP API

Stable across `1.x`:

- **Route paths and methods** listed in the README's *API Endpoints* section
  (e.g. `POST /api/v1/auth/login`, `GET /api/v1/transactions`,
  `GET /api/v1/transactions/export.csv`).
- **Authentication mechanisms**: `Authorization: Bearer <jwt>` and `X-API-Key`.
- **The response envelope**: success responses are `{ "success": true, "data": ... }`;
  errors are `{ "success": false, "error": { "code": "...", "message": "..." } }`.
- **Existing field names and types** on request and response bodies.
- **Existing error `code` values** (the machine-readable `error.code` string).

### The backup format

Stable across `1.x`:

- The **top-level shape**: `{ version, exportedAt, userId, data: { ... } }`.
- The **`version` field** is a semver string; import enforces that the backup's
  **major** version matches the app's major version (see
  `BackupService.validateBackup`). A `1.x` app imports any `1.y` backup.
- **Existing entity arrays** under `data` (`accounts`, `transactions`,
  `transactionSplits`, `transfers`, `subscriptions`, `goals`, `budgets`,
  `budgetCategories`, `categories`, `subcategories`, `rules`, `alerts`,
  `assets`, `liabilities`, `loans`, `loanPayments`, `networthSnapshots`,
  `creditSubscriptions`, `attachments`, `receiptAnalyses`, `receiptItems`) and
  their existing field names.
- **Self-containment**: attachment binaries travel inline as base64
  (`fileBase64`), so a backup restores with no separate file bundle.

---

## What is explicitly **not** a breaking change

These can happen in a **minor** or **patch** release without a major bump, so
clients must tolerate them:

- **Adding** a new endpoint, or a new optional field to a request/response.
- **Adding** a new field or a new entity array to the backup `data`. Importers
  ignore unknown fields; older apps skip arrays they don't understand.
- **Adding** a new `error.code` value.
- Wording changes to human-readable `error.message` text (localized; never
  parse it — branch on `error.code`).
- Behind-the-scenes changes: new DB migrations, new indexes, performance work,
  new config/env vars with safe defaults.

**Client guidance:** treat unknown JSON fields leniently, branch on `error.code`
rather than `error.message`, and don't depend on undocumented endpoints or on
the numeric database ids in a backup (import re-assigns ids and remaps foreign
keys).

---

## What **would** require a major version (`2.0.0`)

- Removing or renaming a `/api/v1` route, method, request/response field, or
  `error.code`.
- Changing the type/meaning of an existing field.
- Changing the response envelope shape.
- A backup-format change that a `1.x` importer could not read. When that day
  comes, the export's `version` gets a new major (`2.0.0`) and `1.x` apps refuse
  the file with a clear `INCOMPATIBLE_VERSION` error rather than importing it
  incorrectly. A `2.x` app is expected to still read `1.x` backups (one-way
  forward compatibility) or ship a converter.

---

## Versioning of the API namespace itself

The URL namespace is `/api/v1`. A future incompatible API redesign would be
served in parallel under a new namespace (e.g. `/api/v2`) rather than mutating
`/api/v1`, so existing integrations keep working during a transition.

---

*See also: [CHANGELOG.md](../CHANGELOG.md) for the per-release record, and the
README's [API Endpoints](../README.md#api-endpoints) section for the current
surface.*
