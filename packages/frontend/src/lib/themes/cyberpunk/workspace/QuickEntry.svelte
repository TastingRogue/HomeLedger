<script lang="ts">
  import { onMount } from 'svelte';
  import Daily from './Daily.svelte';
  import { preferences } from '$lib/stores/preferences';
  import { loadWorkspace, emptyData, buildModel, type Actions } from './model';
  import './workspace.css';
  let { saved }: { close: () => void; saved: () => void } = $props();
  let data = $state(emptyData());
  let loading = $state(true);
  let error = $state('');
  let notice = $state('');
  const m = $derived(buildModel(data, 'registro-rapido', $preferences.locale, $preferences.currency));
  async function refresh() { try { data = await loadWorkspace('registro-rapido'); error = ''; } catch (e) { error = e instanceof Error ? e.message : String(e); } finally { loading = false; } }
  const a: Actions = { refresh, manage: () => {}, edit: () => {}, notify: message => { notice = message; saved(); } };
  onMount(refresh);
</script>
<div class="cp-workspace cp-popup-content">
  {#if notice}<p class="cp-notice" role="status">✓ {notice}</p>{/if}
  {#if error}<p class="cp-error" role="alert">{error}<button class="cp-button" onclick={refresh}>{m.t('offline.retry')}</button></p>{/if}
  {#if loading}<p role="status">{m.t('cyberpunk.loading_your_finances')}</p>{:else}<Daily {m} {a}/>{/if}
</div>
