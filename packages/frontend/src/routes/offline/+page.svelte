<script lang="ts">
  import { t } from '$lib/i18n';

  function retry() {
    // Simplest reliable recovery: reload the current document. If the network is
    // back the app shell loads normally; if not, the SW serves this page again.
    if (typeof location !== 'undefined') location.reload();
  }
</script>

<svelte:head>
  <title>{$t('offline.title')} | HomeLedger</title>
</svelte:head>

<div class="offline-wrap">
  <div class="offline-card">
    <div class="offline-icon" aria-hidden="true">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
        <path d="M1 1l22 22" />
        <path d="M16.72 11.06A10.94 10.94 0 0119 12.55" />
        <path d="M5 12.55a10.94 10.94 0 015.17-2.39" />
        <path d="M10.71 5.05A16 16 0 0122.58 9" />
        <path d="M1.42 9a15.91 15.91 0 014.7-2.88" />
        <path d="M8.53 16.11a6 6 0 016.95 0" />
        <line x1="12" y1="20" x2="12.01" y2="20" />
      </svg>
    </div>
    <h1 class="offline-title">{$t('offline.title')}</h1>
    <p class="offline-desc">{$t('offline.desc')}</p>
    <button class="offline-retry" onclick={retry}>{$t('offline.retry')}</button>
  </div>
</div>

<style>
  .offline-wrap {
    min-height: 100vh;
    min-height: 100dvh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-md, 1rem);
    background: var(--bg-deep, #0b1118);
  }
  .offline-card {
    width: 100%;
    max-width: 380px;
    text-align: center;
    padding: 2rem 1.5rem;
    border-radius: var(--radius-lg, 12px);
    background: var(--bg-surface, #151b23);
    border: 1px solid var(--border-default, #2a323c);
    box-shadow: var(--shadow-lg, 0 10px 30px rgba(0, 0, 0, 0.3));
  }
  .offline-icon {
    width: 64px;
    height: 64px;
    margin: 0 auto 1rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-muted, rgba(255, 255, 255, 0.05));
    color: var(--text-muted, #8a94a3);
  }
  .offline-title {
    font-size: 1.15rem;
    font-weight: 700;
    color: var(--text-primary, #e6eaf0);
    margin-bottom: 0.4rem;
  }
  .offline-desc {
    font-size: 0.85rem;
    color: var(--text-muted, #8a94a3);
    margin-bottom: 1.25rem;
    line-height: 1.5;
  }
  .offline-retry {
    padding: 0.6rem 1.4rem;
    background: var(--accent-blue, #3b82f6);
    color: #fff;
    border: none;
    border-radius: var(--radius-md, 8px);
    font-size: 0.88rem;
    font-weight: 600;
    cursor: pointer;
    min-height: 44px;
  }
  .offline-retry:hover {
    background: var(--color-primary-hover, #2563eb);
  }
</style>
