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
- [ ] New env vars have a Dockerfile default and are documented in the README table
- [ ] i18n keys updated in **both** `es.ts` and `en.ts` (parity), if UI strings changed
- [ ] Docs updated if behavior/setup changed
