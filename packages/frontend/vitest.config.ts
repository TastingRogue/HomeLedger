import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Frontend test config. Uses the SvelteKit Vite plugin so `$lib/*` and `$app/*`
// virtual imports resolve exactly as they do in the app, and jsdom so code that
// touches `window`/`localStorage` (currency formatting, token storage) runs.
// `root` is pinned to this package dir so the `src/**` include resolves whether
// this config runs standalone or is referenced as a project from the repo root.
const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  // Pin the Vite root to this package so the SvelteKit plugin finds `src/app.html`
  // and resolves `$lib/*` aliases even when this config runs as a project
  // referenced by path from the repo-root vitest.config.ts.
  root,
  plugins: [sveltekit()],
  // Load the *client* build of Svelte components (DOM lifecycle available),
  // not the SSR build — otherwise mounting throws `lifecycle_function_unavailable`.
  resolve: {
    conditions: ['browser'],
  },
  test: {
    name: 'frontend',
    root,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{js,ts}'],
    globals: true,
    // Absolute path so the setup resolves whether Vitest runs this config
    // standalone (cwd = this package) or as a project referenced from the repo
    // root (cwd = repo root).
    setupFiles: [fileURLToPath(new URL('./vitest-setup.ts', import.meta.url))],
    // @testing-library/svelte ships a `.svelte` scaffold that lives in
    // node_modules; inline it so the SvelteKit plugin transforms it (Vite
    // otherwise externalizes node_modules and jsdom can't load raw `.svelte`).
    server: {
      deps: {
        inline: [/@testing-library\/svelte/],
      },
    },
  },
});
