# =============================================================================
# HomeLedger - Dockerfile
# Self-contained image: a single process serves the SvelteKit frontend and the
# Fastify API on port 3000. Run with `docker run -p 3000:3000 ...` (no command
# needed). Docker Compose can still override the command for dev with HMR.
# =============================================================================
FROM node:22-alpine

WORKDIR /app

# Native dependencies:
#  - python3/make/g++: build better-sqlite3 and bcrypt
#  - tini: PID 1 init  |  curl: healthcheck
#  - poppler-utils: provides `pdftotext` (text of digital PDF invoices) and
#    `pdftoppm` (rasterizes scanned PDFs so they can be OCR'd).
#    (image receipts use tesseract.js OCR, pure WASM, no system pkg needed).
#    Image pre-processing before OCR uses `sharp`, which pulls its own prebuilt
#    musl libvips binary (@img/sharp-libvips-linuxmusl-*) during npm ci;
#    no `vips` apk package is required.
RUN apk add --no-cache python3 make g++ tini curl poppler-utils

# Copy workspace manifests first for dependency caching.
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/backend/package.json ./packages/backend/
COPY packages/frontend/package.json ./packages/frontend/

# Install the exact dependency versions recorded in the committed lockfile.
RUN npm ci --no-audit --no-fund

# Copy the source code used by both Docker Compose services.
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY packages/backend ./packages/backend
COPY packages/frontend ./packages/frontend
COPY locales ./locales

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
# Primary language for the install (system categories + default UI language).
# Use a supported language pack code; falls back to English if unset/invalid.
ENV DEFAULT_LOCALE=en
# Base currency for consolidated reports; accounts may use other currencies.
ENV DISPLAY_CURRENCY=MXN
# Automated backups: gzip whole-DB snapshots under $DATA_DIR/backups, keeping the
# newest BACKUP_RETENTION. Disable with BACKUP_ENABLED=false.
ENV BACKUP_ENABLED=true
ENV BACKUP_RETENTION=7
ENV BACKUP_CRON="0 3 * * *"
# Registration policy (seeds on first run; admin can change in-app). Safe default:
# only the first user (admin) can register, then registration is closed.
ENV REGISTRATION_MODE=first_user_only

# Supply JWT_SECRET at runtime. An admin may be created through first-user
# registration, or by supplying ADMIN_EMAIL and ADMIN_PASSWORD explicitly.
ENV ALLOW_INSECURE_DEFAULTS=false

RUN mkdir -p /data && chown node:node /data \
  && chown -R node:node /app/packages/frontend/.svelte-kit

USER node

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl --fail --silent http://127.0.0.1:${PORT}/api/v1/health || exit 1

EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--"]

# Default command: start the API, which also serves the built frontend on the
# same port. Compose overrides this for development (tsx watch / vite dev).
CMD ["node", "packages/backend/dist/server.js"]
