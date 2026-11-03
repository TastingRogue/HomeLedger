import type { ThemeDefinition } from '../types';
import './styles.css';
import './popups.css';
import './transactions.css';

export default {
  id: 'cyberpunk',
  workspace: () => import('./workspace/Workspace.svelte'),
  quickEntry: () => import('./workspace/QuickEntry.svelte'),
  authFrame: () => import('./workspace/AuthFrame.svelte'),
  name: { es: 'Cyberpunk 2077', en: 'Cyberpunk 2077' },
  description: {
    es: 'Paneles de terminal, fondo burdeos y acentos amarillo eléctrico y cian.',
    en: 'Terminal panels, a burgundy background, and electric yellow and cyan accents.',
  },
  notice: {
    es: 'Este diseño usa su propia paleta oscura. Tu preferencia de modo claro u oscuro se conserva al volver a Normal.',
    en: 'This design uses its own dark palette. Your light or dark preference is preserved when you return to Normal.',
  },
  colorScheme: 'dark',
  browserThemeColor: '#100b10',
  preview: {
    canvas: '#160b10', panel: '#28151b', accent: '#6ff4ed',
    heading: '#fcee0a', selection: '#fcee0a', border: '#a89d35', radius: '0px',
  },
  order: 10,
} satisfies ThemeDefinition;
