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
  let wrap: HTMLDivElement;
  let chart: any = null;
  let themeObserver: MutationObserver | null = null;
  // Hide the center total while hovering a slice, so the tooltip (drawn on the
  // canvas, under the HTML overlay) isn't covered by the center label.
  let hovering = $state(false);

  // Read a CSS custom property off the wrapper so the chart follows the active
  // theme (light/dark) instead of hardcoded dark colors. Falls back to the dark
  // value if the var can't be resolved.
  function token(name: string, fallback: string): string {
    if (!browser || !wrap) return fallback;
    const v = getComputedStyle(wrap).getPropertyValue(name).trim();
    return v || fallback;
  }

  // The slice separators should match the CARD surface the donut sits on, so on
  // dark they blend into the dark card and on light they read as thin white gaps
  // — never a hard black line.
  function applyThemeColors() {
    if (!chart) return;
    const surface = token('--bg-card', '#161e2a');
    chart.data.datasets[0].borderColor = surface;
    const tt = chart.options.plugins.tooltip;
    tt.backgroundColor = token('--bg-elevated', '#1a2332');
    tt.borderColor = token('--border-default', '#1e2a3a');
    tt.titleColor = token('--text-primary', '#f1f5f9');
    tt.bodyColor = token('--text-primary', '#f1f5f9');
    chart.update('none');
  }

  onMount(async () => {
    if (!browser) return;
    const { Chart, registerables } = await import('chart.js');
    Chart.register(...registerables);

    chart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors,
          borderColor: token('--bg-card', '#161e2a'),
          borderWidth: 2,
          hoverBorderWidth: 0,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '58%',
        onHover: (_evt: unknown, elements: unknown[]) => {
          hovering = elements.length > 0;
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: token('--bg-elevated', '#1a2332'),
            borderColor: token('--border-default', '#1e2a3a'),
            borderWidth: 1,
            titleColor: token('--text-primary', '#f1f5f9'),
            bodyColor: token('--text-primary', '#f1f5f9'),
            titleFont: { size: 11 },
            bodyFont: { size: 11 },
            padding: 8,
          },
        },
      },
    });

    // Re-theme the chart when the user toggles light/dark (data-theme on <html>).
    themeObserver = new MutationObserver(applyThemeColors);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
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

  onDestroy(() => {
    themeObserver?.disconnect();
    chart?.destroy();
  });
</script>

<!-- The wrap is a fixed-height square so the donut is drawn centered and the
     absolutely-positioned center label lands exactly on the donut's middle. -->
<div class="doughnut-wrap" style="height: {height}px" bind:this={wrap}>
  <div
    class="doughnut-canvas"
    style="height: {height}px; width: {height}px"
    role="presentation"
    onmouseleave={() => (hovering = false)}
  >
    <canvas bind:this={canvas}></canvas>
    {#if centerText}
      <!-- Centered relative to the square canvas box (not the full-width wrap),
           so the label lands on the donut hole regardless of card width.
           Fades out while hovering a slice so the tooltip isn't covered. -->
      <div class="center-text" class:hidden={hovering}>
        <span class="center-amount">{centerText}</span>
        <span class="center-label">Total</span>
      </div>
    {/if}
  </div>
</div>

<style>
  .doughnut-wrap { position: relative; width: 100%; display: flex; align-items: center; justify-content: center; }
  /* Square canvas box centered in the wrap → the drawn donut is centered, so the
     center label (below) aligns with the hole instead of drifting. */
  .doughnut-canvas { position: relative; flex-shrink: 0; }
  .center-text { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); text-align: center; pointer-events: none; display: flex; flex-direction: column; align-items: center; gap: 0.05rem; transition: opacity var(--transition-fast); }
  /* While a slice is hovered, fade the center total so the canvas tooltip is legible. */
  .center-text.hidden { opacity: 0; }
  .center-amount { font-size: 0.85rem; font-weight: 700; color: var(--text-primary); white-space: nowrap; font-variant-numeric: tabular-nums; }
  .center-label { font-size: 0.6rem; color: var(--text-muted); }
</style>
