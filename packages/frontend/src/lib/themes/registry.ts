import type { ThemeDefinition, ThemeId, ThemePreview } from './types';
export type { ThemeDefinition, ThemeId, ColorMode } from './types';

/** Fail early on contributor mistakes instead of accepting ambiguous preferences. */
export function createThemeRegistry(definitions: readonly ThemeDefinition[]): readonly ThemeDefinition[] {
  const ids = new Set<string>();
  for (const definition of definitions) {
    if (!/^[a-z][a-z0-9-]*$/.test(definition.id) || ids.has(definition.id)) {
      throw new Error(`Invalid or duplicate theme id: ${definition.id}`);
    }
    if (!['preference', 'dark', 'light'].includes(definition.colorScheme)) {
      throw new Error(`Invalid color scheme for theme: ${definition.id}`);
    }
    ids.add(definition.id);
  }
  if (!ids.has('normal')) throw new Error('The normal fallback theme is required.');
  return Object.freeze([...definitions].sort((a, b) =>
    (a.order ?? 100) - (b.order ?? 100) || a.id.localeCompare(b.id)));
}

// A contribution only needs its own folder. Each manifest imports its scoped CSS.
const modules = import.meta.glob<ThemeDefinition>('./*/theme.ts', { eager: true, import: 'default' });
export const themes = createThemeRegistry(Object.entries(modules).map(([path, definition]) => {
  const folder = path.split('/')[1];
  if (definition.id !== folder) {
    throw new Error(`Theme id ${definition.id} must match its folder: ${folder}`);
  }
  return definition;
}));

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && themes.some(definition => definition.id === value);
}

export function getThemeDefinition(id: unknown): ThemeDefinition {
  const definition = themes.find(candidate => candidate.id === id)
    ?? themes.find(candidate => candidate.id === 'normal');
  if (!definition) throw new Error('The normal fallback theme is required.');
  return definition;
}

export function themePreviewStyle(preview: ThemePreview): string {
  return Object.entries(preview).map(([name, value]) => `--preview-${name}: ${value}`).join('; ');
}
