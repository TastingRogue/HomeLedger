import type { SupportedLocale } from '../i18n/registry';
import type { Component, Snippet } from 'svelte';

export type ColorMode = 'dark' | 'light';
export type ThemeId = string;
export type ThemeText = Partial<Record<SupportedLocale, string>> & { en: string };
export type ThemeComposition<Props extends Record<string, unknown>> = () => Promise<{ default: Component<Props> }>;

export interface ThemePreview {
  canvas: string;
  panel: string;
  accent: string;
  heading: string;
  selection: string;
  border: string;
  radius: string;
}

/** Serializable metadata also used by the script that runs before first paint. */
export interface AppearanceDescriptor {
  id: ThemeId;
  colorScheme: 'preference' | ColorMode;
  browserThemeColor: string | Record<ColorMode, string>;
}

export interface ThemeDefinition extends AppearanceDescriptor {
  name: ThemeText;
  description: ThemeText;
  notice?: ThemeText;
  preview: ThemePreview;
  order?: number;
  /** Optional theme-owned compositions; business APIs remain shared. */
  workspace?: ThemeComposition<{ path: string; children: Snippet }>;
  quickEntry?: ThemeComposition<{ close: () => void; saved: () => void }>;
  authFrame?: ThemeComposition<{ kind: 'login' | 'register' | 'offline'; children: Snippet }>;
}

export interface ResolvedAppearance {
  id: ThemeId;
  mode: ColorMode;
  colorScheme: ColorMode;
  browserThemeColor: string;
}
