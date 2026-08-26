<script lang="ts">
  import { onMount } from 'svelte';
  import {
    listGoals,
    createGoal,
    updateGoal,
    fundGoal,
    withdrawGoal,
    type GoalData,
    type GoalType,
    type CreateGoalPayload,
  } from '$lib/api/goals';
  import { ApiError } from '$lib/api/client';
  import { formatCurrency } from '$lib/utils/format';
  import { t } from '$lib/i18n';

  // ─── State ───
  let goals: GoalData[] = $state([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

  // Form state (create/edit)
  let showForm = $state(false);
  let editingGoal: GoalData | null = $state(null);
  let formError = $state('');
  let formSubmitting = $state(false);

  // Form fields
  let formName = $state('');
  let formTargetAmount = $state('');
  let formType: GoalType = $state('Lista de Deseos');
  let formDeadline = $state('');

  // Validation
  let validationErrors: Record<string, string> = $state({});

  // Fund modal
  let fundTarget: GoalData | null = $state(null);
  let fundAmount = $state('');
  let fundError = $state('');
  let fundSubmitting = $state(false);

  // Withdraw modal
  let withdrawTarget: GoalData | null = $state(null);
  let withdrawAmount = $state('');
  let withdrawError = $state('');
  let withdrawSubmitting = $state(false);

  // ─── Constants ───
  const goalTypes: GoalType[] = ['Lista de Deseos', 'Deuda'];

  // ─── Helpers ───
  function getTypeBadgeClass(type: string): string {
    return type === 'Deuda' ? 'badge-deuda' : 'badge-deseos';
  }

  function getProgressBarClass(progress: number, status: string): string {
    if (status === 'Completada') return 'progress-completed';
    if (progress >= 75) return 'progress-high';
    if (progress >= 50) return 'progress-mid';
    return 'progress-low';
  }

  // ─── Data Loading ───
  async function loadGoals() {
    loading = true;
    error = null;
    try {
      goals = await listGoals();
    } catch (e: unknown) {
      error = e instanceof ApiError ? e.message : $t('goals.error_loading');
    } finally {
      loading = false;
    }
  }

  // ─── Create/Edit Form ───
  function openCreateForm() {
    editingGoal = null;
    formName = '';
    formTargetAmount = '';
    formType = 'Lista de Deseos';
    formDeadline = '';
    formError = '';
    validationErrors = {};
    showForm = true;
  }

  function openEditForm(goal: GoalData) {
    editingGoal = goal;
    formName = goal.name;
    formTargetAmount = String(goal.targetAmount);
    formType = goal.type;
    formDeadline = goal.deadline ? goal.deadline.split('T')[0] : '';
    formError = '';
    validationErrors = {};
    showForm = true;
  }

  function closeForm() {
    showForm = false;
    editingGoal = null;
    formError = '';
    validationErrors = {};
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {};

    if (!String(formName ?? '').trim()) {
      errors.name = $t('goals.name_required');
    } else if (String(formName ?? '').trim().length > 100) {
      errors.name = $t('goals.name_max');
    }

    if (!String(formTargetAmount ?? '').trim()) {
      errors.targetAmount = $t('goals.target_required');
    } else {
      const val = Number(formTargetAmount);
      if (isNaN(val) || val < 0.01) {
        errors.targetAmount = $t('goals.target_min');
      } else if (val > 999999999.99) {
        errors.targetAmount = $t('goals.target_max');
      }
    }

    validationErrors = errors;
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit() {
    if (!validateForm()) return;

    formSubmitting = true;
    formError = '';

    const payload: CreateGoalPayload = {
      name: String(formName ?? '').trim(),
      targetAmount: Number(formTargetAmount),
      type: formType,
    };

    if (String(formDeadline ?? '').trim()) {
      payload.deadline = new Date(formDeadline).toISOString();
    }

    try {
      if (editingGoal) {
        await updateGoal(editingGoal.id, payload);
      } else {
        await createGoal(payload);
      }
      closeForm();
      await loadGoals();
    } catch (e: unknown) {
      formError = e instanceof ApiError ? e.message : $t('goals.error_saving');
    } finally {
      formSubmitting = false;
    }
  }

  // ─── Fund Modal ───
  function openFundModal(goal: GoalData) {
    fundTarget = goal;
    fundAmount = '';
    fundError = '';
  }

  function closeFundModal() {
    fundTarget = null;
    fundAmount = '';
    fundError = '';
  }

  async function handleFund() {
    if (!fundTarget) return;

    const val = Number(fundAmount);
    if (isNaN(val) || val <= 0) {
      fundError = $t('goals.fund_invalid');
      return;
    }

    fundSubmitting = true;
    fundError = '';

    try {
      await fundGoal(fundTarget.id, { amount: val });
      closeFundModal();
      await loadGoals();
    } catch (e: unknown) {
      fundError = e instanceof ApiError ? e.message : $t('goals.fund_error');
    } finally {
      fundSubmitting = false;
    }
  }

  // ─── Withdraw Modal ───
  function openWithdrawModal(goal: GoalData) {
    withdrawTarget = goal;
    withdrawAmount = '';
    withdrawError = '';
  }

  function closeWithdrawModal() {
    withdrawTarget = null;
    withdrawAmount = '';
    withdrawError = '';
  }

  async function handleWithdraw() {
    if (!withdrawTarget) return;

    const val = Number(withdrawAmount);
    if (isNaN(val) || val <= 0) {
      withdrawError = $t('goals.withdraw_invalid');
      return;
    }

    withdrawSubmitting = true;
    withdrawError = '';

    try {
      await withdrawGoal(withdrawTarget.id, { amount: val });
      closeWithdrawModal();
      await loadGoals();
    } catch (e: unknown) {
      withdrawError = e instanceof ApiError ? e.message : $t('goals.withdraw_error');
    } finally {
      withdrawSubmitting = false;
    }
  }

  onMount(() => {
    loadGoals();
  });
</script>

<svelte:head>
  <title>{$t('goals.title')} - HomeLedger</title>
</svelte:head>

<div class="page">
  <header class="page-header">
    <div>
      <h1>{$t('goals.title')}</h1>
      <p class="page-subtitle">{$t('goals.subtitle')}</p>
    </div>
    <button class="btn btn-primary" onclick={openCreateForm}>{$t('goals.new')}</button>
  </header>

  {#if loading}
    <div class="state-msg"><p>{$t('goals.loading')}</p></div>
  {:else if error}
    <div class="state-msg error">
      <p>{error}</p>
      <button class="btn btn-secondary" onclick={loadGoals}>{$t('common.retry')}</button>
    </div>
  {:else if goals.length === 0}
    <div class="state-msg">
      <p>{$t('goals.no_goals')}</p>
      <button class="btn btn-primary" onclick={openCreateForm}>{$t('goals.create_first')}</button>
    </div>
  {:else}
    <div class="goals-list" role="list" aria-label="Lista de metas de ahorro">
      {#each goals as goal (goal.id)}
        {@const isCompleted = goal.status === 'Completada'}
        <div class="goal-row" class:completed={isCompleted} role="listitem">
          <div class="goal-main">
            <span class="goal-name">{goal.name}</span>
            <span class="type-tag {getTypeBadgeClass(goal.type)}">{goal.type}</span>
            {#if isCompleted}
              <span class="completed-tag">{$t('goals.completed_tag')}</span>
            {/if}
          </div>
          <div class="goal-progress-row">
            <div class="progress-bar" role="progressbar" aria-valuenow={goal.progress} aria-valuemin={0} aria-valuemax={100} aria-label="Progreso: {goal.progress.toFixed(1)}%">
              <div class="progress-fill {getProgressBarClass(goal.progress, goal.status)}" style="width:{Math.min(goal.progress, 100)}%"></div>
            </div>
            <span class="progress-pct {getProgressBarClass(goal.progress, goal.status)}">{goal.progress.toFixed(1)}%</span>
          </div>
          <div class="goal-amounts">
            <span class="amount-saved">{formatCurrency(goal.savedAmount)}</span>
            <span class="amount-sep">/</span>
            <span class="amount-target">{formatCurrency(goal.targetAmount)}</span>
            {#if goal.deadline}
              <span class="goal-deadline">· {new Date(goal.deadline).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}</span>
            {/if}
          </div>
          <div class="goal-actions">
            {#if !isCompleted}
              <button class="btn btn-sm btn-success" onclick={() => openFundModal(goal)}>{$t('goals.fund_btn')}</button>
              <button class="btn btn-sm btn-warning" onclick={() => openWithdrawModal(goal)} disabled={goal.savedAmount <= 0}>{$t('goals.withdraw_btn')}</button>
            {:else}
              <button class="btn btn-sm btn-warning" onclick={() => openWithdrawModal(goal)} disabled={goal.savedAmount <= 0}>Retirar</button>
            {/if}
            <button class="btn btn-sm btn-secondary" onclick={() => openEditForm(goal)}>{$t('common.edit')}</button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- ─── Create / Edit Modal ─── -->
{#if showForm}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <!-- svelte-ignore a11y_interactive_supports_focus -->
  <div class="overlay" role="dialog" aria-modal="true" aria-label={editingGoal ? 'Editar meta' : 'Nueva meta'}  onkeydown={(e) => { if (e.key === 'Escape') closeForm(); }}>
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="modal" onclick={(e) => e.stopPropagation()} role="document">
      <header class="modal-header">
        <h2>{editingGoal ? $t('goals.edit_title') : $t('goals.new_title')}</h2>
        <button class="close-btn" onclick={closeForm} aria-label="Cerrar">&times;</button>
      </header>

      {#if formError}
        <div class="form-alert" role="alert">{formError}</div>
      {/if}

      <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} novalidate>
        <div class="field">
          <label for="f-name">{$t('goals.form_name')} <span class="req">*</span></label>
          <input id="f-name" type="text" bind:value={formName} maxlength={100} placeholder={$t('goals.form_name_placeholder')} class:invalid={validationErrors.name} aria-invalid={!!validationErrors.name} />
          {#if validationErrors.name}<span class="field-err">{validationErrors.name}</span>{/if}
        </div>

        <div class="field">
          <label for="f-target">{$t('goals.form_target')} <span class="req">*</span></label>
          <input id="f-target" type="number" step="0.01" min="0.01" bind:value={formTargetAmount} placeholder="0.00" class:invalid={validationErrors.targetAmount} aria-invalid={!!validationErrors.targetAmount} />
          {#if validationErrors.targetAmount}<span class="field-err">{validationErrors.targetAmount}</span>{/if}
        </div>

        <div class="field">
          <label for="f-type">{$t('goals.form_type')} <span class="req">*</span></label>
          <select id="f-type" bind:value={formType}>
            {#each goalTypes as t}
              <option value={t}>{t}</option>
            {/each}
          </select>
        </div>

        <div class="field">
          <label for="f-deadline">{$t('goals.form_deadline')} <span class="opt">{$t('goals.form_deadline_optional')}</span></label>
          <input id="f-deadline" type="date" bind:value={formDeadline} />
        </div>

        <div class="form-buttons">
          <button type="button" class="btn btn-secondary" onclick={closeForm} disabled={formSubmitting}>{$t('common.cancel')}</button>
          <button type="submit" class="btn btn-primary" disabled={formSubmitting}>
            {formSubmitting ? $t('common.saving') : editingGoal ? $t('goals.save_changes') : $t('goals.create_btn')}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- ─── Fund Modal ─── -->
{#if fundTarget}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <!-- svelte-ignore a11y_interactive_supports_focus -->
  <div class="overlay" role="dialog" aria-modal="true" aria-label="Abonar a meta"  onkeydown={(e) => { if (e.key === 'Escape') closeFundModal(); }}>
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="modal modal-sm" onclick={(e) => e.stopPropagation()} role="document">
      <header class="modal-header">
        <h2>{$t('goals.fund_title')}</h2>
        <button class="close-btn" onclick={closeFundModal} aria-label="Cerrar">&times;</button>
      </header>

      <p class="modal-subtitle">{fundTarget.name}</p>
      <p class="modal-info">{$t('goals.fund_remaining')}: {formatCurrency(fundTarget.targetAmount - fundTarget.savedAmount)}</p>

      {#if fundError}
        <div class="form-alert" role="alert">{fundError}</div>
      {/if}

      <form onsubmit={(e) => { e.preventDefault(); handleFund(); }} novalidate>
        <div class="field">
          <label for="f-fund-amount">{$t('goals.fund_amount')}</label>
          <input id="f-fund-amount" type="number" step="0.01" min="0.01" bind:value={fundAmount} placeholder="0.00" />
          <span class="field-hint">{$t('goals.fund_max')}: {formatCurrency(fundTarget.targetAmount - fundTarget.savedAmount)}</span>
        </div>

        <div class="form-buttons">
          <button type="button" class="btn btn-secondary" onclick={closeFundModal} disabled={fundSubmitting}>{$t('common.cancel')}</button>
          <button type="submit" class="btn btn-success" disabled={fundSubmitting}>
            {fundSubmitting ? $t('goals.funding') : $t('goals.fund_btn')}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- ─── Withdraw Modal ─── -->
{#if withdrawTarget}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <!-- svelte-ignore a11y_interactive_supports_focus -->
  <div class="overlay" role="dialog" aria-modal="true" aria-label="Retirar de meta"  onkeydown={(e) => { if (e.key === 'Escape') closeWithdrawModal(); }}>
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="modal modal-sm" onclick={(e) => e.stopPropagation()} role="document">
      <header class="modal-header">
        <h2>{$t('goals.withdraw_title')}</h2>
        <button class="close-btn" onclick={closeWithdrawModal} aria-label="Cerrar">&times;</button>
      </header>

      <p class="modal-subtitle">{withdrawTarget.name}</p>
      <p class="modal-info">{$t('goals.withdraw_available')}: {formatCurrency(withdrawTarget.savedAmount)}</p>

      {#if withdrawError}
        <div class="form-alert" role="alert">{withdrawError}</div>
      {/if}

      <form onsubmit={(e) => { e.preventDefault(); handleWithdraw(); }} novalidate>
        <div class="field">
          <label for="f-withdraw-amount">{$t('goals.withdraw_amount')}</label>
          <input id="f-withdraw-amount" type="number" step="0.01" min="0.01" bind:value={withdrawAmount} placeholder="0.00" />
          <span class="field-hint">{$t('goals.withdraw_max')}: {formatCurrency(withdrawTarget.savedAmount)}</span>
        </div>

        <div class="form-buttons">
          <button type="button" class="btn btn-secondary" onclick={closeWithdrawModal} disabled={withdrawSubmitting}>{$t('common.cancel')}</button>
          <button type="submit" class="btn btn-danger" disabled={withdrawSubmitting}>
            {withdrawSubmitting ? $t('goals.withdrawing') : $t('goals.withdraw_btn')}
          </button>
        </div>
      </form>
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

  /* Goals List (compact rows) */
  .goals-list { display: flex; flex-direction: column; gap: 2px; }

  .goal-row {
    display: grid; grid-template-columns: 1fr auto;
    gap: 0.3rem 1rem; padding: 0.5rem 0.7rem;
    background: var(--bg-surface); border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md); align-items: center;
  }
  .goal-row.completed { border-color: var(--accent-green); border-left: 3px solid var(--accent-green); }
  .goal-row:hover { background: var(--bg-hover); }

  .goal-main { display: flex; align-items: center; gap: 0.4rem; grid-column: 1 / -1; }
  .goal-name { font-size: 0.88rem; font-weight: 500; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .type-tag { font-size: 0.65rem; font-weight: 600; padding: 0.1rem 0.35rem; border-radius: var(--radius-sm); }
  .type-tag.badge-deseos { background: var(--tag-blue-bg); color: var(--accent-blue); }
  .type-tag.badge-deuda { background: var(--tag-orange-bg); color: var(--accent-orange); }
  .completed-tag { font-size: 0.65rem; font-weight: 600; color: var(--accent-green); background: var(--tag-green-bg); padding: 0.1rem 0.35rem; border-radius: var(--radius-sm); }

  .goal-progress-row { display: flex; align-items: center; gap: 0.5rem; grid-column: 1; }
  .progress-bar { flex: 1; height: 5px; background: var(--border-default); border-radius: 3px; overflow: hidden; }
  .progress-fill { height: 100%; border-radius: 3px; transition: width 0.3s ease; }
  .progress-fill.progress-low { background: var(--accent-blue); }
  .progress-fill.progress-mid { background: var(--accent-orange); }
  .progress-fill.progress-high { background: var(--accent-orange); }
  .progress-fill.progress-completed { background: var(--accent-green); }
  .progress-pct { font-size: 0.72rem; font-weight: 700; min-width: 3rem; text-align: right; }
  .progress-pct.progress-low { color: var(--accent-blue); }
  .progress-pct.progress-mid { color: var(--accent-orange); }
  .progress-pct.progress-high { color: var(--accent-orange); }
  .progress-pct.progress-completed { color: var(--accent-green); }

  .goal-amounts { font-size: 0.78rem; color: var(--text-secondary); grid-column: 1; display: flex; gap: 0.2rem; align-items: baseline; }
  .amount-saved { font-weight: 600; color: var(--text-primary); }
  .amount-sep { color: var(--text-muted); }
  .amount-target { color: var(--text-secondary); }
  .goal-deadline { color: var(--text-muted); font-size: 0.72rem; }

  .goal-actions { display: flex; gap: 0.3rem; grid-column: 2; grid-row: 2 / 4; align-self: center; }

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
  .btn-success { background: var(--tag-green-bg); color: var(--accent-green); }
  .btn-success:hover:not(:disabled) { background: rgba(77, 170, 87, 0.25); }
  .btn-warning { background: var(--tag-orange-bg); color: var(--accent-orange); }
  .btn-warning:hover:not(:disabled) { background: rgba(212, 128, 61, 0.25); }
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
    width: 100%; max-width: 440px; max-height: 90vh; overflow-y: auto;
  }
  .modal-sm { max-width: 360px; }
  .modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--spacing-md); }
  .modal-header h2 { font-size: 1rem; font-weight: 600; color: var(--text-primary); }
  .modal-subtitle { font-weight: 600; color: var(--text-primary); margin: 0 0 0.15rem; font-size: 0.88rem; }
  .modal-info { font-size: 0.78rem; color: var(--text-secondary); margin: 0 0 var(--spacing-md); }
  .close-btn { background: none; border: none; font-size: 1.3rem; color: var(--text-muted); cursor: pointer; padding: 0.2rem; }
  .close-btn:hover { color: var(--text-primary); }

  /* Form */
  .form-alert { background: var(--tag-red-bg); color: var(--accent-red); padding: 0.4rem 0.6rem; border-radius: var(--radius-sm); font-size: 0.78rem; margin-bottom: var(--spacing-md); }
  .field { margin-bottom: var(--spacing-md); }
  .field label { display: block; margin-bottom: 0.2rem; font-size: 0.75rem; font-weight: 500; color: var(--text-secondary); }
  .req { color: var(--accent-red); }
  .opt { font-weight: 400; color: var(--text-muted); font-size: 0.7rem; }
  .field input, .field select { width: 100%; }
  .field input.invalid { border-color: var(--accent-red); }
  .field-err { display: block; margin-top: 0.15rem; font-size: 0.7rem; color: var(--accent-red); }
  .field-hint { display: block; margin-top: 0.15rem; font-size: 0.68rem; color: var(--text-muted); }
  .form-buttons { display: flex; gap: var(--spacing-sm); justify-content: flex-end; margin-top: var(--spacing-lg); }

  @media (max-width: 600px) {
    .goal-row { grid-template-columns: 1fr; }
    .goal-actions { grid-column: 1; grid-row: auto; justify-content: flex-start; margin-top: 0.2rem; }
  }
</style>
