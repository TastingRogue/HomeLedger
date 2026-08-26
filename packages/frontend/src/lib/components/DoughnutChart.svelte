<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';

  let { labels, data, colors, height = 200, centerText = '' }: {
    labels: string[];
    data: number[];
    colors: string[];
    height?: number;
    centerText?: string;
  } = $props();

  let canvas: HTMLCanvasElement;
  let chart: any = null;

  onMount(async () => {
    if (!browser) return;
    const { Chart, registerables } = await import('chart.js');
    Chart.register(...registerables);

    chart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{ data, backgroundColor: colors, borderColor: '#131a24', borderWidth: 2, hoverBorderWidth: 0 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '58%',
        plugins: {
          legend: { display: false },
          tooltip: { backgroundColor: '#1a2332', borderColor: '#1e2a3a', borderWidth: 1, titleFont: { size: 11 }, bodyFont: { size: 11 }, padding: 8 },
        },
      },
    });
  });

  $effect(() => {
    labels; data; colors;
    if (chart) {
      chart.data.labels = labels;
      chart.data.datasets[0].data = data;
      chart.data.datasets[0].backgroundColor = colors;
      chart.update('none');
    }
  });

  onDestroy(() => { chart?.destroy(); });
</script>

<div class="doughnut-wrap" style="height: {height}px">
  <canvas bind:this={canvas}></canvas>
  {#if centerText}
    <div class="center-text">
      <span class="center-amount">{centerText}</span>
      <span class="center-label">Total</span>
    </div>
  {/if}
</div>

<style>
  .doughnut-wrap { position: relative; width: 100%; display: flex; align-items: center; justify-content: center; }
  .center-text { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); text-align: center; pointer-events: none; display: flex; flex-direction: column; align-items: center; gap: 0.05rem; }
  .center-amount { font-size: 0.85rem; font-weight: 700; color: var(--text-primary); white-space: nowrap; }
  .center-label { font-size: 0.6rem; color: var(--text-muted); }
</style>
