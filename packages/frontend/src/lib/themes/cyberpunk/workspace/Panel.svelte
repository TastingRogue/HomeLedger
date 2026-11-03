<script lang="ts">
  import type { Snippet } from 'svelte';
  let { title, children, action, class: className = '' }: { title: string; children: Snippet; action?: Snippet; class?: string } = $props();
</script>
<section class="cp-panel {className}">
  <header class="cp-panel-head"><h2>{title}</h2>{#if action}<div>{@render action()}</div>{/if}</header>
  <div class="cp-panel-body">{@render children()}</div>
</section>
