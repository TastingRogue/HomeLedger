<script lang="ts">
  import { onMount } from 'svelte';
  import {
    listBudgets,
    getBudgetSummary,
    createBudget,
    updateBudget,
    deleteBudget,
    type BudgetWithProgress,
    type BudgetSummary,
    type BudgetPeriod,
    type CategoryAllocation,
    type CreateBudgetPayload,
  } from '$lib/api/budgets';
  import { apiGet, ApiError } from '$lib/api/client';
  import { formatCurrency } from '$lib/utils/format';
  import { t } from '$lib/i18n';

  // ─── Types ───
  interface Category {
    id: number;
    name: string;
  }

  // ─── State ───
  let budgets: BudgetWithProgress[] = $state([]);
  let summary: BudgetSummary | null = $state(null);
  let categories: Category[] = $state([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

  // Form state
  let showForm = $state(false);
  let editingBudget: BudgetWithProgress | null = $state(null);
  let formError = $state('');
  let formSubmitting = $state(false);

  // Form fields
  let formName = $state('');
  let formPeriod: BudgetPeriod = $state('Mensual');
  let formStartDate = $state('');
  let formAllocations: { categoryId: number | ''; allocated: string }[] = $state([]);

  // Validation
  let validationErrors: Record<string, string> = $state({});

  // Delete confirmation
  let deleteTarget: BudgetWithProgress | null = $state(null);
  let deleteSubmitting = $state(false);

  // ─── Constants ───
  const periods: BudgetPeriod[] = ['Mensual', 'Semanal'];

  // ─── Helpers ───
  function getCategoryName(categoryId: number): string {
    return categories.find((c) => c.id === categoryId)?.name ?? `Categoría ${categoryId}`;
  }

  function getProgressColor(spent: number, allocated: number): string {
    if (allocated <= 0) return 'progress-ok';
    const pct = (spent / allocated) * 100;
    if (pct > 100) return 'progress-exceeded';
    if (pct >= 80) return 'progress-warning';
    return 'progress-ok';
  }

  function getProgressLabel(spent: number, allocated: number): string {
    if (allocated <= 0) return $t('budgets.no_allocation');
    const pct = (spent / allocated) * 100;
    if (pct > 100) return $t('budgets.exceeded');
    if (pct >= 80) return $t('budgets.near_limit');
    return $t('budgets.in_control');
  }

  function formatDateRange(start: string, end: string): string {
    const s = new Date(start + 'T00:00:00');
    const e = new Date(end + 'T00:00:00');
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    return `${s.toLocaleDateString('es-MX', opts)} - ${e.toLocaleDateString('es-MX', opts)}, ${e.getFullYear()}`;
  }

  // ─── Data Loading ───
  async function loadData() {
    loading = true;
    error = null;
    try {
      const [b, s, cats] = await Promise.all([
        listBudgets(),
        getBudgetSummary(),
        apiGet<Category[]>('/categories'),
      ]);
      budgets = b;
      summary = s;
      categories = cats;
    } catch (e: unknown) {
      error = e instanceof ApiError ? e.message : $t('budgets.error_loading');
    } finally {
      loading = false;
    }
  }

  // ─── Create / Edit Form ───
  function openCreateForm() {
    editingBudget = null;
    formName = '';
    formPeriod = 'Mensual';
    formStartDate = new Date().toISOString().split('T')[0]!;
    formAllocations = [{ categoryId: '', allocated: '' }];
    formError = '';
    validationErrors = {};
    showForm = true;
  }

  function openEditForm(budget: BudgetWithProgress) {
    editingBudget = budget;
    formName = budget.name;
    formPeriod = budget.period;
    formStartDate = budget.startDate;
    formAllocations = budget.categories.map((c) => ({
      categoryId: c.categoryId,
      allocated: String(c.allocated),
    }));
    if (formAllocations.length === 0) {
      formAllocations = [{ categoryId: '', allocated: '' }];
    }
    formError = '';
    validationErrors = {};
    showForm = true;
  }

  function closeForm() {
    showForm = false;
    editingBudget = null;
    formError = '';
    validationErrors = {};
  }

  function addAllocation() {
    formAllocations = [...formAllocations, { categoryId: '', allocated: '' }];
  }

  function removeAllocation(index: number) {
    formAllocations = formAllocations.filter((_, i) => i !== index);
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {};

    if (!String(formName ?? '').trim()) {
      errors.name = $t('budgets.name_required');
    } else if (String(formName ?? '').trim().length > 100) {
      errors.name = $t('budgets.name_max');
    }

    if (!formStartDate) {
      errors.startDate = $t('budgets.start_required');
    }

    if (formAllocations.length === 0) {
      errors.categories = $t('budgets.min_one_category');
    } else {
      for (let i = 0; i < formAllocations.length; i++) {
        const alloc = formAllocations[i];
        if (!alloc.categoryId) {
          errors[`cat_${i}`] = $t('budgets.select_category');
        }
        if (!String(alloc.allocated ?? '').trim() || Number(alloc.allocated) <= 0) {
          errors[`amt_${i}`] = $t('budgets.amount_positive');
        } else if (Number(alloc.allocated) > 999999999.99) {
          errors[`amt_${i}`] = $t('budgets.amount_max');
        }
      }
    }

    validationErrors = errors;
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit() {
    if (!validateForm()) return;

    formSubmitting = true;
    formError = '';

    const catAllocations: CategoryAllocation[] = formAllocations.map((a) => ({
      categoryId: Number(a.categoryId),
      allocated: Number(Number(a.allocated).toFixed(2)),
    }));

    try {
      if (editingBudget) {
        await updateBudget(editingBudget.id, {
          name: String(formName ?? '').trim(),
          period: formPeriod,
          startDate: formStartDate,
          categories: catAllocations,
        });
      } else {
        const payload: CreateBudgetPayload = {
          name: String(formName ?? '').trim(),
          period: formPeriod,
          startDate: formStartDate,
          categories: catAllocations,
        };
        await createBudget(payload);
      }
      closeForm();
      await loadData();
    } catch (e: unknown) {
      formError = e instanceof ApiError ? e.message : $t('budgets.error_saving');
    } finally {
      formSubmitting = false;
    }
  }

  // ─── Delete ───
  function openDeleteConfirm(budget: BudgetWithProgress) {
    deleteTarget = budget;
  }

  function closeDeleteConfirm() {
    deleteTarget = null;
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    deleteSubmitting = true;
    try {
      await deleteBudget(deleteTarget.id);
      closeDeleteConfirm();
      await loadData();
    } catch (e: unknown) {
      error = e instanceof ApiError ? e.message : $t('budgets.error_deleting');
      closeDeleteConfirm();
    } finally {
      deleteSubmitting = false;
    }
  }

  onMount(() => {
    loadData();
  });
</script>

<svelte:head>
  <title>{$t('budgets.title')} - HomeLedger</title>
</svelte:head>

<div class="page">
  <header class="page-header">
    <div>
      <h1>{$t('budgets.title')}</h1>
      <p class="page-subtitle">{$t('budgets.subtitle')}</p>
    </div>
    <button class="btn btn-primary" onclick={openCreateForm}>{$t('budgets.new')}</button>
  </header>

  {#if loading}
    <div class="state-msg"><p>{$t('budgets.loading')}</p></div>
  {:else if error}
    <div class="state-msg error">
      <p>{error}</p>
      <button class="btn btn-secondary" onclick={loadData}>{$t('common.retry')}</button>
    </div>
  {:else}
    <!-- Summary Stats Row -->
    {#if summary && (summary.totalAllocated > 0 || budgets.length > 0)}
      <div class="summary-row" aria-label="Resumen general de presupuestos">
        <div class="stat">
          <span class="stat-label">{$t('budgets.allocated')}</span>
          <span class="stat-value">{formatCurrency(summary.totalAllocated)}</span>
        </div>
        <div class="stat">
          <span class="stat-label">{$t('budgets.spent')}</span>
          <span class="stat-value spent">{formatCurrency(summary.totalSpent)}</span>
        </div>
        <div class="stat">
          <span class="stat-label">{$t('budgets.remaining')}</span>
          <span class="stat-value {summary.totalRemaining < 0 ? 'exceeded' : 'remaining'}">{formatCurrency(summary.totalRemaining)}</span>
        </div>
        <div class="stat">
          <span class="stat-label">{$t('budgets.usage')}</span>
          <span class="stat-value {summary.percentUsed > 100 ? 'exceeded' : summary.percentUsed >= 80 ? 'warn' : ''}">{summary.percentUsed.toFixed(1)}%</span>
        </div>
      </div>
    {/if}

    <!-- Budget List -->
    {#if budgets.length === 0}
      <div class="state-msg">
        <p>{$t('budgets.no_budgets')}</p>
        <button class="btn btn-primary" onclick={openCreateForm}>{$t('budgets.create_first')}</button>
      </div>
    {:else}
      <div class="budgets-list" role="list" aria-label="Lista de presupuestos">
        {#each budgets as budget (budget.id)}
          <article class="budget-card" role="listitem">
            <div class="budget-top">
              <div class="budget-title-row">
                <h2 class="budget-name">{budget.name}</h2>
                <span class="period-tag">{budget.period}</span>
              </div>
              <span class="budget-dates">{formatDateRange(budget.startDate, budget.endDate)}</span>
            </div>

            <!-- Total progress -->
            <div class="budget-progress">
              <div class="progress-info">
                <span class="progress-amounts">{formatCurrency(budget.totalSpent)} / {formatCurrency(budget.totalAllocated)}</span>
                <span class="progress-pct {getProgressColor(budget.totalSpent, budget.totalAllocated)}">{budget.percentUsed.toFixed(1)}%</span>
              </div>
              <div class="progress-bar" role="progressbar" aria-valuenow={budget.percentUsed} aria-valuemin={0} aria-valuemax={100}>
                <div class="progress-fill {getProgressColor(budget.totalSpent, budget.totalAllocated)}" style="width:{Math.min(budget.percentUsed, 100)}%"></div>
              </div>
            </div>

            <!-- Per-category -->
            {#if budget.categories.length > 0}
              <div class="cat-section">
                <span class="cat-section-title">{$t('budgets.by_category')}</span>
                {#each budget.categories as cat (cat.id)}
                  {@const pct = cat.allocated > 0 ? (cat.spent / cat.allocated) * 100 : 0}
                  {@const colorClass = getProgressColor(cat.spent, cat.allocated)}
                  <div class="cat-row">
                    <span class="cat-name">{getCategoryName(cat.categoryId)}</span>
                    <div class="cat-bar-wrap">
                      <div class="progress-bar progress-bar-thin">
                        <div class="progress-fill {colorClass}" style="width:{Math.min(pct, 100)}%"></div>
                      </div>
                    </div>
                    <span class="cat-amt">{formatCurrency(cat.spent)}/{formatCurrency(cat.allocated)}</span>
                    <span class="cat-status-tag {colorClass}">{getProgressLabel(cat.spent, cat.allocated)}</span>
                  </div>
                {/each}
              </div>
            {/if}

            <div class="budget-actions">
              <button class="btn btn-sm btn-secondary" onclick={() => openEditForm(budget)}>{$t('common.edit')}</button>
              <button class="btn btn-sm btn-danger" onclick={() => openDeleteConfirm(budget)}>{$t('common.delete')}</button>
            </div>
          </article>
        {/each}
      </div>
    {/if}
  {/if}
</div>

<!-- ─── Create / Edit Modal ─── -->
{#if showForm}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <!-- svelte-ignore a11y_interactive_supports_focus -->
  <div class="overlay" role="dialog" aria-modal="true" aria-label={editingBudget ? 'Editar presupuesto' : 'Nuevo presupuesto'}  onkeydown={(e) => { if (e.key === 'Escape') closeForm(); }}>
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="modal" onclick={(e) => e.stopPropagation()} role="document">
      <header class="modal-header">
        <h2>{editingBudget ? $t('budgets.edit_title') : $t('budgets.new_title')}</h2>
        <button class="close-btn" onclick={closeForm} aria-label="Cerrar">&times;</button>
      </header>

      {#if formError}
        <div class="form-alert" role="alert">{formError}</div>
      {/if}

      <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} novalidate>
        <div class="field">
          <label for="f-name">{$t('budgets.form_name')} <span class="req">*</span></label>
          <input id="f-name" type="text" bind:value={formName} maxlength={100} placeholder={$t('budgets.form_name_placeholder')} class:invalid={!!validationErrors.name} aria-invalid={!!validationErrors.name} />
          {#if validationErrors.name}<span class="field-err">{validationErrors.name}</span>{/if}
        </div>

        <div class="field-row">
          <div class="field">
            <label for="f-period">{$t('budgets.form_period')} <span class="req">*</span></label>
            <select id="f-period" bind:value={formPeriod}>
              {#each periods as p}
                <option value={p}>{p}</option>
              {/each}
            </select>
          </div>

          <div class="field">
            <label for="f-start">{$t('budgets.form_start_date')} <span class="req">*</span></label>
            <input id="f-start" type="date" bind:value={formStartDate} class:invalid={!!validationErrors.startDate} aria-invalid={!!validationErrors.startDate} />
            {#if validationErrors.startDate}<span class="field-err">{validationErrors.startDate}</span>{/if}
          </div>
        </div>

        <!-- Category Allocations -->
        <div class="allocations-section">
          <div class="alloc-header">
            <label>{$t('budgets.form_allocations')} <span class="req">*</span></label>
            <button type="button" class="btn btn-sm btn-secondary" onclick={addAllocation}>{$t('budgets.add_allocation')}</button>
          </div>
          {#if validationErrors.categories}<span class="field-err">{validationErrors.categories}</span>{/if}

          {#each formAllocations as alloc, i}
            <div class="alloc-row">
              <select bind:value={alloc.categoryId} class:invalid={!!validationErrors[`cat_${i}`]} aria-label="Categoría {i + 1}">
                <option value="">{$t('budgets.category_placeholder')}</option>
                {#each categories as cat (cat.id)}
                  <option value={cat.id}>{cat.name}</option>
                {/each}
              </select>
              <input type="number" step="0.01" min="0.01" bind:value={alloc.allocated} placeholder={$t('budgets.amount_placeholder')} class:invalid={!!validationErrors[`amt_${i}`]} aria-label="Monto {i + 1}" />
              {#if formAllocations.length > 1}
                <button type="button" class="btn-remove" onclick={() => removeAllocation(i)} aria-label="Eliminar">&times;</button>
              {/if}
            </div>
            {#if validationErrors[`cat_${i}`]}<span class="field-err">{validationErrors[`cat_${i}`]}</span>{/if}
            {#if validationErrors[`amt_${i}`]}<span class="field-err">{validationErrors[`amt_${i}`]}</span>{/if}
          {/each}
        </div>

        <div class="form-buttons">
          <button type="button" class="btn btn-secondary" onclick={closeForm} disabled={formSubmitting}>{$t('common.cancel')}</button>
          <button type="submit" class="btn btn-primary" disabled={formSubmitting}>
            {formSubmitting ? $t('common.saving') : editingBudget ? $t('budgets.save_changes') : $t('budgets.create_btn')}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- ─── Delete Confirmation Modal ─── -->
{#if deleteTarget}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <!-- svelte-ignore a11y_interactive_supports_focus -->
  <div class="overlay" role="dialog" aria-modal="true" aria-label="Confirmar eliminación"  onkeydown={(e) => { if (e.key === 'Escape') closeDeleteConfirm(); }}>
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="modal modal-sm" onclick={(e) => e.stopPropagation()} role="document">
      <header class="modal-header">
        <h2>{$t('budgets.delete_title')}</h2>
        <button class="close-btn" onclick={closeDeleteConfirm} aria-label="Cerrar">&times;</button>
      </header>

      <p class="modal-subtitle">{$t('budgets.delete_confirm', { name: deleteTarget.name })}</p>
      <p class="modal-info">{$t('budgets.delete_irreversible')}</p>

      <div class="form-buttons">
        <button type="button" class="btn btn-secondary" onclick={closeDeleteConfirm} disabled={deleteSubmitting}>{$t('common.cancel')}</button>
        <button type="button" class="btn btn-danger" onclick={handleDelete} disabled={deleteSubmitting}>
          {deleteSubmitting ? $t('budgets.deleting') : $t('common.delete')}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .page { width: 100%; margin: 0; }

  .page-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    margin-bottom: 1.25rem; gap: var(--spacing-sm);
  }
  .page-header h1 { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); }
  .page-subtitle { font-size: 0.8rem; color: var(--text-muted); margin-top: 0.15rem; }

  /* Summary Row */
  .summary-row {
    display: flex; gap: var(--spacing-lg); padding: 0.6rem 0.8rem;
    background: var(--bg-surface); border: 1px solid var(--border-default);
    border-radius: var(--radius-md); margin-bottom: var(--spacing-md); flex-wrap: wrap;
  }
  .stat { display: flex; flex-direction: column; gap: 0.1rem; }
  .stat-label { font-size: 0.6rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); }
  .stat-value { font-size: 0.95rem; font-weight: 700; color: var(--text-primary); }
  .stat-value.spent { color: var(--accent-red); }
  .stat-value.remaining { color: var(--accent-green); }
  .stat-value.exceeded { color: var(--accent-red); }
  .stat-value.warn { color: var(--accent-orange); }

  /* Budget Cards */
  .budgets-list { display: flex; flex-direction: column; gap: var(--spacing-sm); }
  .budget-card {
    background: var(--bg-surface); border: 1px solid var(--border-default);
    border-radius: var(--radius-md); padding: 0.7rem 0.8rem;
    display: flex; flex-direction: column; gap: 0.4rem;
  }
  .budget-card:hover { border-color: var(--border-default); background: var(--bg-elevated); }

  .budget-top { display: flex; flex-direction: column; gap: 0.1rem; }
  .budget-title-row { display: flex; align-items: center; gap: 0.4rem; }
  .budget-name { font-size: 0.9rem; font-weight: 600; color: var(--text-primary); margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .period-tag { font-size: 0.6rem; font-weight: 600; padding: 0.1rem 0.3rem; border-radius: var(--radius-sm); background: var(--tag-blue-bg); color: var(--accent-blue); }
  .budget-dates { font-size: 0.7rem; color: var(--text-muted); }

  /* Progress */
  .budget-progress { display: flex; flex-direction: column; gap: 0.2rem; }
  .progress-info { display: flex; justify-content: space-between; align-items: baseline; }
  .progress-amounts { font-size: 0.78rem; color: var(--text-secondary); }
  .progress-pct { font-size: 0.72rem; font-weight: 700; }
  .progress-pct.progress-ok { color: var(--accent-green); }
  .progress-pct.progress-warning { color: var(--accent-orange); }
  .progress-pct.progress-exceeded { color: var(--accent-red); }

  .progress-bar { height: 5px; background: var(--border-default); border-radius: 3px; overflow: hidden; }
  .progress-bar-thin { height: 3px; }
  .progress-fill { height: 100%; border-radius: 3px; transition: width 0.3s ease; }
  .progress-fill.progress-ok { background: var(--accent-green); }
  .progress-fill.progress-warning { background: var(--accent-orange); }
  .progress-fill.progress-exceeded { background: var(--accent-red); }

  /* Category Section */
  .cat-section { border-top: 1px solid var(--border-subtle); padding-top: 0.4rem; }
  .cat-section-title { font-size: 0.6rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); display: block; margin-bottom: 0.3rem; }
  .cat-row { display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.25rem; font-size: 0.75rem; }
  .cat-name { min-width: 80px; color: var(--text-primary); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .cat-bar-wrap { flex: 1; min-width: 60px; }
  .cat-amt { font-size: 0.68rem; color: var(--text-secondary); white-space: nowrap; }
  .cat-status-tag { font-size: 0.6rem; font-weight: 600; padding: 0.05rem 0.25rem; border-radius: var(--radius-sm); white-space: nowrap; }
  .cat-status-tag.progress-ok { background: var(--tag-green-bg); color: var(--accent-green); }
  .cat-status-tag.progress-warning { background: var(--tag-orange-bg); color: var(--accent-orange); }
  .cat-status-tag.progress-exceeded { background: var(--tag-red-bg); color: var(--accent-red); }

  /* Actions */
  .budget-actions { display: flex; gap: 0.3rem; border-top: 1px solid var(--border-subtle); padding-top: 0.4rem; margin-top: auto; }

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
  .btn-danger { background: var(--tag-red-bg); color: var(--accent-red); }
  .btn-danger:hover:not(:disabled) { background: rgba(212, 76, 71, 0.25); }
  .btn-sm { padding: 0.25rem 0.5rem; font-size: 0.72rem; }

  /* States */
  .state-msg { text-align: center; padding: var(--spacing-xl); color: var(--text-secondary); font-size: 0.85rem; }
  .state-msg.error { color: var(--accent-red); }
  .state-msg button { margin-top: var(--spacing-sm); }

  /* Modal */
  .overlay {
    position: fixed; inset: 0; background: rgba(0, 0, 0, 0.6);
    display: flex; align-items: center; justify-content: center;
    padding: var(--spacing-md); z-index: 1000;
  }
  .modal {
    background: var(--bg-surface); border: 1px solid var(--border-default);
    border-radius: var(--radius-lg); padding: var(--spacing-lg);
    width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto;
  }
  .modal-sm { max-width: 380px; }
  .modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--spacing-md); }
  .modal-header h2 { font-size: 1rem; font-weight: 600; color: var(--text-primary); }
  .modal-subtitle { font-weight: 600; color: var(--text-primary); margin: 0 0 0.15rem; font-size: 0.88rem; }
  .modal-info { font-size: 0.78rem; color: var(--text-secondary); margin: 0 0 var(--spacing-md); }
  .close-btn { background: none; border: none; font-size: 1.3rem; color: var(--text-muted); cursor: pointer; padding: 0.2rem; }
  .close-btn:hover { color: var(--text-primary); }

  /* Form */
  .form-alert { background: var(--tag-red-bg); color: var(--accent-red); padding: 0.4rem 0.6rem; border-radius: var(--radius-sm); font-size: 0.78rem; margin-bottom: var(--spacing-md); }
  .field { margin-bottom: var(--spacing-md); flex: 1; }
  .field-row { display: flex; gap: var(--spacing-md); }
  .field label { display: block; margin-bottom: 0.2rem; font-size: 0.75rem; font-weight: 500; color: var(--text-secondary); }
  .req { color: var(--accent-red); }
  .field input, .field select { width: 100%; }
  .field input.invalid, .field select.invalid { border-color: var(--accent-red); }
  .field-err { display: block; margin-top: 0.15rem; font-size: 0.7rem; color: var(--accent-red); }

  /* Allocations */
  .allocations-section { border: 1px solid var(--border-default); border-radius: var(--radius-sm); padding: var(--spacing-md); margin-bottom: var(--spacing-md); }
  .alloc-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-sm); }
  .alloc-header label { font-size: 0.75rem; font-weight: 500; color: var(--text-secondary); }
  .alloc-row { display: flex; gap: var(--spacing-sm); align-items: center; margin-bottom: var(--spacing-sm); }
  .alloc-row select { flex: 2; }
  .alloc-row input { flex: 1; }
  .alloc-row select.invalid, .alloc-row input.invalid { border-color: var(--accent-red); }
  .btn-remove { background: none; border: none; font-size: 1.2rem; color: var(--accent-red); cursor: pointer; padding: 0 0.3rem; }
  .btn-remove:hover { opacity: 0.7; }

  .form-buttons { display: flex; gap: var(--spacing-sm); justify-content: flex-end; margin-top: var(--spacing-lg); }

  @media (max-width: 600px) {
    .summary-row { flex-direction: column; gap: var(--spacing-sm); }
    .field-row { flex-direction: column; gap: var(--spacing-sm); }
    .cat-row { flex-wrap: wrap; }
  }
</style>
