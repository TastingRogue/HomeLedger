<script lang="ts">
  import { onMount } from 'svelte';
  import { apiGet } from '$lib/api/client';
  import { formatCurrency } from '$lib/utils/format';
  import { t } from '$lib/i18n';
  import { preferences } from '$lib/stores/preferences';

  interface CalendarPayment {
    id: number;
    name: string;
    amount: number;
    daysRemaining: number;
    nextDate?: string;
    accountName?: string;
    categoryName?: string;
    cycle?: string;
  }

  let loading = $state(true);
  let error = $state('');
  let payments: CalendarPayment[] = $state([]);
  let currentMonth = $state(new Date().getMonth());
  let currentYear = $state(new Date().getFullYear());

  const localeTag = $derived($preferences.locale === 'en' ? 'en-US' : 'es-MX');
  const months = $derived(Array.from({ length: 12 }, (_, m) => {
    const n = new Intl.DateTimeFormat(localeTag, { month: 'long' }).format(new Date(2000, m, 1));
    return n.charAt(0).toUpperCase() + n.slice(1);
  }));
  const weekdays = $derived(Array.from({ length: 7 }, (_, i) => {
    const n = new Intl.DateTimeFormat(localeTag, { weekday: 'short' }).format(new Date(2024, 0, 7 + i));
    return n.charAt(0).toUpperCase() + n.slice(1);
  }));

  let calendarDays = $derived.by(() => {
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  });

  let paymentsOnDay = $derived.by(() => {
    const map: Record<number, CalendarPayment[]> = {};
    for (const p of payments) {
      if (!p.nextDate) continue;
      const d = new Date(p.nextDate);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(p);
      }
    }
    return map;
  });

  let upcomingPayments = $derived(
    [...payments].sort((a, b) => a.daysRemaining - b.daysRemaining).slice(0, 8)
  );

  function prevMonth() {
    if (currentMonth === 0) { currentMonth = 11; currentYear--; }
    else currentMonth--;
  }

  function nextMonth() {
    if (currentMonth === 11) { currentMonth = 0; currentYear++; }
    else currentMonth++;
  }

  function goToday() {
    currentMonth = new Date().getMonth();
    currentYear = new Date().getFullYear();
  }

  async function loadData() {
    try {
      const res = await apiGet<CalendarPayment[]>('/subscriptions/calendar');
      payments = Array.isArray(res) ? res : (res as any).items ?? [];
    } catch { error = $t('calendar.error_loading'); } finally { loading = false; }
  }

  onMount(loadData);
</script>

<svelte:head><title>{$t('calendar.title')}</title></svelte:head>

