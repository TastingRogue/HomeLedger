<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { watchChartTheme, createThemePalette } from '$lib/utils/chart-theme';

  let { labels, barDataset, lineDataset, height = 220 }: {
    labels: string[];
    barDataset: { label: string; data: number[]; backgroundColor: string; borderColor?: string };
    lineDataset: { label: string; data: number[]; borderColor: string; backgroundColor?: string };
    height?: number;
  } = $props();

  let canvas: HTMLCanvasElement;
  let chart: any = null;
  let disposed = false;
  let stopWatchingTheme: (() => void) | undefined;

  async function createChart() {
    if (!browser || !canvas) return;
    const { Chart, registerables } = await import('chart.js');
    if (disposed || !canvas?.isConnected) return;
    Chart.register(...registerables);

    stopWatchingTheme?.();
    if (chart) chart.destroy();

    chart = new Chart(canvas, {
      plugins: [createThemePalette()],
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            type: 'bar',
            label: barDataset.label,
            data: barDataset.data,
            backgroundColor: barDataset.backgroundColor,
            borderColor: barDataset.borderColor ?? barDataset.backgroundColor,
            borderWidth: 0,
            borderRadius: 3,
            barPercentage: 0.5,
            categoryPercentage: 0.7,
            order: 2,
          },
          {
            type: 'line',
            label: lineDataset.label,
            data: lineDataset.data,
            borderColor: lineDataset.borderColor,
            backgroundColor: lineDataset.backgroundColor ?? 'rgba(239, 68, 68, 0.05)',
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
            pointHoverBackgroundColor: lineDataset.borderColor,
            tension: 0.4,
            fill: true,
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              color: '#94a3b8',
              font: { size: 11 },
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 16,
            },
          },
          tooltip: {
            backgroundColor: '#1a2332',
            borderColor: '#1e2a3a',
            borderWidth: 1,
            titleFont: { size: 11 },
            bodyFont: { size: 11 },
            padding: 8,
          },
        },
        scales: {
          x: {
            border: { display: false },
            grid: { color: 'rgba(30,42,58,0.4)' },
            ticks: { color: '#64748b', font: { size: 10 }, maxRotation: 0 },
          },
          y: {
            border: { display: false },
            grid: { color: 'rgba(30,42,58,0.4)' },
            ticks: { color: '#64748b', font: { size: 10 } },
            beginAtZero: true,
          },
        },
      },
    });
    stopWatchingTheme = watchChartTheme(chart);
  }

  onMount(() => { createChart(); });

  $effect(() => {
    // Re-read reactive props to trigger
    labels; barDataset; lineDataset;
    if (chart) {
      chart.data.labels = labels;
      chart.data.datasets[0].data = barDataset.data;
      chart.data.datasets[1].data = lineDataset.data;
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
