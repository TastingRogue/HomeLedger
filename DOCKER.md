# Docker guide

Docker instructions are maintained in these guides:

- [Installation, configuration and upgrades](docs/INSTALLATION.md)
- [HTTPS, consistent backups and restoration](docs/DEPLOYMENT.md)
- [Local development and rebuilding](CONTRIBUTING.md#setup)

The production image serves the app and API on port 3000. The repository's
Compose configuration is for development: services are `backend` (3000) and
`frontend` (5173).

```bash
# Development Compose, from the repository root
docker compose ps
docker compose logs -f backend frontend
docker compose restart backend

# Standalone production container named homeledger
docker logs -f homeledger
```

## Data permissions

The production image runs as `node`, not root. Named volumes are recommended.
For a bind mount, inspect the image's numeric user/group with
`docker run --rm --entrypoint id irving1flores/homeledger:latest node` and grant
that user write access to the mounted data directory on the host. Stop the app
before changing ownership. Apply changes only to the verified data directory;
do not change it to `root:root` or make it world-writable. Host ACLs and Docker
Desktop file sharing may also control access.

Do not use `docker compose down -v` to troubleshoot: it deletes persistent data.
Use the deployment guide's backup procedure before replacing storage.
