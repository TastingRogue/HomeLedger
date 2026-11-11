# Deployment & Operations

Production guidance for running HomeLedger behind a reverse proxy with HTTPS,
and for backing up, restoring, and upgrading your instance.

For getting the container running in the first place (Docker run, Docker
Compose, Docker Desktop) and the full environment-variable reference, start with
the [installation guide](INSTALLATION.md#docker-recommended-for-production). This document
covers what comes **after** that: putting it on the public internet safely and
keeping your data recoverable.

---

## Table of contents

- [Reverse proxy + HTTPS](#reverse-proxy--https)
  - [Caddy (easiest — automatic HTTPS)](#caddy-easiest--automatic-https)
  - [Nginx (+ Let's Encrypt / certbot)](#nginx--lets-encrypt--certbot)
  - [Traefik (Docker labels)](#traefik-docker-labels)
  - [Tell HomeLedger it's behind a proxy](#tell-homeledger-its-behind-a-proxy)
- [Backup & restore](#backup--restore)
  - [1. Per-user data export/import (JSON)](#1-per-user-data-exportimport-json)
  - [2. Automated whole-database snapshots](#2-automated-whole-database-snapshots)
  - [3. Volume-level file backup](#3-volume-level-file-backup)
  - [Which one should I use?](#which-one-should-i-use)
- [Upgrading & rolling back](#upgrading--rolling-back)
- [Account recovery](#account-recovery)

---

## Reverse proxy + HTTPS

HomeLedger serves the web app **and** the API from a single HTTP port
(`3000` by default) — one process, no separate frontend/backend hosts. So a
reverse proxy only needs to forward one upstream. HomeLedger uses stateless JWT
auth over normal HTTP requests; there are **no WebSockets or SSE**, so no special
upgrade/streaming configuration is required.

The examples below assume the container is reachable at `localhost:3000` on the
proxy host (adjust the upstream if it runs elsewhere, e.g. another container or
a LAN IP). Replace `homeledger.example.com` with your domain.

### Caddy (easiest — automatic HTTPS)

Caddy obtains and renews Let's Encrypt certificates for you with zero extra
config. This is the least-effort option.

```caddy
# /etc/caddy/Caddyfile
homeledger.example.com {
    reverse_proxy localhost:3000
}
```

Caddy sets `X-Forwarded-For` / `X-Forwarded-Proto` automatically. Reload with
`caddy reload` (or restart the Caddy service/container).

### Nginx (+ Let's Encrypt / certbot)

```nginx
# /etc/nginx/sites-available/homeledger.conf
server {
    listen 80;
    server_name homeledger.example.com;
    # Let certbot serve the ACME challenge, redirect everything else to HTTPS.
    location / { return 301 https://$host$request_uri; }
}

server {
    listen 443 ssl;
    http2 on;
    server_name homeledger.example.com;

    # Managed by certbot (see below); paths shown for reference.
    ssl_certificate     /etc/letsencrypt/live/homeledger.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/homeledger.example.com/privkey.pem;

    # Attachments/receipts and JSON backups can be large — raise the upload cap.
    client_max_body_size 25m;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Issue and auto-renew the certificate with certbot:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d homeledger.example.com
# certbot edits the server block with the real cert paths and sets up renewal.
```

The `X-Forwarded-Proto` header is important: it tells HomeLedger the original
request was HTTPS. Pair it with `TRUST_PROXY=true` (below).

### Traefik (Docker labels)

If you already run Traefik as your Docker ingress, add labels to the HomeLedger
service in `docker-compose.yml` (assumes a `websecure` entrypoint on 443 and a
configured ACME cert resolver named `le`):

```yaml
services:
  homeledger:
    image: irving1flores/homeledger:latest
    volumes:
      - homeledger-data:/data
    environment:
      JWT_SECRET: "${JWT_SECRET:?Set a generated JWT_SECRET in your private .env}"
      TRUST_PROXY: "true"
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.homeledger.rule=Host(`homeledger.example.com`)"
      - "traefik.http.routers.homeledger.entrypoints=websecure"
      - "traefik.http.routers.homeledger.tls.certresolver=le"
      - "traefik.http.services.homeledger.loadbalancer.server.port=3000"
```

This is a separate production Compose example, not the repository's development
Compose file. Declare `volumes: { homeledger-data: {} }` at the top level and join
the existing Traefik network. Generate the secret as described in
[Installation](INSTALLATION.md#docker-recommended-for-production); preserve it.

Traefik forwards the `X-Forwarded-*` headers by default.

### Tell HomeLedger it's behind a proxy

Behind any of the above, set these environment variables on the HomeLedger
container (see the [installation environment table](INSTALLATION.md#environment-variables) for
the full list):

| Variable | Set it to | Why |
|----------|-----------|-----|
| `TRUST_PROXY` | `true` | Makes HomeLedger trust `X-Forwarded-*`, so rate limiting and logs use the **real client IP** instead of the proxy's. Leave unset for direct connections (avoids IP spoofing). |
| `CORS_ORIGIN` | `https://homeledger.example.com` | Allowlist for cross-origin browser clients. Leave unset for same-origin deployment; CORS is disabled by default, not reflected. |

> :warning: Only enable `TRUST_PROXY` when a proxy really is in front of
> HomeLedger. If you enable it on a directly-exposed instance, clients can spoof
> `X-Forwarded-For` and evade rate limiting.

---

## Backup & restore

HomeLedger gives you **three** independent ways to protect data. They serve
different purposes — you can use more than one.

### 1. Per-user data export/import (JSON)

**What:** a single JSON file containing one user's data (accounts,
transactions, budgets, goals, categories, rules, attachments inlined as base64,
receipts, etc.). **Who:** any user, for their own data.

- **Export:** **Settings → Data & Backup → Export** (or `POST /api/v1/backup/export`).
  Downloads `homeledger-backup-<date>.json`.
- **Import:** **Settings → Data & Backup → Import**. Selecting a file first shows
  a **non-destructive preview** — a per-entity table of what's in the backup vs.
  what you currently have (and will be replaced), plus warnings for anything that
  would be skipped — so you confirm before the replace. Import is atomic and
  remaps ids safely, so restoring never collides with other users' data.

Use this for portability ("give me my data"), moving a user between instances,
or a personal restore point.

### 2. Automated whole-database snapshots

**What:** gzip-compressed copies of the **entire** SQLite database (all users +
system data). **Who:** admin only. SQLite's online backup API produces a
consistent database snapshot while the app runs. Snapshots do **not** contain
attachment files or external configuration/secrets. Keep a full volume backup
and your private deployment configuration for complete disaster recovery; copy
backups off the source disk.

- Runs on a schedule (a cron job), controlled by env vars — see the
  [installation environment table](INSTALLATION.md#environment-variables):
  - `BACKUP_ENABLED` (default `true`)
  - `BACKUP_CRON` (default `0 3 * * *` — daily 03:00, server timezone)
  - `BACKUP_RETENTION` (default `7` — older snapshots are rotated out)
- Snapshots are written to `\$DATA_DIR/backups/homeledger-<timestamp>.db.gz`, on
  the same persistent volume as the database.
- **From the app (admin):** **Settings → Backups** lets an admin list snapshots,
  **Create backup now**, and **Restore** a snapshot.

> :rotating_light: **Restore is destructive and instance-wide.** It replaces the
> whole database for **all** users. Before swapping, HomeLedger writes a
> `.pre-restore` safety copy of the current database next to it, validates the
> snapshot, and then reopens the connection. After a restore, reload the app and
> log in again. The restore dialog requires you to type `RESTORE` to confirm.

### 3. Volume-level file backup

**What:** an offline copy of the database, attachments and snapshot files.
Stop **all** processes writing to this storage before archiving it. A tar of a
live SQLite/WAL directory is not a guaranteed consistent backup.

These commands use Bash. First choose the container that owns `/data`:

```bash
# Standalone installation
DATA_CONTAINER=homeledger
# OR development Compose, from the original project directory:
# DATA_CONTAINER=$(docker compose ps -q backend)

# Inspect the actual mount. Compose normally prefixes volume names with its
# project name; do not assume its volume is literally homeledger-data.
docker inspect --format '{{range .Mounts}}{{if eq .Destination "/data"}}{{.Type}} {{.Name}} {{.Source}}{{end}}{{end}}' "$DATA_CONTAINER"
```

Verify the mount points to the intended data. Pre-pull the archive helper so a
network failure does not extend downtime. Create a new private backup directory:

```bash
docker pull alpine:3.22
mkdir -m 700 homeledger-backup
BACKUP_DIR="$(pwd)/homeledger-backup"
docker stop "$DATA_CONTAINER" || exit 1
# Continue only after stop succeeds. --volumes-from uses the actual mount.
docker run --rm --volumes-from "$DATA_CONTAINER":ro \
  --mount "type=bind,src=$BACKUP_DIR,dst=/backup" \
  alpine:3.22 tar czf /backup/homeledger-volume.tar.gz -C /data . || { docker start "$DATA_CONTAINER"; exit 1; }
# Check that tar succeeded and inspect the archive before accepting the backup.
docker run --rm --mount "type=bind,src=$BACKUP_DIR,dst=/backup,readonly" \
  alpine:3.22 tar tzf /backup/homeledger-volume.tar.gz
docker start "$DATA_CONTAINER"
```

Keep the environment file, image version/digest and deployment configuration
privately alongside the backup. They are not stored in `/data`. Backups contain
financial data and authentication material; restrict access on the backup host.

**Restore into a new empty volume**, keeping the original available for recovery.
Do not extract over a running or populated database directory. For example:

```bash
# BACKUP_DIR must identify the verified backup directory above.
# Pick a NEW volume name and verify it did not already exist.
docker volume create homeledger-restore-check
docker run --rm -v homeledger-restore-check:/data \
  --mount "type=bind,src=$BACKUP_DIR,dst=/backup,readonly" \
  alpine:3.22 sh -c 'test -z "$(ls -A /data)" && tar xzf /backup/homeledger-volume.tar.gz -C /data'
```

Start an isolated instance with the **matching original image version** and
private configuration, binding a different loopback port and mounting only the
restored volume. Check health, login, balances and receipt downloads. Keep it
disconnected from integrations to avoid duplicate webhook deliveries. Once
verified, stop the old instance and recreate your deployment with the restored
mount and original configuration. Do not discard the old volume until recovery
has been confirmed. Preserve file ownership: the production process runs as
`node`; see [permissions](../DOCKER.md#data-permissions).

### Which one should I use?

| Goal | Use |
|------|-----|
| "Export my own data" / move one user | JSON export/import (#1) |
| Scheduled protection against DB corruption | Automated snapshots (#2) — on by default |
| Full off-host copy / migrate the whole server | Volume tar (#3) |
| **Before upgrading** | Full consistent volume backup (#3), original image version and private configuration; optionally also export user data |

---

## Upgrading & rolling back

Migrations run automatically when a newer image opens the database. Read the
target release notes and take a complete backup before upgrading; use the
[installation guide](INSTALLATION.md#upgrading) to preserve configuration.

Do not assume an older image can read a database modified by a newer release.
API/JSON compatibility does not guarantee database downgrade compatibility.
Unless the release explicitly supports rollback, restore the **pre-upgrade**
backup into a fresh volume and use its matching image and configuration. Changes
made after that backup will not be present. Keep the failed/newer volume intact
until recovery is verified.

Desktop has its own downgrade guard and can refuse newer profile data. Do not
bypass that check: preserve the profile and use a compatible desktop version or
its pre-upgrade backup. Server Docker commands do not restore a desktop profile.

---

## Account recovery

Locked out (forgot the admin password, disabled the only admin)? HomeLedger
ships an **admin recovery CLI** that runs directly against the database, no email
required — see [Installation → Account recovery](INSTALLATION.md#account-recovery-locked-out).
An admin who can still log in can also reset another user's password from
**Settings → Users**.
