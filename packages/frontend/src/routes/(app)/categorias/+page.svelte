<script lang="ts">
  import { onMount } from 'svelte';
  import {
    listCategories,
    getCategoryAnalysis,
    createCategory,
    updateCategory,
    deleteCategory,
    type Category,
    type CategoryAnalysisItem,
  } from '$lib/api/categories';
  import { ApiError } from '$lib/api/client';
  import { formatCurrency, formatPercentage } from '$lib/utils/format';
  import { t } from '$lib/i18n';

  // ─── State ───
  let categories: Category[] = $state([]);
  let analysis: CategoryAnalysisItem[] = $state([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

  // Date range filter
  let startDate = $state('');
  let endDate = $state('');

  // Create modal
  let showCreateModal = $state(false);
  let newCategoryName = $state('');
  let newCategoryType: 'Gasto' | 'Ingreso' | 'Ambos' = $state('Ambos');
  let createError = $state<string | null>(null);
  let creating = $state(false);
  let createSuccess = $state(false);

  // Edit modal
  let showEditModal = $state(false);
  let editCat: Category | null = $state(null);
  let editName = $state('');
  let editType: 'Gasto' | 'Ingreso' | 'Ambos' = $state('Ambos');
  let editError = $state<string | null>(null);
  let editSubmitting = $state(false);
  let editDeleting = $state(false);

  // Delete
  let deletingId = $state<number | null>(null);

  // ─── Computed ───
  let userCategories = $derived(categories.filter((c) => !c.isSystem));
  let systemCategories = $derived(categories.filter((c) => c.isSystem));

  // ─── Helpers ───
  function getDefaultDateRange(): { start: string; end: string } {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    };
  }

  // ─── Data Loading ───
  async function loadData() {
    loading = true;
    error = null;
    try {
      const [cats, anal] = await Promise.all([
        listCategories(),
        getCategoryAnalysis(startDate || undefined, endDate || undefined),
      ]);
      categories = cats;
      analysis = anal;
    } catch (e: unknown) {
      error = e instanceof ApiError ? e.message : $t('categories.error_loading');
    } finally {
      loading = false;
    }
  }

  async function loadAnalysis() {
    try {
      analysis = await getCategoryAnalysis(startDate || undefined, endDate || undefined);
    } catch (e: unknown) {
      error = e instanceof ApiError ? e.message : $t('categories.error_analysis');
    }
  }

  // ─── Create Modal ───
  function openCreateModal() {
    newCategoryName = '';
    newCategoryType = 'Ambos';
    createError = null;
    createSuccess = false;
    showCreateModal = true;
  }

  function closeCreateModal() {
    showCreateModal = false;
    createError = null;
    createSuccess = false;
  }

  async function handleCreate() {
    const name = newCategoryName.trim();
    if (!name) {
      createError = $t('categories.name_required');
      return;
    }

    creating = true;
    createError = null;
    try {
      await createCategory({ name, type: newCategoryType });
      createSuccess = true;
      setTimeout(() => {
        closeCreateModal();
        loadData();
      }, 600);
    } catch (e: unknown) {
      createError = e instanceof ApiError ? e.message : $t('categories.error_creating');
    } finally {
      creating = false;
    }
  }

  // ─── Edit Modal ───
  function openEditModal(cat: Category) {
    editCat = cat;
    editName = cat.name;
    editType = (cat.type as 'Gasto' | 'Ingreso' | 'Ambos') ?? 'Ambos';
    editError = null;
    editSubmitting = false;
    editDeleting = false;
    showEditModal = true;
  }

  function closeEditModal() {
    showEditModal = false;
    editCat = null;
    editError = null;
  }

  async function handleEdit() {
    if (!editCat) return;
    const name = editName.trim();
    if (!name) {
      editError = $t('categories.name_required');
      return;
    }

    editSubmitting = true;
    editError = null;
    try {
      await updateCategory(editCat.id, { name, type: editType });
      closeEditModal();
      await loadData();
    } catch (e: unknown) {
      editError = e instanceof ApiError ? e.message : $t('categories.error_updating');
    } finally {
      editSubmitting = false;
    }
  }

  async function handleDeleteFromEdit() {
    if (!editCat) return;
    editDeleting = true;
    editError = null;
    try {
      await deleteCategory(editCat.id);
      closeEditModal();
      await loadData();
    } catch (e: unknown) {
      editError = e instanceof ApiError ? e.message : $t('categories.error_deleting');
    } finally {
      editDeleting = false;
    }
  }

  // ─── Inline Delete ───
  async function handleDelete(id: number) {
    if (deletingId === id) return;
    if (!confirm($t('categories.delete_confirm'))) return;
    deletingId = id;
    try {
      await deleteCategory(id);
      await loadData();
    } catch (e: unknown) {
      error = e instanceof ApiError ? e.message : $t('categories.error_deleting');
    } finally {
      deletingId = null;
    }
  }

  function applyFilter() {
    loadAnalysis();
  }

  onMount(() => {
    const defaults = getDefaultDateRange();
    startDate = defaults.start;
    endDate = defaults.end;
    loadData();
  });
</script>

<svelte:head>
  <title>{$t('categories.title')} - HomeLedger</title>
</svelte:head>

<div class="page">
  <header class="page-header">
    <div>
      <h1>{$t('categories.title')}</h1>
      <p class="page-subtitle">{$t('categories.subtitle')}</p>
    </div>
    <button class="btn btn-primary" onclick={openCreateModal}>{$t('categories.new')}</button>
  </header>

  {#if loading}
    <div class="state-msg"><p>{$t('categories.loading')}</p></div>
  {:else if error}
    <div class="state-msg error">
      <p>{error}</p>
      <button class="btn btn-secondary" onclick={loadData}>{$t('common.retry')}</button>
    </div>
  {:else}
    <!-- Analysis Section -->
    <section class="section">
      <div class="section-header">
        <h2 class="section-title">{$t('categories.expense_analysis')}</h2>
        <div class="date-filters">
          <input type="date" id="filter-start" bind:value={startDate} />
          <span class="filter-sep">–</span>
          <input type="date" id="filter-end" bind:value={endDate} />
          <button class="btn btn-secondary btn-sm" onclick={applyFilter}>{$t('common.filter')}</button>
        </div>
      </div>

      {#if analysis.length === 0}
        <p class="empty-msg">{$t('categories.no_expenses')}</p>
      {:else}
        {@const totalSpent = analysis.reduce((s, a) => s + a.total, 0)}
        <div class="analysis-total">Total: <strong>{formatCurrency(totalSpent)}</strong></div>
        <div class="analysis-list">
          {#each analysis as item, i}
            {@const barColors = ['#3b82f6', '#ef4444', '#f59e0b', '#22c55e', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b']}
            <div class="analysis-row">
              <span class="analysis-dot" style="background: {barColors[i % barColors.length]}"></span>
              <span class="analysis-name">{item.categoryName}</span>
              <div class="analysis-bar-wrap">
                <div class="analysis-bar" style="width: {Math.min(item.percentage, 100)}%; background: {barColors[i % barColors.length]}"></div>
              </div>
              <span class="analysis-pct">{formatPercentage(item.percentage)}</span>
              <span class="analysis-amount">{formatCurrency(item.total)}</span>
            </div>
          {/each}
        </div>
      {/if}
    </section>

    <!-- All Categories -->
    <section class="section">
      <div class="section-header">
        <h2 class="section-title">{$t('categories.all_categories')}</h2>
        <span class="cat-count">{$t('categories.count', { count: categories.length })}</span>
      </div>

      <div class="cat-grid">
        {#each categories as cat (cat.id)}
          <button class="cat-card" type="button" onclick={() => openEditModal(cat)} title={$t('categories.click_edit')}>
            <div class="cat-card-top">
              <span class="cat-card-name">{cat.name}</span>
              {#if cat.isSystem}<span class="cat-badge system">{$t('categories.system_badge')}</span>{/if}
            </div>
            <div class="cat-card-bottom">
              <span class="cat-type-badge" class:type-gasto={cat.type === 'Gasto'} class:type-ingreso={cat.type === 'Ingreso'} class:type-ambos={cat.type === 'Ambos' || !cat.type}>
                {cat.type ?? 'Ambos'}
              </span>
            </div>
          </button>
        {/each}
      </div>
    </section>
  {/if}
</div>

<!-- ═══════════ CREATE CATEGORY MODAL ═══════════ -->
{#if showCreateModal}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="modal-backdrop" onclick={closeCreateModal} role="presentation">
    <div class="modal-content" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Nueva Categoría" tabindex="-1">
      <div class="modal-header">
        <h3 class="modal-title">{$t('categories.new_title')}</h3>
        <button class="modal-close" onclick={closeCreateModal} aria-label="Cerrar">&times;</button>
      </div>

      {#if createSuccess}
        <div class="modal-success">
          <span class="success-icon">✓</span>
          <span>{$t('categories.created_success')}</span>
        </div>
      {:else}
        <form class="modal-form" onsubmit={(e) => { e.preventDefault(); handleCreate(); }}>
          <div class="form-field">
            <label for="create-name">{$t('categories.form_name')}</label>
            <!-- svelte-ignore a11y_autofocus -->
            <input id="create-name" type="text" placeholder={$t('categories.form_name_placeholder')} bind:value={newCategoryName} maxlength={50} required autofocus />
          </div>

          <div class="form-field">
            <label for="create-type">{$t('categories.form_type')}</label>
            <select id="create-type" bind:value={newCategoryType}>
              <option value="Ambos">{$t('categories.type_both')}</option>
              <option value="Gasto">{$t('categories.type_expense_only')}</option>
              <option value="Ingreso">{$t('categories.type_income_only')}</option>
            </select>
          </div>

          {#if createError}
            <p class="modal-error">{createError}</p>
          {/if}

          <div class="modal-actions">
            <button type="button" class="btn-modal-cancel" onclick={closeCreateModal}>{$t('common.cancel')}</button>
            <button type="submit" class="btn-modal-submit" disabled={creating}>
              {creating ? $t('categories.creating') : $t('categories.create_btn')}
            </button>
          </div>
        </form>
      {/if}
    </div>
  </div>
{/if}

<!-- ═══════════ EDIT CATEGORY MODAL ═══════════ -->
{#if showEditModal && editCat}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="modal-backdrop" onclick={closeEditModal} role="presentation">
    <div class="modal-content" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Editar Categoría" tabindex="-1">
      <div class="modal-header">
        <h3 class="modal-title">{$t('categories.edit_title')}</h3>
        <button class="modal-close" onclick={closeEditModal} aria-label="Cerrar">&times;</button>
      </div>

      <form class="modal-form" onsubmit={(e) => { e.preventDefault(); handleEdit(); }}>
        <div class="form-field">
          <label for="edit-name">{$t('categories.form_name')}</label>
          <!-- svelte-ignore a11y_autofocus -->
          <input id="edit-name" type="text" bind:value={editName} maxlength={50} required autofocus />
        </div>

        <div class="form-field">
          <label for="edit-type">{$t('categories.form_type')}</label>
          <select id="edit-type" bind:value={editType}>
            <option value="Ambos">Ambos (Gasto e Ingreso)</option>
            <option value="Gasto">Solo Gasto</option>
            <option value="Ingreso">Solo Ingreso</option>
          </select>
        </div>

        {#if editError}
          <p class="modal-error">{editError}</p>
        {/if}

        <div class="modal-actions-split">
          <button
            type="button"
            class="btn-modal-delete"
            onclick={handleDeleteFromEdit}
            disabled={editDeleting}
          >
            {editDeleting ? $t('common.loading') : '🗑️ ' + $t('common.delete')}
          </button>
          <div class="modal-actions-right">
            <button type="button" class="btn-modal-cancel" onclick={closeEditModal}>{$t('common.cancel')}</button>
            <button type="submit" class="btn-modal-submit" disabled={editSubmitting}>
              {editSubmitting ? $t('common.saving') : $t('common.save')}
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  .page { width: 100%; margin: 0; padding: 0; }

  .page-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    margin-bottom: 1.25rem; gap: var(--spacing-sm);
  }
  .page-header h1 { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); }
  .page-subtitle { font-size: 0.8rem; color: var(--text-muted); margin-top: 0.15rem; }

  /* Section */
  .section { margin-bottom: 1.5rem; }
  .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem; }
  .section-title { font-size: 0.85rem; font-weight: 600; color: var(--text-primary); margin: 0; }
  .cat-count { font-size: 0.72rem; color: var(--text-muted); }

  /* Date Filters */
  .date-filters {
    display: flex; gap: 0.4rem; align-items: center; font-size: 0.72rem;
  }
  .date-filters input[type='date'] { max-width: 130px; font-size: 0.7rem; }
  .filter-sep { color: var(--text-muted); }

  /* Analysis */
  .analysis-total { font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.5rem; }
  .analysis-total strong { color: var(--text-primary); }
  .analysis-list { display: flex; flex-direction: column; gap: 0.4rem; background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 0.75rem 1rem; }
  .analysis-row { display: flex; align-items: center; gap: 0.6rem; font-size: 0.85rem; padding: 0.3rem 0; }
  .analysis-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
  .analysis-name { min-width: 90px; font-weight: 500; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .analysis-bar-wrap { flex: 1; height: 8px; background: var(--bg-hover); border-radius: 4px; overflow: hidden; }
  .analysis-bar { height: 100%; border-radius: 4px; transition: width 0.3s; }
  .analysis-pct { font-size: 0.75rem; color: var(--text-muted); min-width: 40px; text-align: right; }
  .analysis-amount { font-size: 0.85rem; font-weight: 600; color: var(--text-primary); min-width: 80px; text-align: right; }

  /* Category Grid — fill available width */
  .cat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr)); gap: 0.6rem; }
  .cat-card {
    background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-md);
    padding: 0.85rem 1rem; cursor: pointer; transition: border-color 0.15s, background 0.15s;
    display: flex; flex-direction: column; gap: 0.4rem; text-align: left; min-height: 4rem;
  }
  .cat-card:hover { border-color: var(--accent-purple); background: var(--bg-elevated); }
  .cat-card-top { display: flex; align-items: center; justify-content: space-between; gap: 0.3rem; }
  .cat-card-name { font-size: 0.85rem; font-weight: 500; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cat-badge { font-size: 0.55rem; padding: 0.08rem 0.3rem; border-radius: var(--radius-full); font-weight: 600; }
  .cat-badge.system { background: var(--bg-hover); color: var(--text-muted); }
  .cat-card-bottom { display: flex; }
  .cat-type-badge { font-size: 0.65rem; padding: 0.12rem 0.35rem; border-radius: var(--radius-full); font-weight: 600; }
  .cat-type-badge.type-gasto { background: rgba(239, 68, 68, 0.12); color: var(--accent-red); }
  .cat-type-badge.type-ingreso { background: rgba(34, 197, 94, 0.12); color: var(--accent-green); }
  .cat-type-badge.type-ambos { background: rgba(139, 92, 246, 0.12); color: var(--accent-purple); }

  /* States */
  .state-msg { text-align: center; padding: var(--spacing-xl); color: var(--text-secondary); font-size: 0.85rem; }
  .state-msg.error { color: var(--accent-red); }
  .state-msg button { margin-top: var(--spacing-sm); }
  .empty-msg { font-size: 0.8rem; color: var(--text-muted); padding: var(--spacing-md); text-align: center; background: var(--bg-elevated); border-radius: var(--radius-sm); }

  /* Buttons */
  .btn {
    display: inline-flex; align-items: center; justify-content: center;
    padding: 0.35rem 0.75rem; border: none; border-radius: var(--radius-sm);
    font-size: 0.8rem; font-weight: 500; cursor: pointer;
  }
  .btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn-primary { background: var(--accent-blue); color: #fff; }
  .btn-primary:hover:not(:disabled) { background: var(--color-primary-hover); }
  .btn-secondary { background: var(--bg-elevated); color: var(--text-secondary); border: 1px solid var(--border-default); }
  .btn-secondary:hover:not(:disabled) { background: var(--bg-hover); }
  .btn-sm { padding: 0.25rem 0.5rem; font-size: 0.72rem; }

  @media (max-width: 600px) {
    .date-filters { flex-direction: column; align-items: stretch; }
    .date-filters input[type='date'] { max-width: 100%; }
    .analysis-row { flex-wrap: wrap; }
  }

  /* ─── Modal Styles ─── */
  .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 300; backdrop-filter: blur(3px); }
  .modal-content { background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-lg); width: 100%; max-width: 400px; box-shadow: var(--shadow-lg); }
  .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; border-bottom: 1px solid var(--border-subtle); }
  .modal-title { font-size: 0.9rem; font-weight: 600; color: var(--text-primary); margin: 0; }
  .modal-close { background: none; border: none; color: var(--text-muted); font-size: 1.3rem; cursor: pointer; }
  .modal-form { padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
  .form-field { display: flex; flex-direction: column; gap: 0.2rem; }
  .form-field label { font-size: 0.68rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; }
  .modal-error { font-size: 0.72rem; color: var(--accent-red); background: var(--tag-red-bg); padding: 0.3rem 0.5rem; border-radius: var(--radius-sm); margin: 0; }
  .modal-success { padding: 1.5rem; text-align: center; color: var(--accent-green); font-weight: 500; font-size: 0.85rem; }
  .success-icon { font-size: 1.5rem; display: block; margin-bottom: 0.3rem; }
  .modal-actions { display: flex; gap: 0.4rem; justify-content: flex-end; margin-top: 0.25rem; }
  .modal-actions-split { display: flex; align-items: center; justify-content: space-between; margin-top: 0.25rem; }
  .modal-actions-right { display: flex; gap: 0.4rem; }
  .btn-modal-cancel { padding: 0.35rem 0.7rem; font-size: 0.75rem; background: none; border: 1px solid var(--border-default); border-radius: var(--radius-sm); color: var(--text-secondary); cursor: pointer; }
  .btn-modal-submit { padding: 0.35rem 0.7rem; font-size: 0.75rem; font-weight: 600; border: none; border-radius: var(--radius-sm); color: #fff; background: var(--accent-blue); cursor: pointer; }
  .btn-modal-submit:disabled { opacity: 0.5; }
  .btn-modal-delete { padding: 0.35rem 0.6rem; font-size: 0.7rem; background: var(--tag-red-bg); color: var(--accent-red); border: 1px solid var(--accent-red); border-radius: var(--radius-sm); cursor: pointer; }
  .btn-modal-delete:hover { background: var(--accent-red); color: #fff; }
</style>
