<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { activeTheme } from '#lib/stores/theme.ts';
  import { t } from '#lib/i18n/index.ts';
  import ThemeComposition from '#lib/themes/ThemeComposition.svelte';
  import QuickEntryForm from './QuickEntryForm.svelte';
  let open = $state(false);
  let dialog = $state<HTMLDialogElement>();
  let origin: HTMLElement | null = null;
  const renderer = $derived($activeTheme.quickEntry);
  function show() { origin = document.activeElement as HTMLElement; open = true; }
  function close() {
    open = false;
    if (page.url.pathname === '/registro-rapido') void goto('/dashboard', { replace: true });
    else void tick().then(() => origin?.focus());
  }
  function saved() { window.dispatchEvent(new Event('homeledger:quick-entry-saved')); }
  function intercept(event: MouseEvent) {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const anchor = (event.target as Element)?.closest?.('a[href]');
    if (!anchor || anchor.getAttribute('target') === '_blank') return;
    const url = new URL(anchor.getAttribute('href')!, location.href);
    if (url.origin === location.origin && url.pathname === '/registro-rapido') { event.preventDefault(); show(); }
  }
  onMount(() => {
    document.addEventListener('click', intercept, true);
    return () => document.removeEventListener('click', intercept, true);
  });
  $effect(() => { if (page.url.pathname === '/registro-rapido') show(); });
  $effect(() => {
    if (!open || !dialog) return;
    dialog.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = overflow; };
  });
</script>

{#if open}
  <dialog bind:this={dialog} class="hl-popup hl-quick-popup" aria-label={$t('nav.quick_add')} oncancel={(event) => { event.preventDefault(); close(); }}>
    <header class="hl-popup-head"><h2>{$t('page_title.quick_register')}</h2><button type="button" aria-label={$t('common.close')} onclick={close}>×</button></header>
    <div class="hl-popup-body">
      {#if renderer}<ThemeComposition load={renderer} props={{ close, saved }}/>{:else}<QuickEntryForm {close} {saved}/>{/if}
    </div>
  </dialog>
{/if}

<style>
  .hl-popup { width:min(1180px,calc(100vw - 40px)); max-height:calc(100dvh - 40px); margin:auto; padding:0; border:1px solid var(--border-default); border-radius:12px; background:var(--bg-surface); color:var(--text-primary); overflow:auto; overscroll-behavior:contain; }
  .hl-popup::backdrop { background:#05050bd6; backdrop-filter:blur(6px); }
  .hl-popup-head { display:flex; align-items:center; justify-content:space-between; gap:20px; padding:18px 24px; border-bottom:1px solid var(--border-default); }
  h2 { margin:0; font-size:22px; }
  header button { background:transparent; border:1px solid var(--border-default); color:inherit; width:36px; height:36px; cursor:pointer; }
  .hl-popup-body { padding:24px; }
  .hl-popup:has(:global(.quick-register)) { width:min(560px,calc(100vw - 40px)); }
  @media(max-width:650px) { .hl-popup {width:calc(100vw - 16px);max-height:calc(100dvh - 16px);} .hl-popup-body {padding:16px;} }
</style>
