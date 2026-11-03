import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { themes, isThemeId, getThemeDefinition } from '../themes/registry';
import { resolveAppearance, applyDocumentAppearance } from '../themes/runtime';
import type { ThemeId, ColorMode } from '../themes/types';

// Preserve the existing public API and storage keys for installed browsers.
export type Theme = ColorMode;
export type UiSkin = ThemeId;

function loadPreference(key: string): string | null {
  if (browser) {
    try { return localStorage.getItem(key); } catch { /* Storage is optional. */ }
  }
  return null;
}

const initial = resolveAppearance(themes, loadPreference('sf_ui_skin'), loadPreference('sf_theme'));
export const theme = writable<Theme>(initial.mode);
export const uiSkin = writable<UiSkin>(initial.id);
export const activeTheme = derived(uiSkin, getThemeDefinition);

let pendingFrame: number | undefined;

function applyAppearance() {
  if (!browser) return;
  const root = document.documentElement;
  root.classList.add('theme-changing');
  applyDocumentAppearance(resolveAppearance(themes, get(uiSkin), get(theme)));
  void root.offsetHeight;
  if (typeof requestAnimationFrame === 'function') {
    if (pendingFrame !== undefined) cancelAnimationFrame(pendingFrame);
    pendingFrame = requestAnimationFrame(() => {
      pendingFrame = requestAnimationFrame(() => {
        root.classList.remove('theme-changing');
        pendingFrame = undefined;
      });
    });
  } else {
    root.classList.remove('theme-changing');
  }
}

function persist(key: string, value: string) {
  if (!browser) return;
  try { localStorage.setItem(key, value); } catch { /* Storage is optional. */ }
  applyAppearance();
}

theme.subscribe(value => persist('sf_theme', value));
uiSkin.subscribe(value => persist('sf_ui_skin', value));

export function setTheme(next: Theme) { theme.set(next === 'light' ? 'light' : 'dark'); }
export function setUiSkin(next: UiSkin) { uiSkin.set(isThemeId(next) ? next : 'normal'); }
export function toggleTheme() { setTheme(get(theme) === 'dark' ? 'light' : 'dark'); }
export function getTheme(): Theme { return get(theme); }
