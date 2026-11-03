import type { ThemeDefinition } from '../types';
import './styles.css';

export default {
  id: 'normal',
  name: { es: 'Normal', en: 'Normal' },
  description: {
    es: 'El diseño original, en modo claro u oscuro.',
    en: 'The original design, in light or dark mode.',
  },
  colorScheme: 'preference',
  browserThemeColor: { dark: '#0b1118', light: '#eef1f6' },
  preview: {
    canvas: '#0b1118', panel: '#1a2332', accent: '#a78bfa',
    heading: '#a78bfa', selection: '#a78bfa', border: '#334155', radius: '5px',
  },
  order: 0,
} satisfies ThemeDefinition;
