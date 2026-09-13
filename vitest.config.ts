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
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.ts'],
      exclude: ['packages/*/src/**/*.{test,spec}.ts'],
    },
    projects: [
      {
        // Backend + shared: Node environment.
        test: {
          name: 'backend',
          globals: true,
          environment: 'node',
          include: ['packages/backend/src/**/*.{test,spec}.ts', 'packages/shared/src/**/*.{test,spec}.ts'],
        },
      },
      // Frontend brings its own config (jsdom + sveltekit plugin).
      './packages/frontend/vitest.config.ts',
    ],
  },
});
