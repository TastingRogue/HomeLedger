<script lang="ts">
  import { uiSkin, setUiSkin, activeTheme } from '$lib/stores/theme';
  import { t } from '$lib/i18n';

  import { themes, themePreviewStyle } from '$lib/themes/registry';
  import { preferences } from '$lib/stores/preferences';
</script>

<fieldset class="appearance-picker">
  <legend>{$t('appearance.title')}</legend>
  <p class="description">{$t('appearance.description')}</p>
  <div class="choices">
    {#each themes as choice (choice.id)}
      <label class="choice" class:selected={$uiSkin === choice.id}>
        <input type="radio" name="ui-skin" value={choice.id} checked={$uiSkin === choice.id}
          onchange={() => setUiSkin(choice.id)} />
        <span class="preview" style={themePreviewStyle(choice.preview)} aria-hidden="true">
          <span class="mini-sidebar"><i></i><i></i><i></i><i></i></span>
          <span class="mini-content"><span class="mini-heading"></span><span class="mini-stats"><i></i><i></i><i></i></span><span class="mini-chart"><i></i><i></i><i></i><i></i><i></i><i></i></span></span>
        </span>
        <span class="choice-heading"><strong>{choice.name[$preferences.locale] ?? choice.name.en}</strong>
          {#if $uiSkin === choice.id}<span class="selected-label">✓ {$t('appearance.selected')}</span>{/if}
        </span>
        <span class="choice-description">{choice.description[$preferences.locale] ?? choice.description.en}</span>
      </label>
    {/each}
  </div>
  {#if $activeTheme.notice}<p class="note">{$activeTheme.notice[$preferences.locale] ?? $activeTheme.notice.en}</p>{/if}
</fieldset>

<style>
  .appearance-picker { border: 0; min-width: 0; padding: 1.15rem 0; }
  legend { font-size: 0.85rem; font-weight: 600; padding: 0; }
  .description, .note { font-size: 0.78rem; color: var(--text-secondary); line-height: 1.55; }
  .description { margin: 0.35rem 0 0.9rem; }
  .note { margin-top: 0.8rem; max-width: 70ch; }
  .choices { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); gap: 0.85rem; }
  .choice { position: relative; display: flex; flex-direction: column; gap: 0.6rem; padding: 0.8rem; border: 1px solid var(--border-default); border-radius: var(--radius-md); background: var(--bg-surface); cursor: pointer; }
  .choice.selected { border-color: var(--text-link); outline: 1px solid var(--text-link); }
  .choice:focus-within { outline: 3px solid var(--text-link); outline-offset: 3px; }
  input { position: absolute; width: 1px; height: 1px; opacity: 0; }
  .choice-heading { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 0.4rem; font-size: 0.85rem; }
  .selected-label { font-size: 0.7rem; color: var(--text-link); }
  .choice-description { color: var(--text-secondary); font-size: 0.75rem; line-height: 1.5; }
  .preview { display: flex; height: 112px; gap: 10px; padding: 10px; background: var(--preview-canvas); border: 1px solid var(--preview-border); border-radius: var(--preview-radius); }
  .mini-sidebar { width: 22%; border-right: 1px solid var(--preview-panel); display: flex; flex-direction: column; gap: 9px; padding: 4px 8px 0 0; }
  .mini-sidebar i { height: 4px; background: #607080; }
  .mini-sidebar i:nth-child(2) { background: var(--preview-selection); }
  .mini-content { flex: 1; display: flex; flex-direction: column; gap: 8px; }
  .mini-heading { height: 5px; width: 48%; background: var(--preview-heading); }
  .mini-stats { display: flex; height: 23px; gap: 5px; }
  .mini-stats i { flex: 1; background: var(--preview-panel); border-top: 2px solid var(--preview-accent); }
  .mini-stats i:last-child { border-color: var(--preview-heading); }
  .mini-chart { display: flex; flex: 1; gap: 8%; align-items: end; padding: 0 8%; border-bottom: 1px solid #607080; }
  .mini-chart i { width: 9%; height: 60%; background: var(--preview-accent); }
  .mini-chart i:nth-child(even) { height: 85%; opacity: 0.65; }
  .mini-chart i:nth-child(3) { height: 40%; }
  @media (max-width: 560px) { .choices { grid-template-columns: 1fr; } }
</style>
