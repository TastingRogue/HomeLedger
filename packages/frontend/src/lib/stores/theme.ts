import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'sf_theme';

function loadFromStorage(): Theme {
  if (!browser) return 'dark';
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {}
  return 'dark';
}

/**
 * Reflect the active theme on the document root so the CSS variables defined
 * under `:root[data-theme='light']` take effect. Dark is the default palette on
 * bare `:root`, so we only set the attribute for light and remove it otherwise.
 */
function applyTheme(theme: Theme) {
  if (!browser) return;
  const root = document.documentElement;
  if (theme === 'light') {
    root.setAttribute('data-theme', 'light');
    root.style.colorScheme = 'light';
  } else {
    root.removeAttribute('data-theme');
    root.style.colorScheme = 'dark';
  }
}

export const theme = writable<Theme>(loadFromStorage());

// Persist and apply on every change.
theme.subscribe((value) => {
  if (!browser) return;
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {}
  applyTheme(value);
});

export function setTheme(next: Theme) {
  theme.set(next);
}

export function toggleTheme() {
  theme.set(get(theme) === 'dark' ? 'light' : 'dark');
}

export function getTheme(): Theme {
  return get(theme);
}
