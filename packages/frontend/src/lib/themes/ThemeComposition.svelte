<script lang="ts" generics="Props extends Record<string, unknown>">
  import type { Component } from 'svelte';
  import type { ThemeComposition } from './types';
  let { load, props }: { load: ThemeComposition<Props>; props: Props } = $props();
  let Renderer = $state<Component<Props>>();
  let error = $state(false);
  $effect(() => {
    const loader = load;
    let current = true;
    Renderer = undefined;
    error = false;
    loader().then(module => { if (current) Renderer = module.default; })
      .catch(() => { if (current) error = true; });
    return () => { current = false; };
  });
</script>

{#if Renderer}
  <Renderer {...props}/>
{:else if error}
  <div role="alert">Unable to load the interface. <button onclick={() => window.location.reload()}>Reload</button></div>
{:else}
  <div role="status" aria-label="Loading interface">…</div>
{/if}
