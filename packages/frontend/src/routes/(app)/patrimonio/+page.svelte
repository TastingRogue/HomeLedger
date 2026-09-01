<script lang="ts">
  import { onMount } from 'svelte';
  import {
    getNetWorth, createAsset, updateAsset, deleteAsset,
    createLiability, updateLiability, deleteLiability,
    type NetWorthSummary, type Asset, type Liability
  } from '$lib/api/networth';
  import { ApiError } from '$lib/api/client';
  import { formatCurrency } from '$lib/utils/format';
  import { t } from '$lib/i18n';

  let data = $state<NetWorthSummary | null>(null);
  let loading = $state(true);
  let error = $state('');

  // Modal state (shared for asset/liability create/edit)
  let showModal = $state(false);
  let modalKind = $state<'asset' | 'liability'>('asset');
  let editingId = $state<number | null>(null);
  let saving = $state(false);
  let formError = $state('');
  let form = $state<{ name: string; amount: string; type: string; notes: string }>({ name: '', amount: '', type: '', notes: '' });

  const isEditing = $derived(editingId !== null);

  onMount(load);
  async function load() {
    loading = true; error = '';
    try { data = await getNetWorth(); }
    catch (e) { error = e instanceof ApiError ? e.message : $t('networth.error_loading'); }
    finally { loading = false; }
  }

  function openCreate(kind: 'asset' | 'liability') {
    modalKind = kind; editingId = null; formError = '';
    form = { name: '', amount: '', type: '', notes: '' };
    showModal = true;
  }
  function openEditAsset(a: Asset) {
    modalKind = 'asset'; editingId = a.id; formError = '';
    form = { name: a.name, amount: String(a.value), type: a.type, notes: a.notes ?? '' };
    showModal = true;
  }
  function openEditLiability(l: Liability) {
    modalKind = 'liability'; editingId = l.id; formError = '';
    form = { name: l.name, amount: String(l.balance), type: l.type, notes: l.notes ?? '' };
    showModal = true;
  }
  function closeModal() { showModal = false; editingId = null; formError = ''; }

  async function save() {
    formError = '';
    const name = form.name.trim();
    const amount = parseFloat(form.amount);
    const type = form.type.trim();
    if (!name) { formError = $t('networth.name_required'); return; }
    if (isNaN(amount)) { formError = $t('networth.value_required'); return; }
    if (!type) { formError = $t('networth.type_required'); return; }
    saving = true;
    try {
      const notes = form.notes.trim() || null;
      if (modalKind === 'asset') {
        if (isEditing) await updateAsset(editingId!, { name, value: amount, type, notes });
        else await createAsset({ name, value: amount, type, notes });
      } else {
        if (isEditing) await updateLiability(editingId!, { name, balance: amount, type, notes });
        else await createLiability({ name, balance: amount, type, notes });
      }
      closeModal();
      await load();
    } catch (e) {
      formError = e instanceof ApiError ? e.message : $t('networth.error_saving');
    } finally { saving = false; }
  }

  async function removeAsset(a: Asset) {
    if (!confirm($t('networth.delete_asset_confirm', { name: a.name }))) return;
    error = '';
    try { await deleteAsset(a.id); await load(); }
    catch (e) { error = e instanceof ApiError ? e.message : $t('networth.error_deleting'); }
  }
  async function removeLiability(l: Liability) {
    if (!confirm($t('networth.delete_liability_confirm', { name: l.name }))) return;
    error = '';
    try { await deleteLiability(l.id); await load(); }
    catch (e) { error = e instanceof ApiError ? e.message : $t('networth.error_deleting'); }
  }
</script>

<svelte:head><title>{$t('networth.title')} · HomeLedger</title></svelte:head>

