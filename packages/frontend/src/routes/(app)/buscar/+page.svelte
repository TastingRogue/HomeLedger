<script lang="ts">
  import { onMount } from 'svelte';
  import { search, type SearchResult, type SearchEntity } from '$lib/api/search';
  import { listAccounts, type AccountData } from '$lib/api/accounts';
  import { apiGet, ApiError } from '$lib/api/client';
  import { formatCurrency, formatDateShort } from '$lib/utils/format';
  import { t } from '$lib/i18n';

  interface Category { id: number; name: string }

  let q = $state('');
  let entityType = $state<'' | SearchEntity>('');
  let accountId = $state('');
  let categoryId = $state('');
  let txType = $state<'' | 'Ingreso' | 'Gasto'>('');
  let minAmount = $state('');
  let maxAmount = $state('');
  let startDate = $state('');
  let endDate = $state('');

  let accounts = $state<AccountData[]>([]);
  let categories = $state<Category[]>([]);
  let results = $state<SearchResult | null>(null);
  let loading = $state(false);
  let error = $state('');
  let searched = $state(false);

  onMount(async () => {
    try {
      const [accs, cats] = await Promise.all([listAccounts(), apiGet<Category[]>('/categories')]);
      accounts = accs; categories = cats;
    } catch { /* filters optional */ }
  });

  const hasCriteria = $derived(
    q.trim() !== '' || accountId !== '' || categoryId !== '' || txType !== '' ||
    minAmount !== '' || maxAmount !== '' || startDate !== '' || endDate !== '',
  );

  async function runSearch(e?: Event) {
    e?.preventDefault();
    if (!hasCriteria) return;
    loading = true; error = ''; searched = true;
    try {
      results = await search({
        q: q.trim() || undefined,
        type: entityType || undefined,
        accountId: accountId ? Number(accountId) : undefined,
        categoryId: categoryId ? Number(categoryId) : undefined,
        txType: txType || undefined,
        minAmount: minAmount ? Number(minAmount) : undefined,
        maxAmount: maxAmount ? Number(maxAmount) : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
    } catch (err) {
      error = err instanceof ApiError ? err.message : $t('search.error');
      results = null;
    } finally {
      loading = false;
    }
  }

  function clearAll() {
    q = ''; entityType = ''; accountId = ''; categoryId = ''; txType = '';
    minAmount = ''; maxAmount = ''; startDate = ''; endDate = '';
    results = null; searched = false; error = '';
  }
</script>

<svelte:head><title>{$t('search.title')} · HomeLedger</title></svelte:head>

<div class="page">
  <header class="page-header">
    <h1>{$t('search.title')}</h1>
    <p class="page-subtitle">{$t('search.subtitle')}</p>
  </header>

  <form class="search-bar" onsubmit={runSearch}>
    <input class="q-input" type="search" bind:value={q} placeholder={$t('search.placeholder')} aria-label={$t('search.placeholder')} />
    <button class="btn-search" type="submit" disabled={loading || !hasCriteria}>{loading ? $t('search.searching') : $t('search.search_btn')}</button>
    {#if searched}<button class="btn-clear" type="button" onclick={clearAll}>{$t('search.clear')}</button>{/if}
  </form>

  <div class="filters">
    <label>{$t('search.filter_entity')}
      <select bind:value={entityType}>
        <option value="">{$t('search.entity_all')}</option>
        <option value="transaction">{$t('search.entity_transactions')}</option>
        <option value="receipt">{$t('search.entity_receipts')}</option>
        <option value="subscription">{$t('search.entity_subscriptions')}</option>
      </select>
    </label>
    <label>{$t('search.filter_account')}
      <select bind:value={accountId}>
        <option value="">—</option>
        {#each accounts as a (a.id)}<option value={String(a.id)}>{a.name}</option>{/each}
      </select>
    </label>
    <label>{$t('search.filter_category')}
      <select bind:value={categoryId}>
        <option value="">—</option>
        {#each categories as c (c.id)}<option value={String(c.id)}>{c.name}</option>{/each}
      </select>
    </label>
    <label>{$t('search.filter_type')}
      <select bind:value={txType}>
        <option value="">—</option>
        <option value="Gasto">{$t('search.type_expense')}</option>
        <option value="Ingreso">{$t('search.type_income')}</option>
      </select>
    </label>
    <label>{$t('search.filter_min')}<input type="number" step="0.01" bind:value={minAmount} /></label>
    <label>{$t('search.filter_max')}<input type="number" step="0.01" bind:value={maxAmount} /></label>
    <label>{$t('search.filter_start')}<input type="date" bind:value={startDate} /></label>
    <label>{$t('search.filter_end')}<input type="date" bind:value={endDate} /></label>
  </div>

  {#if error}<div class="error">{error}</div>{/if}

  {#if loading}
    <div class="state-msg">{$t('search.searching')}</div>
  {:else if results}
    {#if results.totalCount === 0}
      <div class="state-msg">{$t('search.no_results')}</div>
    {:else}
      {#if results.transactions.length}
        <section class="result-group">
          <h2>{$t('search.entity_transactions')} <span class="count">{results.transactions.length}</span></h2>
          <div class="hits">
            {#each results.transactions as tx (tx.id)}
              <a class="hit" href="/transacciones">
                <div class="hit-main">
                  <span class="hit-name">{tx.name}</span>
                  <span class="hit-meta">{tx.merchant ? `${tx.merchant} · ` : ''}{tx.categoryName ?? ''} · {tx.accountName ?? ''} · {formatDateShort(tx.date)}</span>
                </div>
                <span class="hit-amount" class:neg={tx.type === 'Gasto'}>{tx.type === 'Gasto' ? '−' : '+'}{formatCurrency(tx.amount)}</span>
              </a>
            {/each}
          </div>
        </section>
      {/if}

      {#if results.receipts.length}
        <section class="result-group">
          <h2>{$t('search.entity_receipts')} <span class="count">{results.receipts.length}</span></h2>
          <div class="hits">
            {#each results.receipts as r (r.id)}
              <a class="hit" href="/recibos">
                <div class="hit-main">
                  <span class="hit-name">{r.merchant ?? r.uuid ?? `#${r.id}`}</span>
                  <span class="hit-meta">{r.issuerRfc ? `${r.issuerRfc} · ` : ''}{r.receiptDate ? formatDateShort(r.receiptDate) : ''}</span>
                </div>
                <span class="hit-amount">{r.total != null ? formatCurrency(r.total) : '—'}</span>
              </a>
            {/each}
          </div>
        </section>
      {/if}

      {#if results.subscriptions.length}
        <section class="result-group">
          <h2>{$t('search.entity_subscriptions')} <span class="count">{results.subscriptions.length}</span></h2>
          <div class="hits">
            {#each results.subscriptions as s (s.id)}
              <a class="hit" href="/suscripciones">
                <div class="hit-main">
                  <span class="hit-name">{s.name}</span>
                  <span class="hit-meta">{s.cycle} · {s.status} · {s.accountName ?? ''} · {formatDateShort(s.nextPaymentDate)}</span>
                </div>
                <span class="hit-amount">{formatCurrency(s.amount)}</span>
              </a>
            {/each}
          </div>
        </section>
      {/if}
    {/if}
  {:else if !searched}
    <div class="state-msg hint">{$t('search.prompt')}</div>
  {/if}
</div>

<style>
  .page { width: 100%; margin: 0; }
  .page-header { margin-bottom: 1.25rem; }
  .page-header h1 { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); }
  .page-subtitle { font-size: 0.8rem; color: var(--text-muted); margin-top: 0.15rem; }

  .search-bar { display: flex; gap: 0.5rem; margin-bottom: 0.75rem; }
  .q-input { flex: 1; padding: 0.6rem 0.8rem; background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-md); color: var(--text-primary); font-size: 0.9rem; outline: none; }
  .btn-search { padding: 0.6rem 1.1rem; background: var(--accent-purple); color: #fff; border: none; border-radius: var(--radius-md); font-weight: 600; font-size: 0.82rem; cursor: pointer; }
  .btn-search:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-clear { padding: 0.6rem 0.9rem; background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-md); color: var(--text-secondary); font-size: 0.82rem; cursor: pointer; }

  .filters { display: flex; flex-wrap: wrap; gap: 0.6rem; margin-bottom: 1.25rem; }
  .filters label { display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); }
  .filters select, .filters input { padding: 0.4rem 0.5rem; background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-sm); color: var(--text-primary); font-size: 0.78rem; min-width: 120px; }

  .error { padding: 0.6rem 0.75rem; background: rgba(239,68,68,.08); border: 1px solid rgba(239,68,68,.2); color: var(--accent-red); border-radius: var(--radius-md); font-size: 0.78rem; margin-bottom: 1rem; }
  .state-msg { padding: 2rem 0; text-align: center; color: var(--text-muted); font-size: 0.82rem; }
  .state-msg.hint { color: var(--text-secondary); }

  .result-group { margin-bottom: 1.5rem; }
  .result-group h2 { font-size: 0.85rem; color: var(--text-primary); margin-bottom: 0.6rem; display: flex; align-items: center; gap: 0.5rem; }
  .count { font-size: 0.65rem; font-weight: 600; background: var(--bg-elevated); color: var(--text-muted); padding: 0.1rem 0.45rem; border-radius: 999px; }
  .hits { display: flex; flex-direction: column; gap: 0.4rem; }
  .hit { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; padding: 0.6rem 0.85rem; background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-md); text-decoration: none; transition: border-color 0.15s; }
  .hit:hover { border-color: var(--accent-purple); }
  .hit-main { display: flex; flex-direction: column; min-width: 0; }
  .hit-name { font-size: 0.82rem; font-weight: 500; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .hit-meta { font-size: 0.68rem; color: var(--text-muted); }
  .hit-amount { font-size: 0.85rem; font-weight: 600; color: var(--accent-green); white-space: nowrap; }
  .hit-amount.neg { color: var(--accent-red); }

  /* Phones: let the search bar wrap (input full-width above the buttons) and
     the filter fields fill the row so nothing overflows ~390px. */
  @media (max-width: 640px) {
    .search-bar { flex-wrap: wrap; }
    .q-input { flex: 1 1 100%; }
    .btn-search, .btn-clear { flex: 1 1 auto; }
    .filters label { flex: 1 1 45%; }
    .filters select, .filters input { min-width: 0; width: 100%; }
  }
</style>
