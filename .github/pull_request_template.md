## Summary

<!-- What does this PR do, and why? Link any related issue: Closes #123 -->

## What changed

<!-- Bullet the notable changes (files/areas). -->

-

## How it was tested

<!-- Manual steps and/or which automated checks you ran. -->

- [ ] `npm run typecheck -w packages/backend`
- [ ] `npm run typecheck -w packages/frontend` (0 errors, 0 warnings)
- [ ] `npm run test` (full suite passes)
- [ ] `npm run build`
- [ ] `npm run lint`

## Checklist

- [ ] Added/updated tests for logic changes
- [ ] Schema changes include a Drizzle migration **and** the `schema.ts` update (additive/idempotent)
- [ ] New env vars document their defaults or required values in docs/INSTALLATION.md (no built-in secrets)
- [ ] i18n text updated in **all** `locales/*.json` language packs; ran `npm run locales:sync` and `npm run locales:check`, if UI strings changed
- [ ] Docs updated if behavior/setup changed
