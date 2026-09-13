import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/.svelte-kit/**', '**/build/**'],
  },
  {
    rules: {
      // Unused vars are real dead code — keep as error (allow _-prefixed args).
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],

      // `any` is discouraged but sometimes pragmatic at boundaries; warn, don't block.
      '@typescript-eslint/no-explicit-any': 'warn',

      // Services are intentionally classes of static methods (a deliberate
      // project convention for namespacing). This rule fights that pattern.
      '@typescript-eslint/no-extraneous-class': 'off',

      // Non-null assertions are used deliberately where invariants are known
      // (e.g. after existence checks, and pervasively in tests). Warn so new
      // ones are visible without blocking the build on the existing, safe uses.
      '@typescript-eslint/no-non-null-assertion': 'warn',
    },
  },
  {
    // Tests: relax further — `!` and `any` are normal and safe in test setup.
    files: ['**/*.test.ts', '**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    // SvelteKit's app.d.ts declares intentionally-empty ambient interfaces
    // (PageData, Platform) that the framework augments — this is by design.
    files: ['**/app.d.ts'],
    rules: {
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },
);
