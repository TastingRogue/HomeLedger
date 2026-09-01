<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { apiGet, apiPost, ApiError } from '$lib/api/client';
  import { formatCurrency } from '$lib/utils/format';
  import { t } from '$lib/i18n';
  import type { Account, Category } from '@smart-finance/shared';

  // --- Constants ---
  const RECENT_ACCOUNTS_KEY = 'sf_recent_accounts';
  const RECENT_CATEGORIES_KEY = 'sf_recent_categories';
  const MAX_RECENT = 5;

  // --- State ---
  let accounts = $state<Account[]>([]);
  let categories = $state<Category[]>([]);
  let loading = $state(true);

  // Form state
  let amount = $state('');
  let transactionName = $state('');
  let selectedAccountId = $state<number | null>(null);
  let selectedCategoryId = $state<number | null>(null);
  let transactionType = $state<'Gasto' | 'Ingreso'>('Gasto');
  let submitting = $state(false);

  // Validation
  let errors = $state<Record<string, string>>({});

  // Toast
  let showToast = $state(false);
  let toastMessage = $state('');

  // Step tracking (for 3-step max flow)
  // Step 1: Enter amount
  // Step 2: Select account & category
  // Step 3: Confirm (type toggle + submit)
  let currentStep = $state(1);

  // --- Computed ---
  let sortedAccounts = $derived(sortByRecent(accounts, RECENT_ACCOUNTS_KEY));
  let sortedCategories = $derived(sortByRecent(categories, RECENT_CATEGORIES_KEY));
  let selectedAccountName = $derived(accounts.find(a => a.id === selectedAccountId)?.name ?? '');
  let selectedCategoryName = $derived(categories.find(c => c.id === selectedCategoryId)?.name ?? '');
  let parsedAmount = $derived(parseFloat(amount) || 0);
  let isAmountValid = $derived(parsedAmount > 0 && parsedAmount <= 999999999.99);
  let hasNoAccounts = $derived(!loading && accounts.length === 0);

  function goToCreateAccount() { goto('/cuentas'); }

  // --- Helper Functions ---
  function getRecentIds(key: string): number[] {
    try {
      const stored = localStorage.getItem(key);
      if (stored) return JSON.parse(stored);
    } catch { /* ignore */ }
    return [];
  }

  function saveRecentId(key: string, id: number): void {
    const recent = getRecentIds(key);
    const filtered = recent.filter(r => r !== id);
    filtered.unshift(id);
    localStorage.setItem(key, JSON.stringify(filtered.slice(0, MAX_RECENT)));
  }

  function sortByRecent<T extends { id: number; name: string }>(items: T[], key: string): T[] {
    const recentIds = getRecentIds(key);
    const recentItems: T[] = [];
    const otherItems: T[] = [];

    for (const item of items) {
      if (recentIds.includes(item.id)) {
        recentItems.push(item);
      } else {
        otherItems.push(item);
      }
    }

    // Sort recent items by their position in the recent list
    recentItems.sort((a, b) => recentIds.indexOf(a.id) - recentIds.indexOf(b.id));
    // Sort other items alphabetically
    otherItems.sort((a, b) => a.name.localeCompare(b.name));

    return [...recentItems, ...otherItems];
  }

  // --- Amount Input ---
  function appendDigit(digit: string) {
    if (digit === '.' && amount.includes('.')) return;
    if (digit === '.' && amount === '') {
      amount = '0.';
      return;
    }
    // Limit to 2 decimal places
    const parts = amount.split('.');
    if (parts[1] && parts[1].length >= 2) return;
    // Limit total length
    if (amount.length >= 12) return;
    amount += digit;
    errors = { ...errors, amount: '' };
  }

  function deleteDigit() {
    amount = amount.slice(0, -1);
  }

  function clearAmount() {
    amount = '';
  }

  // --- Navigation ---
  function goToStep2() {
    if (!isAmountValid) {
      errors = { ...errors, amount: 'Ingresa un monto válido mayor a $0' };
      return;
    }
    errors = {};
    currentStep = 2;
  }

  function goToStep3() {
    const newErrors: Record<string, string> = {};
    if (!selectedAccountId) {
      newErrors.account = 'Selecciona una cuenta';
    }
    if (!selectedCategoryId) {
      newErrors.category = 'Selecciona una categoría';
    }
    if (Object.keys(newErrors).length > 0) {
      errors = newErrors;
      return;
    }
    errors = {};
    currentStep = 3;
  }

  function goBack() {
    if (currentStep > 1) {
      currentStep -= 1;
      errors = {};
    } else {
      goto('/dashboard');
    }
  }

  // --- Submit ---
  async function submitTransaction() {
    if (submitting) return;

    // Final validation
    const newErrors: Record<string, string> = {};
    if (!isAmountValid) newErrors.amount = 'Monto inválido';
    if (!selectedAccountId) newErrors.account = 'Cuenta requerida';
    if (!selectedCategoryId) newErrors.category = 'Categoría requerida';

    if (Object.keys(newErrors).length > 0) {
      errors = newErrors;
      return;
    }

    submitting = true;
    try {
      const name = String(transactionName ?? '').trim();
      // Ensure amount always has exactly 2 decimal places
      const amountFixed = Math.round(parsedAmount * 100) / 100;
      
      if (name) {
        // Use regular transaction endpoint with custom name
        const payload = {
          name,
          amount: amountFixed,
          accountId: selectedAccountId!,
          categoryId: selectedCategoryId!,
          type: transactionType,
          date: new Date().toISOString(),
        };
        await apiPost('/transactions', payload);
      } else {
        // Use quick endpoint (auto-fills name from category)
        const payload = {
          amount: amountFixed,
          accountId: selectedAccountId!,
          categoryId: selectedCategoryId!,
          type: transactionType,
        };
        await apiPost('/transactions/quick', payload);
      }

      // Save recent selections
      saveRecentId(RECENT_ACCOUNTS_KEY, selectedAccountId!);
      saveRecentId(RECENT_CATEGORIES_KEY, selectedCategoryId!);

      // Show confirmation toast
      const displayName = String(transactionName ?? '').trim() || selectedCategoryName;
      toastMessage = `Transacción registrada: ${formatCurrency(parsedAmount)} - ${displayName}`;
      showToast = true;

      // Reset form
      amount = '';
      transactionName = '';
      selectedAccountId = null;
      selectedCategoryId = null;
      transactionType = 'Gasto';
      currentStep = 1;

      // Hide toast after 3 seconds
      setTimeout(() => {
        showToast = false;
      }, 3000);
    } catch (e) {
      if (e instanceof ApiError) {
        errors = { general: e.message };
      } else {
        errors = { general: 'Error al registrar la transacción' };
      }
    } finally {
      submitting = false;
    }
  }

  // --- Lifecycle ---
  onMount(async () => {
    try {
      const [accs, cats] = await Promise.all([
        apiGet<Account[]>('/accounts'),
        apiGet<Category[]>('/categories'),
      ]);
      accounts = accs;
      categories = cats;
    } catch {
      errors = { general: 'Error al cargar datos' };
    } finally {
      loading = false;
    }
  });
