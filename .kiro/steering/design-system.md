---
inclusion: auto
---

# HomeLedger Design System

> The frontend is SvelteKit 5 + TypeScript. All design tokens live as CSS custom
> properties in `packages/frontend/src/app.css` (`:root` = dark, `:root[data-theme='light']`
> = light). **When a value here could drift, the token in `app.css` is the source of
> truth.** The app ships **dark and light themes** (toggle in the dashboard header
> and Settings, persisted, applied before first paint) and is **bilingual (en/es)**
> per user — never hardcode user-facing copy; use the i18n dictionaries.

## Visual Foundation
- Premium, calm financial dashboard; professional fintech/SaaS aesthetic.
- Backgrounds (dark): deep `#0b1118`, default `#0f1720`, surface `#131a24`,
  elevated `#1a2332`, hover `#1e2a3a`, card `#161e2a`.
- Borders: subtle 1px, `--border-default: #1e2a3a` (dark).
- Border radius: 6px (sm) / 8px (md) / 12px (lg).
- Typography: Inter / system-ui, clean and compact.
- No gradients or flashy effects. **Translucent "materials" ARE used** (see below) —
  this is deliberate depth, not decorative glassmorphism.

## Color System (accents)
- Green `#22c55e` = income, savings, positive/active.
- Red `#ef4444` = expenses, negative balances, warnings.
- Blue `#3b82f6` = accounts, transfers, informational.
- Purple `#8b5cf6` = goals, planning, selected nav.
- Orange `#f59e0b` = subscriptions, warnings, attention.
- Text: primary `#f1f5f9`, secondary `#94a3b8`, muted `#7c8ba3` (dark) /
  `#616e88` (light). **Muted was retuned for WCAG-AA** (was `#64748b`, which failed
  AA for small text on cards) — do not revert to `#64748b`.
- Light theme deepens accents for contrast on white (e.g. green `#16a34a`,
  blue `#2563eb`). Known accessibility follow-up: white text on solid green/orange
  buttons, and orange/yellow used as small on-surface text, still sit just under the
  AA/3:1 bar — a palette decision, not yet resolved.

## Translucent materials (P3.D — apple-design)
- Structural chrome uses translucent materials with a backdrop blur, NOT solid fills:
  - Sidebar: `--sidebar-bg-glass` (dark `rgba(10,15,22,0.72)`) + `--material-blur`
    (`blur(20px) saturate(180%)`).
  - Modals/overlays: `--surface-glass`.
- These are defined once as tokens so `@media (prefers-reduced-transparency: reduce)`
  can swap them for solid equivalents in one place. Respect that mechanism.

## Motion (P3.B / P3.C — apple-design)
- Motion is **CSS-based Svelte transitions** (`$lib/motion`: `modalPanel`, `scrim`,
  `popover` + `MOTION` tokens), **not** JS springs, for click-driven UI.
- Global press feedback: a small `:active` scale-down (~0.96) reads as a physical
  push; buttons already have `transition: all var(--transition-fast)`.
- `@media (prefers-reduced-motion: reduce)` collapses durations to near-zero and
  neutralizes transforms globally in `app.css` — never bypass it.
- Toggle switches stay on CSS transitions (not gesture-driven).

## Layout
- Fixed left sidebar ~235px; sticky on desktop (`min-width: 1024px`), off-canvas
  with a hamburger toggle on mobile.
- **Pages use the full available width**: the top-level page wrapper is
  `.page { width: 100%; margin: 0; }` — do **not** reintroduce a narrow `max-width`
  (older pages had `max-width: 1200/1400px` that left a large empty gutter on wide
  screens; those were removed). The `main-content` provides the outer padding.
- Modals keep a bounded `max-width` (they should not go full-width).
- Consistent per-page header: title + description on the left, actions/filters on
  the right.
- Cards: consistent padding (~16–20px) and clear hierarchy. Tables dense but
  readable. Charts minimalist, integrated into cards.

## Numbers & currency
- **Single display currency per install**, configurable via `DISPLAY_CURRENCY`
  (MXN, USD, EUR, COP, ARS, CLP, PEN, BRL) — do NOT hardcode `MX$`/MXN. Format via
  `$lib/utils/format` (`formatCurrency`), which reads the instance currency.
- Monetary/figure values use **tabular numerals** (`font-variant-numeric: tabular-nums`)
  so columns align.

## Sidebar Navigation (grouped, per `(app)/+layout.svelte`)
Labels are i18n keys (`nav.*`); shown here in English:
- **NAVIGATION:** Dashboard, Accounts, Transactions, Transfers, Subscriptions
- **PLANNING:** Goals, Budgets, Loans
- **ANALYSIS:** Categories, Rules, Reports, Net worth, Receipts, Alerts
- **CONFIGURATION:** Settings, Data & Backup
- Selected item: purple-tinted background (`--sidebar-active-bg`) + `--sidebar-active-text`.

## Accessibility (P3.A / static a11y pass)
- Icon/symbol-only buttons need an `aria-label` (i18n `a11y.*`/`common.*`).
- Every modal is Escape-dismissable and has a labelled visible close button.
- Use correct label semantics (`<label for>` only for real form controls).
- Honor `prefers-reduced-motion`, `prefers-reduced-transparency`, `prefers-contrast`.
- svelte-check must stay at 0 errors / 0 warnings (it lints a11y).

## Key Rules
- NO floating action button; quick actions live in the sidebar/interface.
- Create/edit via **modals**, not page navigation.
- **Per-user categories**: each user owns their full editable category set (no shared/
  system categories). Categories have a type: `Gasto`, `Ingreso`, `Ambos`.
- Credit accounts: balance = used credit (transfers IN reduce debt).
- Account balances are computed dynamically from transactions/transfers
  (`AccountService.calculateBalance`); `initialBalance` is never mutated.
- Error messages must be self-descriptive (cause + action), never a bare "Error".
