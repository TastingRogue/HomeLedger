# =============================================================================
# HomeLedger - Multi-stage Dockerfile
# Produces a minimal production image (~80-120MB) with backend API + frontend
# Supports multi-arch: linux/amd64, linux/arm64
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Install all dependencies
# ---------------------------------------------------------------------------
FROM node:22-alpine AS deps

WORKDIR /app

# Install build dependencies for native modules (better-sqlite3, bcrypt)
RUN apk add --no-cache python3 make g++

# Copy package files for dependency installation
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/backend/package.json ./packages/backend/
COPY packages/frontend/package.json ./packages/frontend/

# Install all dependencies (including devDependencies for build)
RUN npm ci

# ---------------------------------------------------------------------------
# Stage 2: Build all packages
# ---------------------------------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /app

# Copy all dependencies from deps stage (npm workspaces hoists to root)
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY packages/backend ./packages/backend
COPY packages/frontend ./packages/frontend

# Build shared → backend → frontend (order matters)
RUN npm run build

# Prune dev dependencies for production
RUN npm prune --omit=dev

# ---------------------------------------------------------------------------
# Stage 3: Final production image
# ---------------------------------------------------------------------------
FROM node:22-alpine AS production

WORKDIR /app

# Install only runtime dependencies
RUN apk add --no-cache tini curl

# Create non-root user
RUN addgroup -S smartfinance && adduser -S smartfinance -G smartfinance

# Copy all built artifacts and pruned node_modules from build stage
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared ./packages/shared
COPY --from=build /app/packages/backend ./packages/backend
COPY --from=build /app/packages/frontend ./packages/frontend

# Copy database migrations (not compiled by TypeScript)
COPY packages/backend/src/db/migrations ./packages/backend/dist/db/migrations

# Copy root package files for reference
COPY package.json package-lock.json ./

# Create data directory for SQLite database
RUN mkdir -p /data && chown -R smartfinance:smartfinance /data

# Environment defaults
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV DATA_DIR=/data

# Expose API port
EXPOSE 3000

# Use tini as init system for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Switch to non-root user
USER smartfinance

# Start the backend server (which also serves the frontend in production)
CMD ["node", "packages/backend/dist/server.js"]
