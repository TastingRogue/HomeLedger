# Creating and contributing UI themes

HomeLedger includes **Normal** (light/dark) and **Cyberpunk 2077**, with a burgundy, yellow and cyan terminal design. Choose a design in **Settings → Profile → Interface design**. Choices apply immediately and persist in the browser. The original light/dark preference is preserved while a theme with a fixed color scheme is active.

## Add a theme in its own folder

Create these two files under `packages/frontend/src/lib/themes/<your-id>/`:

```text
lib/themes/
  types.ts                 # Typed metadata contract
  registry.ts              # Discovers */theme.ts automatically
  runtime.ts               # Resolves preferences and applies the document state
  bootstrap.ts             # Same resolver, before first paint
  normal/
    theme.ts
    styles.css             # Default tokens + original light palette
  cyberpunk/
    theme.ts
    styles.css             # Video-inspired palette, panels and chart colors
  terminal-blue/           # Example contribution
    theme.ts
    styles.css
```

No changes to the registry, settings component, global dictionaries, backend, database or bootstrap are needed. Themes are bundled at build time, not installed dynamically from a URL.

### 1. `theme.ts`: metadata and stylesheet import

```ts
import type { ThemeDefinition } from '../types';
import './styles.css';

export default {
  id: 'terminal-blue',
  name: { es: 'Terminal azul', en: 'Blue terminal' },
  description: {
    es: 'Una paleta azul para consultar tus finanzas.',
    en: 'A blue palette for managing your finances.',
  },
  colorScheme: 'dark',
  browserThemeColor: '#07131d',
  preview: {
    canvas: '#07131d', panel: '#102332', accent: '#67d9ff',
    heading: '#67d9ff', selection: '#4e83dc', border: '#345065', radius: '4px',
  },
  order: 20,
} satisfies ThemeDefinition;
```

- **id:** stable lowercase letters, digits and hyphens; start with a letter. Match the folder name. Duplicate/invalid IDs fail early. Keep `normal` as the required fallback. Renaming an ID resets that saved preference to Normal.
- **name, description:** translations for every supported locale. TypeScript checks completeness. Add an optional `notice` with the same shape when the theme needs an explanatory note.
- **colorScheme:** `preference` follows the user's saved light/dark mode; `dark` or `light` fixes the scheme without overwriting that preference. The mode selector automatically appears only for `preference` themes.
- **browserThemeColor:** one CSS hex color for fixed schemes, or `{ dark: '#…', light: '#…' }` when the browser chrome should follow the mode.
- **preview:** colors for the miniature preview in Settings. Previews are rendered by the shared component; contributors do not need to author another Svelte component.
- **order:** optional display order (default 100, then ID). Normal is 0 and Cyberpunk is 10.

### 2. `styles.css`: scoped tokens and optional details

```css
:root[data-ui='terminal-blue'] {
  --bg-deep: #07131d;
  --bg-default: #0a1a27;
  --bg-surface: #102332;
  --bg-elevated: #163043;
  --bg-hover: #1b3a4d;
  --bg-card: #102332;
  --text-primary: #e9f4fa;
  --text-secondary: #a3bfd0;
  --text-muted: #8eacbf;
  --text-link: #67d9ff;
  --accent-blue: #1d72a3;
  --accent-purple: #4e83dc;
  --accent-cyan: #67d9ff;
  --color-primary: #1d72a3;
  --color-primary-hover: #246da0;
  --border-default: #345065;
  --border-subtle: #223b4c;
  --sidebar-bg: #061019;
  --sidebar-bg-glass: #061019;
  --surface-glass: #102332;
  --sidebar-border: #345065;
  --sidebar-active-bg: #1a3554;
  --sidebar-active-text: #99dcff;
}

:root[data-ui='terminal-blue'] h1 {
  color: var(--text-link);
}
```

The Normal stylesheet supplies complete base tokens, including spacing, typography, borders, tag surfaces, semantic colors and legacy aliases. Override only what differs. Normal's light palette is explicitly scoped to Normal, so it cannot leak into a fixed dark theme when a user previously chose light mode. Custom theme selectors are more specific than base defaults, independent of stylesheet discovery order.

