# Installation and maintenance

[← HomeLedger](../README.md) · [HTTPS, backups and deployment](DEPLOYMENT.md)

The fastest way to run HomeLedger is Docker — no toolchain to install. For local
development from source (Node) see **[Development](../CONTRIBUTING.md#setup)**.

## Docker (recommended for production)

**Option 1 — Prebuilt image from Docker Hub**

A multi-arch image is published to Docker Hub on every push to `main`. The
image is self-contained: a single process serves both the web app and the API
on port 3000, so it runs with no extra command.

Create `homeledger.env` **once**, in a private folder outside source control.
The commands below use Bash and Docker's Node image to generate a random secret:

```bash
(umask 077; docker run --rm node:22-alpine node -e 'console.log("JWT_SECRET=" + require("node:crypto").randomBytes(32).toString("hex"))' > homeledger.env)
```

PowerShell equivalent:

```powershell
$secretBytes = New-Object byte[] 32
$secretGenerator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$secretGenerator.GetBytes($secretBytes)
$secretGenerator.Dispose()
"JWT_SECRET=$([Convert]::ToBase64String($secretBytes))" | Set-Content -Encoding ascii homeledger.env
```

Verify the command succeeded and the file contains a `JWT_SECRET=` value before
starting. Keep this file private and preserve it for upgrades; **do not regenerate
it on each restart**. Optionally add `DEFAULT_LOCALE=en`, `DISPLAY_CURRENCY=USD`,
or `ADMIN_EMAIL` and a strong `ADMIN_PASSWORD` (one `KEY=value` per line).
Without admin bootstrap credentials, register the first account immediately;
it becomes administrator. Do this before exposing the instance publicly.

```bash
docker pull irving1flores/homeledger:latest

docker run -d \
  -p 3000:3000 \
  -v homeledger-data:/data \
  --env-file homeledger.env \
  --name homeledger \
  irving1flores/homeledger:latest

# Then open http://localhost:3000 and register the first administrator.
```

**What each flag does.** `JWT_SECRET` is required. Set `ADMIN_PASSWORD` to bootstrap an administrator, or register the first account in the app.

| Flag | What it does | Your options |
|------|--------------|--------------|
| `-p 3000:3000` | Publishes the app + API on host port 3000. Without it the container runs but you can't reach it. | Any `HOST:3000` (e.g. `-p 8080:3000` to use `localhost:8080`) |
| `-v homeledger-data:/data` | Persists the SQLite DB + attachments in a named volume, so data survives rebuilds. | A named volume, or a host path (`-v /my/folder:/data`) |
| `--env-file homeledger.env` | Loads your private configuration. Preserve the same file for updates. | One `KEY=value` per line; `-e` flags below are alternatives |
| `-e JWT_SECRET=…` | **Required.** Random secret (≥32 chars) used to sign login tokens. | Any long random string |
| `-e ADMIN_EMAIL=…` | Email for the first admin user, created on first run. | Any email (default `admin@homeledger.local`) |
| `-e ADMIN_PASSWORD=…` | Optional password for an administrator created at startup. | A strong password |
| `-e DEFAULT_LOCALE=…` | Starting UI language + the language your default categories are seeded in. Each user can change their own later in **Settings**. | Any [supported locale](../README.md#supported-languages-and-translation-credits) (default `en`) |
| `-e DISPLAY_CURRENCY=…` | The base currency for consolidated totals. Accounts can use other currencies with manual exchange rates. | `MXN` `USD` `EUR` `GBP` `COP` `ARS` `CLP` `PEN` `BRL` (default `MXN`) |

> :bulb: The `\` at the end of each line is a **bash** line-continuation. On
> **Windows PowerShell**, use a backtick `` ` `` instead, or put the whole
> `docker run` on a single line.
>
> The first account created becomes the admin. `DEFAULT_LOCALE` / `DISPLAY_CURRENCY`
> are optional — see the full [Environment Variables](#environment-variables) table.

## Run from Docker Desktop (no command line)

The image requires a strong `JWT_SECRET` before it can start.

1. Open **Images** and click **Run** on `irving1flores/homeledger`.
2. Expand **Optional settings** and map host port `3000` to container port `3000`.
3. Mount a persistent folder or volume at `/data`.
4. Under **Environment variables**, set `JWT_SECRET` to a random value of at
   least 32 characters. Optionally set `ADMIN_EMAIL` and `ADMIN_PASSWORD` to
   create an administrator at startup.
5. Optionally set `DEFAULT_LOCALE` (see [supported languages](../README.md#supported-languages-and-translation-credits)) and `DISPLAY_CURRENCY`.
6. Click **Run** and open <http://localhost:3000>. Without a bootstrapped admin,
   register the first account to become the administrator.

**Option 2 — Local development with Docker Compose**

This repository's Compose setup runs development services; use the standalone
image above for production. Service names are `backend` and `frontend`.

```bash
# Clone and configure
git clone https://github.com/TastingRogue/HomeLedger.git
cd HomeLedger
cp .env.example .env
# Edit .env: set JWT_SECRET (required) and ADMIN_PASSWORD (optional admin bootstrap), and optionally
# DEFAULT_LOCALE (see supported languages) and DISPLAY_CURRENCY (MXN|USD|…). Compose reads .env,
# so this file — not -e flags — is where you configure this deployment.

# Start with Docker Compose (backend on 3000, frontend on 5173)
docker compose up -d
```

## Environment Variables

The Docker image has no built-in credentials. Supply `JWT_SECRET` at runtime;
production startup rejects missing or known insecure values.

| Variable | Description | Default (Docker image) |
|----------|-------------|------------------------|
| `JWT_SECRET` | Secret key for signing tokens (min 32 chars) | unset — **required** |
| `CORS_ORIGIN` | Comma-separated allowlist for cross-origin browser clients. Same-origin use needs no CORS setting. | unset (CORS disabled) |
| `ADMIN_EMAIL` | Admin user email | `admin@homeledger.local` |
| `ADMIN_PASSWORD` | Admin password | unset — optional admin bootstrap |
| `ALLOW_INSECURE_DEFAULTS` | Explicitly bypass startup security checks for disposable demos only. | `false` |
| `TRUST_PROXY` | Trust `X-Forwarded-*` from a reverse proxy so `request.ip` (rate limiting/logging) is the real client. Set to `true` when behind Nginx/Traefik/Caddy; leave unset for direct connections. | unset (disabled) |
| `DEFAULT_LOCALE` | Primary language for the install (the language each user's default categories are seeded in at sign-up, and the UI's default language before any user picks one): see [supported languages](../README.md#supported-languages-and-translation-credits). Users can still switch their own language and rename/delete their own categories. | `en` (falls back to English if unset/invalid) |
| `DISPLAY_CURRENCY` | Base currency for consolidated totals (`MXN`, `USD`, `EUR`, `GBP`, `COP`, `ARS`, `CLP`, `PEN`, `BRL`). Accounts have their own currency and manual exchange rate to base. | `MXN` |
| `LOG_LEVEL` | Server log verbosity (pino): `fatal`, `error`, `warn`, `info`, `debug`, `trace`, `silent` | `info` |
| `TZ` | Timezone | `America/Mexico_City` |
| `PORT` | Server port (app + API) | `3000` |
| `DATA_DIR` | Persistent data directory: SQLite database **and** uploaded attachments (`$DATA_DIR/attachments`) | `/data` (Docker) · `./data` (local) |
| `BACKUP_ENABLED` | Enable the scheduled backup job (gzip whole-DB snapshots under `$DATA_DIR/backups`) | `true` |
| `BACKUP_RETENTION` | How many snapshots to keep; older ones are rotated out | `7` |
| `BACKUP_CRON` | Cron schedule for automated backups (server timezone) | `0 3 * * *` (daily 03:00) |
| `REGISTRATION_MODE` | Who may register: `first_user_only` (safe default — first user bootstraps admin, then closed), `open`, or `closed`. Admin can change it in-app; env only seeds the initial value. | `first_user_only` |
| `REGISTRATION_ALLOWLIST` | Optional comma-separated email allowlist; when set and mode is `open`, only these emails may register | unset (no allowlist) |

> :floppy_disk: **Data persistence.** Everything under `DATA_DIR` — the database
> and receipt/invoice attachments — lives on the `homeledger-data` volume, so it
> survives `docker compose up --build --force-recreate` and container rebuilds.
> Deleting the volume (`docker compose down -v`) is what wipes your data.

## Account Recovery (locked out?)

If you forget the admin password, disable the only admin, or somehow end up with
no admin, use the built-in **admin recovery CLI**. It runs directly against the
database (no email needed) and works headless, so you can always regain access
**without wiping your data**.

```bash
# Docker (against a running container):
docker exec -it homeledger node packages/backend/dist/cli/admin.js list-users
docker exec -it homeledger node packages/backend/dist/cli/admin.js reset-password admin@homeledger.local
# ^ prints a new strong password once. Or pass your own:
docker exec -it homeledger node packages/backend/dist/cli/admin.js reset-password admin@homeledger.local 'MyNewPassw0rd'

# Local (from the repo root):
npm run admin -w packages/backend -- list-users
npm run admin -w packages/backend -- reset-password admin@homeledger.local
```

Commands: `list-users`, `reset-password <email> [password]`,
`create-admin <email> [password] [name]`, `promote <email>` (make a user admin),
`enable <email>` (re-enable a disabled account). If you omit the password, a
strong one is generated and printed once — copy it, then change it in-app.

> An admin who **can** log in can also reset another user's password from the
> app (admin user-management). The CLI is the fallback for when nobody can log in.
>
> :email: **Email-based reset (optional, not built in):** HomeLedger is
> local-first and ships no SMTP dependency, so there is no "email me a reset
> link" flow by default. The CLI above is the supported recovery path. An
> optional SMTP flow could be added later for setups that want it.

## Upgrading

Read the target release notes and make a [consistent backup](DEPLOYMENT.md#backup--restore)
of the full instance before upgrading. Preserve the image version, environment
file and mount configuration used by the old container. A per-user JSON export
alone does not preserve the entire installation.

```bash
# Standalone image: use the SAME private environment file and data mount.
docker pull irving1flores/homeledger:latest
docker stop homeledger
docker rm homeledger
docker run -d -p 3000:3000 -v homeledger-data:/data \
  --env-file homeledger.env --name homeledger irving1flores/homeledger:latest

# Development Compose: preserve .env and the existing project/volume name.
git pull
docker compose up -d --build --force-recreate
```

Reapply any custom ports, networks, restart policy or proxy labels when recreating
a standalone container. Migrations run automatically at startup. Check logs and
`/api/v1/health`, then confirm your accounts and receipts are accessible.
Automatic migration does not guarantee compatibility with older images:
see [rollback requirements](DEPLOYMENT.md#upgrading--rolling-back).
