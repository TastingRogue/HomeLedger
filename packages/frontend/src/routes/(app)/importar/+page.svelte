<script lang="ts">
  import { apiPost } from '$lib/api/client';
  import { onMount } from 'svelte';
  import { t } from '$lib/i18n';
  import { listAccounts, type AccountData } from '$lib/api/accounts';
  import {
    uploadImport,
    previewImport,
    confirmImport,
    undoImport,
    getImportHistory,
    type ImportPreview,
    type ImportResult,
    type ImportSession,
  } from '$lib/api/imports';

  let step = $state(1);
  let activeTab: 'import' | 'export' = $state('import');
  let file: File | null = $state(null);
  let dragging = $state(false);
  let importing = $state(false);
  let importResult = $state<{ imported: number; skipped: number; errors: number } | null>(null);
  let importError = $state<string | null>(null);

  // Smart-importer (CSV/bank-file) state (P4.4)
  let accounts = $state<AccountData[]>([]);
  let selectedAccountId = $state<number | null>(null);
  let bankPreview = $state<ImportPreview | null>(null);
  let sessionId = $state<number | null>(null);
  let skipDuplicates = $state(true);
  let bankResult = $state<ImportResult | null>(null);

  // Import history + undo
  let history = $state<ImportSession[]>([]);
  let undoingId = $state<number | null>(null);

  // Export state
  let exporting = $state(false);
  let exportSuccess = $state(false);
  let exportError = $state<string | null>(null);

  function computeIsBankFile(f: File | null): boolean {
    return f != null && !f.name.toLowerCase().endsWith('.json');
  }
  const isBankFile = $derived(computeIsBankFile(file));

  onMount(async () => {
    try {
      accounts = await listAccounts();
    } catch { /* accounts optional for the JSON path */ }
    await loadHistory();
  });

  async function loadHistory() {
    try {
      history = await getImportHistory();
    } catch { /* non-fatal */ }
  }

  async function undo(id: number) {
    undoingId = id;
    try {
      await undoImport(id);
      await loadHistory();
    } catch (e: unknown) {
      importError = e instanceof Error ? e.message : $t('import.error_importing');
    } finally {
      undoingId = null;
    }
  }

  function statusLabel(s: string): string {
    switch (s) {
      case 'completed': return $t('import.hist_completed');
      case 'reverted': return $t('import.hist_reverted');
      case 'failed': return $t('import.hist_failed');
      default: return $t('import.hist_pending');
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    dragging = false;
    const f = e.dataTransfer?.files?.[0];
    if (f) selectFile(f);
  }

  function handleFileInput(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files?.[0]) selectFile(input.files[0]);
  }

  function selectFile(f: File) {
    const validExtensions = ['.csv', '.xlsx', '.xls', '.ofx', '.qif', '.json'];
    const ext = '.' + f.name.split('.').pop()?.toLowerCase();
    if (!validExtensions.includes(ext)) {
      importError = $t('import.format_error', { ext });
      return;
    }
    file = f;
    importError = null;
    bankPreview = null;
    bankResult = null;
    sessionId = null;
    step = 2;
    // Bank files use the real upload→preview pipeline; JSON stays client-side.
    if (isBankFile) void runBankPreview();
  }

  function reset() {
    step = 1;
    file = null;
    importResult = null;
    importError = null;
    bankPreview = null;
    bankResult = null;
    sessionId = null;
    selectedAccountId = null;
  }

  /**
   * For bank files (CSV/XLSX/OFX): upload to create a session, then fetch the
   * annotated preview (per-row new/duplicate/pending status + detected account).
   */
  async function runBankPreview() {
    if (!file) return;
    importing = true;
    importError = null;
    try {
      const session = await uploadImport(file);
      sessionId = session.id;
      const preview = await previewImport(session.id);
      bankPreview = preview;
      // Preselect the detected account, else the first account.
      selectedAccountId = preview.detectedAccountId ?? accounts[0]?.id ?? null;
    } catch (e: unknown) {
      importError = e instanceof Error ? e.message : $t('import.analyze_error');
    } finally {
      importing = false;
    }
  }

  async function previewFile(): Promise<{ stats: { label: string; value: string | number }[]; columns: string[]; sample: Record<string, any>[]; warnings: string[] } | null> {
    if (!file) return null;
    const text = await file.text();
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'json') {
      try {
        const data = JSON.parse(text);
        const stats: { label: string; value: string | number }[] = [];
        const warnings: string[] = [];

        // The backup structure is { version, exportedAt, data: { accounts, transactions, ... } }
        const inner = data.data ?? data;

        if (data.version) stats.push({ label: 'Versión', value: data.version });
        if (data.exportedAt) stats.push({ label: 'Fecha de export', value: new Date(data.exportedAt).toLocaleDateString('es-MX') });
        if (inner.accounts) stats.push({ label: 'Cuentas', value: inner.accounts.length });
        if (inner.transactions) stats.push({ label: 'Transacciones', value: inner.transactions.length });
        if (inner.transfers) stats.push({ label: 'Transferencias', value: inner.transfers.length });
        if (inner.subscriptions) stats.push({ label: 'Suscripciones', value: inner.subscriptions.length });
        if (inner.goals) stats.push({ label: 'Metas', value: inner.goals.length });
        if (inner.categories) stats.push({ label: 'Categorías', value: inner.categories.length });
        if (inner.budgets) stats.push({ label: 'Presupuestos', value: inner.budgets.length });

        if (!data.version) warnings.push('El archivo no tiene campo "version".');
        if (!inner.accounts && !inner.transactions) warnings.push('No se encontraron cuentas ni transacciones.');

        return { stats, columns: [], sample: [], warnings };
      } catch {
        return { stats: [{ label: 'Tipo', value: 'JSON inválido' }], columns: [], sample: [], warnings: ['El archivo no es un JSON válido.'] };
      }
    }

    if (ext === 'csv') {
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length === 0) return { stats: [], columns: [], sample: [], warnings: ['Archivo vacío'] };

      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      const sample: Record<string, any>[] = [];

      for (let i = 1; i < Math.min(lines.length, 6); i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const row: Record<string, any> = {};
        headers.forEach((h, idx) => { row[h] = values[idx] ?? ''; });
        sample.push(row);
      }

      const stats = [
        { label: 'Total de filas', value: lines.length - 1 },
        { label: 'Columnas', value: headers.length },
      ];

      const warnings: string[] = [];
      if (!headers.some(h => /fecha|date/i.test(h))) warnings.push($t('import.no_date_col'));
      if (!headers.some(h => /monto|amount|importe/i.test(h))) warnings.push($t('import.no_amount_col'));

      return { stats, columns: headers.slice(0, 5), sample, warnings };
    }

    return { stats: [{ label: 'Tipo', value: ext?.toUpperCase() ?? 'Desconocido' }, { label: 'Tamaño', value: `${(file.size / 1024).toFixed(1)} KB` }], columns: [], sample: [], warnings: [] };
  }

  async function startImport() {
    if (!file) return;
    importing = true;
    importError = null;

    try {
      if (file.name.toLowerCase().endsWith('.json')) {
        // JSON backup restore (client parses, backend imports).
        const text = await file.text();
        const parsed = JSON.parse(text);
        await apiPost('/backup/import', { backup: parsed, confirmed: true });
        importResult = { imported: 1, skipped: 0, errors: 0 };
      } else {
        // Bank file: confirm the previewed session.
        if (sessionId == null) throw new Error($t('import.error_importing'));
        if (selectedAccountId == null) throw new Error($t('import.select_account_required'));

        // When "skip duplicates" is on, only send the new + pending-match rows.
        let selectedTransactionIds: number[] | undefined;
        if (skipDuplicates && bankPreview) {
          selectedTransactionIds = bankPreview.transactions
            .filter((r) => r.status !== 'duplicate')
            .map((r) => r.index);
        }

        const result = await confirmImport(sessionId, {
          accountId: selectedAccountId,
          ...(selectedTransactionIds ? { selectedTransactionIds } : {}),
        });
        bankResult = result;
        importResult = {
          imported: result.importedCount + result.matchedCount,
          skipped: result.duplicateCount,
          errors: result.skippedCount,
        };
        await loadHistory();
      }
      step = 3;
    } catch (e: unknown) {
      importError = e instanceof Error ? e.message : $t('import.error_importing');
    } finally {
      importing = false;
    }
  }

  async function handleExport() {
    exporting = true;
    exportError = null;
    exportSuccess = false;
    try {
      const backup = await apiPost<unknown>('/backup/export', {});
      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `homeledger-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      exportSuccess = true;
      setTimeout(() => exportSuccess = false, 4000);
    } catch (e: unknown) {
      exportError = e instanceof Error ? e.message : 'Error al exportar';
    } finally {
      exporting = false;
    }
  }
</script>

<svelte:head><title>{$t('import.title')} - HomeLedger</title></svelte:head>

<div class="page">
  <header class="page-header">
    <div>
      <h1>{$t('import.title')}</h1>
      <p class="page-subtitle">{$t('import.subtitle')}</p>
    </div>
  </header>

  <!-- Tabs -->
  <div class="tabs">
    <button class="tab" class:active={activeTab === 'import'} onclick={() => { activeTab = 'import'; reset(); }}>{$t('import.tab_import')}</button>
    <button class="tab" class:active={activeTab === 'export'} onclick={() => activeTab = 'export'}>{$t('import.tab_export')}</button>
  </div>

  {#if activeTab === 'export'}
    <!-- Export Section -->
    <div class="export-card">
      <div class="export-icon">💾</div>
      <h3>{$t('import.export_title')}</h3>
      <p class="export-desc">{$t('import.export_desc')}</p>
      <button class="btn-export" onclick={handleExport} disabled={exporting} title={$t('import.export_tooltip')}>
        {exporting ? $t('import.exporting') : $t('import.export_btn')}
      </button>
      {#if exportSuccess}
        <p class="export-status success">{$t('import.export_success')}</p>
      {/if}
      {#if exportError}
        <p class="export-status error">{exportError}</p>
      {/if}
      <p class="export-hint">{$t('import.export_hint')}</p>
    </div>

  {:else}

  <!-- Steps indicator -->
  <div class="steps">
    <div class="step" class:active={step >= 1} class:done={step > 1}>
      <span class="step-num">1</span>
      <span class="step-label">{$t('import.step_file')}</span>
    </div>
    <div class="step-line" class:done={step > 1}></div>
    <div class="step" class:active={step >= 2} class:done={step > 2}>
      <span class="step-num">2</span>
      <span class="step-label">{$t('import.step_review')}</span>
    </div>
    <div class="step-line" class:done={step > 2}></div>
    <div class="step" class:active={step >= 3}>
      <span class="step-num">3</span>
      <span class="step-label">{$t('import.step_result')}</span>
    </div>
  </div>

  <!-- Step 1: Upload -->
  {#if step === 1}
    <div
      class="drop-zone"
      class:dragging
      ondragover={(e) => { e.preventDefault(); dragging = true; }}
      ondragleave={() => dragging = false}
      ondrop={handleDrop}
      role="button"
      tabindex="0"
    >
      <div class="drop-icon">📂</div>
      <p class="drop-title">{$t('import.drop_title')}</p>
      <p class="drop-subtitle">{$t('import.drop_subtitle')}</p>
      <label class="file-btn">
        {$t('import.select_file')}
        <input type="file" accept=".csv,.xlsx,.xls,.ofx,.qif,.json" onchange={handleFileInput} hidden />
      </label>
      <p class="drop-formats">{$t('import.formats')}</p>
    </div>

    {#if importError}
      <div class="error-msg">{importError}</div>
    {/if}

    <div class="info-card">
      <h4>{$t('import.tips_title')}</h4>
      <ul>
        <li>{$t('import.tip_columns')}</li>
        <li>{$t('import.tip_duplicates')}</li>
        <li>{$t('import.tip_safe')}</li>
        <li>{$t('import.tip_restore')}</li>
      </ul>
    </div>

  <!-- Step 2: Review -->
  {:else if step === 2}
    <div class="review-card">
      <h3>{$t('import.review_title')}</h3>
      <div class="file-info">
        <span class="file-icon">📄</span>
        <div class="file-details">
          <span class="file-name">{file?.name}</span>
          <span class="file-size">{((file?.size ?? 0) / 1024).toFixed(1)} KB</span>
        </div>
        <button class="btn-change" onclick={reset}>{$t('import.change_file')}</button>
      </div>

      {#if isBankFile}
        <!-- Bank file: real upload→preview with per-row classification (P4.4) -->
        {#if importing && !bankPreview}
          <div class="preview-loading">{$t('import.analyzing')}</div>
        {:else if bankPreview}
          <div class="preview-section">
            <h4>📊 {$t('import.preview_summary')}</h4>
            <div class="preview-stats">
              <div class="preview-stat"><span class="ps-value">{bankPreview.totalCount}</span><span class="ps-label">{$t('import.stat_total')}</span></div>
              <div class="preview-stat"><span class="ps-value green">{bankPreview.newCount}</span><span class="ps-label">{$t('import.status_new')}</span></div>
              <div class="preview-stat"><span class="ps-value yellow">{bankPreview.duplicateCount}</span><span class="ps-label">{$t('import.status_duplicate')}</span></div>
              <div class="preview-stat"><span class="ps-value blue">{bankPreview.pendingMatchCount}</span><span class="ps-label">{$t('import.status_pending_match')}</span></div>
            </div>
            <p class="parser-note">{$t('import.detected_parser')}: <strong>{bankPreview.parser}</strong></p>
          </div>

          <!-- Target account -->
          <div class="account-picker">
            <label for="import-account">{$t('import.target_account')}</label>
            <select id="import-account" bind:value={selectedAccountId}>
              {#if accounts.length === 0}
                <option value={null}>{$t('import.no_accounts')}</option>
              {/if}
              {#each accounts as acc}
                <option value={acc.id}>{acc.name}{acc.bank ? ` — ${acc.bank}` : ''}</option>
              {/each}
            </select>
            {#if bankPreview.detectedAccountId}
              <span class="detected-hint">✓ {$t('import.account_autodetected')}</span>
            {/if}
          </div>

          <label class="skip-dup-toggle">
            <input type="checkbox" bind:checked={skipDuplicates} />
            <span>{$t('import.skip_duplicates')}</span>
          </label>

          <!-- Row table with status badges -->
          <div class="preview-table-wrap">
            <table class="preview-table">
              <thead>
                <tr>
                  <th>{$t('import.col_status')}</th>
                  <th>{$t('import.col_date')}</th>
                  <th>{$t('import.col_merchant')}</th>
                  <th style="text-align:right">{$t('import.col_amount')}</th>
                </tr>
              </thead>
              <tbody>
                {#each bankPreview.transactions.slice(0, 50) as row}
                  <tr class:row-dup={row.status === 'duplicate'}>
                    <td>
                      <span class="badge badge-{row.status}">
                        {row.status === 'new' ? $t('import.status_new') : row.status === 'duplicate' ? $t('import.status_duplicate') : $t('import.status_pending_match')}
                      </span>
                    </td>
                    <td>{row.normalizedDate.slice(0, 10)}</td>
                    <td>{row.normalizedMerchant || row.description}</td>
                    <td style="text-align:right" class:neg={row.type === 'expense'}>
                      {row.type === 'expense' ? '−' : '+'}{row.amount.toFixed(2)}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
            {#if bankPreview.transactions.length > 50}
              <p class="preview-note">{$t('import.more_rows', { n: bankPreview.transactions.length - 50 })}</p>
            {/if}
          </div>
        {/if}

      <!-- JSON backup: client-side preview -->
      {:else}
      {#await previewFile()}
        <div class="preview-loading">{$t('import.analyzing')}</div>
      {:then preview}
        {#if preview}
          <div class="preview-section">
            <h4>📊 Resumen del contenido</h4>
            <div class="preview-stats">
              {#each preview.stats as stat}
                <div class="preview-stat">
                  <span class="ps-value">{stat.value}</span>
                  <span class="ps-label">{stat.label}</span>
                </div>
              {/each}
            </div>
            {#if preview.sample.length > 0}
              <h4 style="margin-top: 1rem">👁️ Vista previa (primeras filas)</h4>
              <div class="preview-table-wrap">
                <table class="preview-table">
                  <thead>
                    <tr>
                      {#each preview.columns as col}
                        <th>{col}</th>
                      {/each}
                    </tr>
                  </thead>
                  <tbody>
                    {#each preview.sample as row}
                      <tr>
                        {#each preview.columns as col}
                          <td>{row[col] ?? '—'}</td>
                        {/each}
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            {/if}
            {#if preview.warnings.length > 0}
              <div class="preview-warnings">
                <h4>⚠️ Advertencias</h4>
                {#each preview.warnings as warn}
                  <span class="pw-item">{warn}</span>
                {/each}
              </div>
            {/if}
          </div>
        {/if}
      {:catch}
        <p class="preview-note">{$t('import.analyze_error')}</p>
      {/await}
      {/if}

      <div class="review-notice">
        <span class="notice-icon">🔒</span>
        <span>{$t('import.review_notice')}</span>
      </div>

      {#if importError}
        <div class="error-msg">{importError}</div>
      {/if}

      <div class="review-actions">
        <button class="btn-secondary" onclick={reset}>{$t('common.cancel')}</button>
        <button
          class="btn-primary"
          onclick={startImport}
          disabled={importing || (isBankFile && (!bankPreview || selectedAccountId == null))}
        >
          {importing ? $t('import.importing') : $t('import.confirm_btn')}
        </button>
      </div>
    </div>

  <!-- Step 3: Result -->
  {:else if step === 3}
    <div class="result-card">
      <div class="result-icon">✅</div>
      <h3>{$t('import.result_title')}</h3>
      {#if importResult}
        <div class="result-stats">
          <div class="stat">
            <span class="stat-value green">{importResult.imported}</span>
            <span class="stat-label">{$t('import.imported')}</span>
          </div>
          {#if bankResult && bankResult.matchedCount > 0}
            <div class="stat">
              <span class="stat-value blue">{bankResult.matchedCount}</span>
              <span class="stat-label">{$t('import.matched')}</span>
            </div>
          {/if}
          <div class="stat">
            <span class="stat-value yellow">{importResult.skipped}</span>
            <span class="stat-label">{$t('import.skipped')}</span>
          </div>
          <div class="stat">
            <span class="stat-value red">{importResult.errors}</span>
            <span class="stat-label">{$t('import.errors')}</span>
          </div>
        </div>
      {/if}
      <button class="btn-primary" onclick={reset}>{$t('import.import_another')}</button>
    </div>
  {/if}

  <!-- Import history + undo (P4.4) -->
  {#if history.length > 0}
    <div class="history-card">
      <h3>{$t('import.history_title')}</h3>
      <div class="history-list">
        {#each history as h}
          <div class="history-row">
            <div class="hist-main">
              <span class="hist-file">{h.filename}</span>
              <span class="hist-meta">
                {new Date(h.createdAt).toLocaleDateString()} · {h.parser}
                {#if h.recordCount != null} · {h.recordCount} {$t('import.imported').toLowerCase()}{/if}
              </span>
            </div>
            <span class="hist-status hist-{h.status}">{statusLabel(h.status)}</span>
            {#if h.status === 'completed'}
              <button class="btn-undo" onclick={() => undo(h.id)} disabled={undoingId === h.id}>
                {undoingId === h.id ? $t('import.undoing') : $t('import.undo')}
              </button>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/if}
  {/if}
</div>

<style>
  .page { width: 100%; margin: 0; }
  .page-header { margin-bottom: 1.25rem; }
  .page-header h1 { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); }
  .page-subtitle { font-size: 0.8rem; color: var(--text-muted); margin-top: 0.15rem; }

  /* Tabs */
  .tabs { display: flex; gap: 0; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border-default); }
  .tab { padding: 0.5rem 1rem; font-size: 0.8rem; font-weight: 500; color: var(--text-secondary); background: none; border: none; border-bottom: 2px solid transparent; cursor: pointer; transition: all 0.15s; }
  .tab:hover { color: var(--text-primary); }
  .tab.active { color: var(--accent-purple); border-bottom-color: var(--accent-purple); }

  /* Export */
  .export-card { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 2.5rem; text-align: center; }
  .export-icon { font-size: 2.5rem; margin-bottom: 0.75rem; }
  .export-card h3 { font-size: 1.1rem; font-weight: 600; color: var(--text-primary); margin-bottom: 0.5rem; }
  .export-desc { font-size: 0.8rem; color: var(--text-secondary); max-width: 400px; margin: 0 auto 1.25rem; line-height: 1.5; }
  .btn-export { padding: 0.6rem 1.25rem; background: var(--accent-green); color: #fff; border: none; border-radius: var(--radius-md); font-size: 0.85rem; font-weight: 600; cursor: pointer; display: block; margin: 0 auto; }
  .btn-export:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-export:hover:not(:disabled) { opacity: 0.9; }
  .export-status { font-size: 0.78rem; margin-top: 0.75rem; text-align: center; }
  .export-status.success { color: var(--accent-green); }
  .export-status.error { color: var(--accent-red); }
  .export-hint { font-size: 0.68rem; color: var(--text-muted); margin-top: 1rem; }

  /* Steps */
  .steps { display: flex; align-items: center; justify-content: center; gap: 0; margin-bottom: 2rem; }
  .step { display: flex; flex-direction: column; align-items: center; gap: 0.25rem; }
  .step-num { width: 28px; height: 28px; border-radius: 50%; background: var(--bg-elevated); border: 2px solid var(--border-default); display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 600; color: var(--text-muted); }
  .step.active .step-num { border-color: var(--accent-purple); color: var(--accent-purple); background: rgba(139, 92, 246, 0.1); }
  .step.done .step-num { border-color: var(--accent-green); color: #fff; background: var(--accent-green); }
  .step-label { font-size: 0.65rem; color: var(--text-muted); }
  .step.active .step-label { color: var(--text-primary); }
  .step-line { width: 60px; height: 2px; background: var(--border-default); margin: 0 0.5rem; margin-bottom: 1rem; }
  .step-line.done { background: var(--accent-green); }

  /* Drop zone */
  .drop-zone { border: 2px dashed var(--border-default); border-radius: var(--radius-lg); padding: 3rem 2rem; text-align: center; cursor: pointer; transition: all 0.2s; background: var(--bg-card); }
  .drop-zone.dragging { border-color: var(--accent-purple); background: rgba(139, 92, 246, 0.05); }
  .drop-zone:hover { border-color: var(--text-muted); }
  .drop-icon { font-size: 2.5rem; margin-bottom: 0.75rem; }
  .drop-title { font-size: 1rem; font-weight: 600; color: var(--text-primary); margin-bottom: 0.25rem; }
  .drop-subtitle { font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1rem; }
  .file-btn { display: inline-block; padding: 0.5rem 1rem; background: var(--accent-blue); color: #fff; border-radius: var(--radius-md); font-size: 0.8rem; font-weight: 500; cursor: pointer; }
  .file-btn:hover { opacity: 0.9; }
  .drop-formats { font-size: 0.65rem; color: var(--text-muted); margin-top: 1rem; }

  .error-msg { background: var(--tag-red-bg); color: var(--accent-red); padding: 0.5rem 0.75rem; border-radius: var(--radius-md); font-size: 0.78rem; margin-top: 0.75rem; }

  .info-card { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 1rem 1.25rem; margin-top: 1.5rem; }
  .info-card h4 { font-size: 0.85rem; font-weight: 600; color: var(--text-primary); margin-bottom: 0.5rem; }
  .info-card ul { list-style: none; padding: 0; }
  .info-card li { font-size: 0.78rem; color: var(--text-secondary); padding: 0.2rem 0; padding-left: 1rem; position: relative; }
  .info-card li::before { content: '•'; position: absolute; left: 0; color: var(--accent-purple); }

  /* Review */
  .review-card { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 1.5rem; }
  .review-card h3 { font-size: 1rem; font-weight: 600; color: var(--text-primary); margin-bottom: 1rem; }
  .file-info { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; background: var(--bg-elevated); border-radius: var(--radius-md); margin-bottom: 1rem; }
  .file-icon { font-size: 1.5rem; }
  .file-details { flex: 1; display: flex; flex-direction: column; }
  .file-name { font-size: 0.8rem; font-weight: 500; color: var(--text-primary); }
  .file-size { font-size: 0.65rem; color: var(--text-muted); }
  .btn-change { padding: 0.25rem 0.5rem; background: none; border: 1px solid var(--border-default); border-radius: var(--radius-sm); font-size: 0.68rem; color: var(--text-secondary); cursor: pointer; }

  .review-notice { display: flex; align-items: center; gap: 0.5rem; padding: 0.6rem 0.75rem; background: rgba(139, 92, 246, 0.08); border-radius: var(--radius-md); font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 1.25rem; }
  .notice-icon { font-size: 1rem; }

  /* Preview */
  .preview-loading { font-size: 0.78rem; color: var(--text-muted); padding: 1rem 0; text-align: center; }
  .preview-note { font-size: 0.75rem; color: var(--text-muted); padding: 0.5rem 0; }
  .preview-section { background: var(--bg-elevated); border: 1px solid var(--border-default); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1rem; }
  .preview-section h4 { font-size: 0.78rem; font-weight: 600; color: var(--text-primary); margin-bottom: 0.5rem; }
  .preview-stats { display: flex; flex-wrap: wrap; gap: 0.75rem; }
  .preview-stat { display: flex; flex-direction: column; align-items: center; padding: 0.5rem 0.75rem; background: var(--bg-card); border-radius: var(--radius-md); min-width: 70px; }
  .ps-value { font-size: 1rem; font-weight: 700; color: var(--text-primary); }
  .ps-label { font-size: 0.6rem; color: var(--text-muted); margin-top: 0.1rem; }
  .preview-table-wrap { overflow-x: auto; margin-top: 0.5rem; }
  .preview-table { width: 100%; border-collapse: collapse; font-size: 0.68rem; }
  .preview-table th { text-align: left; padding: 0.35rem 0.5rem; font-weight: 600; color: var(--text-muted); border-bottom: 1px solid var(--border-default); white-space: nowrap; }
  .preview-table td { padding: 0.3rem 0.5rem; border-bottom: 1px solid var(--border-subtle); color: var(--text-secondary); white-space: nowrap; max-width: 150px; overflow: hidden; text-overflow: ellipsis; }
  .preview-warnings { margin-top: 0.75rem; padding: 0.5rem 0.75rem; background: rgba(245, 158, 11, 0.08); border-radius: var(--radius-md); }
  .preview-warnings h4 { color: var(--accent-orange); }
  .pw-item { display: block; font-size: 0.72rem; color: var(--accent-orange); padding: 0.15rem 0; }

  .review-actions { display: flex; gap: 0.5rem; justify-content: flex-end; }
  .btn-secondary { padding: 0.45rem 0.85rem; background: var(--bg-elevated); border: 1px solid var(--border-default); border-radius: var(--radius-md); font-size: 0.78rem; color: var(--text-secondary); cursor: pointer; }
  .btn-primary { padding: 0.45rem 0.85rem; background: var(--accent-blue); border: none; border-radius: var(--radius-md); font-size: 0.78rem; font-weight: 500; color: #fff; cursor: pointer; }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

  /* Result */
  .result-card { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 2.5rem; text-align: center; }
  .result-icon { font-size: 2.5rem; margin-bottom: 0.75rem; }
  .result-card h3 { font-size: 1.1rem; font-weight: 600; color: var(--text-primary); margin-bottom: 1.25rem; }
  .result-stats { display: flex; gap: 2rem; justify-content: center; margin-bottom: 1.5rem; }
  .stat { display: flex; flex-direction: column; align-items: center; gap: 0.2rem; }
  .stat-value { font-size: 1.5rem; font-weight: 700; }
  .stat-value.green { color: var(--accent-green); }
  .stat-value.yellow { color: var(--accent-orange); }
  .stat-value.red { color: var(--accent-red); }
  .stat-value.blue { color: var(--accent-blue); }
  .stat-label { font-size: 0.7rem; color: var(--text-muted); }

  /* Smart-importer preview (P4.4) */
  .ps-value.green { color: var(--accent-green); }
  .ps-value.yellow { color: var(--accent-orange); }
  .ps-value.blue { color: var(--accent-blue); }
  .parser-note { font-size: 0.72rem; color: var(--text-muted); margin-top: 0.6rem; }

  .account-picker { display: flex; align-items: center; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.75rem; }
  .account-picker label { font-size: 0.78rem; color: var(--text-secondary); font-weight: 500; }
  .account-picker select { flex: 1; min-width: 180px; padding: 0.4rem 0.6rem; background: var(--bg-elevated); border: 1px solid var(--border-default); border-radius: var(--radius-md); font-size: 0.78rem; color: var(--text-primary); }
  .detected-hint { font-size: 0.68rem; color: var(--accent-green); }

  .skip-dup-toggle { display: flex; align-items: center; gap: 0.4rem; font-size: 0.76rem; color: var(--text-secondary); margin-bottom: 0.75rem; cursor: pointer; }

  .badge { display: inline-block; padding: 0.1rem 0.45rem; border-radius: 999px; font-size: 0.62rem; font-weight: 600; }
  .badge-new { background: rgba(16, 185, 129, 0.12); color: var(--accent-green); }
  .badge-duplicate { background: rgba(245, 158, 11, 0.12); color: var(--accent-orange); }
  .badge-pending_match { background: rgba(59, 130, 246, 0.12); color: var(--accent-blue); }
  .preview-table td.neg { color: var(--accent-red); }
  .preview-table tr.row-dup { opacity: 0.55; }

  /* Import history */
  .history-card { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 1.25rem 1.5rem; margin-top: 1.5rem; }
  .history-card h3 { font-size: 0.95rem; font-weight: 600; color: var(--text-primary); margin-bottom: 0.75rem; }
  .history-list { display: flex; flex-direction: column; gap: 0.5rem; }
  .history-row { display: flex; align-items: center; gap: 0.75rem; padding: 0.6rem 0.75rem; background: var(--bg-elevated); border-radius: var(--radius-md); }
  .hist-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
  .hist-file { font-size: 0.8rem; font-weight: 500; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .hist-meta { font-size: 0.66rem; color: var(--text-muted); }
  .hist-status { font-size: 0.66rem; font-weight: 600; padding: 0.12rem 0.5rem; border-radius: 999px; }
  .hist-completed { background: rgba(16, 185, 129, 0.12); color: var(--accent-green); }
  .hist-reverted { background: rgba(148, 163, 184, 0.15); color: var(--text-muted); }
  .hist-failed { background: rgba(239, 68, 68, 0.12); color: var(--accent-red); }
  .hist-pending { background: rgba(59, 130, 246, 0.12); color: var(--accent-blue); }
  .btn-undo { padding: 0.3rem 0.6rem; background: none; border: 1px solid var(--border-default); border-radius: var(--radius-sm); font-size: 0.7rem; color: var(--text-secondary); cursor: pointer; }
  .btn-undo:hover:not(:disabled) { border-color: var(--accent-red); color: var(--accent-red); }
  .btn-undo:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