Keep **every custom rule** scoped to `:root[data-ui='<your-id>']`, including selectors inside media queries. `app.css` contains shared layout/reset rules; do not add theme-specific branches there or in financial pages. A palette should work across all routes, modals, empty/error/loading states and forms.

For a theme that supports both modes, use the two document attributes together:

```css
:root[data-ui='your-theme'][data-theme='light'] {
  /* Complete light surfaces, text, borders and readable accent colors. */
}
```

Prefer bundled fonts or local fallbacks. If adding a font/asset, include its license and attribution. Preserve visible keyboard focus, semantic income/expense cues, readable small text and dark text on bright fills. Keep menus and focus outlines unclipped. Respect reduced motion and forced colors; theme switching already suppresses color transitions.

## Optional view compositions

A theme may provide its own workspace and authentication layouts, beyond tokens. These are lazy imports so Normal does not download another theme's financial views:

```ts
workspace: () => import('./workspace/Workspace.svelte'),
authFrame: () => import('./workspace/AuthFrame.svelte'),
quickEntry: () => import('./workspace/QuickEntry.svelte'),
```

`workspace` receives `{ path, children }`; `children` is the original route content. `authFrame` receives `{ kind, children }`, with `kind` equal to `login`, `register`, or `offline`. The shared `ThemeComposition.svelte` loader ignores obsolete imports when switching themes. Authentication, locking, API authorization and preferences stay in the shared application. Keep financial operations on the existing API clients and retain access to advanced controls from the original route snippet.

`quickEntry` receives `{ close, saved }`. The shared `QuickEntryHost` owns the native modal, focus restoration, Escape, page scroll lock and interception of same-origin Quick Entry links. It keeps the current route in place; direct `/registro-rapido` links also open the modal and return to Dashboard when closed. Normal reuses `QuickEntryForm`; Cyberpunk supplies its Details/Categories/Preview composition. Call `saved` after a successful mutation so the underlying view refreshes. The host is unavailable while the application is locked.

Cyberpunk popup styling is centralized in `cyberpunk/popups.css`, scoped to its theme. It covers route/controller, dashboard, settings and fallback editor dialogs, with shared ribbons, left-aligned help labels, responsive fields and action rows. Keep compact confirmation dialogs distinct from wide detail/editor dialogs and retain all business controls. Quick Entry's popup layout removes workspace frame decoration and stacks panels on mobile.

Cyberpunk's `workspace/` contains its navigation shell, grouped route compositions, reusable ribbons/progress/tables and editors. Its component CSS uses the `cp-` namespace; document-wide overrides remain scoped to `data-ui='cyberpunk'`. Prefer this composition hook when changing information hierarchy; avoid accumulating theme-specific conditions in every normal route.

The dashboard renders the original route snippet directly inside `.cp-dashboard`, with its theme presentation in `dashboard.css`. Its quick actions, editors, attachments, chart period controls and summary sections are shared with Normal and visible by default. Do not replace it with a reduced copy or put the full dashboard behind a Tools dialog. Dashboard parity tests render the real route inside the theme workspace and exercise quick income saving.

Cyberpunk preserves its own cards and panels while projecting complete route workflows through `view-actions.ts`. A route calls `exposeViewActions` during initialization; Normal has no action host and behaves as before. The Cyberpunk workspace registers the host, keeps route summaries hidden in `.cp-route-controller`, and opens only the requested workflow dialog from the visible card. It never opens a duplicate route in a Tools dialog. Form presentation is scoped in `shared-controls.css`; account details, subscription options, subcategories, complex rules, budget allocations and goal withdrawals use the original controllers. Successful API mutations invalidate the visible composition and its controller together. Keep controller calls optional and handle loading failures visibly.

Transactions, reports and search render their complete route controls in `.cp-shared-view`, with scoped Cyberpunk presentation. The shared transaction controller supplies the unified `TransactionLog` presentation while retaining its pagination, filters, detail, split/tag/history workflows and alternate view. Workspace width is fluid (`max-width:none`) and card grids respond to the available screen space.

