<script lang="ts">
  import { onMount } from 'svelte';
  import { apiGet } from '$lib/api/client';
  import { formatCurrency } from '$lib/utils/format';
  import BarChart from '$lib/components/BarChart.svelte';
  import DoughnutChart from '$lib/components/DoughnutChart.svelte';
  import LineChart from '$lib/components/LineChart.svelte';
  import { t } from '$lib/i18n';
  import { getIntlTag } from '$lib/i18n/registry';
  import { preferences } from '$lib/stores/preferences';

  interface DashboardData {
    consolidatedBalance: number;
    monthlySummary: { totalIncome: number; totalExpenses: number };
    categoryBreakdown: { categoryName: string; total: number; percentage: number }[];
  }

  interface TrendEntry { month: string; income: number; expenses: number; net: number; }

  interface DebtItem { id: number; name: string; kind: 'credit' | 'loan'; owed: number; apr: number | null; }
  interface DebtReport { totalDebt: number; items: DebtItem[]; }
  interface CreditCard { id: number; name: string; limit: number; owed: number; utilization: number; }
  interface CreditReport { overallUtilization: number; totalOwed: number; totalLimit: number; cards: CreditCard[]; }
  interface MerchantEntry { merchant: string; total: number; count: number; }
  interface MerchantReport { merchants: MerchantEntry[]; totalSpend: number; }

  let loading = $state(true);
  let dashboard = $state<DashboardData | null>(null);
  let trends = $state<TrendEntry[]>([]);
  // P4.10 extra reports
  let debt = $state<DebtReport | null>(null);
  let credit = $state<CreditReport | null>(null);
  let merchants = $state<MerchantReport | null>(null);

  const catColors = ['#3b82f6', '#ef4444', '#f59e0b', '#22c55e', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b'];

  let income = $derived(dashboard?.monthlySummary?.totalIncome ?? 0);
  let expenses = $derived(dashboard?.monthlySummary?.totalExpenses ?? 0);
  let savings = $derived(income - expenses);
  let savingsRate = $derived(income > 0 ? ((income - expenses) / income * 100) : 0);

  // Localized short month names, derived from the active locale (follows the
  // app language reactively instead of reading localStorage directly).
  const shortMonths = $derived(
    Array.from({ length: 12 }, (_, m) => {
      const n = new Intl.DateTimeFormat(getIntlTag($preferences.locale), { month: 'short' })
        .format(new Date(2000, m, 1))
        .replace('.', '');
      return n.charAt(0).toUpperCase() + n.slice(1);
    }),
  );
  let trendLabels = $derived(trends.map(tr => {
    const [, m] = tr.month.split('-');
    return shortMonths[parseInt(m!, 10) - 1] ?? tr.month;
  }));

  async function loadData() {
    try {
      // Last-12-months window for the merchant report.
      const end = new Date().toISOString().slice(0, 10);
      const startD = new Date(); startD.setFullYear(startD.getFullYear() - 1);
      const start = startD.toISOString().slice(0, 10);

      const [dashRes, trendsRes, debtRes, creditRes, merchRes] = await Promise.allSettled([
        apiGet<DashboardData>('/reports/dashboard'),
        apiGet<{ entries: TrendEntry[] }>('/reports/trends', { months: 6 }),
        apiGet<DebtReport>('/reports/debt'),
        apiGet<CreditReport>('/reports/credit-utilization'),
        apiGet<MerchantReport>('/reports/merchant', { startDate: start, endDate: end, limit: 8 }),
      ]);
      if (dashRes.status === 'fulfilled') dashboard = dashRes.value;
      if (trendsRes.status === 'fulfilled') {
        const raw = trendsRes.value as any;
        trends = raw?.entries ?? (Array.isArray(raw) ? raw : []);
      }
      if (debtRes.status === 'fulfilled') debt = debtRes.value;
      if (creditRes.status === 'fulfilled') credit = creditRes.value;
      if (merchRes.status === 'fulfilled') merchants = merchRes.value;
    } catch {} finally { loading = false; }
  }

  onMount(loadData);
</script>

<svelte:head><title>{$t('reports.title')} - HomeLedger</title></svelte:head>

<div class="page">
  <header class="page-header">
    <div>
      <h1>{$t('reports.title')}</h1>
      <p class="page-subtitle">{$t('reports.subtitle')}</p>
    </div>
  </header>

  {#if loading}
    <div class="loading"><div class="spinner"></div></div>
  {:else}
    <!-- Summary Cards -->
    <div class="summary-row">
      <div class="summary-card">
        <span class="sc-label">{$t('reports.income')}</span>
        <span class="sc-value green">{formatCurrency(income)}</span>
      </div>
      <div class="summary-card">
        <span class="sc-label">{$t('reports.expenses')}</span>
        <span class="sc-value red">{formatCurrency(expenses)}</span>
      </div>
      <div class="summary-card">
        <span class="sc-label">{$t('reports.net_savings')}</span>
        <span class="sc-value" class:green={savings >= 0} class:red={savings < 0}>{formatCurrency(savings)}</span>
      </div>
      <div class="summary-card">
        <span class="sc-label">{$t('reports.savings_title')}</span>
        <span class="sc-value" class:green={savingsRate > 0} class:red={savingsRate <= 0}>{savingsRate.toFixed(1)}%</span>
      </div>
      <div class="summary-card">
        <span class="sc-label">{$t('reports.current_networth')}</span>
        <span class="sc-value">{formatCurrency(dashboard?.consolidatedBalance ?? 0)}</span>
      </div>
    </div>

    <!-- Charts Grid -->
    <div class="charts-grid">
      <!-- Trends chart (6 months) -->
      <div class="chart-card chart-wide">
        <h3 class="card-title">{$t('reports.cashflow_title')}</h3>
        <p class="card-desc">{$t('reports.cashflow_desc')}</p>
        {#if trends.length > 0}
          <LineChart
            labels={trendLabels}
            datasets={[
              { label: $t('reports.income'), data: trends.map(t => t.income), borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.08)', fill: true, tension: 0.3 },
              { label: $t('reports.expenses'), data: trends.map(t => t.expenses), borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.08)', fill: true, tension: 0.3 },
            ]}
            height={240}
          />
        {:else}
          <p class="empty">{$t('common.no_data')}</p>
        {/if}
      </div>

      <!-- Category donut -->
      <div class="chart-card">
        <h3 class="card-title">{$t('reports.categories_title')}</h3>
        <p class="card-desc">{$t('reports.categories_desc')}</p>
        {#if dashboard?.categoryBreakdown && dashboard.categoryBreakdown.length > 0}
          <div class="donut-area">
            <DoughnutChart
              labels={dashboard.categoryBreakdown.map(c => c.categoryName)}
              data={dashboard.categoryBreakdown.map(c => c.total)}
              colors={catColors.slice(0, dashboard.categoryBreakdown.length)}
              height={180}
              centerText={formatCurrency(dashboard.categoryBreakdown.reduce((s, c) => s + c.total, 0))}
            />
          </div>
          <div class="cat-list">
            {#each dashboard.categoryBreakdown as cat, i}
              <div class="cat-row">
                <span class="cat-dot" style="background: {catColors[i % catColors.length]}"></span>
                <span class="cat-name">{cat.categoryName}</span>
                <span class="cat-pct">{cat.percentage.toFixed(1)}%</span>
                <span class="cat-amount">{formatCurrency(cat.total)}</span>
              </div>
            {/each}
          </div>
        {:else}
          <p class="empty">{$t('reports.no_categories')}</p>
        {/if}
      </div>

      <!-- Monthly bar comparison -->
      <div class="chart-card">
        <h3 class="card-title">{$t('reports.cashflow')}</h3>
        <p class="card-desc">{$t('common.this_month')}</p>
        <BarChart
          labels={[$t('reports.income'), $t('reports.expenses'), $t('reports.net_savings')]}
          datasets={[{ label: $t('reports.chart_amount'), data: [income, expenses, savings], backgroundColor: ['#22c55e', '#ef4444', savings >= 0 ? '#3b82f6' : '#f59e0b'] }]}
          height={200}
        />
      </div>

      <!-- Savings rate visual -->
      <div class="chart-card savings-card">
        <h3 class="card-title">{$t('reports.savings_title')}</h3>
        <p class="card-desc">{$t('reports.savings_desc')}</p>
        <div class="savings-ring">
          <svg viewBox="0 0 36 36">
            <path class="ring-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            <path class="ring-fill" stroke-dasharray="{Math.max(savingsRate, 0)}, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
          </svg>
          <div class="ring-center">
            <span class="ring-pct" class:green={savingsRate > 0} class:red={savingsRate <= 0}>{savingsRate.toFixed(1)}%</span>
            <span class="ring-label">{$t('reports.savings_rate_label')}</span>
          </div>
        </div>
        <div class="savings-breakdown">
          <div class="sb-item"><span class="sb-label">{$t('reports.income')}</span><span class="sb-value green">{formatCurrency(income)}</span></div>
          <div class="sb-item"><span class="sb-label">{$t('reports.expenses')}</span><span class="sb-value red">{formatCurrency(expenses)}</span></div>
          <div class="sb-item"><span class="sb-label">{$t('reports.net_savings')}</span><span class="sb-value">{formatCurrency(savings)}</span></div>
        </div>
      </div>

      <!-- P4.10: Top merchants (last 12 months) -->
      <div class="chart-card">
        <h3 class="card-title">{$t('reports.merchant_title')}</h3>
        <p class="card-desc">{$t('reports.merchant_desc')}</p>
        {#if merchants && merchants.merchants.length > 0}
          <div class="rank-list">
            {#each merchants.merchants as m}
              <div class="rank-row">
                <span class="rank-name">{m.merchant}</span>
                <span class="rank-count">{m.count}×</span>
                <span class="rank-amount">{formatCurrency(m.total)}</span>
              </div>
            {/each}
          </div>
        {:else}
          <p class="empty">{$t('common.no_data')}</p>
        {/if}
      </div>

      <!-- P4.10: Debt overview -->
      <div class="chart-card">
        <h3 class="card-title">{$t('reports.debt_title')}</h3>
        <p class="card-desc">{$t('reports.debt_desc')}</p>
        {#if debt && debt.items.length > 0}
          <div class="report-total"><span>{$t('reports.debt_total')}</span><strong class="red">{formatCurrency(debt.totalDebt)}</strong></div>
          <div class="rank-list">
            {#each debt.items as d}
              <div class="rank-row">
                <span class="rank-name">{d.name} <span class="kind-tag">{d.kind === 'loan' ? $t('reports.debt_loan') : $t('reports.debt_credit')}</span></span>
                <span class="rank-count">{d.apr != null ? `${d.apr}%` : '—'}</span>
                <span class="rank-amount red">{formatCurrency(d.owed)}</span>
              </div>
            {/each}
          </div>
        {:else}
          <p class="empty">{$t('reports.debt_none')}</p>
        {/if}
      </div>

      <!-- P4.10: Credit utilization -->
      <div class="chart-card">
        <h3 class="card-title">{$t('reports.credit_title')}</h3>
        <p class="card-desc">{$t('reports.credit_desc')}</p>
        {#if credit && credit.cards.length > 0}
          <div class="report-total"><span>{$t('reports.credit_overall')}</span><strong class:red={credit.overallUtilization >= 30}>{credit.overallUtilization.toFixed(1)}%</strong></div>
          <div class="rank-list">
            {#each credit.cards as c}
              <div class="util-row">
                <div class="util-head"><span class="rank-name">{c.name}</span><span class="rank-amount">{c.utilization.toFixed(1)}%</span></div>
                <div class="util-bar"><div class="util-fill" class:high={c.utilization >= 30} style="width:{Math.min(c.utilization, 100)}%"></div></div>
                <span class="util-sub">{formatCurrency(c.owed)} / {formatCurrency(c.limit)}</span>
              </div>
            {/each}
          </div>
        {:else}
          <p class="empty">{$t('reports.credit_none')}</p>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .page { width: 100%; margin: 0; }
  .page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 1.25rem; }
  .page-header h1 { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); }
  .page-subtitle { font-size: 0.8rem; color: var(--text-muted); margin-top: 0.15rem; }

  .loading { text-align: center; padding: 3rem; }
  .spinner { width: 20px; height: 20px; border: 2px solid var(--border-default); border-top-color: var(--accent-blue); border-radius: 50%; animation: spin 0.6s linear infinite; margin: 0 auto; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Summary */
  .summary-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.75rem; margin-bottom: 1.25rem; }
  .summary-card { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 1rem; display: flex; flex-direction: column; gap: 0.2rem; }
  .sc-label { font-size: 0.65rem; font-weight: 500; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
  .sc-value { font-size: 1.2rem; font-weight: 700; color: var(--text-primary); }
  .sc-value.green { color: var(--accent-green); }
  .sc-value.red { color: var(--accent-red); }

  /* Charts Grid */
  .charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .chart-card { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 1.25rem; }
  .chart-wide { grid-column: span 2; }
  .card-title { font-size: 0.9rem; font-weight: 600; color: var(--text-primary); margin: 0 0 0.15rem; }
  .card-desc { font-size: 0.72rem; color: var(--text-muted); margin-bottom: 1rem; }
  .empty { font-size: 0.8rem; color: var(--text-muted); text-align: center; padding: 2rem; }

  /* P4.10 report cards */
  .report-total { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.75rem; font-size: 0.72rem; color: var(--text-muted); }
  .report-total strong { font-size: 1rem; color: var(--text-primary); }
  .report-total strong.red { color: var(--accent-red); }
  .rank-list { display: flex; flex-direction: column; gap: 0.45rem; }
  .rank-row { display: grid; grid-template-columns: 1fr auto auto; align-items: center; gap: 0.6rem; font-size: 0.78rem; }
  .rank-name { color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .rank-count { font-size: 0.68rem; color: var(--text-muted); }
  .rank-amount { font-weight: 600; color: var(--text-primary); }
  .rank-amount.red { color: var(--accent-red); }
  .kind-tag { font-size: 0.58rem; text-transform: uppercase; color: var(--text-muted); background: var(--bg-elevated); padding: 0.05rem 0.35rem; border-radius: 999px; }
  .util-row { display: flex; flex-direction: column; gap: 0.2rem; }
  .util-head { display: flex; justify-content: space-between; font-size: 0.78rem; }
  .util-bar { height: 5px; background: var(--border-default); border-radius: 3px; overflow: hidden; }
  .util-fill { height: 100%; background: var(--accent-green); border-radius: 3px; }
  .util-fill.high { background: var(--accent-red); }
  .util-sub { font-size: 0.66rem; color: var(--text-muted); }

  /* Category donut */
  .donut-area { display: flex; justify-content: center; margin-bottom: 1rem; }
  .cat-list { display: flex; flex-direction: column; gap: 0.4rem; }
  .cat-row { display: grid; grid-template-columns: 14px 1fr auto auto; align-items: center; gap: 0.5rem; }
  .cat-dot { width: 10px; height: 10px; border-radius: 50%; }
  .cat-name { font-size: 0.78rem; color: var(--text-primary); }
  .cat-pct { font-size: 0.7rem; color: var(--text-muted); text-align: right; }
  .cat-amount { font-size: 0.78rem; font-weight: 600; color: var(--text-primary); text-align: right; }

  /* Savings card */
  .savings-card { display: flex; flex-direction: column; align-items: center; }
  .savings-ring { position: relative; width: 160px; height: 160px; margin: 1rem 0; }
  .savings-ring svg { width: 100%; height: 100%; transform: rotate(-90deg); }
  .ring-bg { fill: none; stroke: var(--bg-hover); stroke-width: 3.5; }
  .ring-fill { fill: none; stroke: var(--accent-green); stroke-width: 3.5; stroke-linecap: round; transition: stroke-dasharray 0.5s; }
  .ring-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .ring-pct { font-size: 1.8rem; font-weight: 700; }
  .ring-pct.green { color: var(--accent-green); }
  .ring-pct.red { color: var(--accent-red); }
  .ring-label { font-size: 0.65rem; color: var(--text-muted); text-align: center; max-width: 80px; }
  .savings-breakdown { display: flex; flex-direction: column; gap: 0.4rem; width: 100%; }
  .sb-item { display: flex; justify-content: space-between; padding: 0.3rem 0; border-bottom: 1px solid var(--border-subtle); font-size: 0.78rem; }
  .sb-item:last-child { border-bottom: none; }
  .sb-label { color: var(--text-muted); }
  .sb-value { font-weight: 600; color: var(--text-primary); }
  .sb-value.green { color: var(--accent-green); }
  .sb-value.red { color: var(--accent-red); }

  @media (max-width: 900px) {
    .summary-row { grid-template-columns: repeat(2, 1fr); }
    .charts-grid { grid-template-columns: 1fr; }
    .chart-wide { grid-column: span 1; }
  }
</style>