<div class="page">
  <header class="page-header">
    <div>
      <h1>{$t('networth.title')}</h1>
      <p class="page-subtitle">{$t('networth.subtitle')}</p>
    </div>
  </header>

  {#if error}<div class="error" role="alert">{error}</div>{/if}

  {#if loading}
    <div class="loading"><div class="spinner"></div><span>{$t('networth.loading')}</span></div>
  {:else if data}
    <!-- Summary -->
    <div class="summary-row">
      <div class="summary-card">
        <span class="sc-label">{$t('networth.total_assets')}</span>
        <span class="sc-value positive">{formatCurrency(data.totalAssets)}</span>
        <span class="sc-hint">{$t('networth.account_balances')}: {formatCurrency(data.accountBalances)} · {$t('networth.asset_values')}: {formatCurrency(data.assetValues)}</span>
      </div>
      <div class="summary-card">
        <span class="sc-label">{$t('networth.total_liabilities')}</span>
        <span class="sc-value negative">{formatCurrency(data.totalLiabilities)}</span>
      </div>
      <div class="summary-card highlight">
        <span class="sc-label">{$t('networth.net_worth')}</span>
        <span class="sc-value" class:positive={data.netWorth >= 0} class:negative={data.netWorth < 0}>{formatCurrency(data.netWorth)}</span>
      </div>
    </div>

    <div class="lists">
      <!-- Assets -->
      <section class="list-card">
        <div class="list-head">
          <h2>{$t('networth.assets_section')}</h2>
          <button class="btn-add" onclick={() => openCreate('asset')}>{$t('networth.add_asset')}</button>
        </div>
        {#if data.assets.length === 0}
          <p class="empty">{$t('networth.no_assets')}</p>
        {:else}
          <div class="items">
            {#each data.assets as a (a.id)}
              <div class="item">
                <div class="item-info">
                  <span class="item-name">{a.name}</span>
                  <span class="item-type">{a.type}{a.notes ? ` · ${a.notes}` : ''}</span>
                </div>
                <span class="item-amount positive">{formatCurrency(a.value)}</span>
                <div class="item-actions">
                  <button class="btn-icon" onclick={() => openEditAsset(a)} aria-label={$t('common.edit')}>✎</button>
                  <button class="btn-icon danger" onclick={() => removeAsset(a)} aria-label={$t('common.delete')}>✕</button>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </section>

      <!-- Liabilities -->
      <section class="list-card">
        <div class="list-head">
          <h2>{$t('networth.liabilities_section')}</h2>
          <button class="btn-add" onclick={() => openCreate('liability')}>{$t('networth.add_liability')}</button>
        </div>
        {#if data.liabilities.length === 0}
          <p class="empty">{$t('networth.no_liabilities')}</p>
        {:else}
          <div class="items">
            {#each data.liabilities as l (l.id)}
              <div class="item">
                <div class="item-info">
                  <span class="item-name">{l.name}</span>
                  <span class="item-type">{l.type}{l.notes ? ` · ${l.notes}` : ''}</span>
                </div>
                <span class="item-amount negative">{formatCurrency(l.balance)}</span>
                <div class="item-actions">
                  <button class="btn-icon" onclick={() => openEditLiability(l)} aria-label={$t('common.edit')}>✎</button>
                  <button class="btn-icon danger" onclick={() => removeLiability(l)} aria-label={$t('common.delete')}>✕</button>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </section>
    </div>
  {/if}
</div>

<!-- Create/Edit Modal -->
{#if showModal}
  <div class="overlay" role="presentation" onclick={closeModal}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="modal" role="dialog" aria-modal="true" tabindex="-1" onclick={(e) => e.stopPropagation()}>
      <header class="modal-head">
        <h2>{modalKind === 'asset' ? (isEditing ? $t('networth.edit_asset') : $t('networth.new_asset')) : (isEditing ? $t('networth.edit_liability') : $t('networth.new_liability'))}</h2>
        <button class="close" onclick={closeModal}>×</button>
      </header>
      {#if formError}<div class="error">{formError}</div>{/if}
      <form onsubmit={(e) => { e.preventDefault(); save(); }}>
        <label class="fld">{$t('networth.form_name')}
          <input type="text" bind:value={form.name} maxlength={100} placeholder={modalKind === 'asset' ? $t('networth.form_name_asset_placeholder') : $t('networth.form_name_liability_placeholder')} />
        </label>
        <div class="fld-row">
          <label class="fld">{modalKind === 'asset' ? $t('networth.form_value') : $t('networth.form_balance')}
            <input type="number" step="0.01" bind:value={form.amount} />
          </label>
          <label class="fld">{$t('networth.form_type')}
            <input type="text" bind:value={form.type} maxlength={50} placeholder={$t('networth.form_type_placeholder')} />
          </label>
        </div>
        <label class="fld">{$t('networth.form_notes')} <span class="opt">{$t('networth.form_notes_optional')}</span>
          <input type="text" bind:value={form.notes} maxlength={200} />
        </label>
        <div class="form-buttons">
          <button type="button" class="btn-cancel" onclick={closeModal} disabled={saving}>{$t('common.cancel')}</button>
          <button type="submit" class="btn-submit" disabled={saving}>{saving ? $t('common.saving') : (isEditing ? $t('networth.save_changes') : $t('networth.create'))}</button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  .page { width: 100%; margin: 0; }
  .page-header { margin-bottom: 1.25rem; }
  .page-header h1 { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); }
  .page-subtitle { font-size: 0.8rem; color: var(--text-muted); margin-top: 0.15rem; }

  .error { background: var(--tag-red-bg); color: var(--accent-red); padding: 0.5rem 0.7rem; border-radius: var(--radius-sm); font-size: 0.8rem; margin-bottom: 1rem; }
  .loading { display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 3rem; color: var(--text-muted); font-size: 0.8rem; }
  .spinner { width: 18px; height: 18px; border: 2px solid var(--border-default); border-top-color: var(--accent-blue); border-radius: 50%; animation: spin 0.6s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .summary-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.75rem; margin-bottom: 1.25rem; }
  .summary-card { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 1rem; display: flex; flex-direction: column; gap: 0.25rem; }
  .summary-card.highlight { border-color: var(--accent-blue); }
  .sc-label { font-size: 0.65rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); }
  .sc-value { font-size: 1.3rem; font-weight: 700; color: var(--text-primary); }
  .sc-value.positive { color: var(--accent-green); }
  .sc-value.negative { color: var(--accent-red); }
  .sc-hint { font-size: 0.62rem; color: var(--text-muted); }

  .lists { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  @media (max-width: 768px) { .lists { grid-template-columns: 1fr; } }
  .list-card { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 1rem; }
  .list-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; }
  .list-head h2 { font-size: 0.95rem; font-weight: 600; color: var(--text-primary); }
  .btn-add { padding: 0.3rem 0.6rem; background: var(--accent-blue); color: #fff; border: none; border-radius: var(--radius-sm); font-size: 0.72rem; font-weight: 500; cursor: pointer; }
  .btn-add:hover { opacity: 0.9; }
  .empty { font-size: 0.78rem; color: var(--text-muted); text-align: center; padding: 1.5rem 0; }

  .items { display: flex; flex-direction: column; gap: 0.4rem; }
  .item { display: flex; align-items: center; gap: 0.6rem; padding: 0.55rem 0.65rem; background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-md); }
  .item-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .item-name { font-size: 0.82rem; font-weight: 500; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .item-type { font-size: 0.65rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .item-amount { font-size: 0.85rem; font-weight: 600; white-space: nowrap; }
  .item-amount.positive { color: var(--accent-green); }
  .item-amount.negative { color: var(--accent-red); }
  .item-actions { display: flex; gap: 0.2rem; }
  .btn-icon { background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 0.8rem; padding: 0.2rem 0.3rem; border-radius: var(--radius-sm); }
  .btn-icon:hover { background: var(--bg-hover); color: var(--text-primary); }
  .btn-icon.danger:hover { color: var(--accent-red); }

  .overlay { position: fixed; inset: 0; background: rgba(0,0,0,.58); z-index: 250; display: flex; align-items: center; justify-content: center; padding: 1.5rem; }
  .modal { width: 100%; max-width: 460px; background: var(--bg-default); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 1.25rem; box-shadow: 0 24px 70px rgba(0,0,0,.45); }
  .modal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
  .modal-head h2 { font-size: 1rem; font-weight: 600; color: var(--text-primary); }
  .close { background: none; border: 0; color: var(--text-muted); font-size: 1.5rem; cursor: pointer; }
  .fld { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); margin-bottom: 0.7rem; }
  .fld .opt { text-transform: none; letter-spacing: 0; }
  .fld input { background: var(--bg-surface); border: 1px solid var(--border-default); color: var(--text-primary); border-radius: var(--radius-md); padding: 0.5rem 0.6rem; font-size: 0.82rem; outline: none; }
  .fld-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
  .form-buttons { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.5rem; }
  .btn-cancel { padding: 0.45rem 0.8rem; background: var(--bg-surface); color: var(--text-secondary); border: 1px solid var(--border-default); border-radius: var(--radius-md); font-size: 0.78rem; cursor: pointer; }
  .btn-submit { padding: 0.45rem 0.9rem; background: var(--accent-blue); color: #fff; border: none; border-radius: var(--radius-md); font-size: 0.78rem; font-weight: 500; cursor: pointer; }
  .btn-submit:disabled, .btn-cancel:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
