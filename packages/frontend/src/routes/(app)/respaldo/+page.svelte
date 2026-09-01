<script lang="ts">
  import { onMount } from 'svelte';
  import {
    exportBackup,
    importBackup,
    getBackupHistory,
    type BackupFile,
    type BackupHistoryEntry,
  } from '$lib/api/backup';
  import { ApiError } from '$lib/api/client';

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

  // ─── Data Loading ───
  async function loadHistory() {
    loading = true;
    error = null;
    try {
      history = await getBackupHistory();
    } catch (e: unknown) {
      error = e instanceof ApiError ? e.message : 'Error al cargar historial';
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

      exportSuccess = 'Respaldo exportado exitosamente.';
      setTimeout(() => (exportSuccess = null), 4000);
    } catch (e: unknown) {
      error = e instanceof ApiError ? e.message : 'Error al exportar respaldo';
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
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        parsedBackup = JSON.parse(content);
        showConfirmDialog = true;
      } catch {
        importError = 'El archivo seleccionado no es un JSON válido.';
        selectedFile = null;
        parsedBackup = null;
      }
    };
    reader.readAsText(file);
  }

  function cancelImport() {
    showConfirmDialog = false;
    selectedFile = null;
    parsedBackup = null;
    importError = null;
  }

  async function confirmImport() {
    if (!parsedBackup) return;

    importing = true;
    importError = null;
    try {
      const result = await importBackup(parsedBackup, true);
      importSuccess = result.message || 'Datos importados exitosamente.';
      showConfirmDialog = false;
      selectedFile = null;
      parsedBackup = null;
      await loadHistory();
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        importError = e.message;
      } else {
        importError = 'Error al importar respaldo';
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
  <title>Respaldo - HomeLedger</title>
</svelte:head>

<div class="page">
  <header class="page-header">
    <h1>Respaldo y Restauración</h1>
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
      <span class="action-text">{exporting ? 'Exportando...' : 'Exportar Respaldo'}</span>
      <span class="action-desc">Descargar JSON completo</span>
    </button>

    <label class="action-btn import-btn" for="file-input">
      <span class="action-icon">↑</span>
      <span class="action-text">Importar Respaldo</span>
      <span class="action-desc">Restaurar desde archivo JSON</span>
    </label>
    <input type="file" id="file-input" accept=".json,application/json" onchange={handleFileSelect} class="file-input" />
  </div>

  {#if importError}
    <p class="field-error">{importError}</p>
  {/if}

  <!-- Confirm Dialog -->
  {#if showConfirmDialog}
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div class="overlay" onkeydown={(e) => e.key === 'Escape' && cancelImport()} tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <div class="modal" onclick={(e) => e.stopPropagation()} role="document">
        <header class="modal-header">
          <h2 id="confirm-title">Confirmar Importación</h2>
          <button class="close-btn" onclick={cancelImport} aria-label="Cerrar">&times;</button>
        </header>
        <p class="confirm-warning">¿Importar este respaldo? <strong>Todos tus datos actuales serán reemplazados.</strong></p>
        {#if selectedFile}
          <p class="file-info">Archivo: {selectedFile.name}</p>
        {/if}
        <div class="form-buttons">
          <button class="btn btn-secondary" onclick={cancelImport} disabled={importing}>Cancelar</button>
          <button class="btn btn-danger" onclick={confirmImport} disabled={importing}>
            {importing ? 'Importando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- History -->
  <section class="section">
    <h2 class="section-title">HISTORIAL</h2>
    {#if loading}
      <p class="loading-msg">Cargando historial...</p>
    {:else if history.length === 0}
      <p class="empty-msg">No hay historial de respaldos.</p>
    {:else}
      <div class="history-list">
        {#each history as entry (entry.id)}
          <div class="history-row">
            <span class="history-type-tag" class:export={entry.type === 'export'} class:import={entry.type === 'import'}>
              {entry.type === 'export' ? 'Exportación' : 'Importación'}
            </span>
            <span class="history-date">{new Date(entry.createdAt).toLocaleString('es-MX')}</span>
          </div>
        {/each}
      </div>
    {/if}
  </section>
</div>

<style>
  .page { max-width: 800px; margin: 0 auto; padding: 0 var(--spacing-md); }

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
    max-width: 400px; width: 100%;
  }
  .modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--spacing-md); }
  .modal-header h2 { font-size: 1rem; font-weight: 600; color: var(--text-primary); }
  .close-btn { background: none; border: none; font-size: 1.3rem; color: var(--text-muted); cursor: pointer; }
  .close-btn:hover { color: var(--text-primary); }
  .confirm-warning { font-size: 0.85rem; color: var(--text-secondary); margin-bottom: var(--spacing-sm); line-height: 1.4; }
  .confirm-warning strong { color: var(--text-primary); }
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
</style>
