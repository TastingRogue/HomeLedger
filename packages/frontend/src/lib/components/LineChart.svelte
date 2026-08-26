<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';

  let { labels, datasets, height = 200 }: {
    labels: string[];
    datasets: { label: string; data: number[]; borderColor: string; backgroundColor?: string; fill?: boolean; tension?: number }[];
    height?: number;
  } = $props();

  let canvas: HTMLCanvasElement;
  let chart: any = null;

  onMount(async () => {
    if (!browser) return;
    const { Chart, registerables } = await import('chart.js');
    Chart.register(...registerables);

    chart = new Chart(canvas, {
      type: 'line',
      data: { labels, datasets: datasets.map(d => ({ ...d, borderWidth: 2, pointRadius: 2, pointBackgroundColor: d.borderColor, tension: d.tension ?? 0.3, fill: d.fill ?? false })) },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1a2332', borderColor: '#1e2a3a', borderWidth: 1, titleFont: { size: 11 }, bodyFont: { size: 11 }, padding: 8 } },
        scales: {
          x: { grid: { color: 'rgba(30,42,58,0.5)' }, ticks: { color: '#64748b', font: { size: 10 }, maxRotation: 0 } },
          y: { grid: { color: 'rgba(30,42,58,0.5)' }, ticks: { color: '#64748b', font: { size: 10 } } },
        },
      },
    });
  });

  onDestroy(() => { chart?.destroy(); });
</script>

<div class="chart-container" style="height: {height}px">
  <canvas bind:this={canvas}></canvas>
</div>

<style>
  .chart-container { position: relative; width: 100%; }
</style>
