/** Installation defaults and supported languages derive from the shared catalog. */
import { localeCodes, resolveLocale } from '@homeledger/shared';
import type { LocaleCode } from '@homeledger/shared';
export { isSupportedLocale } from '@homeledger/shared';
export const SUPPORTED_LOCALES = localeCodes;
export type BackendLocale = LocaleCode;
export const FALLBACK_LOCALE: BackendLocale = 'en';
export function getDefaultLocale(): BackendLocale {
  return resolveLocale(process.env['DEFAULT_LOCALE']);
}
