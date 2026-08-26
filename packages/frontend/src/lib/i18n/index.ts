import { derived } from 'svelte/store';
import { preferences, type SupportedLocale } from '../stores/preferences';
import { es } from './es';
import { en } from './en';

const dictionaries: Record<SupportedLocale, Record<string, string>> = { es, en };

// Reactive translation store
export const t = derived(preferences, ($prefs) => {
  const dict = dictionaries[$prefs.locale] ?? dictionaries.es;
  return (key: string, params?: Record<string, string | number>): string => {
    let text = dict[key] ?? dictionaries.es[key] ?? key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    return text;
  };
});
