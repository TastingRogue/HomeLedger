# Docker Deployment Guide

## Quick Start

### Using Docker Compose (Recommended)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/irving1flores/homeledger.git
   cd homeledger
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and configure:
   - `JWT_SECRET`: Generate with `openssl rand -base64 32`
   - `ADMIN_EMAIL` and `ADMIN_PASSWORD`: Your admin credentials
   - `TZ`: Your timezone (default: America/Mexico_City)

3. **Start the application:**
   ```bash
   docker compose up --pull always -d
   ```

4. **Access the application:**
   - Open http://localhost:3000
   - Log in with your admin credentials from `.env`

5. **View logs:**
   ```bash
   docker compose logs -f homeledger
   ```

6. **Stop the application:**
   ```bash
   docker compose down
   ```

---

## Docker Compose Commands

### Basic Operations

```bash
# Start with latest image
docker compose up --pull always -d

# View running containers
docker compose ps

# View logs
docker compose logs -f homeledger

# Stop all services
docker compose down

# Stop and remove all data
docker compose down -v
```

### Troubleshooting

```bash
# Check container health
docker compose ps homeledger

# View full logs
docker compose logs homeledger

# Execute command in running container
docker compose exec homeledger /bin/sh

# Rebuild image locally
docker compose build --no-cache

# Restart container
docker compose restart homeledger
```

---

## Direct Docker Push (CI/CD)

To push the pre-built image to Docker Hub:

```bash
# Tag the image
docker tag homeledger:latest irving1flores/homeledger:latest

# Log in to Docker Hub
docker login

# Push the image
docker push irving1flores/homeledger:latest
```

> Note: GitHub Actions automatically builds and pushes on every commit to `main` or tag push.

---

## Image Details

- **Base Image**: Node 22-Alpine
- **Size**: ~78.6 MB compressed, 353 MB on disk
- **Architecture**: linux/amd64, linux/arm64 (with multi-arch builds)
- **Database**: SQLite (persistent volume at `/data`)
- **Health Check**: HTTP endpoint at `/api/v1/health`

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Node environment |
| `PORT` | `3000` | API port |
| `HOST` | `0.0.0.0` | Listen address |
| `JWT_SECRET` | — | JWT signing secret (required) |
| `ADMIN_EMAIL` | `admin@homeledger.local` | Initial admin email |
| `ADMIN_PASSWORD` | — | Initial admin password |
| `DATA_DIR` | `/data` | Database and attachments directory |
| `TZ` | `America/Mexico_City` | Timezone |

---

## Volume Management

The `homeledger-data` named volume stores:
- SQLite database (`*.db`)
- User file attachments
- Application backups

### Backup and Restore

```bash
# Backup volume to tar
docker run --rm -v homeledger-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/homeledger-backup.tar.gz -C /data .

# Restore from backup
docker run --rm -v homeledger-data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/homeledger-backup.tar.gz -C /data
```

---

## Production Considerations

### Resource Limits

Add to `docker-compose.yml` under `homeledger` service:

```yaml
deploy:
  resources:
    limits:
      cpus: '1'
      memory: 1G
    reservations:
      cpus: '0.5'
      memory: 512M
```

### Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name homeledger.example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### SSL/TLS (with Caddy)

```caddy
homeledger.example.com {
    reverse_proxy localhost:3000
}
```

---

## CI/CD Setup

GitHub Actions automatically builds and pushes on:
- Push to `main` or `develop` branches
- Tag pushes (`v*`)
- PR builds (test only, no push)

**Required Secrets** (set in GitHub):
- `DOCKER_USERNAME`: Docker Hub username
- `DOCKER_PASSWORD`: Docker Hub token or password

---

## Troubleshooting

### Container won't start
```bash
docker compose logs homeledger
```
Check for JWT_SECRET not set or missing required env vars.

### Database is locked
Restart the container:
```bash
docker compose restart homeledger
```

### Permission denied errors
Ensure the volume has proper ownership:
```bash
docker compose exec homeledger chown -R smartfinance:smartfinance /data
```

### Port already in use
Change the port in `docker-compose.yml`:
```yaml
ports:
  - "8080:3000"  # Access on http://localhost:8080
```

---

## Support

For issues, questions, or contributions:
- GitHub: https://github.com/irving1flores/homeledger
- Docker Hub: https://hub.docker.com/r/irving1flores/homeledger
