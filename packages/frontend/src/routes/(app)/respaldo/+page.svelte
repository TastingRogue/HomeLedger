<script lang="ts">
  import { onMount } from 'svelte';
  import {
    exportBackup,
    importBackup,
    getBackupHistory,
    previewImport,
    type BackupHistoryEntry,
    type ImportPreview,
  } from '$lib/api/backup';
  import { ApiError } from '$lib/api/client';
  import { t } from '$lib/i18n';
  import { modalPanel, scrim } from '$lib/motion';

  // ─── State ───
  let history: BackupHistoryEntry[] = $state([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

  // Export
  let exporting = $state(false);
  let exportSuccess = $state<string | null>(null);

  // Import
  let importing = $state(false);
  let importError = $state<string | null>(null);
  let importSuccess = $state<string | null>(null);
  let showConfirmDialog = $state(false);
  let selectedFile: File | null = $state(null);
  let parsedBackup: unknown = $state(null);
  // Dry-run preview (P1.9): shown in the confirm dialog before the destructive
  // replace so the user sees what will be restored vs. replaced, and what the
  // import would skip.
  let preview = $state<ImportPreview | null>(null);
  let previewLoading = $state(false);

  // Entities to surface in the preview table, in a sensible order. Anything in
  // the backup/current counts that isn't listed still shows via the union below.
  const PREVIEW_ORDER = [
    'accounts', 'categories', 'subcategories', 'transactions', 'transactionSplits',
    'transfers', 'subscriptions', 'goals', 'budgets', 'budgetCategories', 'rules',
    'alerts', 'assets', 'liabilities', 'loans', 'loanPayments', 'networthSnapshots',
    'creditSubscriptions', 'attachments', 'receiptAnalyses', 'receiptItems',
  ];

  // Union of entity keys present in either count map, ordered by PREVIEW_ORDER
  // (known keys first) then any extras, dropping all-zero rows to keep it short.
  let previewRows = $derived.by(() => {
    if (!preview) return [] as { key: string; backup: number; current: number }[];
    const keys = new Set<string>([...Object.keys(preview.backupCounts), ...Object.keys(preview.currentCounts)]);
    const ordered = [
      ...PREVIEW_ORDER.filter((k) => keys.has(k)),
      ...[...keys].filter((k) => !PREVIEW_ORDER.includes(k)),
    ];
    return ordered
      .map((key) => ({ key, backup: preview!.backupCounts[key] ?? 0, current: preview!.currentCounts[key] ?? 0 }))
      .filter((r) => r.backup > 0 || r.current > 0);
  });

  // ─── Data Loading ───
  async function loadHistory() {
    loading = true;
    error = null;
    try {
      history = await getBackupHistory();
    } catch (e: unknown) {
      error = e instanceof ApiError ? e.message : $t('backup.error_loading');
    } finally {
      loading = false;
    }
  }

  // ─── Export ───
  async function handleExport() {
    exporting = true;
    exportSuccess = null;
    error = null;
    try {
      const backup = await exportBackup();

      // Trigger download
      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `smart-finance-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      exportSuccess = $t('backup.export_success');
      setTimeout(() => (exportSuccess = null), 4000);
    } catch (e: unknown) {
      error = e instanceof ApiError ? e.message : $t('backup.error_exporting');
    } finally {
      exporting = false;
    }
  }

  // ─── Import ───
  function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    importError = null;
    importSuccess = null;
    selectedFile = file;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        parsedBackup = JSON.parse(content);
      } catch {
        importError = $t('backup.invalid_json');
        selectedFile = null;
        parsedBackup = null;
        return;
      }
      // Open the dialog immediately, then load the non-destructive preview so the
      // user reviews counts + warnings before confirming the replace.
      showConfirmDialog = true;
      preview = null;
      previewLoading = true;
      try {
        preview = await previewImport(parsedBackup);
      } catch (err: unknown) {
        // A validation failure here means the file isn't a usable backup — surface
        // it and close the dialog rather than letting the user confirm a bad import.
        importError = err instanceof ApiError ? err.message : $t('backup.invalid_json');
        showConfirmDialog = false;
        selectedFile = null;
        parsedBackup = null;
      } finally {
        previewLoading = false;
      }
    };
    reader.readAsText(file);
    // Allow re-selecting the same file later (onchange won't fire otherwise).
    input.value = '';
  }

  function cancelImport() {
    showConfirmDialog = false;
    selectedFile = null;
    parsedBackup = null;
    preview = null;
    importError = null;
  }

  async function confirmImport() {
    if (!parsedBackup) return;

    importing = true;
    importError = null;
    try {
      const result = await importBackup(parsedBackup, true);
      importSuccess = result.message || $t('backup.import_success');
      showConfirmDialog = false;
      selectedFile = null;
      parsedBackup = null;
      preview = null;
      await loadHistory();
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        importError = e.message;
      } else {
        importError = $t('backup.error_importing');
      }
    } finally {
      importing = false;
    }
  }

  onMount(() => {
    loadHistory();
  });
</script>

<svelte:head>
  <title>{$t('page_title.backup')} - HomeLedger</title>
</svelte:head>

<div class="page">
  <header class="page-header">
    <h1>{$t('backup.title')}</h1>
  </header>

  {#if error}
    <div class="alert alert-error" role="alert">
      <span>{error}</span>
      <button class="alert-dismiss" onclick={() => (error = null)}>×</button>
    </div>
  {/if}
  {#if exportSuccess}
    <div class="alert alert-success" role="status"><span>{exportSuccess}</span></div>
  {/if}
  {#if importSuccess}
    <div class="alert alert-success" role="status"><span>{importSuccess}</span></div>
  {/if}

  <!-- Actions -->
  <div class="actions-row">
    <button class="action-btn export-btn" onclick={handleExport} disabled={exporting}>
      <span class="action-icon">↓</span>
      <span class="action-text">{exporting ? $t('backup.exporting') : $t('backup.export_btn')}</span>
      <span class="action-desc">{$t('backup.export_desc')}</span>
    </button>

    <label class="action-btn import-btn" for="file-input">
      <span class="action-icon">↑</span>
      <span class="action-text">{$t('backup.import_btn')}</span>
      <span class="action-desc">{$t('backup.import_desc')}</span>
    </label>
    <input type="file" id="file-input" accept=".json,application/json" onchange={handleFileSelect} class="file-input" />
  </div>

  {#if importError}
    <p class="field-error">{importError}</p>
  {/if}

  <!-- Confirm Dialog -->
  {#if showConfirmDialog}
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div class="overlay" onkeydown={(e) => e.key === 'Escape' && cancelImport()} tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="confirm-title" transition:scrim>
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <div class="modal" onclick={(e) => e.stopPropagation()} role="document" transition:modalPanel>
        <header class="modal-header">
          <h2 id="confirm-title">{$t('backup.confirm_title')}</h2>
          <button class="close-btn" onclick={cancelImport} aria-label={$t('common.close')}>&times;</button>
        </header>
        <p class="confirm-warning">{$t('backup.confirm_warning')}</p>
        {#if selectedFile}
          <p class="file-info">{$t('backup.file_label', { name: selectedFile.name })}</p>
        {/if}

        <!-- Dry-run preview (P1.9): what will be restored vs. replaced. -->
        {#if previewLoading}
          <p class="preview-loading">{$t('backup.preview_loading')}</p>
        {:else if preview}
          <div class="preview">
            <div class="preview-head">
              <span class="preview-title">{$t('backup.preview_title')}</span>
              <span class="preview-cols"><span>{$t('backup.preview_in_backup')}</span><span>{$t('backup.preview_current')}</span></span>
            </div>
            {#if previewRows.length === 0}
              <p class="preview-empty">{$t('backup.preview_empty')}</p>
            {:else}
              <div class="preview-rows">
                {#each previewRows as row (row.key)}
                  <div class="preview-row">
                    <span class="preview-entity">{$t(`backup.entity.${row.key}`)}</span>
                    <span class="preview-nums">
                      <span class="preview-backup">{row.backup}</span>
                      <span class="preview-current" class:replaced={row.current > 0}>{row.current}</span>
                    </span>
                  </div>
                {/each}
              </div>
            {/if}
            {#if preview.warnings.length > 0}
              <ul class="preview-warnings">
                {#each preview.warnings as w}
                  <li>⚠ {w}</li>
                {/each}
              </ul>
            {/if}
          </div>
        {/if}

        <div class="form-buttons">
          <button class="btn btn-secondary" onclick={cancelImport} disabled={importing}>{$t('common.cancel')}</button>
          <button class="btn btn-danger" onclick={confirmImport} disabled={importing || previewLoading}>
            {importing ? $t('backup.confirming') : $t('common.confirm')}
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- History -->
  <section class="section">
    <h2 class="section-title">{$t('backup.history_title')}</h2>
    {#if loading}
      <p class="loading-msg">{$t('backup.loading_history')}</p>
    {:else if history.length === 0}
      <p class="empty-msg">{$t('backup.no_history')}</p>
    {:else}
      <div class="history-list">
        {#each history as entry (entry.id)}
          <div class="history-row">
            <span class="history-type-tag" class:export={entry.type === 'export'} class:import={entry.type === 'import'}>
              {entry.type === 'export' ? $t('backup.type_export') : $t('backup.type_import')}
            </span>
            <span class="history-date">{new Date(entry.createdAt).toLocaleString('es-MX')}</span>
          </div>
        {/each}
      </div>
    {/if}
  </section>
</div>

<style>
  .page { max-width: var(--content-max); margin: 0 auto; padding: 0 var(--spacing-md); }

  .page-header { margin-bottom: 1.25rem; }
  .page-header h1 { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); }

  /* Alerts */
  .alert {
    display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-sm);
    padding: 0.4rem 0.6rem; border-radius: var(--radius-sm); margin-bottom: var(--spacing-sm); font-size: 0.8rem;
  }
  .alert-error { background: var(--tag-red-bg); color: var(--accent-red); }
  .alert-success { background: var(--tag-green-bg); color: var(--accent-green); }
  .alert-dismiss { background: none; border: none; color: inherit; font-size: 1rem; cursor: pointer; padding: 0 0.2rem; }

  /* Action Buttons */
  .actions-row { display: flex; gap: var(--spacing-sm); margin-bottom: var(--spacing-md); flex-wrap: wrap; }
  .action-btn {
    flex: 1; min-width: 200px; padding: 0.8rem 1rem;
    background: var(--bg-surface); border: 1px solid var(--border-default);
    border-radius: var(--radius-md); cursor: pointer;
    display: flex; flex-direction: column; align-items: center; gap: 0.2rem;
    transition: border-color 0.15s, background 0.15s; text-align: center;
  }
  .action-btn:hover { border-color: var(--accent-blue); background: var(--bg-elevated); }
  .action-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .export-btn { border-color: var(--accent-green); }
  .export-btn:hover { border-color: var(--accent-green); background: var(--tag-green-bg); }
  .import-btn { border-color: var(--accent-orange); }
  .import-btn:hover { border-color: var(--accent-orange); background: var(--tag-orange-bg); }
  .action-icon { font-size: 1.3rem; }
  .action-text { font-size: 0.85rem; font-weight: 600; color: var(--text-primary); }
  .action-desc { font-size: 0.7rem; color: var(--text-muted); }

  .file-input { display: none; }
  .field-error { font-size: 0.75rem; color: var(--accent-red); margin-bottom: var(--spacing-sm); }

  /* Section */
  .section { margin-top: var(--spacing-lg); }
  .section-title { font-size: 0.65rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--accent-blue); margin-bottom: var(--spacing-sm); }

  /* History */
  .history-list { display: flex; flex-direction: column; gap: 2px; }
  .history-row {
    display: flex; justify-content: space-between; align-items: center;
    padding: 0.35rem 0.6rem; background: var(--bg-surface); border-radius: var(--radius-sm);
  }
  .history-row:hover { background: var(--bg-hover); }
  .history-type-tag { font-size: 0.72rem; font-weight: 600; padding: 0.08rem 0.3rem; border-radius: var(--radius-sm); }
  .history-type-tag.export { background: var(--tag-green-bg); color: var(--accent-green); }
  .history-type-tag.import { background: var(--tag-orange-bg); color: var(--accent-orange); }
  .history-date { font-size: 0.72rem; color: var(--text-muted); }

  .loading-msg, .empty-msg { font-size: 0.8rem; color: var(--text-muted); text-align: center; padding: var(--spacing-md); }

  /* Modal */
  .overlay {
    position: fixed; inset: 0; background: rgba(0, 0, 0, 0.6);
    display: flex; align-items: center; justify-content: center;
    z-index: 1000; padding: var(--spacing-md);
  }
  .modal {
    background: var(--bg-surface); border: 1px solid var(--border-default);
    border-radius: var(--radius-lg); padding: var(--spacing-lg);
    max-width: 460px; width: 100%; max-height: 85vh; overflow-y: auto;
  }
  .modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--spacing-md); }
  .modal-header h2 { font-size: 1rem; font-weight: 600; color: var(--text-primary); }
  .close-btn { background: none; border: none; font-size: 1.3rem; color: var(--text-muted); cursor: pointer; }
  .close-btn:hover { color: var(--text-primary); }
  .confirm-warning { font-size: 0.85rem; color: var(--text-secondary); margin-bottom: var(--spacing-sm); line-height: 1.4; }
  .file-info { font-size: 0.72rem; color: var(--text-muted); margin-bottom: var(--spacing-md); }

  /* Buttons */
  .btn {
    display: inline-flex; align-items: center; justify-content: center;
    padding: 0.35rem 0.75rem; border: none; border-radius: var(--radius-sm);
    font-size: 0.8rem; font-weight: 500; cursor: pointer;
  }
  .btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn-secondary { background: var(--bg-elevated); color: var(--text-secondary); border: 1px solid var(--border-default); }
  .btn-secondary:hover:not(:disabled) { background: var(--bg-hover); }
  .btn-danger { background: var(--accent-red); color: #fff; }
  .btn-danger:hover:not(:disabled) { background: #b33a36; }

  .form-buttons { display: flex; gap: var(--spacing-sm); justify-content: flex-end; margin-top: var(--spacing-md); }

  /* Import preview (P1.9) */
  .preview-loading { font-size: 0.78rem; color: var(--text-muted); padding: 0.5rem 0; }
  .preview {
    border: 1px solid var(--border-subtle); border-radius: var(--radius-md);
    padding: 0.5rem 0.65rem; margin-bottom: var(--spacing-md); background: var(--bg-elevated);
  }
  .preview-head {
    display: flex; align-items: center; justify-content: space-between;
    padding-bottom: 0.35rem; margin-bottom: 0.35rem; border-bottom: 1px solid var(--border-subtle);
  }
  .preview-title { font-size: 0.65rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); }
  .preview-cols { display: flex; gap: 1rem; }
  .preview-cols span { font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.03em; color: var(--text-muted); width: 3.5rem; text-align: right; }
  .preview-rows { display: flex; flex-direction: column; max-height: 34vh; overflow-y: auto; }
  .preview-row { display: flex; align-items: center; justify-content: space-between; padding: 0.18rem 0; font-size: 0.76rem; }
  .preview-entity { color: var(--text-secondary); }
  .preview-nums { display: flex; gap: 1rem; font-variant-numeric: tabular-nums; }
  .preview-nums span { width: 3.5rem; text-align: right; }
  .preview-backup { color: var(--text-primary); font-weight: 600; }
  .preview-current { color: var(--text-muted); }
  .preview-current.replaced { color: var(--accent-orange); }
  .preview-empty { font-size: 0.76rem; color: var(--text-muted); padding: 0.35rem 0; }
  .preview-warnings { list-style: none; margin: 0.5rem 0 0; padding: 0.5rem 0 0; border-top: 1px solid var(--border-subtle); display: flex; flex-direction: column; gap: 0.25rem; }
  .preview-warnings li { font-size: 0.72rem; color: var(--accent-orange); line-height: 1.35; }
</style>
