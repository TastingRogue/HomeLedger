import { themeTexts } from '../../i18n/theme-texts';
import type { ThemeDefinition } from '../types';
import './styles.css';
import './responsive.css';

export default {
  id: 'normal',
  name: themeTexts.normal.name,
  description: themeTexts.normal.description,
  colorScheme: 'preference',
  browserThemeColor: { dark: '#0b1118', light: '#eef1f6' },
  preview: {
    canvas: '#0b1118', panel: '#1a2332', accent: '#a78bfa',
    heading: '#a78bfa', selection: '#a78bfa', border: '#334155', radius: '5px',
  },
  order: 0,
} satisfies ThemeDefinition;
