import { themeTexts } from '../../i18n/theme-texts';
import type { ThemeDefinition } from '../types';
import './styles.css';
import './popups.css';
import './transactions.css';

export default {
  id: 'cyberpunk',
  workspace: () => import('./workspace/Workspace.svelte'),
  quickEntry: () => import('./workspace/QuickEntry.svelte'),
  authFrame: () => import('./workspace/AuthFrame.svelte'),
  name: themeTexts.cyberpunk.name,
  description: themeTexts.cyberpunk.description,
  notice: themeTexts.cyberpunk.notice,
  colorScheme: 'dark',
  browserThemeColor: '#100b10',
  preview: {
    canvas: '#160b10', panel: '#28151b', accent: '#6ff4ed',
    heading: '#fcee0a', selection: '#fcee0a', border: '#a89d35', radius: '0px',
  },
  order: 10,
} satisfies ThemeDefinition;
