<script lang="ts">
  import { onMount } from 'svelte';
  import { apiGet, apiPost, apiPut, apiDelete, ApiError } from '$lib/api/client';
  import { formatCurrency, formatDateShort, toDatetimeLocal, nowDatetimeLocal } from '$lib/utils/format';
  import type { Transaction, Account, Category, PaginatedResult, TransactionType as TxType } from '@smart-finance/shared';
  import Dropdown from '$lib/components/Dropdown.svelte';
  import { t } from '$lib/i18n';

  // --- State ---
  let transactions = $state<Transaction[]>([]);
  let accounts = $state<Account[]>([]);
  let categories = $state<Category[]>([]);
  let loading = $state(true);
  let error = $state('');

  let currentPage = $state(1);
  let totalPages = $state(1);
  let total = $state(0);
  const pageSize = 20;

  // Filters
  let filterAccountId = $state('');
  let filterCategoryId = $state('');
  let filterType = $state('');
  let filterStartDate = $state('');
  let filterEndDate = $state('');
  let filtersExpanded = $state(false);

  // Dropdown options
  let accountOptions = $derived([{ value: '', label: 'Todas' }, ...accounts.map(a => ({ value: String(a.id), label: a.name }))]);
  let categoryOptions = $derived([{ value: '', label: 'Todas' }, ...categories.map(c => ({ value: String(c.id), label: c.name }))]);

  // View toggle
  let viewMode = $state<'gallery' | 'table'>('gallery');

  // Detail popup
  let selectedTransaction = $state<Transaction | null>(null);

  // Collapsible month groups
  let collapsedMonths = $state<Set<string>>(new Set());

  // Form modal
  let showFormModal = $state(false);
  let showDeleteModal = $state(false);
  let editingTransaction = $state<Transaction | null>(null);
  let deletingTransaction = $state<Transaction | null>(null);

  let formName = $state('');
  let formAccountId = $state('');
  let formCategoryId = $state('');
  let formAmount = $state('');
  let formType = $state<'Ingreso' | 'Gasto'>('Gasto');
  let formDate = $state('');
  let formErrors = $state<Record<string, string>>({});
  let formSubmitting = $state(false);

  let isEditing = $derived(editingTransaction !== null);

  // --- Month Grouping ---
  interface MonthGroup {
    key: string;
    label: string;
    total: number;
    transactions: Transaction[];
  }

  let monthGroups = $derived.by(() => {
    const groups = new Map<string, Transaction[]>();
    for (const tx of transactions) {
      const date = new Date(tx.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const arr = groups.get(key) ?? [];
      arr.push(tx);
      groups.set(key, arr);
    }

    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const result: MonthGroup[] = [];

    for (const [key, txs] of groups) {
      const [year, month] = key.split('-');
      const monthIdx = parseInt(month!, 10) - 1;
      const label = `${monthNames[monthIdx]} ${year}`;
      const totalGastos = txs
        .filter(t => t.type === 'Gasto')
        .reduce((sum, t) => sum + t.amount, 0);
      result.push({ key, label, total: totalGastos, transactions: txs });
    }

    result.sort((a, b) => b.key.localeCompare(a.key));
    return result;
  });

  // Split transactions by type
  let gastos = $derived(transactions.filter(t => t.type === 'Gasto'));
  let ingresos = $derived(transactions.filter(t => t.type === 'Ingreso'));
  let totalGastos = $derived(gastos.reduce((s, t) => s + Math.abs(t.amount), 0));
  let totalIngresos = $derived(ingresos.reduce((s, t) => s + t.amount, 0));

  // Group by month
  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  function groupByMonth(txs: Transaction[]): { key: string; label: string; total: number; transactions: Transaction[] }[] {
    const groups = new Map<string, Transaction[]>();
    for (const tx of txs) {
      const d = new Date(tx.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const arr = groups.get(key) ?? [];
      arr.push(tx);
      groups.set(key, arr);
    }
    return Array.from(groups.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, txs]) => {
        const [year, month] = key.split('-');
        const label = `${monthNames[parseInt(month!, 10) - 1]} ${year}`;
        const total = txs.reduce((s, t) => s + Math.abs(t.amount), 0);
        return { key, label, total, transactions: txs };
      });
  }

  let gastosByMonth = $derived(groupByMonth(gastos));
  let ingresosByMonth = $derived(groupByMonth(ingresos));

  // Current month key for auto-expand
  let currentMonthKey = $derived.by(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Expanded months (current month starts expanded)
  let expandedMonths = $state<Set<string>>(new Set());

  function isMonthExpanded(key: string): boolean {
    if (expandedMonths.has(key)) return true;
    // Auto-expand current month (key formats: 'g-YYYY-MM', 'i-YYYY-MM', 'gt-YYYY-MM', 'it-YYYY-MM')
    const monthPart = key.replace(/^[a-z]+-/, '');
    return monthPart === currentMonthKey && !collapsedMonths.has(key);
  }

  function toggleMonthExpand(key: string) {
    if (isMonthExpanded(key)) {
      expandedMonths.delete(key);
      expandedMonths = new Set(expandedMonths);
      collapsedMonths.add(key);
      collapsedMonths = new Set(collapsedMonths);
    } else {
      expandedMonths.add(key);
      expandedMonths = new Set(expandedMonths);
      collapsedMonths.delete(key);
      collapsedMonths = new Set(collapsedMonths);
    }
  }

  // --- API ---
  async function loadTransactions() {
    loading = true;
    error = '';
    try {
      const params: Record<string, string | number | undefined> = {
        page: currentPage, pageSize,
        accountId: filterAccountId || undefined,
        categoryId: filterCategoryId || undefined,
        type: filterType || undefined,
        startDate: filterStartDate || undefined,
        endDate: filterEndDate || undefined,
      };
      const result = await apiGet<PaginatedResult<Transaction>>('/transactions', params);
      transactions = result.items;
      totalPages = result.totalPages;
      total = result.total;
    } catch (e) {
      error = e instanceof ApiError ? e.message : $t('transactions.error_loading');
    } finally {
      loading = false;
    }
  }

  async function loadAccounts() { try { accounts = await apiGet<Account[]>('/accounts'); } catch { } }
  async function loadCategories() { try { categories = await apiGet<Category[]>('/categories'); } catch { } }

  function goToPage(page: number) { if (page >= 1 && page <= totalPages) { currentPage = page; loadTransactions(); } }
  function applyFilters() { currentPage = 1; loadTransactions(); }
  function clearFilters() { filterAccountId = ''; filterCategoryId = ''; filterType = ''; filterStartDate = ''; filterEndDate = ''; currentPage = 1; loadTransactions(); }

  // --- Detail Popup ---
  function openDetail(tx: Transaction) {
    selectedTransaction = tx;
  }

  function closePanel() {
    selectedTransaction = null;
  }

  function toggleMonth(key: string) {
    const next = new Set(collapsedMonths);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    collapsedMonths = next;
  }

  // --- Form ---
  function openCreateForm() {
    editingTransaction = null;
    formName = ''; formAccountId = accounts.length > 0 ? String(accounts[0].id) : '';
    formCategoryId = categories.length > 0 ? String(categories[0].id) : '';
    formAmount = ''; formType = 'Gasto'; formDate = nowDatetimeLocal(); formErrors = {};
    showFormModal = true;
  }

  function openEditForm(tx: Transaction) {
    editingTransaction = tx;
    formName = tx.name; formAccountId = String(tx.accountId); formCategoryId = String(tx.categoryId);
    formAmount = String(tx.amount); formType = tx.type as 'Ingreso' | 'Gasto'; formDate = toDatetimeLocal(tx.date);
    formErrors = {}; showFormModal = true;
  }

  function closeFormModal() { showFormModal = false; editingTransaction = null; formErrors = {}; }

  function validateForm(): boolean {
    const errors: Record<string, string> = {};
    if (!String(formName ?? '').trim()) errors.name = $t('common.required');
    if (!formAccountId) errors.accountId = $t('common.required');
    if (!formCategoryId) errors.categoryId = $t('common.required');
    const amount = parseFloat(String(formAmount ?? ''));
    if (!String(formAmount ?? '').trim() || isNaN(amount)) errors.amount = $t('common.required');
    else if (amount <= 0) errors.amount = $t('transactions.must_be_positive');
    if (!formDate) errors.date = $t('common.required');
    formErrors = errors;
    return Object.keys(errors).length === 0;
  }

  async function submitForm() {
    if (!validateForm()) return;
    formSubmitting = true;
    try {
      const payload = {
        name: String(formName ?? '').trim(),
        accountId: parseInt(formAccountId, 10),
        categoryId: parseInt(formCategoryId, 10),
        amount: parseFloat(parseFloat(String(formAmount ?? '')).toFixed(2)),
        type: formType,
        date: new Date(formDate).toISOString()
      };
      if (isEditing && editingTransaction) await apiPut<Transaction>(`/transactions/${editingTransaction.id}`, payload);
      else await apiPost<Transaction>('/transactions', payload);
      closeFormModal(); await loadTransactions();
    } catch (e) {
      if (e instanceof ApiError) {
        formErrors = e.details
          ? Object.fromEntries(Object.entries(e.details).map(([key, msgs]) => [key, msgs[0]]))
          : { general: e.message };
      } else formErrors = { general: $t('transactions.error_saving') };
    } finally { formSubmitting = false; }
  }

  function openDeleteModal(tx: Transaction) { deletingTransaction = tx; showDeleteModal = true; }
  function closeDeleteModal() { showDeleteModal = false; deletingTransaction = null; }
  async function confirmDelete() {
    if (!deletingTransaction) return;
    try {
      await apiDelete(`/transactions/${deletingTransaction.id}`);
      closeDeleteModal();
      if (selectedTransaction?.id === deletingTransaction.id) closePanel();
      await loadTransactions();
    } catch (e) { if (e instanceof ApiError) error = e.message; closeDeleteModal(); }
  }

  // --- Helpers ---
  function getAccountName(id: number): string { return accounts.find(a => a.id === id)?.name ?? '—'; }
  function getCategoryName(id: number): string { return categories.find(c => c.id === id)?.name ?? '—'; }

  function formatCardDate(dateStr: string): string {
    // Parse as local date parts to avoid UTC timezone shift
    const parts = dateStr.split('T')[0]!.split('-');
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    if (parts.length === 3) {
      const monthIdx = parseInt(parts[1]!, 10) - 1;
      return `${months[monthIdx]} ${parseInt(parts[2]!, 10)}, ${parts[0]}`;
    }
    const d = new Date(dateStr);
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }

  function handlePanelEditClick() {
    if (selectedTransaction) {
      openEditForm(selectedTransaction);
      closePanel();
    }
  }

  function handlePanelDeleteClick() {
    if (selectedTransaction) {
      openDeleteModal(selectedTransaction);
      closePanel();
    }
  }

  onMount(async () => { await Promise.all([loadAccounts(), loadCategories()]); await loadTransactions(); });
</script>

<svelte:head><title>{$t('transactions.title')} | HomeLedger</title></svelte:head>

<div class="page">
  <header class="page-header">
    <div>
      <h1>{$t('transactions.title')}</h1>
      <p class="page-subtitle">{$t('transactions.subtitle')}</p>
    </div>
    <div class="header-actions">
      <div class="view-toggle">
        <button class="toggle-btn" class:active={viewMode === 'table'} onclick={() => (viewMode = 'table')} title={$t('transactions.view_table')}>📋</button>
        <button class="toggle-btn" class:active={viewMode === 'gallery'} onclick={() => (viewMode = 'gallery')} title={$t('transactions.view_gallery')}>🃏</button>
      </div>
      <button class="btn-new" onclick={openCreateForm}>{$t('common.new')}</button>
    </div>
  </header>

  <!-- Filters - Always Visible -->
  <div class="filters-bar">
    <div class="filter-item">
      <span class="filter-label">{$t('transactions.filter_account')}</span>
      <Dropdown bind:value={filterAccountId} options={accountOptions} />
    </div>
    <div class="filter-item">
      <span class="filter-label">{$t('transactions.filter_category')}</span>
      <Dropdown bind:value={filterCategoryId} options={categoryOptions} />
    </div>
    <div class="filter-item">
      <span class="filter-label">{$t('transactions.filter_from')}</span>
      <input type="date" bind:value={filterStartDate} />
    </div>
    <div class="filter-item">
      <span class="filter-label">{$t('transactions.filter_to')}</span>
      <input type="date" bind:value={filterEndDate} />
    </div>
    <button class="btn-filter" onclick={applyFilters}>{$t('common.filter')}</button>
    {#if filterAccountId || filterCategoryId || filterStartDate || filterEndDate}
      <button class="btn-clear" onclick={clearFilters}>{$t('transactions.clear_filters')}</button>
    {/if}
  </div>

  {#if error}
    <div class="alert-error" role="alert"><span>{error}</span><button onclick={() => (error = '')}>×</button></div>
  {/if}

  {#if loading}
    <div class="state-msg"><div class="spinner"></div><span>{$t('common.loading')}</span></div>
  {:else if transactions.length === 0}
    <div class="state-msg"><p>{$t('transactions.no_results')}</p></div>
  {:else if viewMode === 'gallery'}
    <!-- Split View: Gastos | Ingresos grouped by month -->
    <div class="split-view">
      <!-- Gastos Column -->
      <div class="split-col">
        <div class="split-header expense">
          <h3>{$t('transactions.expenses')}</h3>
          <span class="split-total">-{formatCurrency(totalGastos)}</span>
        </div>
        {#each gastosByMonth as group (group.key)}
          <button class="month-toggle" onclick={() => toggleMonthExpand('g-' + group.key)} type="button">
            <span class="month-chevron">{isMonthExpanded('g-' + group.key) ? '▾' : '▸'}</span>
            <span class="month-label">{group.label}</span>
            <span class="month-total expense">{formatCurrency(group.total)}</span>
          </button>
          {#if isMonthExpanded('g-' + group.key)}
            <div class="split-grid">
              {#each group.transactions as tx (tx.id)}
                <button class="tx-card card-gasto" type="button" onclick={() => openDetail(tx)}>
                  <span class="card-name">{tx.name}</span>
                  <span class="card-amount amount-red">-{formatCurrency(tx.amount)}</span>
                  <span class="card-meta"><span class="meta-dot expense"></span> {getCategoryName(tx.categoryId)}</span>
                  <span class="card-meta"><span class="meta-dot account"></span> {getAccountName(tx.accountId)}</span>
                  <span class="card-date">{formatCardDate(tx.date)}</span>
                </button>
              {/each}
            </div>
          {/if}
        {:else}
          <p class="empty-text">{$t('transactions.no_expenses')}</p>
        {/each}
      </div>

      <!-- Ingresos Column -->
      <div class="split-col">
        <div class="split-header income">
          <h3>{$t('transactions.income')}</h3>
          <span class="split-total">+{formatCurrency(totalIngresos)}</span>
        </div>
        {#each ingresosByMonth as group (group.key)}
          <button class="month-toggle" onclick={() => toggleMonthExpand('i-' + group.key)} type="button">
            <span class="month-chevron">{isMonthExpanded('i-' + group.key) ? '▾' : '▸'}</span>
            <span class="month-label">{group.label}</span>
            <span class="month-total income">{formatCurrency(group.total)}</span>
          </button>
          {#if isMonthExpanded('i-' + group.key)}
            <div class="split-grid">
              {#each group.transactions as tx (tx.id)}
                <button class="tx-card card-ingreso" type="button" onclick={() => openDetail(tx)}>
                  <span class="card-name">{tx.name}</span>
                  <span class="card-amount amount-green">+{formatCurrency(tx.amount)}</span>
                  <span class="card-meta"><span class="meta-dot income"></span> {getCategoryName(tx.categoryId)}</span>
                  <span class="card-meta"><span class="meta-dot account"></span> {getAccountName(tx.accountId)}</span>
                  <span class="card-date">{formatCardDate(tx.date)}</span>
                </button>
              {/each}
            </div>
          {/if}
        {:else}
          <p class="empty-text">{$t('transactions.no_income')}</p>
        {/each}
      </div>
    </div>
  {:else}
    <!-- Table View — split by type with month groups -->
    <div class="split-view">
      <!-- Gastos Table -->
      <div class="split-col">
        <div class="split-header expense">
          <h3>Gastos</h3>
          <span class="split-total">-{formatCurrency(totalGastos)}</span>
        </div>
        {#each gastosByMonth as group (group.key)}
          <button class="month-toggle" onclick={() => toggleMonthExpand('gt-' + group.key)} type="button">
            <span class="month-chevron">{isMonthExpanded('gt-' + group.key) ? '▾' : '▸'}</span>
            <span class="month-label">{group.label}</span>
            <span class="month-total expense">{formatCurrency(group.total)}</span>
          </button>
          {#if isMonthExpanded('gt-' + group.key)}
            <table class="data-table">
              <thead><tr><th>{$t('transactions.col_date')}</th><th>{$t('transactions.col_name')}</th><th>{$t('transactions.col_category')}</th><th class="text-right">{$t('transactions.col_amount')}</th><th>{$t('transactions.col_account')}</th><th></th></tr></thead>
              <tbody>
                {#each group.transactions as tx (tx.id)}
                  <tr onclick={() => openDetail(tx)} class="clickable-row">
                    <td class="col-date">{formatDateShort(tx.date)}</td>
                    <td class="col-name">{tx.name}</td>
                    <td><span class="tag tag-blue">{getCategoryName(tx.categoryId)}</span></td>
                    <td class="text-right expense">-{formatCurrency(tx.amount)}</td>
                    <td class="col-account">{getAccountName(tx.accountId)}</td>
                    <td class="col-actions">
                      <button class="btn-action" onclick={(e) => { e.stopPropagation(); openEditForm(tx); }}>✎</button>
                      <button class="btn-action danger" onclick={(e) => { e.stopPropagation(); openDeleteModal(tx); }}>✕</button>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          {/if}
        {:else}
          <p class="empty-text">No hay gastos</p>
        {/each}
      </div>

      <!-- Ingresos Table -->
      <div class="split-col">
        <div class="split-header income">
          <h3>Ingresos</h3>
          <span class="split-total">+{formatCurrency(totalIngresos)}</span>
        </div>
        {#each ingresosByMonth as group (group.key)}
          <button class="month-toggle" onclick={() => toggleMonthExpand('it-' + group.key)} type="button">
            <span class="month-chevron">{isMonthExpanded('it-' + group.key) ? '▾' : '▸'}</span>
            <span class="month-label">{group.label}</span>
            <span class="month-total income">{formatCurrency(group.total)}</span>
          </button>
          {#if isMonthExpanded('it-' + group.key)}
            <table class="data-table">
              <thead><tr><th>Fecha</th><th>Nombre</th><th>Categoría</th><th class="text-right">Monto</th><th>Cuenta</th><th></th></tr></thead>
              <tbody>
                {#each group.transactions as tx (tx.id)}
                  <tr onclick={() => openDetail(tx)} class="clickable-row">
                    <td class="col-date">{formatDateShort(tx.date)}</td>
                    <td class="col-name">{tx.name}</td>
                    <td><span class="tag tag-blue">{getCategoryName(tx.categoryId)}</span></td>
                    <td class="text-right income">+{formatCurrency(tx.amount)}</td>
                    <td class="col-account">{getAccountName(tx.accountId)}</td>
                    <td class="col-actions">
                      <button class="btn-action" onclick={(e) => { e.stopPropagation(); openEditForm(tx); }}>✎</button>
                      <button class="btn-action danger" onclick={(e) => { e.stopPropagation(); openDeleteModal(tx); }}>✕</button>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          {/if}
        {:else}
          <p class="empty-text">No hay ingresos</p>
        {/each}
      </div>
    </div>
  {/if}

  {#if totalPages > 1}
    <nav class="pagination">
      <button class="btn-page" disabled={currentPage <= 1} onclick={() => goToPage(currentPage - 1)}>{$t('transactions.prev_page')}</button>
      <span class="page-info">{$t('common.page_info', { current: currentPage, total: totalPages, count: total })}</span>
      <button class="btn-page" disabled={currentPage >= totalPages} onclick={() => goToPage(currentPage + 1)}>{$t('transactions.next_page')}</button>
    </nav>
  {/if}
</div>

<!-- Detail Popup Modal -->
{#if selectedTransaction}
  <div class="overlay" role="dialog" aria-modal="true" onclick={closePanel}>
    <div class="modal modal-detail" onclick={(e) => e.stopPropagation()} role="document">
      <header class="modal-header">
        <h2>{selectedTransaction.name}</h2>
        <button class="close-btn" onclick={closePanel}>×</button>
      </header>
      <div class="detail-body">
        <div class="detail-amount" class:amount-red={selectedTransaction.type === 'Gasto'} class:amount-green={selectedTransaction.type === 'Ingreso'}>
          {selectedTransaction.type === 'Ingreso' ? '+' : '-'}{formatCurrency(selectedTransaction.amount)}
        </div>
        <div class="detail-props">
          <div class="detail-prop">
            <span class="prop-label">{$t('common.date')}</span>
            <span class="prop-value">{formatCardDate(selectedTransaction.date)}</span>
          </div>
          <div class="detail-prop">
            <span class="prop-label">{$t('common.type')}</span>
            <span class="prop-value"><span class="tag {selectedTransaction.type === 'Ingreso' ? 'tag-green' : 'tag-red'}">{selectedTransaction.type}</span></span>
          </div>
          <div class="detail-prop">
            <span class="prop-label">{$t('common.category')}</span>
            <span class="prop-value">{getCategoryName(selectedTransaction.categoryId)}</span>
          </div>
          <div class="detail-prop">
            <span class="prop-label">{$t('common.account')}</span>
            <span class="prop-value">{getAccountName(selectedTransaction.accountId)}</span>
          </div>
        </div>
      </div>
      <footer class="modal-footer-actions">
        <button class="btn-edit" onclick={handlePanelEditClick}>✎ {$t('common.edit')}</button>
        <button class="btn-delete" onclick={handlePanelDeleteClick}>✕ {$t('common.delete')}</button>
      </footer>
    </div>
  </div>
{/if}

<!-- Form Modal -->
{#if showFormModal}
  <div class="overlay" role="dialog" aria-modal="true">
    <div class="modal" onclick={(e) => e.stopPropagation()} role="document">
      <header class="modal-header">
        <h2>{isEditing ? $t('transactions.edit_transaction') : $t('transactions.new_transaction')}</h2>
        <button class="close-btn" onclick={closeFormModal}>×</button>
      </header>
      <form onsubmit={(e) => { e.preventDefault(); submitForm(); }}>
        {#if formErrors.general}<div class="form-alert">{formErrors.general}</div>{/if}
        <div class="field">
          <label for="fm-name">{$t('transactions.form_name')}</label>
          <input id="fm-name" type="text" bind:value={formName} maxlength={100} class:invalid={!!formErrors.name} />
          {#if formErrors.name}<span class="field-err">{formErrors.name}</span>{/if}
        </div>
        <div class="field-row">
          <div class="field">
            <label for="fm-account">{$t('transactions.form_account')}</label>
            <select id="fm-account" bind:value={formAccountId} class:invalid={!!formErrors.accountId}>
              <option value="">—</option>{#each accounts as a}<option value={String(a.id)}>{a.name}</option>{/each}
            </select>
          </div>
          <div class="field">
            <label for="fm-cat">{$t('transactions.form_category')}</label>
            <select id="fm-cat" bind:value={formCategoryId} class:invalid={!!formErrors.categoryId}>
              <option value="">—</option>{#each categories as c}<option value={String(c.id)}>{c.name}</option>{/each}
            </select>
          </div>
        </div>
        <div class="field-row">
          <div class="field">
            <label for="fm-amount">{$t('transactions.form_amount')}</label>
            <input id="fm-amount" type="number" step="0.01" bind:value={formAmount} class:invalid={!!formErrors.amount} />
          </div>
          <div class="field">
            <label for="fm-type">{$t('transactions.form_type')}</label>
            <select id="fm-type" bind:value={formType}>
              <option value="Gasto">Gasto</option>
              <option value="Ingreso">Ingreso</option>
            </select>
          </div>
        </div>
        <div class="field">
          <label for="fm-date">{$t('transactions.form_date')}</label>
          <input id="fm-date" type="datetime-local" bind:value={formDate} class:invalid={!!formErrors.date} />
        </div>
        <div class="form-buttons">
          <button type="button" class="btn-cancel" onclick={closeFormModal}>{$t('common.cancel')}</button>
          <button type="submit" class="btn-submit" disabled={formSubmitting}>
            {formSubmitting ? $t('common.saving') : isEditing ? $t('common.update') : $t('common.create')}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Delete Modal -->
{#if showDeleteModal && deletingTransaction}
  <div class="overlay" role="dialog" aria-modal="true">
    <div class="modal modal-sm" onclick={(e) => e.stopPropagation()} role="document">
      <header class="modal-header">
        <h2>{$t('transactions.delete_title')}</h2>
        <button class="close-btn" onclick={closeDeleteModal}>×</button>
      </header>
      <p class="confirm-text">{$t('transactions.delete_confirm', { name: deletingTransaction.name })}</p>
      <div class="form-buttons">
        <button class="btn-cancel" onclick={closeDeleteModal}>{$t('common.cancel')}</button>
        <button class="btn-danger-solid" onclick={confirmDelete}>{$t('common.delete')}</button>
      </div>
    </div>
  </div>
{/if}

<style>
  /* --- Layout --- */
  .page { width: 100%; margin: 0; }
  .page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 1.25rem; }
  .page-header h1 { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); }
  .page-subtitle { font-size: 0.8rem; color: var(--text-muted); margin-top: 0.15rem; }
  .header-actions { display: flex; align-items: center; gap: 0.5rem; }
  .btn-new { padding: 0.3rem 0.6rem; background: var(--accent-blue); color: #fff; border: none; border-radius: var(--radius-sm); font-size: 0.75rem; font-weight: 500; cursor: pointer; }

  /* --- View Toggle --- */
  .view-toggle { display: flex; background: var(--bg-elevated); border: 1px solid var(--border-default); border-radius: var(--radius-sm); overflow: hidden; }
  .toggle-btn { padding: 0.25rem 0.5rem; background: none; border: none; font-size: 0.8rem; cursor: pointer; color: var(--text-muted); transition: background 0.15s, color 0.15s; }
  .toggle-btn.active { background: var(--bg-surface); color: var(--text-primary); }

  /* --- Filters --- */
  .filters-bar { display: flex; gap: 0.6rem; flex-wrap: wrap; align-items: flex-end; margin-bottom: 1rem; }
  .filter-item { display: flex; flex-direction: column; gap: 0.15rem; }
  .filter-label { font-size: 0.6rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.03em; }
  .filters-bar input[type="date"] { padding: 0.25rem 0.45rem; font-size: 0.72rem; background: var(--bg-elevated); color: var(--text-primary); border: 1px solid var(--border-default); border-radius: var(--radius-sm); }
  .btn-filter { padding: 0.3rem 0.7rem; background: var(--accent-blue); color: #fff; border: none; border-radius: var(--radius-sm); font-size: 0.75rem; font-weight: 500; cursor: pointer; align-self: flex-end; }
  .btn-filter:hover { opacity: 0.9; }
  .btn-clear { padding: 0.3rem 0.5rem; background: none; color: var(--accent-red); border: 1px solid var(--accent-red); border-radius: var(--radius-sm); font-size: 0.72rem; cursor: pointer; align-self: flex-end; }
  .btn-clear:hover { background: var(--tag-red-bg); }

  /* --- Alerts & States --- */
  .alert-error { background: var(--tag-red-bg); color: var(--accent-red); padding: 0.35rem 0.6rem; border-radius: var(--radius-sm); font-size: 0.75rem; margin-bottom: 0.5rem; display: flex; align-items: center; justify-content: space-between; }
  .alert-error button { background: none; border: none; color: inherit; cursor: pointer; font-size: 1rem; }
  .state-msg { text-align: center; padding: 2rem; color: var(--text-secondary); font-size: 0.85rem; }
  .spinner { width: 18px; height: 18px; border: 2px solid var(--border-default); border-top-color: var(--accent-blue); border-radius: 50%; animation: spin 0.6s linear infinite; margin: 0 auto 0.5rem; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* --- Split View --- */
  .split-view { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
  .split-col { display: flex; flex-direction: column; }
  .split-header { display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0.75rem; border-radius: var(--radius-md); margin-bottom: 0.75rem; }
  .split-header h3 { font-size: 0.9rem; font-weight: 600; color: var(--text-primary); margin: 0; }
  .split-header.expense { background: rgba(239, 68, 68, 0.06); border: 1px solid rgba(239, 68, 68, 0.15); }
  .split-header.income { background: rgba(34, 197, 94, 0.06); border: 1px solid rgba(34, 197, 94, 0.15); }
  .split-total { font-size: 0.9rem; font-weight: 700; }
  .split-header.expense .split-total { color: var(--accent-red); }
  .split-header.income .split-total { color: var(--accent-green); }

  /* Card Grid */
  .split-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr)); gap: 0.5rem; margin-bottom: 0.75rem; }

  .month-toggle { display: flex; align-items: center; gap: 0.5rem; width: 100%; background: none; border: none; padding: 0.4rem 0.5rem; cursor: pointer; border-bottom: 1px solid var(--border-subtle); margin-bottom: 0.5rem; }
  .month-toggle:hover { background: var(--bg-hover); border-radius: var(--radius-sm); }
  .month-chevron { font-size: 0.7rem; color: var(--text-muted); width: 0.8rem; }
  .month-label { font-size: 0.82rem; font-weight: 600; color: var(--text-primary); }
  .month-total { margin-left: auto; font-size: 0.78rem; font-weight: 600; }
  .month-total.expense { color: var(--accent-red); }
  .month-total.income { color: var(--accent-green); }

  .tx-card {
    display: flex; flex-direction: column; gap: 0.3rem;
    padding: 0.7rem 0.8rem; background: var(--bg-card); border: 1px solid var(--border-default);
    border-radius: var(--radius-md); cursor: pointer; text-align: left; transition: border-color 0.15s, background 0.15s;
  }
  .tx-card:hover { border-color: var(--accent-purple); background: var(--bg-elevated); }
  .tx-card.card-gasto { border-top: 2px solid var(--accent-red); }
  .tx-card.card-ingreso { border-top: 2px solid var(--accent-green); }

  .card-name { font-size: 0.82rem; font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .card-amount { font-size: 0.9rem; font-weight: 700; }
  .amount-red { color: var(--accent-red); }
  .amount-green { color: var(--accent-green); }
  .card-meta { font-size: 0.68rem; color: var(--text-secondary); display: flex; align-items: center; gap: 0.3rem; }
  .meta-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
  .meta-dot.expense { background: var(--accent-red); }
  .meta-dot.income { background: var(--accent-green); }
  .meta-dot.account { background: var(--accent-blue); }
  .card-date { font-size: 0.65rem; color: var(--text-muted); margin-top: 0.1rem; }

  /* --- Detail Popup --- */
  .modal-detail { max-width: 400px; }
  .detail-body { padding: 1rem; }
  .detail-amount { font-size: 1.4rem; font-weight: 700; text-align: center; margin-bottom: 1rem; }
  .detail-props { display: flex; flex-direction: column; gap: 0.5rem; }
  .detail-prop { display: flex; justify-content: space-between; align-items: center; padding: 0.3rem 0; border-bottom: 1px solid var(--border-subtle); }
  .detail-prop:last-child { border-bottom: none; }
  .prop-label { font-size: 0.75rem; color: var(--text-muted); }
  .prop-value { font-size: 0.8rem; font-weight: 500; color: var(--text-primary); }
  .modal-footer-actions { display: flex; gap: 0.5rem; padding: 0.75rem 1rem; border-top: 1px solid var(--border-subtle); }
  .btn-edit { flex: 1; padding: 0.4rem 0.6rem; background: var(--bg-elevated); color: var(--text-primary); border: 1px solid var(--border-default); border-radius: var(--radius-sm); font-size: 0.78rem; font-weight: 500; cursor: pointer; text-align: center; }
  .btn-edit:hover { background: var(--bg-hover); }
  .btn-delete { flex: 1; padding: 0.4rem 0.6rem; background: var(--tag-red-bg); color: var(--accent-red); border: 1px solid transparent; border-radius: var(--radius-sm); font-size: 0.78rem; font-weight: 500; cursor: pointer; text-align: center; }
  .btn-delete:hover { background: var(--accent-red); color: #fff; }

  /* --- Table View --- */
  .data-table { width: 100%; border-collapse: collapse; font-size: 0.8rem; margin-bottom: 0.75rem; }
  .data-table th { text-align: left; font-size: 0.65rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; padding: 0.4rem 0.5rem; border-bottom: 1px solid var(--border-default); }
  .data-table td { padding: 0.35rem 0.5rem; border-bottom: 1px solid var(--border-subtle); color: var(--text-primary); vertical-align: middle; }
  .data-table tr:hover td { background: var(--bg-elevated); }
  .clickable-row { cursor: pointer; }
  .text-right { text-align: right; }
  .col-date { font-size: 0.7rem; color: var(--text-muted); white-space: nowrap; }
  .col-name { font-weight: 500; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .col-account { font-size: 0.75rem; color: var(--text-secondary); }
  .col-actions { white-space: nowrap; }
  .income { color: var(--accent-green); font-weight: 600; }
  .expense { color: var(--accent-red); font-weight: 600; }

  .tag { padding: 0.1rem 0.3rem; border-radius: var(--radius-full); font-size: 0.6rem; font-weight: 600; white-space: nowrap; display: inline-block; }
  .tag-blue { background: var(--tag-blue-bg); color: var(--accent-blue); }
  .tag-green { background: var(--tag-green-bg); color: var(--accent-green); }
  .tag-red { background: var(--tag-red-bg); color: var(--accent-red); }

  .btn-action { background: none; border: none; font-size: 0.75rem; color: var(--text-muted); cursor: pointer; padding: 0.15rem 0.3rem; border-radius: var(--radius-sm); }
  .btn-action:hover { background: var(--bg-hover); color: var(--text-primary); }
  .btn-action.danger:hover { color: var(--accent-red); background: var(--tag-red-bg); }

  /* --- Pagination --- */
  .pagination { display: flex; align-items: center; justify-content: center; gap: 0.75rem; margin-top: 0.75rem; padding: 0.5rem 0; }
  .page-info { font-size: 0.75rem; color: var(--text-muted); }
  .btn-page { padding: 0.25rem 0.5rem; background: var(--bg-elevated); color: var(--text-secondary); border: 1px solid var(--border-default); border-radius: var(--radius-sm); font-size: 0.7rem; cursor: pointer; }
  .btn-page:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn-page:hover:not(:disabled) { background: var(--bg-hover); }

  /* --- Modals --- */
  .overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.6); display: flex; align-items: center; justify-content: center; padding: 1rem; z-index: 1000; }
  .modal { background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 1rem; width: 100%; max-width: 460px; max-height: 90vh; overflow-y: auto; }
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

  /* --- Responsive --- */
  @media (max-width: 768px) {
    .split-view { grid-template-columns: 1fr; }
    .filters-bar { flex-direction: column; align-items: stretch; }
    .split-grid { grid-template-columns: 1fr; }
    .field-row { grid-template-columns: 1fr; }
  }
</style>
