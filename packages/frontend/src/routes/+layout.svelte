<script lang="ts">
	import '../app.css';
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
	<!-- theme-color lives in app.html (#0b1118, matching manifest theme_color) as a
	     single source of truth for the installed-PWA status bar. -->
	<!-- Apply persisted theme before paint to avoid a flash of the wrong palette -->
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html `<script>try{var t=localStorage.getItem('sf_theme');if(t==='light'){document.documentElement.setAttribute('data-theme','light');document.documentElement.style.colorScheme='light';}}catch(e){}</script>`}
</svelte:head>

{@render children()}
