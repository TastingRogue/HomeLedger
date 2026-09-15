<script lang="ts">
  import { onMount } from 'svelte';
  import {
    listAccounts,
    getAccount,
    getCreditStatement,
    createAccount,
    updateAccount,
    deactivateAccount,
    type AccountData,
    type AccountDetail,
    type CreditStatement,
    type CreateAccountPayload,
    type AccountType,
  } from '$lib/api/accounts';
  import { getTransactions, type Transaction, type PaginatedTransactions } from '$lib/api/transactions';
  import { ApiError } from '$lib/api/client';
  import { formatCurrency } from '$lib/utils/format';
  import { t } from '$lib/i18n';
  import { modalPanel, scrim } from '$lib/motion';
  import Tooltip from '$lib/components/Tooltip.svelte';
  import { preferences, SUPPORTED_CURRENCIES } from '$lib/stores/preferences';

  // The instance/base currency (from the preferences store, seeded from /config).
  const baseCurrency = $derived($preferences.currency);

  let accounts: AccountData[] = $state([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

  let showForm = $state(false);
  let editingAccount: AccountData | null = $state(null);
  let formError = $state('');
  let formSubmitting = $state(false);

  let formName = $state('');
  let formInitialBalance = $state('');
  let formType: AccountType = $state('Débito');
  let formBank = $state('');
  let formBalanceLimit = $state('');
  let formCreditLimit = $state('');
  // ── P4.11 multi-currency ──
  let formCurrency = $state('');
  let formExchangeRate = $state('');
  // The exchange-rate field is only relevant when the account isn't in base currency.
  const formNeedsRate = $derived(formCurrency !== '' && formCurrency !== baseCurrency);
  // ── P4.2 credit-card statement fields ──
  let formStatementDay = $state('');
  let formPaymentDueDay = $state('');
  let formApr = $state('');
  let formMinimumPayment = $state('');

  let deactivateTarget: AccountData | null = $state(null);
  let deactivating = $state(false);

  let expandedCreditId: number | null = $state(null);
  let creditDetail: AccountDetail | null = $state(null);
  let creditDetailLoading = $state(false);
  // P4.2: statement summary shown in the account detail drawer for credit cards.
  let statement: CreditStatement | null = $state(null);
  let statementLoading = $state(false);

  // Account detail view
  let selectedAccount: AccountData | null = $state(null);
  let accountTransactions: Transaction[] = $state([]);
  let accountTxLoading = $state(false);
  let accountTxPage = $state(1);
  let accountTxTotal = $state(0);
  let accountTxTotalPages = $state(1);

  let validationErrors: Record<string, string> = $state({});

  const accountTypes: AccountType[] = ['Débito', 'Crédito', 'Inversión', 'Vales', 'Efectivo'];

  function getTypeBorderColor(type: string): string {
    const map: Record<string, string> = {
      'Débito': 'var(--accent-blue)',
      'Crédito': 'var(--accent-red)',
      'Inversión': 'var(--accent-green)',
      'Vales': 'var(--accent-yellow)',
      'Efectivo': 'var(--accent-purple)',
    };
    return map[type] ?? 'var(--border-default)';
  }

  function getTypeBadgeClass(type: string): string {
    const map: Record<string, string> = {
      'Débito': 'badge-blue',
      'Crédito': 'badge-red',
      'Inversión': 'badge-green',
      'Vales': 'badge-yellow',
      'Efectivo': 'badge-purple',
    };
    return map[type] ?? '';
  }

  function getHealthStatus(account: AccountData): 'ok' | 'low' | null {
    if (account.balanceLimit == null) return null;
    const balance = account.calculatedBalance ?? account.balance ?? account.initialBalance;
    return balance >= account.balanceLimit ? 'ok' : 'low';
  }

  function getUtilizationLevel(utilization: number): 'green' | 'yellow' | 'red' {
    if (utilization <= 30) return 'green';
    if (utilization <= 70) return 'yellow';
    return 'red';
  }

  function getUtilizationLabel(utilization: number): string {
    if (utilization <= 30) return $t('accounts.healthy');
    if (utilization <= 70) return $t('accounts.moderate');
    return $t('accounts.critical');
  }

  async function loadAccounts() {
    loading = true;
    error = null;
    try {
      accounts = await listAccounts();
    } catch (e: unknown) {
      error = e instanceof ApiError ? e.message : $t('accounts.error_loading');
    } finally {
      loading = false;
    }
  }

  async function loadCreditDetail(accountId: number) {
    if (expandedCreditId === accountId) {
      expandedCreditId = null;
      creditDetail = null;
      return;
    }
    expandedCreditId = accountId;
    creditDetailLoading = true;
    try {
      creditDetail = await getAccount(accountId);
    } catch {
      creditDetail = null;
    } finally {
      creditDetailLoading = false;
    }
  }

  async function openAccountDetail(account: AccountData) {
    selectedAccount = account;
    accountTxPage = 1;
    statement = null;
    // P4.2: load the statement summary for credit accounts.
    if (account.type === 'Crédito') {
      statementLoading = true;
      try { statement = await getCreditStatement(account.id); }
      catch { statement = null; }
      finally { statementLoading = false; }
    }
    await loadAccountTransactions();
  }

  function closeAccountDetail() {
    selectedAccount = null;
    accountTransactions = [];
    accountTxPage = 1;
    statement = null;
  }

  async function loadAccountTransactions() {
    if (!selectedAccount) return;
    accountTxLoading = true;
    try {
      const result = await getTransactions({ accountId: selectedAccount.id, page: accountTxPage, pageSize: 15 });
      accountTransactions = result.items;
      accountTxTotal = result.total;
      accountTxTotalPages = result.totalPages;
    } catch {
      accountTransactions = [];
    } finally {
      accountTxLoading = false;
    }
  }

  async function nextTxPage() {
    if (accountTxPage < accountTxTotalPages) {
      accountTxPage++;
      await loadAccountTransactions();
    }
  }

  async function prevTxPage() {
    if (accountTxPage > 1) {
      accountTxPage--;
      await loadAccountTransactions();
    }
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function openCreateForm() {
    editingAccount = null;
    formName = '';
    formInitialBalance = '';
    formType = 'Débito';
    formBank = '';
    formBalanceLimit = '';
    formCreditLimit = '';
    formStatementDay = ''; formPaymentDueDay = ''; formApr = ''; formMinimumPayment = '';
    formCurrency = baseCurrency;
    formExchangeRate = '';
    formError = '';
    validationErrors = {};
    showForm = true;
  }

  function openEditForm(account: AccountData) {
    editingAccount = account;
    formName = account.name;
    formInitialBalance = String(account.initialBalance);
    formType = account.type as AccountType;
    formBank = account.bank ?? '';
    formBalanceLimit = account.balanceLimit != null ? String(account.balanceLimit) : '';
    formCreditLimit = account.creditLimit != null ? String(account.creditLimit) : '';
    formStatementDay = account.statementDay != null ? String(account.statementDay) : '';
    formPaymentDueDay = account.paymentDueDay != null ? String(account.paymentDueDay) : '';
    formApr = account.apr != null ? String(account.apr) : '';
    formMinimumPayment = account.minimumPayment != null ? String(account.minimumPayment) : '';
    formCurrency = account.currency ?? baseCurrency;
    formExchangeRate = account.exchangeRate != null && account.exchangeRate !== 1 ? String(account.exchangeRate) : '';
    formError = '';
    validationErrors = {};
    showForm = true;
  }

  function closeForm() {
    showForm = false;
    editingAccount = null;
    formError = '';
    validationErrors = {};
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {};
    const name = String(formName ?? '').trim();
    const balance = String(formInitialBalance ?? '').trim();
    const credit = String(formCreditLimit ?? '').trim();

    if (!name) errors.name = $t('accounts.name_required');
    else if (name.length > 50) errors.name = $t('accounts.name_max');
    if (!balance) errors.initialBalance = $t('accounts.balance_required');
    else if (isNaN(Number(balance))) errors.initialBalance = $t('accounts.balance_numeric');
    if (formType === 'Crédito') {
      if (!credit) errors.creditLimit = $t('accounts.credit_required');
      else if (isNaN(Number(credit)) || Number(credit) <= 0) errors.creditLimit = $t('accounts.credit_positive');
    }
    if (formNeedsRate) {
      const rate = String(formExchangeRate ?? '').trim();
      if (!rate) errors.exchangeRate = $t('accounts.rate_required');
      else if (isNaN(Number(rate)) || Number(rate) <= 0) errors.exchangeRate = $t('accounts.rate_positive');
    }
    validationErrors = errors;
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit() {
    if (!validateForm()) return;
    formSubmitting = true;
    formError = '';
    const payload: CreateAccountPayload = {
      name: String(formName ?? '').trim(),
      initialBalance: Number(formInitialBalance),
      type: formType,
    };
    if (String(formBank ?? '').trim()) payload.bank = String(formBank).trim();
    // P4.11: currency + exchange rate (rate only when not base currency).
    if (formCurrency) payload.currency = formCurrency;
    if (formNeedsRate && String(formExchangeRate ?? '').trim() && !isNaN(Number(formExchangeRate))) {
      payload.exchangeRate = Number(formExchangeRate);
    } else if (!formNeedsRate) {
      payload.exchangeRate = 1;
    }
    if (String(formBalanceLimit ?? '').trim() && !isNaN(Number(formBalanceLimit))) payload.balanceLimit = Number(formBalanceLimit);
    if (formType === 'Crédito' && String(formCreditLimit ?? '').trim()) payload.creditLimit = Number(formCreditLimit);
    // P4.2 statement fields (credit-only). Empty → null so editing can clear them.
    if (formType === 'Crédito') {
      payload.statementDay = String(formStatementDay ?? '').trim() ? Number(formStatementDay) : null;
      payload.paymentDueDay = String(formPaymentDueDay ?? '').trim() ? Number(formPaymentDueDay) : null;
      payload.apr = String(formApr ?? '').trim() ? Number(formApr) : null;
      payload.minimumPayment = String(formMinimumPayment ?? '').trim() ? Number(formMinimumPayment) : null;
    }
    try {
      if (editingAccount) await updateAccount(editingAccount.id, payload);
      else await createAccount(payload);
      closeForm();
      await loadAccounts();
    } catch (e: unknown) {
      formError = e instanceof ApiError ? e.message : $t('accounts.error_saving');
    } finally {
      formSubmitting = false;
    }
  }

  function confirmDeactivate(account: AccountData) { deactivateTarget = account; }
  function cancelDeactivate() { deactivateTarget = null; }

  async function handleDeactivate() {
    if (!deactivateTarget) return;
    deactivating = true;
    try {
      await deactivateAccount(deactivateTarget.id);
      deactivateTarget = null;
      await loadAccounts();
    } catch (e) {
      error = e instanceof ApiError ? e.message : $t('common.error_deleting');
    } finally {
      deactivating = false;
    }
  }

  onMount(() => { loadAccounts(); });
</script>

<svelte:head>
  <title>{$t('accounts.title')} - HomeLedger</title>
</svelte:head>

<div class="page">
  <header class="page-header">
    <div class="page-header-left">
      <h1>{$t('accounts.title')}</h1>
      <p class="page-subtitle">{$t('accounts.subtitle')}</p>
    </div>
    <button class="btn-new" onclick={openCreateForm} title={$t('accounts.create_tooltip')}>{$t('accounts.add')}</button>
  </header>

  {#if loading}
    <div class="state-msg"><div class="spinner"></div><p>{$t('accounts.loading')}</p></div>
  {:else if error}
    <div class="state-msg error"><p>{error}</p><button class="btn-retry" onclick={loadAccounts}>{$t('common.retry')}</button></div>
  {:else if accounts.length === 0}
    <div class="state-msg"><p>{$t('accounts.no_accounts')}</p><button class="btn-new" onclick={openCreateForm}>{$t('accounts.create_first')}</button></div>
  {:else}
    <!-- Summary Cards -->
    {@const totalBalance = accounts.reduce((s, a) => s + (a.calculatedBalance ?? a.balance ?? a.initialBalance), 0)}
    {@const disponible = accounts.filter(a => a.type !== 'Crédito' && a.type !== 'Inversión').reduce((s, a) => s + (a.calculatedBalance ?? a.balance ?? a.initialBalance), 0)}
    {@const inversiones = accounts.filter(a => a.type === 'Inversión').reduce((s, a) => s + (a.calculatedBalance ?? a.balance ?? a.initialBalance), 0)}
    {@const deuda = accounts.filter(a => a.type === 'Crédito').reduce((s, a) => s + Math.abs(a.calculatedBalance ?? a.balance ?? a.initialBalance), 0)}

    <div class="summary-row">
      <div class="summary-card" title={$t('accounts.total_equity_tooltip')}>
        <span class="sc-label">{$t('accounts.total_equity')}</span>
        <span class="sc-value">{formatCurrency(totalBalance)}</span>
      </div>
      <div class="summary-card" title={$t('accounts.available_tooltip')}>
        <span class="sc-label">{$t('accounts.available')}</span>
        <span class="sc-value green">{formatCurrency(disponible)}</span>
      </div>
      <div class="summary-card" title={$t('accounts.investments_tooltip')}>
        <span class="sc-label">{$t('accounts.investments')}</span>
        <span class="sc-value blue">{formatCurrency(inversiones)}</span>
      </div>
      <div class="summary-card" title={$t('accounts.debt_tooltip')}>
        <span class="sc-label">{$t('accounts.total_debt')}</span>
        <span class="sc-value red">{formatCurrency(deuda)}</span>
      </div>
    </div>

    <div class="accounts-grid" role="list">
      {#each accounts as account (account.id)}
        {@const health = getHealthStatus(account)}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <article class="account-card" role="listitem" style="border-left-color: {getTypeBorderColor(account.type)}" onclick={() => openAccountDetail(account)}>
          <div class="card-top">
            <span class="card-name">{account.name}</span>
            <span class="type-badge {getTypeBadgeClass(account.type)}">{account.type}</span>
          </div>
          {#if account.bank}
            <span class="card-bank">{account.bank}</span>
          {/if}
          <span class="card-balance" class:negative={(account.calculatedBalance ?? account.balance ?? account.initialBalance) < 0}>
            {formatCurrency(account.calculatedBalance ?? account.balance ?? account.initialBalance)}
          </span>

          {#if health}
            <span class="health health-{health}">{health === 'ok' ? $t('accounts.health_ok') : $t('accounts.health_low')}</span>
          {/if}

          {#if account.type === 'Crédito' && account.creditLimit}
            <button class="credit-toggle" onclick={(e) => { e.stopPropagation(); loadCreditDetail(account.id); }} aria-expanded={expandedCreditId === account.id}>
              {expandedCreditId === account.id ? $t('accounts.hide') : $t('accounts.show_utilization')}
            </button>
            {#if expandedCreditId === account.id}
              {#if creditDetailLoading}
                <p class="credit-loading">{$t('common.loading')}</p>
              {:else if creditDetail}
                {@const util = creditDetail.creditUtilization ?? 0}
                {@const level = getUtilizationLevel(util)}
                <div class="credit-section">
                  <div class="util-row">
                    <span>Utilización</span>
                    <span class="util-pct util-{level}">{util.toFixed(1)}%</span>
                  </div>
                  <div class="util-bar" role="progressbar" aria-valuenow={util} aria-valuemin={0} aria-valuemax={100}>
                    <div class="util-fill util-{level}" style="width:{Math.min(util, 100)}%"></div>
                  </div>
                  <span class="util-label util-{level}">{getUtilizationLabel(util)}</span>
                </div>
              {/if}
            {/if}
          {/if}

          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div class="card-actions" onclick={(e) => e.stopPropagation()}>
            <button class="btn-action" onclick={() => openEditForm(account)} title={$t('accounts.edit_tooltip')}>{$t('common.edit')}</button>
            <button class="btn-action danger" onclick={() => confirmDeactivate(account)} title={$t('accounts.deactivate_tooltip')}>{$t('common.deactivate')}</button>
          </div>
        </article>
      {/each}
    </div>
  {/if}
</div>

<!-- Create / Edit Modal -->
{#if showForm}
  <div class="overlay" role="dialog" aria-modal="true" tabindex="-1"  onkeydown={(e) => { if (e.key === 'Escape') closeForm(); }} transition:scrim>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div class="modal" onclick={(e) => e.stopPropagation()} role="document" transition:modalPanel>
      <header class="modal-header">
        <h2>{editingAccount ? $t('accounts.edit_title') : $t('accounts.new_title')}</h2>
        <button class="close-btn" onclick={closeForm} aria-label={$t('common.close')}>×</button>
      </header>
      {#if formError}<div class="form-alert" role="alert">{formError}</div>{/if}
      <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} novalidate>
        <div class="field">
          <label for="f-name">{$t('accounts.form_name')}</label>
          <input id="f-name" type="text" bind:value={formName} maxlength={50} placeholder={$t('accounts.form_name_placeholder')} class:invalid={!!validationErrors.name} title={$t('accounts.name_tooltip')} />
          {#if validationErrors.name}<span class="field-err">{validationErrors.name}</span>{/if}
        </div>
        <div class="field">
          <label for="f-balance" class="field-label-row">{$t('accounts.form_balance')} <Tooltip text={$t('accounts.balance_tooltip')} label={$t('accounts.form_balance')} /></label>
          <input id="f-balance" type="number" step="0.01" bind:value={formInitialBalance} placeholder="0.00" class:invalid={!!validationErrors.initialBalance} />
          {#if validationErrors.initialBalance}<span class="field-err">{validationErrors.initialBalance}</span>{/if}
        </div>
        <div class="field">
          <label for="f-type" class="field-label-row">{$t('accounts.form_type')} <Tooltip text={$t('accounts.type_tooltip')} label={$t('accounts.form_type')} /></label>
          <select id="f-type" bind:value={formType}>
            {#each accountTypes as t}<option value={t}>{t}</option>{/each}
          </select>
        </div>
        <div class="field">
          <label for="f-bank">{formType === 'Efectivo' ? $t('accounts.form_location') : $t('accounts.form_bank')}</label>
          <input id="f-bank" type="text" bind:value={formBank} maxlength={50} placeholder={formType === 'Efectivo' ? $t('accounts.form_location_placeholder') : $t('accounts.form_bank_placeholder')} title={formType === 'Efectivo' ? $t('accounts.location_tooltip') : $t('accounts.bank_tooltip')} />
        </div>
        <!-- P4.11: per-account currency + exchange rate to base -->
        <div class="field">
          <label for="f-currency" class="field-label-row">{$t('accounts.form_currency')} <Tooltip text={$t('accounts.currency_tooltip')} label={$t('accounts.form_currency')} /></label>
          <select id="f-currency" bind:value={formCurrency}>
            {#each SUPPORTED_CURRENCIES as c}<option value={c}>{c}{c === baseCurrency ? ` (${$t('accounts.currency_base')})` : ''}</option>{/each}
          </select>
        </div>
        {#if formNeedsRate}
          <div class="field">
            <label for="f-rate" class="field-label-row">{$t('accounts.form_exchange_rate', { currency: formCurrency, base: baseCurrency })} <Tooltip text={$t('accounts.exchange_rate_tooltip')} label={$t('accounts.form_exchange_rate_label')} /></label>
            <input id="f-rate" type="number" step="0.000001" bind:value={formExchangeRate} placeholder={$t('accounts.form_exchange_rate_placeholder')} class:invalid={!!validationErrors.exchangeRate} />
            {#if validationErrors.exchangeRate}<span class="field-error">{validationErrors.exchangeRate}</span>{/if}
          </div>
        {/if}
        <div class="field">
          <label for="f-limit" class="field-label-row">{$t('accounts.form_balance_limit')} <Tooltip text={$t('accounts.balance_limit_tooltip')} label={$t('accounts.form_balance_limit')} /></label>
          <input id="f-limit" type="number" step="0.01" bind:value={formBalanceLimit} placeholder={$t('accounts.form_balance_limit_placeholder')} />
        </div>
        {#if formType === 'Crédito'}
          <div class="field">
            <label for="f-credit" class="field-label-row">{$t('accounts.form_credit_limit')} <Tooltip text={$t('accounts.credit_limit_tooltip')} label={$t('accounts.form_credit_limit')} /></label>
            <input id="f-credit" type="number" step="0.01" bind:value={formCreditLimit} placeholder={$t('accounts.form_credit_limit_placeholder')} class:invalid={!!validationErrors.creditLimit} />
            {#if validationErrors.creditLimit}<span class="field-err">{validationErrors.creditLimit}</span>{/if}
          </div>
          <!-- P4.2 statement fields (all optional) -->
          <div class="field-row-2">
            <div class="field">
              <label for="f-stmt-day" class="field-label-row">{$t('accounts.form_statement_day')} <Tooltip text={$t('accounts.statement_day_tooltip')} label={$t('accounts.form_statement_day')} /></label>
              <input id="f-stmt-day" type="number" min="1" max="31" step="1" bind:value={formStatementDay} placeholder="1–31" />
            </div>
            <div class="field">
              <label for="f-due-day" class="field-label-row">{$t('accounts.form_payment_due_day')} <Tooltip text={$t('accounts.payment_due_day_tooltip')} label={$t('accounts.form_payment_due_day')} /></label>
              <input id="f-due-day" type="number" min="1" max="31" step="1" bind:value={formPaymentDueDay} placeholder="1–31" />
            </div>
          </div>
          <div class="field-row-2">
            <div class="field">
              <label for="f-apr" class="field-label-row">{$t('accounts.form_apr')} <Tooltip text={$t('accounts.apr_tooltip')} label={$t('accounts.form_apr')} /></label>
              <input id="f-apr" type="number" min="0" step="0.01" bind:value={formApr} placeholder="%" />
            </div>
            <div class="field">
              <label for="f-minpay" class="field-label-row">{$t('accounts.form_minimum_payment')} <Tooltip text={$t('accounts.minimum_payment_tooltip')} label={$t('accounts.form_minimum_payment')} /></label>
              <input id="f-minpay" type="number" min="0" step="0.01" bind:value={formMinimumPayment} placeholder="0.00" />
            </div>
          </div>
        {/if}
        <div class="form-buttons">
          <button type="button" class="btn-cancel" onclick={closeForm} disabled={formSubmitting}>{$t('common.cancel')}</button>
          <button type="submit" class="btn-submit" disabled={formSubmitting}>
            {formSubmitting ? $t('common.saving') : editingAccount ? $t('common.save') : $t('common.create')}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Deactivate Confirmation -->
{#if deactivateTarget}
  <div class="overlay" role="dialog" aria-modal="true" tabindex="-1"  onkeydown={(e) => { if (e.key === 'Escape') cancelDeactivate(); }} transition:scrim>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div class="modal modal-sm" onclick={(e) => e.stopPropagation()} role="document" transition:modalPanel>
      <header class="modal-header">
        <h2>{$t('accounts.deactivate_title')}</h2>
        <button class="close-btn" onclick={cancelDeactivate} aria-label={$t('common.close')}>×</button>
      </header>
      <p class="confirm-text">{$t('accounts.deactivate_confirm', { name: deactivateTarget.name })}</p>
      <div class="form-buttons">
        <button class="btn-cancel" onclick={cancelDeactivate} disabled={deactivating}>{$t('common.cancel')}</button>
        <button class="btn-danger-solid" onclick={handleDeactivate} disabled={deactivating}>
          {deactivating ? $t('accounts.deactivating') : $t('common.deactivate')}
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Account Detail Modal -->
{#if selectedAccount}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="overlay" role="dialog" aria-modal="true" onclick={closeAccountDetail} onkeydown={(e) => { if (e.key === 'Escape') closeAccountDetail(); }} tabindex="-1" transition:scrim>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div class="modal modal-detail" onclick={(e) => e.stopPropagation()} role="document" transition:modalPanel>
      <header class="modal-header">
        <div class="detail-header-info">
          <h2>{selectedAccount.name}</h2>
          <div class="detail-meta">
            <span class="type-badge {getTypeBadgeClass(selectedAccount.type)}">{selectedAccount.type}</span>
            {#if selectedAccount.bank}<span class="detail-bank">{selectedAccount.bank}</span>{/if}
          </div>
        </div>
        <button class="close-btn" onclick={closeAccountDetail} aria-label={$t('common.close')}>×</button>
      </header>

      <div class="detail-balance-row">
        <div class="detail-balance">
          <span class="db-label">{$t('accounts.current_balance')}</span>
          <span class="db-value" class:negative={(selectedAccount.calculatedBalance ?? selectedAccount.balance ?? selectedAccount.initialBalance) < 0}>
            {formatCurrency(selectedAccount.calculatedBalance ?? selectedAccount.balance ?? selectedAccount.initialBalance)}
          </span>
        </div>
        {#if selectedAccount.type === 'Crédito'}
          {#if statementLoading}
            <p class="credit-loading">{$t('common.loading')}</p>
          {:else if statement}
            {@const util = statement.utilization ?? 0}
            {#if statement.creditLimit != null}
              <div class="detail-balance">
                <span class="db-label">{$t('accounts.credit_limit_label')}</span>
                <span class="db-value">{formatCurrency(statement.creditLimit)}</span>
              </div>
            {/if}
            <div class="detail-balance">
              <span class="db-label">{$t('accounts.amount_owed')}</span>
              <span class="db-value negative">{formatCurrency(statement.owed)}</span>
            </div>
            {#if statement.availableCredit != null}
              <div class="detail-balance">
                <span class="db-label">{$t('accounts.available_credit')}</span>
                <span class="db-value">{formatCurrency(statement.availableCredit)}</span>
              </div>
            {/if}
            {#if statement.creditLimit != null}
              <div class="detail-balance">
                <span class="db-label">{$t('accounts.credit_utilization')}</span>
                <span class="db-value util-{getUtilizationLevel(util)}">{util.toFixed(1)}%</span>
              </div>
            {/if}
            {#if statement.nextStatementDate}
              <div class="detail-balance">
                <span class="db-label">{$t('accounts.next_statement')}</span>
                <span class="db-value">{formatDate(statement.nextStatementDate)}</span>
              </div>
            {/if}
            {#if statement.nextDueDate}
              <div class="detail-balance">
                <span class="db-label">{$t('accounts.next_due')}</span>
                <span class="db-value">{formatDate(statement.nextDueDate)}</span>
              </div>
            {/if}
            {#if statement.minimumPayment != null}
              <div class="detail-balance">
                <span class="db-label">{$t('accounts.minimum_payment_label')}</span>
                <span class="db-value">{formatCurrency(statement.minimumPayment)}</span>
              </div>
            {/if}
            {#if statement.apr != null}
              <div class="detail-balance">
                <span class="db-label">{$t('accounts.apr_label')}</span>
                <span class="db-value">{statement.apr}%</span>
              </div>
            {/if}
            {#if statement.payments.length > 0}
              <div class="payments-section">
                <h3 class="payments-title">{$t('accounts.payment_history')} <span class="tx-count">({statement.payments.length})</span></h3>
                <div class="tx-list">
                  {#each statement.payments as p (p.id)}
                    <div class="tx-row">
                      <div class="tx-left">
                        <span class="tx-indicator income"></span>
                        <div class="tx-info">
                          <span class="tx-name">{p.name}</span>
                          <span class="tx-meta">{formatDate(p.date)}</span>
                        </div>
                      </div>
                      <span class="tx-amount income">{formatCurrency(p.amount)}</span>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          {/if}
        {/if}
      </div>

      <div class="detail-transactions">
        <h3>{$t('accounts.recent_transactions')} <span class="tx-count">({accountTxTotal})</span></h3>
        {#if accountTxLoading}
          <div class="tx-loading"><div class="spinner"></div></div>
        {:else if accountTransactions.length === 0}
          <p class="tx-empty">{$t('accounts.no_transactions')}</p>
        {:else}
          <div class="tx-list">
            {#each accountTransactions as tx (tx.id)}
              <div class="tx-row">
                <div class="tx-left">
                  <span class="tx-indicator" class:income={tx.type === 'Ingreso'} class:expense={tx.type === 'Gasto'}></span>
                  <div class="tx-info">
                    <span class="tx-name">{tx.name || tx.merchant || $t('accounts.no_name')}</span>
                    <span class="tx-meta">{tx.categoryName ?? $t('accounts.no_category')} · {formatDate(tx.date)}</span>
                  </div>
                </div>
                <span class="tx-amount" class:income={tx.type === 'Ingreso'} class:expense={tx.type === 'Gasto'}>
                  {tx.type === 'Ingreso' ? '+' : '-'}{formatCurrency(Math.abs(tx.amount))}
                </span>
              </div>
            {/each}
          </div>
          {#if accountTxTotalPages > 1}
            <div class="tx-pagination">
              <button class="btn-page" onclick={prevTxPage} disabled={accountTxPage <= 1}>{$t('common.previous')}</button>
              <span class="page-info">{accountTxPage} / {accountTxTotalPages}</span>
              <button class="btn-page" onclick={nextTxPage} disabled={accountTxPage >= accountTxTotalPages}>{$t('common.next')}</button>
            </div>
          {/if}
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .page { width: 100%; margin: 0; }

  .page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 1.25rem; }
  .page-header h1 { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); }
  .page-subtitle { font-size: 0.8rem; color: var(--text-muted); margin-top: 0.15rem; }
  .page-header-left { display: flex; flex-direction: column; }

  .btn-new { padding: 0.4rem 0.85rem; background: var(--accent-blue); color: #fff; border: none; border-radius: var(--radius-md); font-size: 0.78rem; font-weight: 500; cursor: pointer; }
  .btn-new:hover { background: var(--color-primary-hover); }

  /* Summary */
  .summary-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.75rem; margin-bottom: 1.5rem; }
  .summary-card { background: var(--bg-card, #161e2a); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 1rem 1.25rem; display: flex; flex-direction: column; gap: 0.3rem; }
  .sc-label { font-size: 0.65rem; font-weight: 500; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
  .sc-value { font-size: 1.3rem; font-weight: 700; color: var(--text-primary); }
  .sc-value.green { color: var(--accent-green); }
  .sc-value.blue { color: var(--accent-blue); }
  .sc-value.red { color: var(--accent-red); }

  .state-msg { text-align: center; padding: 2rem; color: var(--text-secondary); font-size: 0.85rem; }
  .state-msg.error { color: var(--accent-red); }
  .state-msg button { margin-top: 0.5rem; }
  .btn-retry { padding: 0.3rem 0.6rem; background: var(--bg-elevated); color: var(--text-secondary); border: 1px solid var(--border-default); border-radius: var(--radius-sm); font-size: 0.75rem; cursor: pointer; }
  .spinner { width: 18px; height: 18px; border: 2px solid var(--border-default); border-top-color: var(--accent-blue); border-radius: 50%; animation: spin 0.6s linear infinite; margin: 0 auto 0.5rem; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Equal-height rows so every card matches, regardless of variable content
     (bank name, health badge, credit toggle). The actions row is then pinned to
     the bottom of each card (margin-top:auto) so Edit/Deactivate always line up
     across the grid (apple-design §16: spatial consistency). */
  .accounts-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 0.75rem; grid-auto-rows: 1fr; }

  .account-card {
    background: var(--bg-card, #161e2a);
    border: 1px solid var(--border-default);
    border-left: 3px solid var(--accent-blue);
    border-radius: var(--radius-lg);
    padding: 0.85rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    transition: border-color 0.15s;
  }
  .account-card:hover { border-color: var(--text-muted); }

  .card-top { display: flex; align-items: center; justify-content: space-between; gap: 0.3rem; }
  .card-name { font-size: 0.85rem; font-weight: 600; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .card-bank { font-size: 0.7rem; color: var(--text-muted); }
  .card-balance { font-size: 1rem; font-weight: 700; color: var(--text-primary); }
  .card-balance.negative { color: var(--accent-red); }

  .type-badge { padding: 0.1rem 0.35rem; border-radius: var(--radius-full); font-size: 0.6rem; font-weight: 600; white-space: nowrap; }
  .badge-blue { background: var(--tag-blue-bg); color: var(--accent-blue); }
  .badge-red { background: var(--tag-red-bg); color: var(--accent-red); }
  .badge-green { background: var(--tag-green-bg); color: var(--accent-green); }
  .badge-yellow { background: var(--tag-yellow-bg); color: var(--accent-yellow); }
  .badge-purple { background: var(--tag-purple-bg); color: var(--accent-purple); }

  .health { font-size: 0.65rem; font-weight: 500; }
  .health-ok { color: var(--accent-green); }
  .health-low { color: var(--accent-red); }

  .credit-toggle { background: none; color: var(--accent-blue); font-size: 0.7rem; cursor: pointer; text-align: left; padding: 0.1rem 0; }
  .credit-loading { font-size: 0.7rem; color: var(--text-muted); }
  /* P4.2 statement form + payment history */
  .field-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
  .payments-section { margin-top: 0.75rem; border-top: 1px solid var(--border-default); padding-top: 0.6rem; }
  .payments-title { font-size: 0.8rem; font-weight: 600; color: var(--text-primary); margin-bottom: 0.4rem; }
  .credit-section { border-top: 1px solid var(--border-subtle); padding-top: 0.3rem; display: flex; flex-direction: column; gap: 0.2rem; margin-top: 0.2rem; }
  .util-row { display: flex; justify-content: space-between; font-size: 0.7rem; color: var(--text-secondary); }
  .util-pct { font-weight: 700; }
  .util-bar { height: 4px; background: var(--bg-elevated); border-radius: 2px; overflow: hidden; }
  .util-fill { height: 100%; border-radius: 2px; }
  .util-fill.util-green { background: var(--accent-green); }
  .util-fill.util-yellow { background: var(--accent-yellow); }
  .util-fill.util-red { background: var(--accent-red); }
  .util-label { font-size: 0.6rem; font-weight: 600; }
  .util-green { color: var(--accent-green); }
  .util-yellow { color: var(--accent-yellow); }
  .util-red { color: var(--accent-red); }

  .card-actions { display: flex; gap: 0.3rem; border-top: 1px solid var(--border-subtle); padding-top: 0.35rem; margin-top: auto; }
  .btn-action { background: none; border: none; font-size: 0.7rem; color: var(--text-secondary); cursor: pointer; padding: 0.15rem 0.3rem; border-radius: var(--radius-sm); }
  .btn-action:hover { background: var(--bg-hover); color: var(--text-primary); }
  .btn-action.danger { color: var(--accent-red); }
  .btn-action.danger:hover { background: var(--tag-red-bg); }

  /* Modal */
  .overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.6); display: flex; align-items: center; justify-content: center; padding: 1rem; z-index: 1000; backdrop-filter: blur(3px); }
  .modal { background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 1.25rem; width: 100%; max-width: 420px; max-height: 90vh; overflow-y: auto; box-shadow: var(--shadow-lg); }
  .modal-sm { max-width: 360px; }
  .modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
  .modal-header h2 { font-size: 1rem; font-weight: 600; color: var(--text-primary); margin: 0; }
  .close-btn { background: none; border: none; font-size: 1.25rem; color: var(--text-muted); cursor: pointer; }
  .close-btn:hover { color: var(--text-primary); }

  .form-alert { background: var(--tag-red-bg); color: var(--accent-red); padding: 0.4rem 0.6rem; border-radius: var(--radius-sm); font-size: 0.75rem; margin-bottom: 0.75rem; }
  .field { margin-bottom: 0.6rem; }
  .field label { display: block; margin-bottom: 0.2rem; font-size: 0.75rem; font-weight: 500; color: var(--text-secondary); }
  /* Label + inline help icon on one row. */
  .field label.field-label-row { display: flex; align-items: center; gap: 0.3rem; }
  .field input, .field select { width: 100%; }
  .field input.invalid { border-color: var(--accent-red); }
  .field-err { display: block; margin-top: 0.15rem; font-size: 0.65rem; color: var(--accent-red); }
  .form-buttons { display: flex; gap: 0.4rem; justify-content: flex-end; margin-top: 0.75rem; }
  .btn-cancel { padding: 0.3rem 0.6rem; background: var(--bg-elevated); color: var(--text-secondary); border: 1px solid var(--border-default); border-radius: var(--radius-sm); font-size: 0.75rem; cursor: pointer; }
  .btn-cancel:hover { background: var(--bg-hover); }
  .btn-submit { padding: 0.3rem 0.6rem; background: var(--accent-blue); color: #fff; border: none; border-radius: var(--radius-sm); font-size: 0.75rem; font-weight: 500; cursor: pointer; }
  .btn-submit:hover { background: var(--color-primary-hover); }
  .btn-danger-solid { padding: 0.3rem 0.6rem; background: var(--accent-red); color: #fff; border: none; border-radius: var(--radius-sm); font-size: 0.75rem; font-weight: 500; cursor: pointer; }
  .confirm-text { font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.75rem; }

  /* Account Detail Modal */
  .modal-detail { max-width: 560px; }
  .detail-header-info { display: flex; flex-direction: column; gap: 0.3rem; }
  .detail-meta { display: flex; align-items: center; gap: 0.4rem; }
  .detail-bank { font-size: 0.7rem; color: var(--text-muted); }

  /* Wraps into rows and each cell auto-sizes, so a credit card with many
     statement fields (P4.2) no longer overflows the modal horizontally. */
  .detail-balance-row { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 0.75rem 1rem; padding: 0.75rem; background: var(--bg-elevated); border-radius: var(--radius-md); margin-bottom: 1rem; }
  .detail-balance { display: flex; flex-direction: column; gap: 0.1rem; min-width: 0; }
  .db-label { font-size: 0.6rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.03em; }
  .db-value { font-size: 1.05rem; font-weight: 700; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  /* Loading + payment history span the full width of the grid instead of
     becoming a narrow grid cell. */
  .credit-loading { grid-column: 1 / -1; }
  .payments-section { grid-column: 1 / -1; }
  .db-value.negative { color: var(--accent-red); }

  .detail-transactions h3 { font-size: 0.85rem; font-weight: 600; color: var(--text-primary); margin-bottom: 0.5rem; }
  .tx-count { font-weight: 400; color: var(--text-muted); font-size: 0.75rem; }
  .tx-loading { text-align: center; padding: 1.5rem; }
  .tx-empty { font-size: 0.78rem; color: var(--text-muted); text-align: center; padding: 1.5rem 0; }

  .tx-list { display: flex; flex-direction: column; gap: 0; max-height: 380px; overflow-y: auto; }
  .tx-row { display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0.4rem; border-bottom: 1px solid var(--border-subtle); }
  .tx-row:last-child { border-bottom: none; }
  .tx-left { display: flex; align-items: center; gap: 0.5rem; min-width: 0; flex: 1; }
  .tx-indicator { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
  .tx-indicator.income { background: var(--accent-green); }
  .tx-indicator.expense { background: var(--accent-red); }
  .tx-info { display: flex; flex-direction: column; min-width: 0; }
  .tx-name { font-size: 0.78rem; font-weight: 500; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .tx-meta { font-size: 0.65rem; color: var(--text-muted); }
  .tx-amount { font-size: 0.8rem; font-weight: 600; white-space: nowrap; margin-left: 0.5rem; }
  .tx-amount.income { color: var(--accent-green); }
  .tx-amount.expense { color: var(--accent-red); }

  .tx-pagination { display: flex; align-items: center; justify-content: center; gap: 0.75rem; margin-top: 0.75rem; padding-top: 0.5rem; border-top: 1px solid var(--border-default); }
  .btn-page { padding: 0.25rem 0.5rem; font-size: 0.7rem; background: var(--bg-elevated); border: 1px solid var(--border-default); border-radius: var(--radius-sm); color: var(--text-secondary); cursor: pointer; }
  .btn-page:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn-page:hover:not(:disabled) { background: var(--bg-hover); color: var(--text-primary); }
  .page-info { font-size: 0.7rem; color: var(--text-muted); }

  .account-card { cursor: pointer; }
</style>
