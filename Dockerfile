# =============================================================================
# HomeLedger - Dockerfile
# Development containers: backend API on 3000 + Svelte/Vite frontend on 5173
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

# Build shared once so the backend and frontend can resolve the workspace package.
RUN npm run build -w packages/shared

ENV NODE_ENV=development
ENV HOST=0.0.0.0
ENV DATA_DIR=/data

RUN mkdir -p /data

EXPOSE 3000 5173

ENTRYPOINT ["/sbin/tini", "--"]
