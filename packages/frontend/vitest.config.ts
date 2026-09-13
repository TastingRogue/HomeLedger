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
  plugins: [sveltekit()],
  test: {
    name: 'frontend',
    root,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{js,ts}'],
    globals: true,
  },
});