<div class="page">
  <header class="page-header">
    <div>
      <h1>{$t('calendar.title')}</h1>
      <p class="page-subtitle">{$t('calendar.subtitle')}</p>
    </div>
  </header>

  {#if error}
    <div class="error">{error}</div>
  {/if}

  {#if loading}
    <div class="loading"><div class="spinner"></div></div>
  {:else}
    <div class="calendar-layout">
      <!-- Calendar -->
      <div class="calendar-card">
        <div class="cal-header">
          <button class="cal-nav" onclick={prevMonth}>←</button>
          <span class="cal-month">{months[currentMonth]} {currentYear}</span>
          <button class="cal-nav" onclick={goToday}>{$t('common.today')}</button>
          <button class="cal-nav" onclick={nextMonth}>→</button>
        </div>

        <div class="cal-grid">
          {#each weekdays as wd}
            <div class="cal-weekday">{wd}</div>
          {/each}
          {#each calendarDays as day}
            <div class="cal-day" class:empty={!day} class:today={day === new Date().getDate() && currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear()} class:has-payment={day && paymentsOnDay[day]}>
              {#if day}
                <span class="day-num">{day}</span>
                {#if paymentsOnDay[day]}
                  <div class="day-payments">
                    {#each paymentsOnDay[day].slice(0, 2) as p}
                      <span class="day-dot" title="{p.name} - {formatCurrency(p.amount)}"></span>
                    {/each}
                    {#if paymentsOnDay[day].length > 2}
                      <span class="day-more">+{paymentsOnDay[day].length - 2}</span>
                    {/if}
                  </div>
                {/if}
              {/if}
            </div>
          {/each}
        </div>
      </div>

      <!-- Upcoming Payments -->
      <div class="upcoming-card">
        <h3 class="card-title">{$t('calendar.upcoming_title')}</h3>
        <div class="upcoming-list">
          {#each upcomingPayments as p (p.id)}
            <div class="upcoming-item">
              <div class="ui-left">
                <span class="ui-name">{p.name}</span>
                <span class="ui-meta">{p.accountName ?? ''} · {p.cycle ?? ''}</span>
              </div>
              <div class="ui-right">
                <span class="ui-amount">{formatCurrency(p.amount)}</span>
                <span class="ui-days" class:urgent={p.daysRemaining <= 3}>{$t('calendar.days_short', { n: p.daysRemaining })}</span>
              </div>
            </div>
          {:else}
            <p class="empty">{$t('calendar.no_payments')}</p>
          {/each}
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .page { width: 100%; margin: 0; }
  .page-header { margin-bottom: 1.25rem; }
  .page-header h1 { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); }
  .page-subtitle { font-size: 0.8rem; color: var(--text-muted); margin-top: 0.15rem; }

  .error { background: var(--tag-red-bg); color: var(--accent-red); padding: 0.5rem 0.7rem; border-radius: var(--radius-sm); font-size: 0.8rem; margin-bottom: 1rem; }

  .loading { text-align: center; padding: 3rem; }
  .spinner { width: 20px; height: 20px; border: 2px solid var(--border-default); border-top-color: var(--accent-blue); border-radius: 50%; animation: spin 0.6s linear infinite; margin: 0 auto; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .calendar-layout { display: grid; grid-template-columns: 1fr 300px; gap: 1rem; }

  .calendar-card, .upcoming-card { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 1.25rem; }

  .cal-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; }
  .cal-month { flex: 1; font-size: 0.9rem; font-weight: 600; color: var(--text-primary); }
  .cal-nav { background: var(--bg-elevated); border: 1px solid var(--border-default); border-radius: var(--radius-md); padding: 0.3rem 0.6rem; font-size: 0.72rem; color: var(--text-secondary); cursor: pointer; }
  .cal-nav:hover { background: var(--bg-hover); color: var(--text-primary); }

  .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; }
  .cal-weekday { text-align: center; font-size: 0.6rem; font-weight: 600; color: var(--text-muted); padding: 0.4rem 0; text-transform: uppercase; }

  .cal-day { min-height: 48px; padding: 0.25rem; border-radius: var(--radius-sm); display: flex; flex-direction: column; align-items: center; gap: 0.15rem; }
  .cal-day.empty { background: transparent; }
  .cal-day.today { background: rgba(139, 92, 246, 0.1); border: 1px solid var(--accent-purple); }
  .cal-day.has-payment { background: var(--bg-elevated); }

  .day-num { font-size: 0.7rem; font-weight: 500; color: var(--text-primary); }
  .day-payments { display: flex; gap: 2px; flex-wrap: wrap; justify-content: center; }
  .day-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent-purple); }
  .day-more { font-size: 0.5rem; color: var(--text-muted); }

  .card-title { font-size: 0.85rem; font-weight: 600; color: var(--text-primary); margin-bottom: 0.75rem; }

  .upcoming-list { display: flex; flex-direction: column; gap: 0.4rem; }
  .upcoming-item { display: flex; align-items: center; justify-content: space-between; padding: 0.5rem; background: var(--bg-elevated); border-radius: var(--radius-md); }
  .ui-left { display: flex; flex-direction: column; }
  .ui-name { font-size: 0.75rem; font-weight: 500; color: var(--text-primary); }
  .ui-meta { font-size: 0.6rem; color: var(--text-muted); }
  .ui-right { text-align: right; }
  .ui-amount { font-size: 0.75rem; font-weight: 600; color: var(--text-primary); display: block; }
  .ui-days { font-size: 0.6rem; font-weight: 600; color: var(--accent-blue); }
  .ui-days.urgent { color: var(--accent-red); }
  .empty { font-size: 0.8rem; color: var(--text-muted); text-align: center; padding: 1rem; }

  @media (max-width: 768px) {
    .calendar-layout { grid-template-columns: 1fr; }
  }
</style>
