<script lang="ts">
  import { onMount } from 'svelte';
  import { t } from '$lib/i18n';
  import { getLockConfig, unlockWebauthn, unlockPin } from '$lib/stores/lock';

  let { onUnlocked }: { onUnlocked: () => void } = $props();

  const config = getLockConfig();
  let busy = $state(false);
  let error = $state('');
  let pin = $state('');

  async function tryWebauthn() {
    busy = true; error = '';
    try {
      const ok = await unlockWebauthn();
      if (ok) { onUnlocked(); return; }
      error = $t('lock.failed');
    } catch {
      error = $t('lock.failed');
    } finally {
      busy = false;
    }
  }

  async function submitPin(e: Event) {
    e.preventDefault();
    busy = true; error = '';
    try {
      const ok = await unlockPin(pin);
      if (ok) { onUnlocked(); return; }
      error = $t('lock.wrong_pin');
      pin = '';
    } finally {
      busy = false;
    }
  }

  onMount(() => {
    // For biometrics, prompt immediately — it's the primary, fastest path.
    if (config.method === 'webauthn') void tryWebauthn();
  });
</script>

<div class="lock-wrap">
  <div class="lock-card">
    <div class="lock-icon" aria-hidden="true">🔒</div>
    <h1 class="lock-title">{$t('lock.title')}</h1>

    {#if config.method === 'webauthn'}
      <p class="lock-desc">{$t('lock.biometric_prompt')}</p>
      <button class="lock-btn" onclick={tryWebauthn} disabled={busy}>
        {busy ? $t('lock.verifying') : $t('lock.unlock_biometric')}
      </button>
    {:else}
      <p class="lock-desc">{$t('lock.pin_prompt')}</p>
      <form onsubmit={submitPin}>
        <input
          class="lock-pin"
          type="password"
          inputmode="numeric"
          autocomplete="off"
          bind:value={pin}
          placeholder="••••"
          aria-label={$t('lock.pin_label')}
          disabled={busy}
        />
        <button class="lock-btn" type="submit" disabled={busy || pin.length < 4}>
          {busy ? $t('lock.verifying') : $t('lock.unlock')}
        </button>
      </form>
    {/if}

    {#if error}<p class="lock-error" role="alert">{error}</p>{/if}
  </div>
</div>

<style>
  .lock-wrap {
    position: fixed;
    inset: 0;
    z-index: 500;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    background: var(--bg-deep, #0b1118);
  }
  .lock-card {
    width: 100%;
    max-width: 340px;
    text-align: center;
    padding: 2rem 1.5rem;
    border-radius: var(--radius-lg, 12px);
    background: var(--bg-surface, #151b23);
    border: 1px solid var(--border-default, #2a323c);
  }
  .lock-icon { font-size: 2rem; margin-bottom: 0.5rem; }
  .lock-title { font-size: 1.15rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.35rem; }
  .lock-desc { font-size: 0.82rem; color: var(--text-muted); margin-bottom: 1.1rem; }
  .lock-pin {
    width: 100%;
    text-align: center;
    letter-spacing: 0.4em;
    font-size: 1.1rem;
    padding: 0.6rem;
    margin-bottom: 0.75rem;
  }
  .lock-btn {
    width: 100%;
    padding: 0.6rem;
    background: var(--accent-blue);
    color: #fff;
    border: none;
    border-radius: var(--radius-md, 8px);
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    min-height: 44px;
  }
  .lock-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .lock-error { margin-top: 0.75rem; font-size: 0.78rem; color: var(--accent-red); }
</style>
