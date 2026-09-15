<script lang="ts">
  import { onMount } from 'svelte';
  import { t } from '$lib/i18n';

  // Reflects navigator.onLine and window online/offline events. Purely a UX hint
  // — the service worker still serves cached content when offline.
  let offline = $state(false);

  onMount(() => {
    offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    const goOffline = () => (offline = true);
    const goOnline = () => (offline = false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  });
</script>

{#if offline}
  <div class="offline-banner" role="status" aria-live="polite">
    <span class="offline-dot" aria-hidden="true"></span>
    {$t('offline.banner')}
  </div>
{/if}

<style>
  .offline-banner {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 300;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.4rem 0.75rem;
    background: var(--accent-orange, #d97706);
    color: #fff;
    font-size: 0.78rem;
    font-weight: 600;
    text-align: center;
  }
  .offline-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #fff;
    opacity: 0.9;
  }
  @media (prefers-reduced-motion: no-preference) {
    .offline-dot {
      animation: offline-pulse 1.4s ease-in-out infinite;
    }
  }
  @keyframes offline-pulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 1; }
  }
</style>