</script>

<svelte:head>
  <title>Registro Rápido | HomeLedger</title>
</svelte:head>

<div class="quick-register">
  <!-- Header -->
  <header class="qr-header">
    <button class="qr-back-btn" onclick={goBack} aria-label="Volver">←</button>
    <h1>Registro Rápido</h1>
    <div class="qr-steps">
      <span class="step-dot" class:active={currentStep >= 1}>1</span>
      <span class="step-line"></span>
      <span class="step-dot" class:active={currentStep >= 2}>2</span>
      <span class="step-line"></span>
      <span class="step-dot" class:active={currentStep >= 3}>3</span>
    </div>
  </header>

  {#if loading}
    <div class="qr-loading">
      <span class="spinner"></span>
      <span>{$t('common.loading')}</span>
    </div>
  {:else if hasNoAccounts}
    <section class="qr-no-accounts" aria-label={$t('transactions.no_accounts_title')}>
      <div class="no-accounts-icon">🏦</div>
      <h2>{$t('transactions.no_accounts_title')}</h2>
      <p class="no-accounts-msg">{$t('transactions.no_accounts_message')}</p>
      <p class="no-accounts-examples-label">{$t('transactions.no_accounts_examples_label')}</p>
      <ul class="no-accounts-examples">
        <li>{$t('transactions.no_accounts_example_cash')}</li>
        <li>{$t('transactions.no_accounts_example_debit')}</li>
        <li>{$t('transactions.no_accounts_example_credit')}</li>
      </ul>
      <button class="btn-create-account" onclick={goToCreateAccount} type="button">
        {$t('transactions.no_accounts_cta')}
      </button>
    </section>
  {:else}
    {#if errors.general}
      <div class="alert-error" role="alert">
        <span>{errors.general}</span>
        <button class="alert-dismiss" onclick={() => (errors = { ...errors, general: '' })} aria-label="Cerrar">×</button>
      </div>
    {/if}

    <!-- Step 1: Amount Entry -->
    {#if currentStep === 1}
      <section class="qr-step" aria-label="Paso 1: Tipo y Monto">
        <!-- Type selection FIRST -->
        <div class="type-toggle-step1" role="group" aria-label="Tipo de transacción">
          <button
            class="type-btn-step1"
            class:active={transactionType === 'Gasto'}
            class:gasto={transactionType === 'Gasto'}
            onclick={() => (transactionType = 'Gasto')}
            type="button"
          >
            ↓ Gasto
          </button>
          <button
            class="type-btn-step1"
            class:active={transactionType === 'Ingreso'}
            class:ingreso={transactionType === 'Ingreso'}
            onclick={() => (transactionType = 'Ingreso')}
            type="button"
          >
            ↑ Ingreso
          </button>
        </div>

        <div class="amount-display">
          <span class="amount-prefix">MX$</span>
          <span class="amount-value">{amount || '0.00'}</span>
        </div>
        {#if errors.amount}
          <span class="field-error">{errors.amount}</span>
        {/if}

        <div class="keypad" role="group" aria-label="Teclado numérico">
          <button class="key" onclick={() => appendDigit('1')} type="button">1</button>
          <button class="key" onclick={() => appendDigit('2')} type="button">2</button>
          <button class="key" onclick={() => appendDigit('3')} type="button">3</button>
          <button class="key" onclick={() => appendDigit('4')} type="button">4</button>
          <button class="key" onclick={() => appendDigit('5')} type="button">5</button>
          <button class="key" onclick={() => appendDigit('6')} type="button">6</button>
          <button class="key" onclick={() => appendDigit('7')} type="button">7</button>
          <button class="key" onclick={() => appendDigit('8')} type="button">8</button>
          <button class="key" onclick={() => appendDigit('9')} type="button">9</button>
          <button class="key" onclick={() => appendDigit('.')} type="button">.</button>
          <button class="key" onclick={() => appendDigit('0')} type="button">0</button>
          <button class="key key-delete" onclick={deleteDigit} aria-label="Borrar" type="button">⌫</button>
        </div>

        <div class="step-actions">
          <button class="btn-clear" onclick={clearAmount} type="button">Limpiar</button>
          <button class="btn-next" onclick={goToStep2} disabled={!amount} type="button">Siguiente →</button>
        </div>
      </section>
    {/if}

    <!-- Step 2: Account & Category Selection -->
    {#if currentStep === 2}
      <section class="qr-step" aria-label="Paso 2: Cuenta y Categoría">
        <div class="amount-summary">
          <span>{transactionType === 'Ingreso' ? '↑ Ingreso' : '↓ Gasto'}:</span>
          <strong>{formatCurrency(parsedAmount)}</strong>
        </div>

        <div class="selector-section">
          <!-- svelte-ignore a11y_label_has_associated_control -->
          <label class="selector-label">CUENTA *</label>
          {#if errors.account}<span class="field-error">{errors.account}</span>{/if}
          <div class="selector-grid" role="listbox" aria-label="Seleccionar cuenta">
            {#each sortedAccounts as account, i (account.id)}
              <button
                class="selector-item"
                class:selected={selectedAccountId === account.id}
                class:recent={i < getRecentIds(RECENT_ACCOUNTS_KEY).length}
                onclick={() => { selectedAccountId = account.id; errors = { ...errors, account: '' }; }}
                role="option"
                aria-selected={selectedAccountId === account.id}
                type="button"
              >
                <span class="selector-name">{account.name}</span>
                <span class="selector-meta">{account.type}</span>
              </button>
            {/each}
          </div>
        </div>

        <div class="selector-section">
          <!-- svelte-ignore a11y_label_has_associated_control -->
          <label class="selector-label">CATEGORÍA *</label>
          {#if errors.category}<span class="field-error">{errors.category}</span>{/if}
          <div class="selector-grid" role="listbox" aria-label="Seleccionar categoría">
            {#each sortedCategories as category, i (category.id)}
              <button
                class="selector-item"
                class:selected={selectedCategoryId === category.id}
                class:recent={i < getRecentIds(RECENT_CATEGORIES_KEY).length}
                onclick={() => { selectedCategoryId = category.id; errors = { ...errors, category: '' }; }}
                role="option"
                aria-selected={selectedCategoryId === category.id}
                type="button"
              >
                <span class="selector-name">{category.name}</span>
              </button>
            {/each}
          </div>
        </div>

        <div class="step-actions">
          <button class="btn-back" onclick={goBack} type="button">← Atrás</button>
          <button class="btn-next" onclick={goToStep3} disabled={!selectedAccountId || !selectedCategoryId} type="button">Siguiente →</button>
        </div>
      </section>
    {/if}

    <!-- Step 3: Type & Confirm -->
    {#if currentStep === 3}
      <section class="qr-step" aria-label="Paso 3: Confirmar">
        <div class="confirm-summary">
          <div class="confirm-row">
            <span class="confirm-label">Monto</span>
            <span class="confirm-value">{formatCurrency(parsedAmount)}</span>
          </div>
          <div class="confirm-row">
            <span class="confirm-label">Cuenta</span>
            <span class="confirm-value">{selectedAccountName}</span>
          </div>
          <div class="confirm-row">
            <span class="confirm-label">Categoría</span>
            <span class="confirm-value">{selectedCategoryName}</span>
          </div>
        </div>

        <!-- Name field (optional) -->
        <div class="name-field">
          <label for="qr-name">Nombre (opcional)</label>
          <input
            id="qr-name"
            type="text"
            bind:value={transactionName}
            placeholder={$t('dashboard.expense_placeholder')}
            maxlength={100}
          />
          <span class="name-hint">Si lo dejas vacío, se usará el nombre de la categoría</span>
        </div>

        <div class="step-actions">
          <button class="btn-back" onclick={goBack} type="button">← Atrás</button>
          <button class="btn-submit" onclick={submitTransaction} disabled={submitting} type="button">
            {submitting ? 'Registrando...' : '✓ Registrar'}
          </button>
        </div>
      </section>
    {/if}
  {/if}

  <!-- Success Toast -->
  {#if showToast}
    <div class="toast" role="status" aria-live="polite">
      <span>✓</span>
      <span>{toastMessage}</span>
    </div>
  {/if}
</div>

<style>
  .quick-register {
    display: flex; flex-direction: column; min-height: 100vh; min-height: 100dvh;
    padding: var(--spacing-md); max-width: 420px; margin: 0 auto; position: relative;
  }

  /* Header */
  .qr-header { display: flex; align-items: center; gap: 0.6rem; margin-bottom: var(--spacing-lg); }
  .qr-header h1 { font-size: 1.1rem; font-weight: 600; color: var(--text-primary); margin: 0; flex: 1; }
  .qr-back-btn {
    min-width: 44px; min-height: 44px; display: flex; align-items: center; justify-content: center;
    background: none; border: none; font-size: 1.1rem; color: var(--text-secondary);
    cursor: pointer; border-radius: var(--radius-sm);
  }
  .qr-back-btn:hover { background: var(--bg-hover); }

  .qr-steps { display: flex; align-items: center; gap: 0.25rem; }
  .step-dot {
    width: 20px; height: 20px; border-radius: 50%; font-size: 0.65rem; font-weight: 600;
    display: flex; align-items: center; justify-content: center;
    background: var(--bg-elevated); color: var(--text-muted);
  }
  .step-dot.active { background: var(--accent-blue); color: #fff; }
  .step-line { width: 8px; height: 1px; background: var(--border-default); }

  /* Loading */
  .qr-loading { display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 2rem; color: var(--text-muted); }
  .spinner { width: 1rem; height: 1rem; border: 2px solid var(--border-default); border-top-color: var(--accent-blue); border-radius: 50%; animation: spin 0.6s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* No Accounts */
  .qr-no-accounts { flex: 1; display: flex; flex-direction: column; align-items: center; text-align: center; padding: 1.5rem 0.5rem; }
  .no-accounts-icon { font-size: 2.5rem; margin-bottom: 0.75rem; }
  .qr-no-accounts h2 { font-size: 1.05rem; font-weight: 600; color: var(--text-primary); margin: 0 0 0.5rem; }
  .qr-no-accounts .no-accounts-msg { font-size: 0.85rem; color: var(--text-secondary); line-height: 1.45; margin: 0 0 1rem; max-width: 320px; }
  .qr-no-accounts .no-accounts-examples-label { font-size: 0.7rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.03em; margin: 0 0 0.4rem; align-self: flex-start; }
  .qr-no-accounts .no-accounts-examples { list-style: none; padding: 0; margin: 0 0 1.25rem; width: 100%; display: flex; flex-direction: column; gap: 0.4rem; }
  .qr-no-accounts .no-accounts-examples li { font-size: 0.8rem; color: var(--text-primary); padding: 0.5rem 0.7rem; background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-sm); text-align: left; }
  .btn-create-account { width: 100%; min-height: 48px; border: none; border-radius: var(--radius-md); background: var(--accent-blue); color: #fff; font-size: 0.9rem; font-weight: 600; cursor: pointer; }
  .btn-create-account:hover { background: var(--color-primary-hover); }

  /* Alert */
  .alert-error {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0.4rem 0.6rem; background: var(--tag-red-bg); color: var(--accent-red);
    border-radius: var(--radius-sm); margin-bottom: var(--spacing-sm); font-size: 0.78rem;
  }
  .alert-dismiss { background: none; border: none; color: inherit; font-size: 1rem; cursor: pointer; min-width: 44px; min-height: 44px; display: flex; align-items: center; justify-content: center; }

  /* Steps */
  .qr-step { flex: 1; display: flex; flex-direction: column; }

  /* Amount Display */
  .amount-display {
    display: flex; align-items: baseline; justify-content: center;
    padding: 1.2rem 0.8rem; margin-bottom: 0.3rem;
    background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-md);
  }
  .amount-prefix { font-size: 1.2rem; font-weight: 500; color: var(--text-muted); margin-right: 0.2rem; }
  .amount-value { font-size: 2rem; font-weight: 700; color: var(--text-primary); }

  /* Keypad */
  .keypad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.4rem; margin: 0.8rem 0; flex: 1; align-content: center; }
  .key {
    min-width: 44px; min-height: 48px; height: 52px;
    border: 1px solid var(--border-default); border-radius: var(--radius-md);
    background: var(--bg-surface); font-size: 1.3rem; font-weight: 500; color: var(--text-primary);
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: background 0.1s; user-select: none; -webkit-tap-highlight-color: transparent;
  }
  .key:hover { background: var(--bg-elevated); }
  .key:active { background: var(--bg-hover); transform: scale(0.96); }
  .key-delete { font-size: 1.1rem; color: var(--text-muted); }

  /* Step Actions */
  .step-actions { display: flex; gap: 0.5rem; margin-top: 0.8rem; }
  .btn-next, .btn-submit {
    flex: 1; min-height: 44px; border: none; border-radius: var(--radius-md);
    font-size: 0.9rem; font-weight: 600; cursor: pointer;
  }
  .btn-next { background: var(--accent-blue); color: #fff; }
  .btn-next:hover:not(:disabled) { background: var(--color-primary-hover); }
  .btn-next:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn-submit { background: var(--accent-green); color: #fff; }
  .btn-submit:hover:not(:disabled) { background: #3d9147; }
  .btn-submit:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn-back, .btn-clear {
    min-height: 44px; padding: 0 0.8rem; border: 1px solid var(--border-default);
    border-radius: var(--radius-md); background: var(--bg-surface);
    font-size: 0.8rem; font-weight: 500; color: var(--text-secondary); cursor: pointer;
  }
  .btn-back:hover, .btn-clear:hover { background: var(--bg-hover); }

  /* Amount Summary (Step 2) */
  .amount-summary {
    display: flex; align-items: center; gap: 0.4rem;
    padding: 0.4rem 0.6rem; background: var(--tag-blue-bg); border-radius: var(--radius-sm);
    margin-bottom: var(--spacing-md); font-size: 0.85rem; color: var(--accent-blue);
  }

  /* Selector */
  .selector-section { margin-bottom: var(--spacing-md); }
  .selector-label { display: block; font-size: 0.65rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); margin-bottom: 0.3rem; }
  .selector-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 0.35rem; max-height: 180px; overflow-y: auto; }
  .selector-item {
    min-height: 44px; padding: 0.4rem 0.6rem; border: 1px solid var(--border-default);
    border-radius: var(--radius-sm); background: var(--bg-surface); cursor: pointer;
    display: flex; flex-direction: column; align-items: flex-start; justify-content: center;
    gap: 0.1rem; text-align: left; transition: border-color 0.15s;
  }
  .selector-item:hover { border-color: var(--accent-blue); }
  .selector-item.selected { border-color: var(--accent-blue); background: var(--tag-blue-bg); box-shadow: 0 0 0 1px var(--accent-blue); }
  .selector-item.recent:not(.selected) { border-color: var(--accent-purple); background: var(--tag-purple-bg); }
  .selector-name { font-size: 0.78rem; font-weight: 500; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
  .selector-meta { font-size: 0.65rem; color: var(--text-muted); }

  /* Confirm Summary */
  .confirm-summary {
    background: var(--bg-surface); border: 1px solid var(--border-default);
    border-radius: var(--radius-md); padding: 0.6rem 0.8rem; margin-bottom: var(--spacing-md);
  }
  .confirm-row { display: flex; justify-content: space-between; align-items: center; padding: 0.3rem 0; }
  .confirm-row + .confirm-row { border-top: 1px solid var(--border-subtle); }
  .confirm-label { font-size: 0.75rem; color: var(--text-muted); }
  .confirm-value { font-size: 0.85rem; font-weight: 600; color: var(--text-primary); }

  /* Type Toggle (Step 1) */
  .type-toggle-step1 { display: flex; gap: 0.4rem; margin-bottom: var(--spacing-md); }
  .type-btn-step1 {
    flex: 1; min-height: 44px; border: 2px solid var(--border-default); border-radius: var(--radius-md);
    background: var(--bg-elevated); font-size: 0.9rem; font-weight: 600;
    color: var(--text-muted); cursor: pointer; transition: all 0.15s;
  }
  .type-btn-step1.active.gasto { border-color: var(--accent-red); background: var(--tag-red-bg); color: var(--accent-red); }
  .type-btn-step1.active.ingreso { border-color: var(--accent-green); background: var(--tag-green-bg); color: var(--accent-green); }
  .type-btn-step1:hover:not(.active) { border-color: var(--text-muted); }

  /* Name field */
  .name-field { margin-bottom: var(--spacing-md); }
  .name-field label { display: block; font-size: 0.75rem; font-weight: 500; color: var(--text-secondary); margin-bottom: 0.25rem; }
  .name-field input { width: 100%; min-height: 44px; padding: 0.5rem 0.75rem; font-size: 0.9rem; }
  .name-hint { display: block; font-size: 0.65rem; color: var(--text-muted); margin-top: 0.2rem; }

  /* Field Error */
  .field-error { display: block; font-size: 0.7rem; color: var(--accent-red); margin-top: 0.15rem; text-align: center; }

  /* Toast */
  .toast {
    position: fixed; bottom: 1.5rem; left: 50%; transform: translateX(-50%);
    display: flex; align-items: center; gap: 0.4rem;
    padding: 0.6rem 1rem; border-radius: var(--radius-md);
    font-size: 0.8rem; font-weight: 500; background: var(--accent-green); color: #fff;
    box-shadow: var(--shadow-lg); z-index: 1000; animation: toastIn 0.3s ease-out;
    max-width: calc(100% - 2rem);
  }
  @keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }

  @media (max-width: 380px) {
    .amount-value { font-size: 1.6rem; }
    .key { height: 46px; font-size: 1.1rem; }
    .selector-grid { grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); }
  }
</style>
