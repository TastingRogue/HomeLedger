import type { AppearanceDescriptor, ResolvedAppearance } from './types';

// Keep these two functions self-contained: bootstrap.ts serializes the SAME
// functions for execution before hydration, without a second theme implementation.
export function resolveAppearance(
  definitions: readonly AppearanceDescriptor[], savedId: unknown, savedMode: unknown,
): ResolvedAppearance {
  const definition = definitions.find(candidate => candidate.id === savedId)
    ?? definitions.find(candidate => candidate.id === 'normal');
  if (!definition) throw new Error('The normal fallback theme is required.');
  const mode = savedMode === 'light' ? 'light' : 'dark';
  const colorScheme = definition.colorScheme === 'preference' ? mode : definition.colorScheme;
  return {
    id: definition.id,
    mode,
    colorScheme,
    browserThemeColor: typeof definition.browserThemeColor === 'string'
      ? definition.browserThemeColor : definition.browserThemeColor[colorScheme],
  };
}

export function applyDocumentAppearance(appearance: ResolvedAppearance): void {
  const root = document.documentElement;
  root.setAttribute('data-ui', appearance.id);
  root.setAttribute('data-theme', appearance.mode);
  root.style.colorScheme = appearance.colorScheme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', appearance.browserThemeColor);

  // Chromium on Windows shows raw `value` attributes in native select popups
  // when `color-scheme: dark` is inherited. An inline style on <html> has
  // higher specificity than any CSS rule, so the CSS fix alone doesn't work.
  // Injecting a sheet with !important overrides the inline style for selects.
  const TAG_ID = 'sf-select-color-scheme-fix';
  let sheet = document.getElementById(TAG_ID) as HTMLStyleElement | null;
  if (appearance.colorScheme === 'dark') {
    if (!sheet) {
      sheet = document.createElement('style');
      sheet.id = TAG_ID;
      document.head.appendChild(sheet);
    }
    sheet.textContent = 'select { color-scheme: light !important; }';
  } else {
    sheet?.remove();
  }
}
