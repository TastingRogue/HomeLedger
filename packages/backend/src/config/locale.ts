/**
 * Backend locale configuration.
 *
 * The host/admin chooses ONE primary language for the install via the
 * `DEFAULT_LOCALE` environment variable. This is the language the system
 * categories are seeded in. Individual users can switch their own UI language
 * afterwards without changing the (shared) category names.
 *
 * Falls back to English when unset or invalid.
 */
export const SUPPORTED_LOCALES = ['es', 'en'] as const;
export type BackendLocale = (typeof SUPPORTED_LOCALES)[number];

export const FALLBACK_LOCALE: BackendLocale = 'en';

export function isSupportedLocale(value: unknown): value is BackendLocale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/**
 * Resolves the host's primary locale from `DEFAULT_LOCALE`.
 * Normalizes values like `en-US` / `ES` to the base language code, and falls
 * back to English for anything unknown.
 */
export function getDefaultLocale(): BackendLocale {
  const raw = process.env['DEFAULT_LOCALE']?.trim().toLowerCase();
  if (!raw) return FALLBACK_LOCALE;
  const base = raw.split(/[-_]/)[0]; // 'en-us' -> 'en'
  return isSupportedLocale(base) ? base : FALLBACK_LOCALE;
}
