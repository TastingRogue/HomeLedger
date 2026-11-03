<script lang="ts">
	import '../app.css';
	import { appearanceBootstrap } from '$lib/themes/bootstrap';
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	import { theme } from '$lib/stores/theme';
	import { applyInstanceConfig } from '$lib/stores/preferences';

	let { children }: { children: Snippet } = $props();

	// Touch the store once on mount so its subscription applies the persisted
	// theme to <html>. The inline head script below prevents a flash by setting
	// the attribute before first paint.
	onMount(() => {
		theme.update((t) => t);
		// Apply instance config: host default language (first run only) + the
		// instance currency (single-currency-per-install, always authoritative).
		void applyInstanceConfig();
	});
</script>

<svelte:head>
	<!-- The registered theme supplies the browser chrome color before first paint. -->
	<!-- Apply persisted theme before paint to avoid a flash of the wrong palette -->
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html appearanceBootstrap}
</svelte:head>

{@render children()}
