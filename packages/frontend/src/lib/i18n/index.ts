import { derived } from 'svelte/store';
import { preferences } from '../stores/preferences';
import { dictionaries, DEFAULT_LOCALE } from './registry';

// Reactive translation store. Resolves the active locale's dictionary, falling
// back to the default-locale string, then to the raw key, for any missing entry.
export const t = derived(preferences, ($prefs) => {
  const dict = dictionaries[$prefs.locale] ?? dictionaries[DEFAULT_LOCALE];
  const fallback = dictionaries[DEFAULT_LOCALE];
  return (key: string, params?: Record<string, string | number>): string => {
    let text = dict[key as keyof typeof dict] ?? fallback[key as keyof typeof fallback] ?? key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    return text;
  };
});
