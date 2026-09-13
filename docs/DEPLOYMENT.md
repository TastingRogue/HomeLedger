# Deployment & Operations

Production guidance for running HomeLedger behind a reverse proxy with HTTPS,
and for backing up, restoring, and upgrading your instance.

For getting the container running in the first place (Docker run, Docker
Compose, Docker Desktop) and the full environment-variable reference, start with
the [README](../README.md#docker-recommended-for-production). This document
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
      JWT_SECRET: "your-strong-random-secret-min-32-chars"
      TRUST_PROXY: "true"
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.homeledger.rule=Host(`homeledger.example.com`)"
      - "traefik.http.routers.homeledger.entrypoints=websecure"
      - "traefik.http.routers.homeledger.tls.certresolver=le"
      - "traefik.http.services.homeledger.loadbalancer.server.port=3000"
```

Traefik forwards the `X-Forwarded-*` headers by default.

### Tell HomeLedger it's behind a proxy

Behind any of the above, set these environment variables on the HomeLedger
container (see the [README env table](../README.md#environment-variables) for
the full list):

| Variable | Set it to | Why |
|----------|-----------|-----|
| `TRUST_PROXY` | `true` | Makes HomeLedger trust `X-Forwarded-*`, so rate limiting and logs use the **real client IP** instead of the proxy's. Leave unset for direct connections (avoids IP spoofing). |
| `CORS_ORIGIN` | `https://homeledger.example.com` | Restricts browser API calls to your domain. Optional — if unset, HomeLedger reflects the request origin, which is fine for a single-domain deploy. |

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
  Downloads `smart-finance-backup-<date>.json`.
- **Import:** **Settings → Data & Backup → Import**. Selecting a file first shows
  a **non-destructive preview** — a per-entity table of what's in the backup vs.
  what you currently have (and will be replaced), plus warnings for anything that
  would be skipped — so you confirm before the replace. Import is atomic and
  remaps ids safely, so restoring never collides with other users' data.

Use this for portability ("give me my data"), moving a user between instances,
or a personal restore point.

### 2. Automated whole-database snapshots

**What:** gzip-compressed copies of the **entire** SQLite database (all users +
system data) — the disaster-recovery mechanism. **Who:** admin only.

- Runs on a schedule (a cron job), controlled by env vars — see the
  [README env table](../README.md#environment-variables):
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

**What:** a raw tar of the `homeledger-data` volume (the `.db` files, the
`attachments/` folder, and the `backups/` snapshots). Useful for off-host copies
or migrating the whole instance to a new server.

```bash
# Back up the volume to a tarball in the current directory
docker run --rm -v homeledger-data:/data -v "$(pwd)":/backup \
  alpine tar czf /backup/homeledger-volume.tar.gz -C /data .

# Restore it (stop HomeLedger first so the DB isn't mid-write)
docker stop homeledger
docker run --rm -v homeledger-data:/data -v "$(pwd)":/backup \
  alpine tar xzf /backup/homeledger-volume.tar.gz -C /data
docker start homeledger
```

### Which one should I use?

| Goal | Use |
|------|-----|
| "Export my own data" / move one user | JSON export/import (#1) |
| Scheduled protection against DB corruption | Automated snapshots (#2) — on by default |
| Full off-host copy / migrate the whole server | Volume tar (#3) |
| **Before upgrading** | A JSON export **or** trigger a snapshot (#2) |

---

## Upgrading & rolling back

HomeLedger upgrades are designed to be safe: your data lives on the
`homeledger-data` volume, and the app runs any pending schema migrations
automatically on startup (migrations are additive; running an old database
against a newer image just brings it up to date). The full upgrade commands are
in the [README](../README.md#upgrading).

**Before every upgrade:** take a backup (JSON export, or an admin snapshot).

**Rolling back** an image is straightforward because the schema changes are
additive — a newer database generally still works with a slightly older image.
If you need to fully revert data, restore a snapshot (#2) or the volume tar (#3)
taken before the upgrade. Pin a specific version instead of `latest` if you want
deterministic rollbacks:

```bash
docker pull irving1flores/homeledger:1.0.0   # example pinned tag
```

---

## Account recovery

Locked out (forgot the admin password, disabled the only admin)? HomeLedger
ships an **admin recovery CLI** that runs directly against the database, no email
required — see [README → Account Recovery](../README.md#account-recovery-locked-out).
An admin who can still log in can also reset another user's password from
**Settings → Users**.
