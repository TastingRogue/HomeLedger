<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/env';
  import { watchChartTheme, createThemePalette } from '#lib/utils/chart-theme.ts';

  let { labels, datasets, height = 200, grid = false, formatValue }: {
    labels: string[];
    datasets: { label: string; data: number[]; backgroundColor: string | string[]; borderRadius?: number }[];
    height?: number;
    grid?: boolean;
    formatValue?: (value:number)=>string;
  } = $props();

  let canvas: HTMLCanvasElement;
  let chart: any = null;
  let disposed = false;
  let stopWatchingTheme: (() => void) | undefined;

  onMount(async () => {
    if (!browser) return;
    const { Chart, registerables } = await import('chart.js');
    if (disposed || !canvas?.isConnected) return;
    Chart.register(...registerables);

    chart = new Chart(canvas, {
      plugins: [createThemePalette()],
      type: 'bar',
      data: { labels, datasets: datasets.map(d => ({ ...d, borderRadius: d.borderRadius ?? 4, borderSkipped: false })) },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1a2332', borderColor: '#1e2a3a', borderWidth: 1, padding: 8, ...(formatValue?{callbacks:{label:(context)=>`${context.dataset.label}: ${formatValue(Number(context.parsed.y))}`}}:{}) } },
        scales: {
          x: { grid: { display:grid }, ticks: { color: '#64748b', font: { size: 10 }, maxRotation:0, autoSkip:true, maxTicksLimit:8 } },
          y: { grid: { color: 'rgba(30,42,58,0.5)' }, ticks: { color: '#64748b', font: { size: 10 }, ...(formatValue?{callback:(value)=>formatValue(Number(value))}:{}) } },
        },
      },
    });
    stopWatchingTheme = watchChartTheme(chart);
  });

  $effect(() => {
    labels; datasets;
    if (chart) {
      chart.data.labels = labels;
      chart.data.datasets = datasets.map(d => ({ ...d, borderRadius:d.borderRadius ?? 4, borderSkipped:false }));
      chart.update('none');
    }
  });

  onDestroy(() => { disposed = true; stopWatchingTheme?.(); chart?.destroy(); });
</script>

<div class="chart-container" style="height: {height}px">
  <canvas bind:this={canvas}></canvas>
</div>

<style>
  .chart-container { position: relative; width: 100%; }
</style>
