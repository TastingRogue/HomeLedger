<script lang="ts">
  import { theme, setTheme, activeTheme } from '$lib/stores/theme';
  import { t } from '$lib/i18n';
</script>

{#if $activeTheme.colorScheme === 'preference'}
<div class="theme-toggle" role="group" aria-label={$t('settings.theme')}>
        <button
          type="button"
          class="theme-icon"
          class:active={$theme === 'dark'}
          aria-pressed={$theme === 'dark'}
          title={$t('settings.theme_dark')}
          onclick={() => setTheme('dark')}
        >🌙</button>
        <button
          type="button"
          class="theme-icon"
          class:active={$theme === 'light'}
          aria-pressed={$theme === 'light'}
          title={$t('settings.theme_light')}
          onclick={() => setTheme('light')}
        >☀️</button>
      </div>

{/if}

<style>
  .theme-toggle { display: flex; background: var(--bg-elevated); border: 1px solid var(--border-default); border-radius: var(--radius-md); overflow: hidden; }
  .theme-icon { padding: 0.3rem 0.5rem; font-size: 0.8rem; cursor: pointer; opacity: 0.5; background: none; border: none; line-height: 1; transition: opacity 0.15s, background 0.15s; }
  .theme-icon:hover { opacity: 0.8; }
  .theme-icon.active { opacity: 1; background: var(--bg-hover); }
</style>