The bundled Rajdhani and Share Tech Mono fonts come from [Google Fonts Rajdhani](https://github.com/google/fonts/tree/main/ofl/rajdhani) and [Google Fonts Share Tech Mono](https://github.com/google/fonts/tree/main/ofl/sharetechmono). Both are distributed with their SIL Open Font License files in `static/fonts/cyberpunk/`. No external font request is needed at runtime.

## Charts

The shared Chart.js components observe both `data-ui` and `data-theme`. Tooltips, axes, legends and donut separators follow the standard surface/text tokens automatically. DoughnutChart preserves explicitly supplied slice colors by default so external legends stay synchronized; opt into dataset recoloring with `themePalette`. Themes may additionally provide:

```css
:root[data-ui='terminal-blue'] {
  --chart-income: #67d9ff;
  --chart-expense: #ff8290;
  --chart-series-1: #67d9ff;
  --chart-series-2: #ff8290;
  --chart-series-3: #f7d66c;
  /* Optional --chart-series-4 through --chart-series-8. */
}
```

These optional tokens recolor datasets without changing data. Category palettes cycle through the supplied colors. Current English/Spanish income and expense labels use their semantic tokens. Other datasets use the series palette. Use six-digit hex colors for translucent line fills. When no palette is defined, the component's supplied colors are preserved; returning to Normal restores them. New chart components should include `plugins: [createThemePalette()]`, call `watchChartTheme(chart)` after creation, and dispose the watcher before destroying the chart (see `lib/utils/chart-theme.ts`). For a specifically typed constructor, match the plugin type, e.g. `new Chart<'doughnut'>(...)` with `createThemePalette<'doughnut'>()`.

## Preference compatibility and first paint

The optional `view-actions.ts` chart host supplies `charts.cashFlow` and `charts.categoryColors`. The shared dashboard reads these with `getViewCharts()`; it does not check a theme ID. Cyberpunk supplies diverging bars (income positive, expenses negative) and matching donut/HTML legend colors. Normal retains its combination chart. BarChart reacts to changed labels and datasets and accepts optional grid and value formatting. Calendar-period aggregation lives in `utils/dashboard-period.ts`, including complete months and an Other bucket that preserves all expenses.

`sf_ui_skin` stores the theme ID and `sf_theme` stores the independent mode. These keys remain compatible with existing installs. Invalid or removed themes fall back to Normal. Blocked browser storage does not prevent switching appearance for the current session. The browser's address/status-bar color is part of theme metadata.

The pre-paint script serializes only registered appearance descriptors and the same self-contained functions used at runtime. It escapes `<` in serialized metadata. If changing `runtime.ts`, keep its resolver and document applier self-contained; the bootstrap tests execute the actual serialized code and compare it with runtime results.

## Validate a contribution

From the repository root:

```bash
npm run typecheck -w packages/frontend
npm run test -w packages/frontend
npm run lint
npm run build
node scripts/check-theme-build.mjs
```

The suite checks registry validation, additional contributed themes, removed IDs, storage failures, first-paint parity, setting selection, light/dark restoration and chart color restoration. The production check starts and closes its own temporary loopback server to verify the actual built HTML, CSS and first-paint script without user data. Add tests when changing those behaviors; palette-only contributions do not need tests that repeat CSS values.

In a real browser, review dashboard, accounts, transactions, transfer forms, subscriptions/calendar, quick entry, search, budgets, goals, loans, net worth, categories, rules, reports, alerts, receipts, import, backup, settings, login/register and offline. Include mobile widths, a modal/dropdown, keyboard focus, disabled/error states and a switch back to Normal/light. Attach screenshots of representative desktop/mobile views to the PR. Concept images are not a replacement for those checks.

If running Docker, rebuild/recreate the application to use the changed bundled source. Theme metadata and CSS are picked up automatically during that build.

## Financial data and workflow parity

Themes must not implement different financial rules. Dashboard and calendar load
all transaction pages before calculating series and convert account amounts to
base currency without mutating editor data. Monthly grouping uses the stored
YYYY-MM-DD civil date, matching report date ranges. Calendar events open the
complete transaction or subscription workflow through a record deep link.

The mobile calendar presents every event in an agenda; desktop days expand to
show additional events. Async selections discard stale results.
Run tests, workspace typechecks, the production build and
`node scripts/check-theme-build.mjs` before contributing a theme.
