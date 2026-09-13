<script lang="ts">
  import { onMount } from 'svelte';
  import {
    listLoans,
    createLoan,
    updateLoan,
    deleteLoan,
    recordPayment,
    getSchedule,
    getPayments,
    type Loan,
    type LoanPayment,
    type AmortizationRow,
    type CreateLoanPayload,
  } from '$lib/api/loans';
  import { ApiError } from '$lib/api/client';
  import { formatCurrency } from '$lib/utils/format';
  import DatePicker from '$lib/components/DatePicker.svelte';
  import { t } from '$lib/i18n';
  import { modalPanel, scrim } from '$lib/motion';

  // ─── State ───
  let loans = $state<Loan[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

  // Create/edit form
  let showForm = $state(false);
  let editing = $state<Loan | null>(null);
  let formError = $state('');
  let submitting = $state(false);
  let fName = $state('');
  let fPrincipal = $state('');
  let fRate = $state('');
  let fTerm = $state('');
  let fStart = $state('');

  // Payment modal
  let payTarget = $state<Loan | null>(null);
  let payError = $state('');
  let paySubmitting = $state(false);
  let pAmount = $state('');
  let pPrincipal = $state('');
  let pInterest = $state('');
  let pDate = $state('');

  // Schedule + payments modal
  let detailTarget = $state<Loan | null>(null);
  let schedule = $state<AmortizationRow[]>([]);
  let payments = $state<LoanPayment[]>([]);
  let detailLoading = $state(false);

  // Delete confirm
  let deleteTarget = $state<Loan | null>(null);
  let deleteSubmitting = $state(false);

  // ─── Load ───
  async function load() {
    loading = true;
    error = null;
    try {
      loans = await listLoans();
    } catch (e) {
      error = e instanceof ApiError ? e.message : $t('loans.error_loading');
    } finally {
      loading = false;
    }
  }
  onMount(load);

  function progress(loan: Loan): number {
    if (loan.principal <= 0) return 0;
    const paid = loan.principal - loan.remainingAmount;
    return Math.max(0, Math.min(100, (paid / loan.principal) * 100));
  }

  // ─── Create / edit ───
  function openCreate() {
    editing = null;
    fName = ''; fPrincipal = ''; fRate = ''; fTerm = '';
    fStart = new Date().toISOString().split('T')[0]!;
    formError = '';
    showForm = true;
  }
  function openEdit(loan: Loan) {
    editing = loan;
    fName = loan.name;
    fPrincipal = String(loan.principal);
    fRate = String(loan.interestRate);
    fTerm = String(loan.term);
    fStart = loan.startDate.split('T')[0]!;
    formError = '';
    showForm = true;
  }
  function closeForm() { showForm = false; editing = null; }

  async function submitForm(e: Event) {
    e.preventDefault();
    formError = '';
    const name = fName.trim();
    const principal = Number(fPrincipal);
    const interestRate = Number(fRate);
    const term = parseInt(fTerm, 10);
    if (!name || !Number.isFinite(principal) || principal <= 0 || !Number.isFinite(interestRate) || !Number.isInteger(term) || term <= 0 || !fStart) {
      formError = $t('common.error');
      return;
    }
    submitting = true;
    try {
      if (editing) {
        // Principal is fixed after creation; only editable fields are sent.
        await updateLoan(editing.id, { name, interestRate, term, startDate: fStart });
      } else {
        const payload: CreateLoanPayload = { name, principal, interestRate, term, startDate: fStart };
        await createLoan(payload);
      }
      closeForm();
      await load();
    } catch (err) {
      formError = err instanceof ApiError ? err.message : $t('common.error');
    } finally {
      submitting = false;
    }
  }

  // ─── Record payment ───
  function openPayment(loan: Loan) {
    payTarget = loan;
    pAmount = ''; pPrincipal = ''; pInterest = '';
    pDate = new Date().toISOString().split('T')[0]!;
    payError = '';
  }
  function closePayment() { payTarget = null; }

  // Keep total in sync as a convenience when principal/interest are entered.
  function syncTotal() {
    const p = Number(pPrincipal) || 0;
    const i = Number(pInterest) || 0;
    if (pPrincipal !== '' || pInterest !== '') pAmount = (Math.round((p + i) * 100) / 100).toString();
  }

  async function submitPayment(e: Event) {
    e.preventDefault();
    if (!payTarget) return;
    payError = '';
    const amount = Number(pAmount);
    const principal = Number(pPrincipal);
    const interest = Number(pInterest);
    if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(principal) || principal < 0 || !Number.isFinite(interest) || interest < 0 || !pDate) {
      payError = $t('common.error');
      return;
    }
    paySubmitting = true;
    try {
      await recordPayment(payTarget.id, { amount, principal, interest, date: pDate });
      closePayment();
      await load();
    } catch (err) {
      payError = err instanceof ApiError ? err.message : $t('common.error');
    } finally {
      paySubmitting = false;
    }
  }

  // ─── Schedule + payments detail ───
  async function openDetail(loan: Loan) {
    detailTarget = loan;
    detailLoading = true;
    schedule = [];
    payments = [];
    try {
      [schedule, payments] = await Promise.all([getSchedule(loan.id), getPayments(loan.id)]);
    } catch {
      /* leave empty on failure */
    } finally {
      detailLoading = false;
    }
  }
  function closeDetail() { detailTarget = null; }

  // ─── Delete ───
  async function confirmDelete() {
    if (!deleteTarget) return;
    deleteSubmitting = true;
    try {
      await deleteLoan(deleteTarget.id);
      deleteTarget = null;
      await load();
    } catch {
      /* keep dialog open */
    } finally {
      deleteSubmitting = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key !== 'Escape') return;
    if (deleteTarget) deleteTarget = null;
    else if (detailTarget) closeDetail();
    else if (payTarget) closePayment();
    else if (showForm) closeForm();
  }
