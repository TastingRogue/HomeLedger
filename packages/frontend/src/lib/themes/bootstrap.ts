import { resolveAppearance, applyDocumentAppearance } from './runtime';
import { themes } from './registry';
import type { AppearanceDescriptor } from './types';

/** Static bundled metadata, never user input; escape '<' before embedding in HTML. */
export function buildAppearanceBootstrap(definitions: readonly AppearanceDescriptor[]): string {
  const descriptors = definitions.map(({ id, colorScheme, browserThemeColor }) =>
    ({ id, colorScheme, browserThemeColor }));
  const serialized = JSON.stringify(descriptors).replace(/</g, '\\u003c');
  return `<script>(function(){var id,mode;try{id=localStorage.getItem('sf_ui_skin');mode=localStorage.getItem('sf_theme');}catch(e){}var appearance=(${resolveAppearance.toString()})(${serialized},id,mode);(${applyDocumentAppearance.toString()})(appearance);})();</script>`;
}

export const appearanceBootstrap = buildAppearanceBootstrap(themes);
