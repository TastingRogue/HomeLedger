import { defineConfig } from 'vitest/config';

// Monorepo test config using Vitest "projects" so each package runs under the
// right environment:
//  - backend/shared: plain Node (services, DB, pure logic).
//  - frontend: its own packages/frontend/vitest.config.ts (jsdom + the SvelteKit
//    Vite plugin), so `$lib/*` / `$app/*` virtual imports and browser globals
//    (window/localStorage) resolve exactly as in the app.
// A single `vitest run` at the root then runs the whole monorepo correctly.
export default defineConfig({
  test: {
    name: 'backend',
    globals: true,
    environment: 'node',
    // Backend + shared run under plain Node. The frontend suite runs separately
    // (from packages/frontend) via the root `test` script because the SvelteKit
    // Vite plugin must execute with that package as its working directory to
    // resolve `$lib/*` / `$app/*` and find `src/app.html` when transforming
    // `.svelte` files — it can't be nested as a Vitest project from the repo root.
    include: ['packages/backend/src/**/*.{test,spec}.ts', 'packages/shared/src/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.ts'],
      exclude: ['packages/*/src/**/*.{test,spec}.ts'],
    },
  },
});