</script>

<svelte:head><title>{$t('page_title.loans')} · HomeLedger</title></svelte:head>
<svelte:window onkeydown={handleKeydown} />

<div class="page">
  <header class="header">
    <div>
      <p class="eyebrow">{$t('loans.page_eyebrow')}</p>
      <h1>{$t('loans.page_title')}</h1>
      <p class="subtitle">{$t('loans.page_subtitle')}</p>
    </div>
    <button class="btn-new" onclick={openCreate}>{$t('loans.new')}</button>
  </header>

  {#if loading}
    <div class="state-msg">…</div>
  {:else if error}
    <div class="state-msg">{error}</div>
  {:else if loans.length === 0}
    <div class="state-msg">{$t('loans.empty')}</div>
  {:else}
    <div class="loans-grid">
      {#each loans as loan (loan.id)}
        <article class="loan-card" class:paid={loan.status === 'paid'}>
          <div class="loan-top">
            <div>
              <h2 class="loan-name">{loan.name}</h2>
              <span class="loan-meta">{$t('loans.rate')}: {loan.interestRate}% · {$t('loans.term_months', { n: loan.term })}</span>
            </div>
            <span class="status" class:active={loan.status === 'active'}>
              {loan.status === 'paid' ? $t('loans.status_paid') : $t('loans.status_active')}
            </span>
          </div>

          <div class="amounts">
            <div><span class="a-label">{$t('loans.remaining')}</span><span class="a-value">{formatCurrency(loan.remainingAmount)}</span></div>
            <div class="a-right"><span class="a-label">{$t('loans.principal')}</span><span class="a-value muted">{formatCurrency(loan.principal)}</span></div>
          </div>

          <div class="progress-track" aria-label={$t('loans.progress')}>
            <div class="progress-fill" style="width: {progress(loan)}%"></div>
          </div>

          <div class="loan-actions">
            {#if loan.status === 'active'}
              <button class="btn-sm primary" onclick={() => openPayment(loan)}>{$t('loans.record_payment')}</button>
            {/if}
            <button class="btn-sm" onclick={() => openDetail(loan)}>{$t('loans.view_schedule')}</button>
            <button class="btn-sm" onclick={() => openEdit(loan)} disabled={loan.status === 'paid'} aria-label={$t('common.edit')}>✎</button>
            <button class="btn-sm danger" onclick={() => (deleteTarget = loan)} aria-label={$t('common.delete')}>🗑</button>
          </div>
        </article>
      {/each}
    </div>
  {/if}
</div>

<!-- Create / edit modal -->
{#if showForm}
  <div class="overlay" role="presentation" onclick={closeForm} transition:scrim>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="modal" role="dialog" aria-modal="true" tabindex="-1" onclick={(e) => e.stopPropagation()} transition:modalPanel>
      <header class="modal-header">
        <h2>{editing ? $t('loans.edit_title') : $t('loans.new_title')}</h2>
        <button class="close-btn" onclick={closeForm} aria-label={$t('common.close')}>&times;</button>
      </header>
      <form class="modal-form" onsubmit={submitForm}>
        {#if formError}<p class="modal-error" role="alert">{formError}</p>{/if}
        <div class="field">
          <label for="l-name">{$t('loans.form_name')}</label>
          <input id="l-name" bind:value={fName} maxlength="100" />
        </div>
        <div class="form-row">
          <div class="field">
            <label for="l-principal">{$t('loans.form_principal')}</label>
            <input id="l-principal" type="number" step="0.01" min="0.01" bind:value={fPrincipal} disabled={!!editing} />
          </div>
          <div class="field">
            <label for="l-rate">{$t('loans.form_rate')}</label>
            <input id="l-rate" type="number" step="0.01" min="0" max="100" bind:value={fRate} />
          </div>
        </div>
        <div class="form-row">
          <div class="field">
            <label for="l-term">{$t('loans.form_term')}</label>
            <input id="l-term" type="number" step="1" min="1" bind:value={fTerm} />
          </div>
          <div class="field">
            <label for="l-start">{$t('loans.form_start')}</label>
            <DatePicker bind:value={fStart} />
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn-cancel" onclick={closeForm}>{$t('common.cancel')}</button>
          <button type="submit" class="btn-submit" disabled={submitting}>{$t('common.save')}</button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Record payment modal -->
{#if payTarget}
  <div class="overlay" role="presentation" onclick={closePayment} transition:scrim>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="modal modal-sm" role="dialog" aria-modal="true" tabindex="-1" onclick={(e) => e.stopPropagation()} transition:modalPanel>
      <header class="modal-header">
        <h2>{$t('loans.payment_title')}</h2>
        <button class="close-btn" onclick={closePayment} aria-label={$t('common.close')}>&times;</button>
      </header>
      <form class="modal-form" onsubmit={submitPayment}>
        {#if payError}<p class="modal-error" role="alert">{payError}</p>{/if}
        <div class="form-row">
          <div class="field">
            <label for="p-principal">{$t('loans.payment_principal')}</label>
            <input id="p-principal" type="number" step="0.01" min="0" bind:value={pPrincipal} oninput={syncTotal} />
          </div>
          <div class="field">
            <label for="p-interest">{$t('loans.payment_interest')}</label>
            <input id="p-interest" type="number" step="0.01" min="0" bind:value={pInterest} oninput={syncTotal} />
          </div>
        </div>
        <div class="form-row">
          <div class="field">
            <label for="p-amount">{$t('loans.payment_amount')}</label>
            <input id="p-amount" type="number" step="0.01" min="0.01" bind:value={pAmount} />
          </div>
          <div class="field">
            <label for="p-date">{$t('loans.payment_date')}</label>
            <DatePicker bind:value={pDate} />
          </div>
        </div>
        <span class="field-hint">{$t('loans.payment_hint')}</span>
        <div class="modal-actions">
          <button type="button" class="btn-cancel" onclick={closePayment}>{$t('common.cancel')}</button>
          <button type="submit" class="btn-submit" disabled={paySubmitting}>{$t('common.save')}</button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Schedule + payments detail modal -->
{#if detailTarget}
  <div class="overlay" role="presentation" onclick={closeDetail} transition:scrim>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="modal modal-wide" role="dialog" aria-modal="true" tabindex="-1" onclick={(e) => e.stopPropagation()} transition:modalPanel>
      <header class="modal-header">
        <h2>{detailTarget.name} — {$t('loans.schedule_title')}</h2>
        <button class="close-btn" onclick={closeDetail} aria-label={$t('common.close')}>&times;</button>
      </header>
      <div class="detail-body">
        {#if detailLoading}
          <div class="state-msg">…</div>
        {:else}
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th class="num">{$t('loans.sched_month')}</th>
                  <th class="num">{$t('loans.sched_payment')}</th>
                  <th class="num">{$t('loans.sched_principal')}</th>
                  <th class="num">{$t('loans.sched_interest')}</th>
                  <th class="num">{$t('loans.sched_balance')}</th>
                </tr>
              </thead>
              <tbody>
                {#each schedule as row (row.month)}
                  <tr>
                    <td class="num">{row.month}</td>
                    <td class="num">{formatCurrency(row.payment)}</td>
                    <td class="num">{formatCurrency(row.principal)}</td>
                    <td class="num">{formatCurrency(row.interest)}</td>
                    <td class="num">{formatCurrency(row.remainingBalance)}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>

          <h3 class="detail-subtitle">{$t('loans.payments_title')}</h3>
          {#if payments.length === 0}
            <p class="state-msg small">{$t('loans.payments_empty')}</p>
          {:else}
            <div class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>{$t('loans.payment_date')}</th>
                    <th class="num">{$t('loans.payment_amount')}</th>
                    <th class="num">{$t('loans.payment_principal')}</th>
                    <th class="num">{$t('loans.payment_interest')}</th>
                  </tr>
                </thead>
                <tbody>
                  {#each payments as p (p.id)}
                    <tr>
                      <td>{p.date.split('T')[0]}</td>
                      <td class="num">{formatCurrency(p.amount)}</td>
                      <td class="num">{formatCurrency(p.principal)}</td>
                      <td class="num">{formatCurrency(p.interest)}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/if}
        {/if}
      </div>
    </div>
  </div>
{/if}

<!-- Delete confirm -->
{#if deleteTarget}
  <div class="overlay" role="presentation" onclick={() => (deleteTarget = null)} transition:scrim>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="modal modal-sm" role="dialog" aria-modal="true" tabindex="-1" onclick={(e) => e.stopPropagation()} transition:modalPanel>
      <header class="modal-header">
        <h2>{$t('loans.delete_title')}</h2>
        <button class="close-btn" onclick={() => (deleteTarget = null)} aria-label={$t('common.close')}>&times;</button>
      </header>
      <div class="modal-form">
        <p class="confirm-text">{$t('loans.delete_confirm')}</p>
        <div class="modal-actions">
          <button class="btn-cancel" onclick={() => (deleteTarget = null)}>{$t('common.cancel')}</button>
          <button class="btn-danger-solid" onclick={confirmDelete} disabled={deleteSubmitting}>{$t('common.delete')}</button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .page { padding: 1.25rem 1.5rem; max-width: 1200px; margin: 0 auto; }
  .header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 1.25rem; }
  .eyebrow { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--accent-orange); font-weight: 600; }
  .header h1 { font-size: 1.5rem; font-weight: 700; letter-spacing: -0.01em; margin: 0.1rem 0; }
  .subtitle { font-size: 0.85rem; color: var(--text-secondary); max-width: 46ch; }

  .btn-new {
    padding: 0.45rem 0.9rem; font-size: 0.82rem; font-weight: 600; color: #fff; flex-shrink: 0;
    background: var(--accent-blue); border: none; border-radius: var(--radius-md); cursor: pointer;
    transition: background var(--transition-fast), transform var(--transition-fast);
  }
  .btn-new:hover { background: var(--color-primary-hover); }
  .btn-new:active { transform: scale(0.97); }

  .state-msg { text-align: center; padding: 3rem 1rem; color: var(--text-secondary); font-size: 0.9rem; }
  .state-msg.small { padding: 1rem; }

  .loans-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1rem; }
  .loan-card {
    background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg);
    padding: 1rem 1.1rem; display: flex; flex-direction: column; gap: 0.75rem;
  }
  .loan-card.paid { opacity: 0.7; }
  .loan-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 0.5rem; }
  .loan-name { font-size: 1rem; font-weight: 600; color: var(--text-primary); margin: 0; }
  .loan-meta { font-size: 0.72rem; color: var(--text-muted); }
  .status {
    font-size: 0.68rem; font-weight: 600; padding: 0.15rem 0.5rem; border-radius: var(--radius-full);
    background: var(--bg-elevated); color: var(--text-muted); white-space: nowrap;
  }
  .status.active { background: var(--color-success-subtle); color: var(--accent-green); }

  .amounts { display: flex; justify-content: space-between; align-items: flex-end; }
  .amounts > div { display: flex; flex-direction: column; gap: 0.1rem; }
  .a-right { text-align: right; }
  .a-label { font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.03em; color: var(--text-muted); }
  .a-value { font-size: 1.05rem; font-weight: 700; font-variant-numeric: tabular-nums; letter-spacing: -0.01em; }
  .a-value.muted { font-size: 0.85rem; font-weight: 500; color: var(--text-secondary); }

  .progress-track { height: 6px; background: var(--border-default); border-radius: var(--radius-full); overflow: hidden; }
  .progress-fill { height: 100%; background: var(--accent-green); border-radius: var(--radius-full); transition: width var(--transition-base); }

  .loan-actions { display: flex; gap: 0.4rem; flex-wrap: wrap; }
  .btn-sm {
    padding: 0.3rem 0.6rem; font-size: 0.75rem; font-weight: 500; color: var(--text-secondary);
    background: var(--bg-elevated); border: 1px solid var(--border-default); border-radius: var(--radius-sm); cursor: pointer;
    transition: background var(--transition-fast), color var(--transition-fast), transform var(--transition-fast);
  }
  .btn-sm:hover:not(:disabled) { background: var(--bg-hover); color: var(--text-primary); }
  .btn-sm:active:not(:disabled) { transform: scale(0.96); }
  .btn-sm.primary { background: var(--tag-blue-bg); color: var(--accent-blue); border-color: transparent; }
  .btn-sm.danger:hover:not(:disabled) { color: var(--accent-red); border-color: var(--accent-red); }

  .field-hint { font-size: 0.7rem; color: var(--text-muted); }

  .modal-wide { max-width: 640px; }
  .detail-body { padding: 1rem 1.25rem; max-height: 70vh; overflow-y: auto; }
  .detail-subtitle { font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; color: var(--text-muted); margin: 1rem 0 0.5rem; }
  .table-wrap { overflow-x: auto; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); }
  .data-table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
  .data-table th { text-align: left; padding: 0.5rem 0.7rem; font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.03em; color: var(--text-muted); font-weight: 600; border-bottom: 1px solid var(--border-subtle); }
  .data-table td { padding: 0.45rem 0.7rem; border-bottom: 1px solid var(--border-subtle); }
  .data-table tr:last-child td { border-bottom: none; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }

  @media (prefers-reduced-motion: reduce) {
    .btn-new, .btn-sm { transition: background var(--transition-fast), color var(--transition-fast); }
    .btn-new:active, .btn-sm:active { transform: none; }
    .progress-fill { transition: none; }
  }
</style>
