<script lang="ts">
  import { onMount } from 'svelte';
  import {
    listSubscriptions,
    createSubscription,
    updateSubscription,
    deactivateSubscription,
    deleteSubscription,
    getSubscriptionCalendar,
    type Subscription,
    type SubscriptionCalendarEntry,
    type SubscriptionCycle,
    type CreateSubscriptionPayload,
  } from '$lib/api/subscriptions';
  import { listAccounts, type AccountData } from '$lib/api/accounts';
  import { apiGet } from '$lib/api/client';
  import { ApiError } from '$lib/api/client';
  import { formatCurrency, formatDaysRemaining } from '$lib/utils/format';
  import { t } from '$lib/i18n';

  // ─── Types ───
  interface Category {
    id: number;
    name: string;
  }

  // ─── State ───
  let subscriptionsList: Subscription[] = $state([]);
  let calendar: SubscriptionCalendarEntry[] = $state([]);
  let accounts: AccountData[] = $state([]);
  let categories: Category[] = $state([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

  // View toggle: 'lista' or 'calendario'
  let activeView: 'lista' | 'calendario' = $state('lista');

  // Calendar view state
  let calViewMonth = $state(new Date().getMonth());
  let calViewYear = $state(new Date().getFullYear());
  const calMonthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const calWeekdays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  let calDays = $derived.by(() => {
    const firstDay = new Date(calViewYear, calViewMonth, 1).getDay();
    const daysInMonth = new Date(calViewYear, calViewMonth + 1, 0).getDate();
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  });

  let paymentsOnDay = $derived.by(() => {
    const map: Record<number, typeof calendar> = {};
    for (const p of calendar) {
      if (!p.nextPaymentDate) continue;
      const parts = p.nextPaymentDate.split('-');
      const pMonth = parseInt(parts[1]!, 10) - 1;
      const pYear = parseInt(parts[0]!, 10);
      if (pMonth === calViewMonth && pYear === calViewYear) {
        const day = parseInt(parts[2]!, 10);
        if (!map[day]) map[day] = [];
        map[day].push(p);
      }
    }
    return map;
  });

  function calPrev() { if (calViewMonth === 0) { calViewMonth = 11; calViewYear--; } else calViewMonth--; }
  function calNext() { if (calViewMonth === 11) { calViewMonth = 0; calViewYear++; } else calViewMonth++; }
  function calToday() { calViewMonth = new Date().getMonth(); calViewYear = new Date().getFullYear(); }

  // Form state
  let showForm = $state(false);
  let editingSub: Subscription | null = $state(null);
  let formError = $state('');
  let formSubmitting = $state(false);

  // Form fields
  let formName = $state('');
  let formAmount = $state('');
  let formStartDate = $state('');
  let formCycle: SubscriptionCycle = $state('Mensual');
  let formCategoryId = $state<number | ''>('');
  let formAccountId = $state<number | ''>('');
  let formAutoCharge = $state(false);

  // Deactivate confirmation
  let deactivateTarget: Subscription | null = $state(null);
  let deactivating = $state(false);

  // Validation
  let validationErrors: Record<string, string> = $state({});

  // ─── Constants ───
  const cycles: SubscriptionCycle[] = ['Semanal', 'Mensual'];

  // ─── Helpers ───
  function getDaysRemaining(sub: Subscription): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const next = new Date(sub.nextPaymentDate + 'T00:00:00');
    const diff = Math.round((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  }

  function getStatusBadge(status: string): string {
    return status === 'Activa' ? 'badge-activa' : 'badge-inactiva';
  }

  function getUrgencyClass(daysRemaining: number): string {
    if (daysRemaining <= 0) return 'urgency-overdue';
    if (daysRemaining <= 3) return 'urgency-urgent';
    return '';
  }

  function getUrgencyLabel(daysRemaining: number): string {
    if (daysRemaining <= 0) return $t('subscriptions.overdue');
    if (daysRemaining <= 3) return $t('subscriptions.urgent');
    return '';
  }

  function getAccountName(accountId: number): string {
    return accounts.find((a) => a.id === accountId)?.name ?? $t('subscriptions.unknown_account');
  }

  function getCategoryName(categoryId: number): string {
    return categories.find((c) => c.id === categoryId)?.name ?? $t('subscriptions.no_category');
  }

  // ─── Data Loading ───
  async function loadData() {
    loading = true;
    error = null;
    try {
      const [subs, cal, accts, cats] = await Promise.all([
        listSubscriptions(),
        getSubscriptionCalendar(),
        listAccounts(),
        apiGet<Category[]>('/categories'),
      ]);
      subscriptionsList = subs;
      calendar = cal;
      accounts = accts;
      categories = cats;
    } catch (e: unknown) {
      error = e instanceof ApiError ? e.message : $t('subscriptions.error_loading');
    } finally {
      loading = false;
    }
  }

  // ─── Form ───
  function openCreateForm() {
    editingSub = null;
    formName = '';
    formAmount = '';
    formStartDate = new Date().toISOString().split('T')[0]!;
    formCycle = 'Mensual';
    formCategoryId = '';
    formAccountId = '';
    formAutoCharge = false;
    formError = '';
    validationErrors = {};
    showForm = true;
  }

  function openEditForm(sub: Subscription) {
    editingSub = sub;
    formName = sub.name;
    formAmount = String(sub.amount);
    formStartDate = sub.startDate;
    formCycle = sub.cycle;
    formCategoryId = sub.categoryId;
    formAccountId = sub.accountId;
    formAutoCharge = sub.autoCharge;
    formError = '';
    validationErrors = {};
    showForm = true;
  }

  function closeForm() {
    showForm = false;
    editingSub = null;
    formError = '';
    validationErrors = {};
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {};

    if (!String(formName ?? '').trim()) {
      errors.name = $t('subscriptions.name_required');
    } else if (String(formName ?? '').trim().length > 100) {
      errors.name = $t('subscriptions.name_max');
    }

    if (!String(formAmount ?? '').trim()) {
      errors.amount = $t('subscriptions.amount_required');
    } else if (isNaN(Number(formAmount)) || Number(formAmount) <= 0) {
      errors.amount = $t('subscriptions.amount_positive');
    } else if (Number(formAmount) > 999999999.99) {
      errors.amount = $t('subscriptions.amount_max');
    }

    if (!formStartDate) {
      errors.startDate = $t('subscriptions.date_required');
    }

    if (!formCategoryId) {
      errors.categoryId = $t('subscriptions.category_required');
    }

    if (!formAccountId) {
      errors.accountId = $t('subscriptions.account_required');
    }

    validationErrors = errors;
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit() {
    if (!validateForm()) return;

    formSubmitting = true;
    formError = '';

    const payload: CreateSubscriptionPayload = {
      name: String(formName ?? '').trim(),
      amount: Number(formAmount),
      startDate: formStartDate,
      cycle: formCycle,
      categoryId: Number(formCategoryId),
      accountId: Number(formAccountId),
      autoCharge: formAutoCharge,
    };

    try {
      if (editingSub) {
        await updateSubscription(editingSub.id, payload);
      } else {
        await createSubscription(payload);
      }
      closeForm();
      await loadData();
    } catch (e: unknown) {
      formError = e instanceof ApiError ? e.message : $t('subscriptions.error_saving');
    } finally {
      formSubmitting = false;
    }
  }

  // ─── Deactivate ───
  function confirmDeactivate(sub: Subscription) {
    deactivateTarget = sub;
  }

  function cancelDeactivate() {
    deactivateTarget = null;
  }

  async function handleDeactivate() {
    if (!deactivateTarget) return;
    deactivating = true;
    try {
      await deleteSubscription(deactivateTarget.id);
      deactivateTarget = null;
      await loadData();
    } catch {
    } finally {
      deactivating = false;
    }
  }

  onMount(() => {
    loadData();
  });
</script>

<svelte:head>
  <title>{$t('subscriptions.title')} - HomeLedger</title>
</svelte:head>

<div class="page">
  <header class="page-header">
    <div>
      <h1>{$t('subscriptions.title')}</h1>
      <p class="page-subtitle">{$t('subscriptions.subtitle')}</p>
    </div>
    <button class="btn btn-primary" onclick={openCreateForm}>{$t('subscriptions.new')}</button>
  </header>

  <div class="info-banner">
    <span class="info-icon">ℹ</span>
    <span>{$t('subscriptions.auto_charge_info')}</span>
  </div>

  <!-- View Tabs -->
  <!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
  <nav class="view-tabs" role="tablist" aria-label="Vistas de suscripciones">
    <button
      class="tab-btn"
      class:active={activeView === 'lista'}
      role="tab"
      aria-selected={activeView === 'lista'}
      onclick={() => (activeView = 'lista')}
    >
      {$t('subscriptions.view_list')}
    </button>
    <button
      class="tab-btn"
      class:active={activeView === 'calendario'}
      role="tab"
      aria-selected={activeView === 'calendario'}
      onclick={() => (activeView = 'calendario')}
    >
      {$t('subscriptions.view_calendar')}
    </button>
  </nav>

  {#if loading}
    <div class="state-msg"><p>{$t('subscriptions.loading')}</p></div>
  {:else if error}
    <div class="state-msg error">
      <p>{error}</p>
      <button class="btn btn-secondary" onclick={loadData}>{$t('common.retry')}</button>
    </div>
  {:else if activeView === 'lista'}
    {#if subscriptionsList.length === 0}
      <div class="state-msg">
        <p>{$t('subscriptions.no_subscriptions')}</p>
        <button class="btn btn-primary" onclick={openCreateForm}>{$t('subscriptions.create_first')}</button>
      </div>
    {:else}
      <div class="table-wrap">
        <table class="data-table" aria-label="Lista de suscripciones">
          <thead>
            <tr>
              <th>{$t('subscriptions.col_name')}</th>
              <th>{$t('subscriptions.col_amount')}</th>
              <th>{$t('subscriptions.col_cycle')}</th>
              <th>{$t('subscriptions.col_days')}</th>
              <th>{$t('subscriptions.col_status')}</th>
              <th>{$t('subscriptions.col_auto')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {#each subscriptionsList as sub (sub.id)}
              {@const days = getDaysRemaining(sub)}
              <tr class="clickable-row" onclick={() => openEditForm(sub)}>
                <td class="cell-name">{sub.name}</td>
                <td class="cell-amount">{formatCurrency(sub.amount)}</td>
                <td>{sub.cycle}</td>
                <td>
                  <span class="days-badge {getUrgencyClass(days)}">
                    {formatDaysRemaining(days)}
                  </span>
                </td>
                <td><span class="tag {getStatusBadge(sub.status)}">{sub.status}</span></td>
                <td>{sub.autoCharge ? '✓' : '–'}</td>
                <td class="cell-actions" onclick={(e) => e.stopPropagation()}>
                  <button class="btn-icon" onclick={() => openEditForm(sub)} title="Editar">✎</button>
                  <button class="btn-icon btn-icon-danger" onclick={() => confirmDeactivate(sub)} title="Eliminar">✕</button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  {:else}
    {#if calendar.length === 0}
      <div class="state-msg">
        <p>{$t('subscriptions.no_payments')}</p>
      </div>
    {:else}
      <div class="calendar-layout">
        <!-- Visual Calendar Grid -->
        <div class="calendar-card">
          <div class="cal-nav-header">
            <button type="button" class="cal-nav-btn" onclick={calPrev}>←</button>
            <span class="cal-nav-month">{calMonthNames[calViewMonth]} {calViewYear}</span>
            <button type="button" class="cal-nav-btn" onclick={calToday}>Hoy</button>
            <button type="button" class="cal-nav-btn" onclick={calNext}>→</button>
          </div>
          <div class="cal-grid">
            {#each calWeekdays as wd}
              <div class="cal-wd">{wd}</div>
            {/each}
            {#each calDays as day}
              <div class="cal-cell" class:empty={!day} class:today={day === new Date().getDate() && calViewMonth === new Date().getMonth() && calViewYear === new Date().getFullYear()} class:has-payment={day && paymentsOnDay[day]}>
                {#if day}
                  <span class="cal-day-num">{day}</span>
                  {#if paymentsOnDay[day]}
                    <div class="cal-dots">
                      {#each paymentsOnDay[day].slice(0, 3) as p}
                        <span class="cal-dot" title="{p.name} - {formatCurrency(p.amount)}"></span>
                      {/each}
                    </div>
                  {/if}
                {/if}
              </div>
            {/each}
          </div>
        </div>

        <!-- Upcoming list -->
        <div class="upcoming-card">
          <h3 class="upcoming-title">{$t('subscriptions.upcoming_payments')}</h3>
          <div class="upcoming-list">
            {#each calendar.slice(0, 8) as entry (entry.id)}
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div class="upcoming-item" onclick={() => { const sub = subscriptionsList.find(s => s.id === entry.id); if (sub) openEditForm(sub); }}>
                <div class="up-left">
                  <span class="up-name">{entry.name}</span>
                  <span class="up-meta">{getCategoryName(entry.categoryId)} · {entry.cycle}</span>
                </div>
                <div class="up-right">
                  <span class="up-amount">{formatCurrency(entry.amount)}</span>
                  <span class="up-days" class:urgent={entry.daysRemaining <= 3}>{entry.daysRemaining} días</span>
                </div>
              </div>
            {:else}
              <p class="state-msg">{$t('subscriptions.no_upcoming')}</p>
            {/each}
          </div>
        </div>
      </div>
    {/if}
  {/if}
</div>

<!-- ─── Create / Edit Modal ─── -->
{#if showForm}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <!-- svelte-ignore a11y_interactive_supports_focus -->
  <div class="overlay" role="dialog" aria-modal="true" aria-label={editingSub ? 'Editar suscripción' : 'Nueva suscripción'}  onkeydown={(e) => { if (e.key === 'Escape') closeForm(); }}>
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="modal" onclick={(e) => e.stopPropagation()} role="document">
      <header class="modal-header">
        <h2>{editingSub ? $t('subscriptions.edit_title') : $t('subscriptions.new_title')}</h2>
        <button class="close-btn" onclick={closeForm} aria-label="Cerrar">&times;</button>
      </header>

      {#if formError}
        <div class="form-alert" role="alert">{formError}</div>
      {/if}

      <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} novalidate>
        <div class="field">
          <label for="f-name">{$t('subscriptions.form_name')} <span class="req">*</span></label>
          <input id="f-name" type="text" bind:value={formName} maxlength={100} placeholder={$t('subscriptions.form_name_placeholder')} class:invalid={validationErrors.name} aria-invalid={!!validationErrors.name} />
          {#if validationErrors.name}<span class="field-err">{validationErrors.name}</span>{/if}
        </div>

        <div class="field">
          <label for="f-amount">{$t('subscriptions.form_amount')} <span class="req">*</span></label>
          <input id="f-amount" type="number" step="0.01" min="0.01" bind:value={formAmount} placeholder="0.00" class:invalid={validationErrors.amount} aria-invalid={!!validationErrors.amount} />
          {#if validationErrors.amount}<span class="field-err">{validationErrors.amount}</span>{/if}
        </div>

        <div class="field">
          <label for="f-start-date">{$t('subscriptions.form_date')} <span class="req">*</span></label>
          <input id="f-start-date" type="date" bind:value={formStartDate} class:invalid={validationErrors.startDate} aria-invalid={!!validationErrors.startDate} />
          {#if validationErrors.startDate}<span class="field-err">{validationErrors.startDate}</span>{/if}
        </div>

        <div class="field">
          <label for="f-cycle">{$t('subscriptions.form_cycle')} <span class="req">*</span></label>
          <select id="f-cycle" bind:value={formCycle}>
            {#each cycles as c}
              <option value={c}>{c}</option>
            {/each}
          </select>
        </div>

        <div class="field">
          <label for="f-category">{$t('subscriptions.form_category')} <span class="req">*</span></label>
          <select id="f-category" bind:value={formCategoryId} class:invalid={validationErrors.categoryId} aria-invalid={!!validationErrors.categoryId}>
            <option value="">{$t('subscriptions.form_category_placeholder')}</option>
            {#each categories as cat (cat.id)}
              <option value={cat.id}>{cat.name}</option>
            {/each}
          </select>
          {#if validationErrors.categoryId}<span class="field-err">{validationErrors.categoryId}</span>{/if}
        </div>

        <div class="field">
          <label for="f-account">{$t('subscriptions.form_account')} <span class="req">*</span></label>
          <select id="f-account" bind:value={formAccountId} class:invalid={validationErrors.accountId} aria-invalid={!!validationErrors.accountId}>
            <option value="">{$t('subscriptions.form_account_placeholder')}</option>
            {#each accounts as acct (acct.id)}
              <option value={acct.id}>{acct.name}</option>
            {/each}
          </select>
          {#if validationErrors.accountId}<span class="field-err">{validationErrors.accountId}</span>{/if}
        </div>

        <div class="field field-toggle">
          <label for="f-auto-charge" class="toggle-label">
            <input id="f-auto-charge" type="checkbox" bind:checked={formAutoCharge} class="toggle-input" />
            <span class="toggle-switch"></span>
            <span>{$t('subscriptions.auto_charge_label')}</span>
          </label>
          <p class="field-hint">{$t('subscriptions.auto_charge_hint')}</p>
        </div>

        <div class="form-buttons">
          <button type="button" class="btn btn-secondary" onclick={closeForm} disabled={formSubmitting}>{$t('common.cancel')}</button>
          <button type="submit" class="btn btn-primary" disabled={formSubmitting}>
            {formSubmitting ? $t('common.saving') : editingSub ? $t('subscriptions.save_changes') : $t('subscriptions.create_btn')}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- ─── Deactivate Confirmation Modal ─── -->
{#if deactivateTarget}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <!-- svelte-ignore a11y_interactive_supports_focus -->
  <div class="overlay" role="dialog" aria-modal="true" aria-label="Confirmar desactivación"  onkeydown={(e) => { if (e.key === 'Escape') cancelDeactivate(); }}>
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="modal modal-sm" onclick={(e) => e.stopPropagation()} role="document">
      <header class="modal-header">
        <h2>{$t('subscriptions.delete_title')}</h2>
        <button class="close-btn" onclick={cancelDeactivate} aria-label="Cerrar">&times;</button>
      </header>
      <p class="confirm-msg">{$t('subscriptions.delete_confirm')}</p>
      <p class="confirm-name">{deactivateTarget.name}</p>
      <div class="form-buttons">
        <button class="btn btn-secondary" onclick={cancelDeactivate} disabled={deactivating}>{$t('common.cancel')}</button>
        <button class="btn btn-danger" onclick={handleDeactivate} disabled={deactivating}>
          {deactivating ? $t('subscriptions.deleting') : $t('common.delete')}
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

  .info-banner { display: flex; align-items: flex-start; gap: 0.5rem; padding: 0.6rem 0.85rem; background: rgba(59, 130, 246, 0.06); border: 1px solid rgba(59, 130, 246, 0.15); border-radius: var(--radius-md); margin-bottom: 1rem; font-size: 0.75rem; color: var(--text-secondary); line-height: 1.4; }
  .info-icon { color: var(--accent-blue); font-size: 0.9rem; flex-shrink: 0; margin-top: 0.05rem; }

  /* Tabs */
  .view-tabs { display: flex; gap: 0; margin-bottom: var(--spacing-md); border-bottom: 1px solid var(--border-default); }
  .tab-btn {
    padding: 0.4rem 0.8rem; border: none; background: none;
    font-size: 0.8rem; font-weight: 500; color: var(--text-secondary);
    cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px;
  }
  .tab-btn:hover { color: var(--text-primary); }
  .tab-btn.active { color: var(--accent-blue); border-bottom-color: var(--accent-blue); }

  /* Table */
  .table-wrap { overflow-x: auto; border: 1px solid var(--border-default); border-radius: var(--radius-md); }
  .data-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
  .data-table th {
    text-align: left; padding: 0.4rem 0.6rem; font-size: 0.7rem; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted);
    background: var(--bg-elevated); border-bottom: 1px solid var(--border-default);
  }
  .data-table td { padding: 0.4rem 0.6rem; border-bottom: 1px solid var(--border-subtle); color: var(--text-primary); }
  .data-table tr:last-child td { border-bottom: none; }
  .data-table tr:hover td { background: var(--bg-hover); }
  .cell-name { font-weight: 500; max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cell-amount { font-weight: 600; font-variant-numeric: tabular-nums; }
  .cell-actions { display: flex; gap: 0.3rem; }
  .clickable-row { cursor: pointer; transition: background 0.1s; }
  .clickable-row:hover td { background: var(--bg-elevated); }

  /* Days badge */
  .days-badge {
    display: inline-block; padding: 0.1rem 0.4rem; border-radius: var(--radius-sm);
    font-size: 0.75rem; font-weight: 600; background: var(--tag-blue-bg); color: var(--accent-blue);
  }
  .days-badge.urgency-overdue { background: var(--tag-red-bg); color: var(--accent-red); }
  .days-badge.urgency-urgent { background: var(--tag-orange-bg); color: var(--accent-orange); }

  /* Tags */
  .tag { display: inline-block; padding: 0.1rem 0.4rem; border-radius: var(--radius-sm); font-size: 0.7rem; font-weight: 600; }
  .tag.badge-activa { background: var(--tag-green-bg); color: var(--accent-green); }
  .tag.badge-inactiva { background: var(--bg-elevated); color: var(--text-muted); }

  /* Calendar list */
  .calendar-list { display: flex; flex-direction: column; gap: 2px; }
  .cal-row {
    display: flex; align-items: center; gap: var(--spacing-md);
    padding: 0.45rem 0.6rem; border-radius: var(--radius-sm);
    border-left: 3px solid var(--border-subtle); background: var(--bg-surface);
  }
  .cal-row.urgency-overdue { border-left-color: var(--accent-red); }
  .cal-row.urgency-urgent { border-left-color: var(--accent-orange); }
  .cal-row:hover { background: var(--bg-hover); }

  .cal-days { display: flex; align-items: baseline; gap: 2px; min-width: 36px; }
  .days-num { font-size: 1.1rem; font-weight: 700; color: var(--text-primary); }
  .days-unit { font-size: 0.65rem; color: var(--text-muted); }

  .cal-info { flex: 1; min-width: 0; }
  .cal-name { display: block; font-size: 0.85rem; font-weight: 500; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cal-meta { font-size: 0.7rem; color: var(--text-muted); }

  .cal-right { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
  .cal-amount { font-size: 0.85rem; font-weight: 600; color: var(--text-primary); }
  .auto-tag { font-size: 0.6rem; padding: 0.05rem 0.3rem; border-radius: var(--radius-sm); background: var(--tag-blue-bg); color: var(--accent-blue); font-weight: 600; }

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

  .btn-icon {
    background: none; border: none; color: var(--text-muted); font-size: 0.9rem;
    padding: 0.2rem 0.3rem; border-radius: var(--radius-sm); cursor: pointer;
  }
  .btn-icon:hover { color: var(--text-primary); background: var(--bg-hover); }
  .btn-icon-danger:hover { color: var(--accent-red); }

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
  .close-btn { background: none; border: none; font-size: 1.3rem; color: var(--text-muted); cursor: pointer; padding: 0.2rem; }
  .close-btn:hover { color: var(--text-primary); }

  /* Form */
  .form-alert { background: var(--tag-red-bg); color: var(--accent-red); padding: 0.4rem 0.6rem; border-radius: var(--radius-sm); font-size: 0.78rem; margin-bottom: var(--spacing-md); }
  .field { margin-bottom: var(--spacing-md); }
  .field label { display: block; margin-bottom: 0.2rem; font-size: 0.75rem; font-weight: 500; color: var(--text-secondary); }
  .req { color: var(--accent-red); }
  .field input, .field select { width: 100%; }
  .field input.invalid, .field select.invalid { border-color: var(--accent-red); }
  .field-err { display: block; margin-top: 0.15rem; font-size: 0.7rem; color: var(--accent-red); }
  .field-hint { margin: 0.2rem 0 0; font-size: 0.7rem; color: var(--text-muted); }

  /* Toggle */
  .field-toggle { margin-top: var(--spacing-md); }
  .toggle-label { display: flex !important; align-items: center; gap: 0.5rem; cursor: pointer; font-weight: 500 !important; color: var(--text-primary) !important; }
  .toggle-input { width: 0; height: 0; opacity: 0; position: absolute; }
  .toggle-switch {
    position: relative; width: 32px; height: 18px; background: var(--border-default);
    border-radius: 9px; transition: background 0.15s; flex-shrink: 0;
  }
  .toggle-switch::after {
    content: ''; position: absolute; top: 2px; left: 2px; width: 14px; height: 14px;
    border-radius: 50%; background: #fff; transition: transform 0.15s;
  }
  .toggle-input:checked + .toggle-switch { background: var(--accent-blue); }
  .toggle-input:checked + .toggle-switch::after { transform: translateX(14px); }
  .toggle-input:focus + .toggle-switch { box-shadow: 0 0 0 1px var(--accent-blue); }

  .form-buttons { display: flex; gap: var(--spacing-sm); justify-content: flex-end; margin-top: var(--spacing-lg); }

  /* Confirm */
  .confirm-msg { font-size: 0.85rem; color: var(--text-secondary); margin-bottom: var(--spacing-xs); }
  .confirm-name { font-weight: 600; font-size: 0.9rem; color: var(--text-primary); margin-bottom: var(--spacing-md); }

  /* Calendar visual grid */
  .calendar-layout { display: grid; grid-template-columns: auto 1fr; gap: 1rem; align-items: start; }
  .calendar-card, .upcoming-card { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 1rem; }
  .calendar-card { max-width: 380px; }
  .cal-nav-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; }
  .cal-nav-month { flex: 1; font-size: 0.9rem; font-weight: 600; color: var(--text-primary); }
  .cal-nav-btn { background: var(--bg-elevated); border: 1px solid var(--border-default); border-radius: var(--radius-sm); padding: 0.25rem 0.5rem; font-size: 0.72rem; color: var(--text-secondary); cursor: pointer; }
  .cal-nav-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
  .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); }
  .cal-wd { text-align: center; font-size: 0.62rem; font-weight: 600; color: var(--text-muted); padding: 0.4rem 0; text-transform: uppercase; border-bottom: 1px solid var(--border-subtle); }
  .cal-cell { aspect-ratio: 1; padding: 0.2rem; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.1rem; border: 1px solid transparent; border-radius: var(--radius-sm); margin: 2px; cursor: default; }
  .cal-cell.empty { opacity: 0; }
  .cal-cell.today { background: var(--accent-purple); border-color: var(--accent-purple); }
  .cal-cell.today .cal-day-num { color: #fff; font-weight: 700; }
  .cal-cell.has-payment { background: var(--bg-elevated); border-color: var(--border-default); }
  .cal-cell.has-payment.today { background: var(--accent-purple); }
  .cal-day-num { font-size: 0.72rem; font-weight: 500; color: var(--text-primary); }
  .cal-dots { display: flex; gap: 2px; }
  .cal-dot { width: 4px; height: 4px; border-radius: 50%; background: var(--accent-green); }
  .cal-cell.today .cal-dot { background: #fff; }
  .upcoming-title { font-size: 0.85rem; font-weight: 600; color: var(--text-primary); margin-bottom: 0.6rem; }
  .upcoming-list { display: flex; flex-direction: column; gap: 0.4rem; }
  .upcoming-item { display: flex; align-items: center; justify-content: space-between; padding: 0.45rem 0.5rem; background: var(--bg-elevated); border-radius: var(--radius-md); cursor: pointer; transition: background 0.1s; }
  .upcoming-item:hover { background: var(--bg-hover); }
  .up-left { display: flex; flex-direction: column; }
  .up-name { font-size: 0.75rem; font-weight: 500; color: var(--text-primary); }
  .up-meta { font-size: 0.6rem; color: var(--text-muted); }
  .up-right { text-align: right; }
  .up-amount { font-size: 0.75rem; font-weight: 600; color: var(--text-primary); display: block; }
  .up-days { font-size: 0.6rem; font-weight: 600; color: var(--accent-blue); }
  .up-days.urgent { color: var(--accent-red); }

  @media (max-width: 640px) {
    .calendar-layout { grid-template-columns: 1fr; }
    .data-table { font-size: 0.78rem; }
    .data-table th, .data-table td { padding: 0.35rem 0.4rem; }
  }
</style>
