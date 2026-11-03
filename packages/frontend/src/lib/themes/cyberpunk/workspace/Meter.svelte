<script lang="ts">
  let { value, max = 100, tone = 'cyan', label }: { value: number; max?: number; tone?: string; label: string } = $props();
  const percent = $derived(Math.max(0, Math.min(100, max > 0 ? value / max * 100 : 0)));
</script>
<div class="cp-meter {tone}" role="progressbar" aria-label={label} aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100}><span style:width={`${percent}%`}></span></div>
