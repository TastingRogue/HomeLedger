<script lang="ts">
  import { onMount } from 'svelte';
  import { apiGet, ApiError } from '$lib/api/client';
  import { listTransfers, createTransfer, updateTransfer, deleteTransfer } from '$lib/api/transfers';
  import type { Transfer } from '$lib/api/transfers';
  import type { AccountData } from '$lib/api/accounts';
  import { formatCurrency, formatDateShort, toDatetimeLocal, nowDatetimeLocal } from '$lib/utils/format';
  import DatePicker from '$lib/components/DatePicker.svelte';
  import { t } from '$lib/i18n';

  let transfers = $state<Transfer[]>([]);
  let accounts = $state<AccountData[]>([]);
  let loading = $state(true);
  let error = $state('');

  let showFormModal = $state(false);
  let showDeleteModal = $state(false);
  let deletingTransfer = $state<Transfer | null>(null);
  let editingTransfer = $state<Transfer | null>(null);

  let formName = $state('');
  let formDate = $state('');
  let formAmount = $state('');
  let formSourceAccountId = $state('');
  let formDestinationAccountId = $state('');
  let formErrors = $state<Record<string, string>>({});
  let formSubmitting = $state(false);

  let isEditing = $derived(editingTransfer !== null);

  async function loadTransfers() { loading = true; error = ''; try { transfers = await listTransfers(); } catch (e) { error = e instanceof ApiError ? e.message : $t('transfers.error_loading'); } finally { loading = false; } }
  async function loadAccounts() { try { accounts = await apiGet<AccountData[]>('/accounts'); } catch { error = $t('common.error_loading_options'); } }

  function openCreateForm() { editingTransfer = null; formName = ''; formDate = nowDatetimeLocal(); formAmount = ''; formSourceAccountId = accounts.length > 0 ? String(accounts[0].id) : ''; formDestinationAccountId = accounts.length > 1 ? String(accounts[1].id) : ''; formErrors = {}; showFormModal = true; }

  function openEditForm(tf: Transfer) {
    editingTransfer = tf;
    formName = tf.name;
    formDate = toDatetimeLocal(tf.date);
    formAmount = String(tf.amount);
    formSourceAccountId = String(tf.sourceAccountId);
    formDestinationAccountId = String(tf.destinationAccountId);
    formErrors = {};
    showFormModal = true;
  }

  function closeFormModal() { showFormModal = false; editingTransfer = null; formErrors = {}; }

  function validateForm(): boolean {
    const errors: Record<string, string> = {};
    if (!String(formName ?? '').trim()) errors.name = $t('common.required');
    if (!formDate) errors.date = $t('common.required');
    const amount = parseFloat(String(formAmount ?? ''));
    if (!String(formAmount ?? '').trim() || isNaN(amount) || amount <= 0) errors.amount = $t('transfers.invalid_amount');
    if (!formSourceAccountId) errors.sourceAccountId = $t('common.required');
    if (!formDestinationAccountId) errors.destinationAccountId = $t('common.required');
    if (formSourceAccountId && formDestinationAccountId && formSourceAccountId === formDestinationAccountId) errors.destinationAccountId = $t('transfers.must_differ');
    formErrors = errors;
    return Object.keys(errors).length === 0;
  }

  async function submitForm() {
    if (!validateForm()) return;
    formSubmitting = true;
    try {
      const payload = { name: String(formName ?? '').trim(), date: new Date(formDate).toISOString(), amount: parseFloat(parseFloat(String(formAmount ?? '')).toFixed(2)), sourceAccountId: parseInt(formSourceAccountId, 10), destinationAccountId: parseInt(formDestinationAccountId, 10) };
      if (isEditing && editingTransfer) {
        await updateTransfer(editingTransfer.id, payload);
      } else {
        await createTransfer(payload);
      }
      closeFormModal(); await loadTransfers();
    } catch (e) {
      if (e instanceof ApiError) { if (e.code === 'SAME_ACCOUNT') formErrors = { destinationAccountId: $t('transfers.must_differ') }; else if (e.code === 'INSUFFICIENT_FUNDS') formErrors = { amount: $t('transfers.insufficient_funds') }; else formErrors = { general: e.message }; }
      else formErrors = { general: $t('transfers.error_saving') };
    } finally { formSubmitting = false; }
  }

  function openDeleteModal(transfer: Transfer) { deletingTransfer = transfer; showDeleteModal = true; }
  function closeDeleteModal() { showDeleteModal = false; deletingTransfer = null; }
  async function confirmDelete() { if (!deletingTransfer) return; try { await deleteTransfer(deletingTransfer.id); closeDeleteModal(); await loadTransfers(); } catch (e) { if (e instanceof ApiError) error = e.message; closeDeleteModal(); } }
  function getAccountName(id: number): string { return accounts.find(a => a.id === id)?.name ?? '—'; }

  onMount(async () => { await loadAccounts(); await loadTransfers(); });
