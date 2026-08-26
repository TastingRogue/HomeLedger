# =============================================================================
# HomeLedger - Multi-stage Dockerfile
# Produces a minimal production image (~80-120MB) with backend API + frontend
# Supports multi-arch: linux/amd64, linux/arm64
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Install dependencies
# ---------------------------------------------------------------------------
FROM node:20-alpine AS deps

WORKDIR /app

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
FROM node:20-alpine AS build

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/backend/node_modules ./packages/backend/node_modules
COPY --from=deps /app/packages/frontend/node_modules ./packages/frontend/node_modules

# Copy source code
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY packages/backend ./packages/backend
COPY packages/frontend ./packages/frontend

# Build shared → backend → frontend (order matters)
RUN npm run build

# ---------------------------------------------------------------------------
# Stage 3: Production image
# ---------------------------------------------------------------------------
FROM node:20-alpine AS production

WORKDIR /app

# Install only what's needed at runtime
# better-sqlite3 needs build tools only if prebuilt binaries aren't available
RUN apk add --no-cache tini

# Create non-root user
RUN addgroup -S smartfinance && adduser -S smartfinance -G smartfinance

# Copy package files for production dependency install
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/backend/package.json ./packages/backend/

# Install production dependencies only
RUN npm ci --omit=dev --workspace=packages/backend --workspace=packages/shared \
    && npm cache clean --force

# Copy built artifacts
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/backend/dist ./packages/backend/dist
COPY --from=build /app/packages/backend/src/db/migrations ./packages/backend/dist/db/migrations
COPY --from=build /app/packages/frontend/build ./packages/frontend/build

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
