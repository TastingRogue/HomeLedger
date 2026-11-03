import type { Chart, ChartDataset, ChartType, Plugin } from 'chart.js';

type DatasetColors<T extends ChartType> = Pick<ChartDataset<T>, 'backgroundColor' | 'borderColor'>;
interface ColorState<T extends ChartType> { original: DatasetColors<T>; applied?: DatasetColors<T> }

/** Optional CSS palettes apply through Chart.js's per-instance plugin API. */
export function createThemePalette<T extends ChartType = ChartType>(): Plugin<T> {
  const colors = new WeakMap<ChartDataset<T>, ColorState<T>>();
  return {
    id: 'homeledger-theme-colors',
    beforeUpdate(instance) {
      const css = getComputedStyle(document.documentElement);
      const token = (name: string) => css.getPropertyValue(name).trim();
      const series = Array.from({ length: 8 }, (_, i) => token(`--chart-series-${i + 1}`)).filter(Boolean);
      instance.data.datasets.forEach((dataset, index) => {
        const state: ColorState<T> = colors.get(dataset) ?? { original: {
          backgroundColor: dataset.backgroundColor, borderColor: dataset.borderColor,
        } };
        // Props may supply new colors while a theme is active. Preserve those
        // as the new originals, not the colors applied by the previous update.
        if (state.applied && dataset.backgroundColor !== state.applied.backgroundColor) {
          state.original.backgroundColor = dataset.backgroundColor;
        }
        if (state.applied && dataset.borderColor !== state.applied.borderColor) {
          state.original.borderColor = dataset.borderColor;
        }
        const label = dataset.label ?? '';
        const color = /ingreso|income/i.test(label) ? token('--chart-income')
          : /gasto|expense/i.test(label) ? token('--chart-expense') : (series.length ? series[index % series.length] : undefined);
        const chartType = 'type' in instance.config ? instance.config.type : undefined;
        const circular = chartType === 'doughnut' || chartType === 'pie';
        const line = dataset.type === 'line' || chartType === 'line';
        dataset.backgroundColor = Array.isArray(state.original.backgroundColor) && series.length
          ? state.original.backgroundColor.map((_, i) => series[i % series.length] ?? '')
          : color ? (line && /^#[0-9a-f]{6}$/i.test(color) ? `${color}22` : color) : state.original.backgroundColor;
        dataset.borderColor = circular ? token('--bg-card')
          : color || state.original.borderColor;
        state.applied = { backgroundColor: dataset.backgroundColor, borderColor: dataset.borderColor };
        colors.set(dataset, state);
      });
    },
  };
}

/** Canvas colors do not inherit CSS; update chart chrome when either theme changes. */
export function watchChartTheme(chart: Chart): () => void {
  const apply = () => {
    if (chart.canvas === null || (chart.canvas && !chart.canvas.isConnected)) return;
    const css = getComputedStyle(document.documentElement);
    const token = (name: string) => css.getPropertyValue(name).trim();
    chart.options.color = token('--text-secondary');
    const tooltip = chart.options.plugins?.tooltip;
    if (tooltip) {
      tooltip.backgroundColor = token('--bg-elevated');
      tooltip.borderColor = token('--border-default');
      tooltip.titleColor = token('--text-primary');
      tooltip.bodyColor = token('--text-primary');
    }
    const legend = chart.options.plugins?.legend;
    if (legend?.labels) legend.labels.color = token('--text-secondary');
    for (const scale of Object.values(chart.options.scales ?? {})) {
      if (scale?.ticks) scale.ticks.color = token('--text-muted');
      if (scale?.grid) scale.grid.color = token('--border-subtle');
    }
    chart.update('none');
  };
  apply();
  const observer = new MutationObserver(apply);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-ui'] });
  return () => observer.disconnect();
}