</script>

<svelte:head><title>{$t('transfers.title')} | HomeLedger</title></svelte:head>

<div class="page">
  <header class="page-header">
    <div>
      <h1>{$t('transfers.title')}</h1>
      <p class="page-subtitle">{$t('transfers.subtitle')}</p>
    </div>
    <button class="btn-new" onclick={openCreateForm}>{$t('transfers.new')}</button>
  </header>

  {#if error}<div class="alert-error"><span>{error}</span><button onclick={() => (error = '')}>×</button></div>{/if}

  {#if loading}
    <div class="state-msg"><div class="spinner"></div><span>{$t('common.loading')}</span></div>
  {:else if transfers.length === 0}
    <div class="state-msg"><p>{$t('transfers.no_transfers')}</p></div>
  {:else}
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>{$t('transfers.col_date')}</th><th>{$t('transfers.col_name')}</th><th class="text-right">{$t('transfers.col_amount')}</th><th>{$t('transfers.col_route')}</th><th></th></tr></thead>
        <tbody>
          {#each transfers as tf (tf.id)}
            <tr>
              <td class="col-date">{formatDateShort(tf.date)}</td>
              <td class="col-name">{tf.name}</td>
              <td class="text-right amount">{formatCurrency(tf.amount)}</td>
              <td class="col-route">{getAccountName(tf.sourceAccountId)} → {getAccountName(tf.destinationAccountId)}</td>
              <td class="col-actions"><button class="btn-action" onclick={() => openEditForm(tf)} title={$t('transfers.edit_tooltip')}>✎</button><button class="btn-action danger" onclick={() => openDeleteModal(tf)} title={$t('transfers.delete_tooltip')}>✕</button></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<!-- Form Modal -->
{#if showFormModal}
  <div class="overlay"  role="dialog" aria-modal="true">
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div class="modal" onclick={(e) => e.stopPropagation()} role="document">
      <header class="modal-header"><h2>{isEditing ? $t('transfers.edit_title') : $t('transfers.new_title')}</h2><button class="close-btn" onclick={closeFormModal}>×</button></header>
      <form onsubmit={(e) => { e.preventDefault(); submitForm(); }}>
        {#if formErrors.general}<div class="form-alert">{formErrors.general}</div>{/if}
        <div class="field"><label for="tf-name">{$t('transfers.form_name')}</label><input id="tf-name" type="text" bind:value={formName} maxlength={100} class:invalid={!!formErrors.name} />{#if formErrors.name}<span class="field-err">{formErrors.name}</span>{/if}</div>
        <div class="field"><label for="tf-date">{$t('transfers.form_date')}</label><DatePicker bind:value={formDate} showTime={true} />{#if formErrors.date}<span class="field-err">{formErrors.date}</span>{/if}</div>
        <div class="field"><label for="tf-amount">{$t('transfers.form_amount')}</label><input id="tf-amount" type="number" step="0.01" bind:value={formAmount} class:invalid={!!formErrors.amount} />{#if formErrors.amount}<span class="field-err">{formErrors.amount}</span>{/if}</div>
        <div class="field-row">
          <div class="field"><label for="tf-src">{$t('transfers.form_source')}</label><select id="tf-src" bind:value={formSourceAccountId} class:invalid={!!formErrors.sourceAccountId}><option value="">—</option>{#each accounts as a}<option value={String(a.id)}>{a.name}</option>{/each}</select></div>
          <div class="field"><label for="tf-dst">{$t('transfers.form_destination')}</label><select id="tf-dst" bind:value={formDestinationAccountId} class:invalid={!!formErrors.destinationAccountId}><option value="">—</option>{#each accounts as a}<option value={String(a.id)}>{a.name}</option>{/each}</select>{#if formErrors.destinationAccountId}<span class="field-err">{formErrors.destinationAccountId}</span>{/if}</div>
        </div>
        <div class="form-buttons"><button type="button" class="btn-cancel" onclick={closeFormModal}>{$t('common.cancel')}</button><button type="submit" class="btn-submit" disabled={formSubmitting}>{formSubmitting ? $t('common.saving') : isEditing ? $t('common.update') : $t('common.create')}</button></div>
      </form>
    </div>
  </div>
{/if}

<!-- Delete Modal -->
{#if showDeleteModal && deletingTransfer}
  <div class="overlay"  role="dialog" aria-modal="true">
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div class="modal modal-sm" onclick={(e) => e.stopPropagation()} role="document">
      <header class="modal-header"><h2>{$t('transfers.delete_title')}</h2><button class="close-btn" onclick={closeDeleteModal}>×</button></header>
      <p class="confirm-text">{$t('transfers.delete_confirm', { name: deletingTransfer.name })}</p>
      <div class="form-buttons"><button class="btn-cancel" onclick={closeDeleteModal}>{$t('common.cancel')}</button><button class="btn-danger-solid" onclick={confirmDelete}>{$t('common.delete')}</button></div>
    </div>
  </div>
{/if}

<style>
  .page { width: 100%; margin: 0; }
  .page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 1.25rem; }
  .page-header h1 { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); }
  .page-subtitle { font-size: 0.8rem; color: var(--text-muted); margin-top: 0.15rem; }
  .btn-new { padding: 0.4rem 0.85rem; background: var(--accent-blue); color: #fff; border: none; border-radius: var(--radius-md); font-size: 0.78rem; font-weight: 500; cursor: pointer; }
  .alert-error { background: var(--tag-red-bg); color: var(--accent-red); padding: 0.35rem 0.6rem; border-radius: var(--radius-sm); font-size: 0.75rem; margin-bottom: 0.5rem; display: flex; align-items: center; justify-content: space-between; }
  .alert-error button { background: none; border: none; color: inherit; cursor: pointer; font-size: 1rem; }
  .state-msg { text-align: center; padding: 2rem; color: var(--text-secondary); font-size: 0.85rem; }
  .spinner { width: 18px; height: 18px; border: 2px solid var(--border-default); border-top-color: var(--accent-blue); border-radius: 50%; animation: spin 0.6s linear infinite; margin: 0 auto 0.5rem; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .table-wrap { overflow-x: auto; }
  .data-table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
  .data-table th { text-align: left; font-size: 0.65rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; padding: 0.4rem 0.5rem; border-bottom: 1px solid var(--border-default); }
  .data-table td { padding: 0.35rem 0.5rem; border-bottom: 1px solid var(--border-subtle); color: var(--text-primary); }
  .data-table tr:hover td { background: var(--bg-surface); }
  .text-right { text-align: right; }
  .col-date { font-size: 0.7rem; color: var(--text-muted); white-space: nowrap; }
  .col-name { font-weight: 500; }
  .amount { color: var(--accent-blue); font-weight: 600; }
  .col-route { font-size: 0.75rem; color: var(--text-secondary); }
  .col-actions { white-space: nowrap; }
  .btn-action { background: none; border: none; font-size: 0.75rem; color: var(--text-muted); cursor: pointer; padding: 0.15rem 0.3rem; border-radius: var(--radius-sm); }
  .btn-action.danger:hover { color: var(--accent-red); background: var(--tag-red-bg); }

  .overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.6); display: flex; align-items: center; justify-content: center; padding: 1rem; z-index: 1000; }
  .modal { background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 1rem; width: 100%; max-width: 440px; max-height: 90vh; overflow-y: auto; }
  .modal-sm { max-width: 360px; }
  .modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; }
  .modal-header h2 { font-size: 1rem; font-weight: 600; color: var(--text-primary); margin: 0; }
  .close-btn { background: none; border: none; font-size: 1.25rem; color: var(--text-muted); cursor: pointer; }
  .form-alert { background: var(--tag-red-bg); color: var(--accent-red); padding: 0.35rem 0.6rem; border-radius: var(--radius-sm); font-size: 0.75rem; margin-bottom: 0.5rem; }
  .field { margin-bottom: 0.6rem; }
  .field label { display: block; font-size: 0.7rem; font-weight: 500; color: var(--text-secondary); margin-bottom: 0.15rem; }
  .field input.invalid, .field select.invalid { border-color: var(--accent-red); }
  .field-err { display: block; font-size: 0.6rem; color: var(--accent-red); margin-top: 0.1rem; }
  .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
  .form-buttons { display: flex; gap: 0.4rem; justify-content: flex-end; margin-top: 0.75rem; }
  .btn-cancel { padding: 0.3rem 0.6rem; background: var(--bg-elevated); color: var(--text-secondary); border: 1px solid var(--border-default); border-radius: var(--radius-sm); font-size: 0.75rem; cursor: pointer; }
  .btn-submit { padding: 0.3rem 0.6rem; background: var(--accent-blue); color: #fff; border: none; border-radius: var(--radius-sm); font-size: 0.75rem; font-weight: 500; cursor: pointer; }
  .btn-danger-solid { padding: 0.3rem 0.6rem; background: var(--accent-red); color: #fff; border: none; border-radius: var(--radius-sm); font-size: 0.75rem; font-weight: 500; cursor: pointer; }
  .confirm-text { font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.75rem; }

  @media (max-width: 640px) { .field-row { grid-template-columns: 1fr; } }
</style>
