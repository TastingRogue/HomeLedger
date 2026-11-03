import { afterEach, describe, expect, it } from 'vitest';
import type { Chart, ChartDataset } from 'chart.js';
import { createThemePalette } from './chart-theme';

describe('theme chart palettes', () => {
  afterEach(() => { document.documentElement.removeAttribute('style'); });

  it('restores original colors and handles new dataset props while themed', () => {
    const dataset: ChartDataset = { label: 'Ingresos', data: [10], backgroundColor: '#123456', borderColor: '#234567' };
    const chart = { config: { type: 'bar' }, data: { datasets: [dataset] } } as unknown as Chart;
    const plugin = createThemePalette();
    const update = () => plugin.beforeUpdate?.(chart, { mode: 'none', cancelable: true }, {});
    document.documentElement.style.setProperty('--chart-income', '#6ff4ed');
    update();
    expect(dataset.backgroundColor).toBe('#6ff4ed');
    // A component changes its supplied colors while the skin is still active.
    dataset.backgroundColor = '#345678';
    update();
    expect(dataset.backgroundColor).toBe('#6ff4ed');
    document.documentElement.style.removeProperty('--chart-income');
    update();
    expect(dataset.backgroundColor).toBe('#345678');
    expect(dataset.borderColor).toBe('#234567');
  });

  it('uses a contributed category palette and keeps donut separators on the card surface', () => {
    const dataset: ChartDataset = { data: [10, 20, 30], backgroundColor: ['red', 'green', 'blue'] };
    const chart = { config: { type: 'doughnut' }, data: { datasets: [dataset] } } as unknown as Chart;
    const plugin = createThemePalette();
    const style = document.documentElement.style;
    style.setProperty('--chart-series-1', '#fcee0a');
    style.setProperty('--chart-series-2', '#6ff4ed');
    style.setProperty('--bg-card', '#110c10');
    plugin.beforeUpdate?.(chart, { mode: 'none', cancelable: true }, {});
    expect(dataset.backgroundColor).toEqual(['#fcee0a', '#6ff4ed', '#fcee0a']);
    expect(dataset.borderColor).toBe('#110c10');
  });
});
