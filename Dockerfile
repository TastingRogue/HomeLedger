# =============================================================================
# HomeLedger - Dockerfile
# Self-contained image: a single process serves the SvelteKit frontend and the
# Fastify API on port 3000. Run with `docker run -p 3000:3000 ...` (no command
# needed). Docker Compose can still override the command for dev with HMR.
# =============================================================================
FROM node:22-alpine

WORKDIR /app

# Native dependencies required by better-sqlite3 and bcrypt.
RUN apk add --no-cache python3 make g++ tini curl

# Copy workspace manifests first for dependency caching.
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/backend/package.json ./packages/backend/
COPY packages/frontend/package.json ./packages/frontend/

# Regenerate dependencies from scratch inside the Alpine/musl container.
# A lockfile generated on another OS (e.g. Windows) omits the platform-specific
# optional native binaries this image needs (@rollup/rollup-linux-x64-musl,
# @esbuild/linux-x64, better-sqlite3). Removing the lockfile forces npm to
# re-resolve and install the correct musl binaries for this platform.
# See https://github.com/npm/cli/issues/4828
RUN rm -f package-lock.json && npm install --no-audit --no-fund

# Copy the source code used by both Docker Compose services.
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY packages/backend ./packages/backend
COPY packages/frontend ./packages/frontend

# Build every workspace so the image can run standalone:
#  - shared: compiled types/utilities used by backend and frontend
#  - frontend: SvelteKit (adapter-node) emits packages/frontend/build/handler.js
#  - backend: tsc emits packages/backend/dist/server.js, which mounts the
#    frontend handler when packages/frontend/build/handler.js is present.
RUN npm run build -w packages/shared \
  && npm run build -w packages/frontend \
  && npm run build -w packages/backend

# tsc only emits .js; copy the Drizzle migration files (.sql + meta/_journal.json)
# next to the compiled connection.js so migrations run from dist at startup.
RUN cp -r packages/backend/src/db/migrations packages/backend/dist/db/migrations

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV DATA_DIR=/data

# Default runtime config so the image runs out of the box (e.g. Docker Desktop
# "Run" with no extra settings): it boots, creates an admin user and lets you
# log in. These are INSECURE demo defaults — override them in production via
# `-e JWT_SECRET=... -e ADMIN_EMAIL=... -e ADMIN_PASSWORD=...`.
ENV JWT_SECRET=insecure-dev-secret-change-me-min-32-characters-long
ENV ADMIN_EMAIL=admin@homeledger.local
ENV ADMIN_PASSWORD=changeme123

RUN mkdir -p /data

EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--"]

# Default command: start the API, which also serves the built frontend on the
# same port. Compose overrides this for development (tsx watch / vite dev).
CMD ["node", "packages/backend/dist/server.js"]
