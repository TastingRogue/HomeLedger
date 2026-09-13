<script lang="ts">
  import { onMount } from 'svelte';
  import {
    getNetWorth, createAsset, updateAsset, deleteAsset,
    createLiability, updateLiability, deleteLiability,
    type NetWorthSummary, type Asset, type Liability, type AssetInput, type AssetStatus
  } from '$lib/api/networth';
  import { getTransactions, type Transaction } from '$lib/api/transactions';
  import { listAttachments, type Attachment } from '$lib/api/attachments';
  import { ApiError } from '$lib/api/client';
  import { formatCurrency } from '$lib/utils/format';
  import { t } from '$lib/i18n';
  import { modalPanel, scrim } from '$lib/motion';
  import Icon from '$lib/components/Icon.svelte';
  import Tooltip from '$lib/components/Tooltip.svelte';

  let data = $state<NetWorthSummary | null>(null);
  let loading = $state(true);
  let error = $state('');

  // How the asset list is rendered: flat list or grouped by physical location.
  let assetView = $state<'list' | 'location'>('list');

  // Optional link sources, loaded lazily the first time the asset modal opens.
  let recentTransactions = $state<Transaction[]>([]);
  let attachments = $state<Attachment[]>([]);
  let linksLoaded = $state(false);

  // Modal state (shared for asset/liability create/edit)
  let showModal = $state(false);
  let modalKind = $state<'asset' | 'liability'>('asset');
  let editingId = $state<number | null>(null);
  let saving = $state(false);
  let formError = $state('');

  // Full asset form. Liabilities only use name/amount/type/notes.
  interface FormState {
    name: string;
    amount: string;       // currentValue (asset) or balance (liability)
    type: string;
    notes: string;
    // ── asset-only optional fields ──
    brand: string;
    model: string;
    serialNumber: string;
    category: string;
    purchaseDate: string;
    purchasePrice: string;
    location: string;
    status: AssetStatus;
    purchaseTransactionId: string; // '' = none
    receiptAttachmentId: string;   // '' = none
  }
  const emptyForm = (): FormState => ({
    name: '', amount: '', type: '', notes: '',
    brand: '', model: '', serialNumber: '', category: '',
    purchaseDate: '', purchasePrice: '', location: '',
    status: 'active', purchaseTransactionId: '', receiptAttachmentId: '',
  });
  let form = $state<FormState>(emptyForm());
  // Whether the collapsible "details" section of the asset form is expanded.
  let showDetails = $state(false);

  const isEditing = $derived(editingId !== null);

  onMount(load);
  async function load() {
    loading = true; error = '';
    try { data = await getNetWorth(); }
    catch (e) { error = e instanceof ApiError ? e.message : $t('networth.error_loading'); }
    finally { loading = false; }
  }

  // Lazily fetch the recent transactions + attachments used to populate the
  // optional "purchase transaction" and "receipt" selectors. Best-effort:
  // failing to load link sources must not block asset editing.
  async function ensureLinks() {
    if (linksLoaded) return;
    linksLoaded = true;
    try {
      const [tx, att] = await Promise.all([
        getTransactions({ page: 1, pageSize: 100 }),
        listAttachments(),
      ]);
      recentTransactions = tx.items;
      attachments = att;
    } catch {
      // leave selectors empty; the asset can still be saved without links
    }
  }

  function openCreate(kind: 'asset' | 'liability') {
    modalKind = kind; editingId = null; formError = '';
    form = emptyForm();
    showDetails = false;
    showModal = true;
    if (kind === 'asset') void ensureLinks();
  }
  function openEditAsset(a: Asset) {
    modalKind = 'asset'; editingId = a.id; formError = '';
    form = {
      name: a.name,
      amount: String(a.currentValue),
      type: a.type,
      notes: a.notes ?? '',
      brand: a.brand ?? '',
      model: a.model ?? '',
      serialNumber: a.serialNumber ?? '',
      category: a.category ?? '',
      purchaseDate: a.purchaseDate ?? '',
      purchasePrice: a.purchasePrice != null ? String(a.purchasePrice) : '',
      location: a.location ?? '',
      status: a.status ?? 'active',
      purchaseTransactionId: a.purchaseTransactionId != null ? String(a.purchaseTransactionId) : '',
      receiptAttachmentId: a.receiptAttachmentId != null ? String(a.receiptAttachmentId) : '',
    };
    // Auto-expand details when the asset already carries any extra data.
    showDetails = !!(a.brand || a.model || a.serialNumber || a.category || a.purchaseDate ||
      a.purchasePrice != null || a.location || a.purchaseTransactionId != null || a.receiptAttachmentId != null);
    showModal = true;
    void ensureLinks();
  }
  function openEditLiability(l: Liability) {
    modalKind = 'liability'; editingId = l.id; formError = '';
    form = { ...emptyForm(), name: l.name, amount: String(l.balance), type: l.type, notes: l.notes ?? '' };
    showModal = true;
  }
  function closeModal() { showModal = false; editingId = null; formError = ''; }
  function handleKeydown(e: KeyboardEvent) { if (e.key === 'Escape' && showModal) closeModal(); }

  function num(s: string): number | null {
    const v = s.trim();
    if (v === '') return null;
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }
  function intOrNull(s: string): number | null {
    const v = s.trim();
    if (v === '') return null;
    const n = parseInt(v, 10);
    return Number.isNaN(n) ? null : n;
  }

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
        const payload: AssetInput = {
          name,
          currentValue: amount,
          type,
          notes,
          brand: form.brand.trim() || null,
          model: form.model.trim() || null,
          serialNumber: form.serialNumber.trim() || null,
          category: form.category.trim() || null,
          purchaseDate: form.purchaseDate.trim() || null,
          purchasePrice: num(form.purchasePrice),
          location: form.location.trim() || null,
          status: form.status,
          purchaseTransactionId: intOrNull(form.purchaseTransactionId),
          receiptAttachmentId: intOrNull(form.receiptAttachmentId),
        };
        if (isEditing) await updateAsset(editingId!, payload);
        else await createAsset(payload);
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

  // Human label for an asset status chip.
  function statusLabel(s: AssetStatus): string {
    return $t(`networth.status_${s}`);
  }

  // Group assets by location for the inventory view. Assets without a location
  // fall into a single "sin ubicación" bucket rendered last.
  const groupedAssets = $derived.by(() => {
    const groups = new Map<string, Asset[]>();
    for (const a of data?.assets ?? []) {
      const key = (a.location ?? '').trim() || '__none__';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(a);
    }
    // Stable order: named locations alphabetically, "none" bucket last.
    return [...groups.entries()]
      .sort(([a], [b]) => {
        if (a === '__none__') return 1;
        if (b === '__none__') return -1;
        return a.localeCompare(b);
      })
      .map(([key, items]) => ({
        label: key === '__none__' ? $t('networth.location_none') : key,
        total: items.reduce((s, a) => s + a.currentValue, 0),
        items,
      }));
  });

  // Compact one-line subtitle for an asset row (type + brand/model when present).
  function assetSubtitle(a: Asset): string {
    const parts = [a.type];
    const bm = [a.brand, a.model].filter(Boolean).join(' ');
    if (bm) parts.push(bm);
    if (a.notes) parts.push(a.notes);
    return parts.join(' · ');
  }
</script>

<svelte:head><title>{$t('networth.title')} · HomeLedger</title></svelte:head>
<svelte:window onkeydown={handleKeydown} />

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
          <div class="head-actions">
            {#if data.assets.length > 0}
              <div class="view-toggle" role="group" aria-label={$t('networth.view_toggle_label')}>
                <button
                  class="vt-btn" class:active={assetView === 'list'}
                  onclick={() => (assetView = 'list')}
                  title={$t('networth.view_list')} aria-pressed={assetView === 'list'}
                >
                  <Icon name="table" size={15} />
                </button>
                <button
                  class="vt-btn" class:active={assetView === 'location'}
                  onclick={() => (assetView = 'location')}
                  title={$t('networth.view_location')} aria-pressed={assetView === 'location'}
                >
                  <Icon name="map-pin" size={15} />
                </button>
              </div>
            {/if}
            <button class="btn-add" onclick={() => openCreate('asset')}>{$t('networth.add_asset')}</button>
          </div>
        </div>
        {#if data.assets.length === 0}
          <p class="empty">{$t('networth.no_assets')}</p>
        {:else if assetView === 'list'}
          <div class="items">
            {#each data.assets as a (a.id)}
              <div class="item">
                <div class="item-info">
                  <span class="item-name">
                    {a.name}
                    {#if a.status !== 'active'}<span class="status-chip {a.status}">{statusLabel(a.status)}</span>{/if}
                  </span>
                  <span class="item-type">{assetSubtitle(a)}</span>
                </div>
                {#if a.receiptAttachmentId != null}
                  <span class="link-badge" title={$t('networth.has_receipt')}><Icon name="receipt" size={13} /></span>
                {/if}
                {#if a.purchaseTransactionId != null}
                  <span class="link-badge" title={$t('networth.has_purchase_tx')}><Icon name="dollar-sign" size={13} /></span>
                {/if}
                <span class="item-amount positive">{formatCurrency(a.currentValue)}</span>
                <div class="item-actions">
                  <button class="btn-icon" onclick={() => openEditAsset(a)} aria-label={$t('common.edit')}><Icon name="pencil" size={15} /></button>
                  <button class="btn-icon danger" onclick={() => removeAsset(a)} aria-label={$t('common.delete')}><Icon name="trash" size={15} /></button>
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <!-- Inventory grouped by physical location -->
          <div class="loc-groups">
            {#each groupedAssets as g (g.label)}
              <div class="loc-group">
                <div class="loc-head">
                  <span class="loc-name"><Icon name="map-pin" size={13} /> {g.label}</span>
                  <span class="loc-total">{formatCurrency(g.total)}</span>
                </div>
                <div class="items">
                  {#each g.items as a (a.id)}
                    <div class="item">
                      <div class="item-info">
                        <span class="item-name">
                          {a.name}
                          {#if a.status !== 'active'}<span class="status-chip {a.status}">{statusLabel(a.status)}</span>{/if}
                        </span>
                        <span class="item-type">{assetSubtitle(a)}</span>
                      </div>
                      <span class="item-amount positive">{formatCurrency(a.currentValue)}</span>
                      <div class="item-actions">
                        <button class="btn-icon" onclick={() => openEditAsset(a)} aria-label={$t('common.edit')}><Icon name="pencil" size={15} /></button>
                        <button class="btn-icon danger" onclick={() => removeAsset(a)} aria-label={$t('common.delete')}><Icon name="trash" size={15} /></button>
                      </div>
                    </div>
                  {/each}
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
                  <button class="btn-icon" onclick={() => openEditLiability(l)} aria-label={$t('common.edit')}><Icon name="pencil" size={15} /></button>
                  <button class="btn-icon danger" onclick={() => removeLiability(l)} aria-label={$t('common.delete')}><Icon name="trash" size={15} /></button>
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
  <div class="overlay" role="presentation" onclick={closeModal} transition:scrim>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="modal" role="dialog" aria-modal="true" tabindex="-1" onclick={(e) => e.stopPropagation()} transition:modalPanel>
      <header class="modal-head">
        <h2>{modalKind === 'asset' ? (isEditing ? $t('networth.edit_asset') : $t('networth.new_asset')) : (isEditing ? $t('networth.edit_liability') : $t('networth.new_liability'))}</h2>
        <button class="close" onclick={closeModal} aria-label={$t('common.cancel')}><Icon name="x" size={18} /></button>
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

        {#if modalKind === 'asset'}
          <!-- Collapsible advanced section: everything here is optional. -->
          <button type="button" class="details-toggle" onclick={() => (showDetails = !showDetails)} aria-expanded={showDetails}>
            <Icon name={showDetails ? 'minus-circle' : 'plus-circle'} size={15} />
            {$t('networth.form_details_toggle')}
          </button>

          {#if showDetails}
            <div class="details">
              <div class="fld-row">
                <label class="fld">{$t('networth.form_brand')} <span class="opt">{$t('networth.form_optional')}</span>
                  <input type="text" bind:value={form.brand} maxlength={50} />
                </label>
                <label class="fld">{$t('networth.form_model')} <span class="opt">{$t('networth.form_optional')}</span>
                  <input type="text" bind:value={form.model} maxlength={50} />
                </label>
              </div>
              <div class="fld-row">
                <label class="fld">{$t('networth.form_serial')} <span class="opt">{$t('networth.form_optional')}</span>
                  <input type="text" bind:value={form.serialNumber} maxlength={80} />
                </label>
                <label class="fld">{$t('networth.form_category')} <span class="opt">{$t('networth.form_optional')}</span>
                  <input type="text" bind:value={form.category} maxlength={50} placeholder={$t('networth.form_category_placeholder')} />
                </label>
              </div>
              <div class="fld-row">
                <label class="fld">
                  <span class="field-label-row">{$t('networth.form_location')} <Tooltip text={$t('networth.form_location_tooltip')} /></span>
                  <input type="text" bind:value={form.location} maxlength={80} placeholder={$t('networth.form_location_placeholder')} />
                </label>
                <label class="fld">{$t('networth.form_status')}
                  <select bind:value={form.status}>
                    <option value="active">{$t('networth.status_active')}</option>
                    <option value="sold">{$t('networth.status_sold')}</option>
                    <option value="disposed">{$t('networth.status_disposed')}</option>
                  </select>
                </label>
              </div>
              <div class="fld-row">
                <label class="fld">
                  <span class="field-label-row">{$t('networth.form_purchase_date')} <Tooltip text={$t('networth.form_purchase_date_tooltip')} /></span>
                  <input type="date" bind:value={form.purchaseDate} />
                </label>
                <label class="fld">
                  <span class="field-label-row">{$t('networth.form_purchase_price')} <Tooltip text={$t('networth.form_purchase_price_tooltip')} /></span>
                  <input type="number" step="0.01" bind:value={form.purchasePrice} />
                </label>
              </div>
              <label class="fld">
                <span class="field-label-row">{$t('networth.form_purchase_tx')} <Tooltip text={$t('networth.form_purchase_tx_tooltip')} /></span>
                <select bind:value={form.purchaseTransactionId}>
                  <option value="">{$t('networth.form_link_none')}</option>
                  {#each recentTransactions as tx (tx.id)}
                    <option value={String(tx.id)}>{tx.date} · {tx.name} · {formatCurrency(tx.amount)}</option>
                  {/each}
                </select>
              </label>
              <label class="fld">
                <span class="field-label-row">{$t('networth.form_receipt')} <Tooltip text={$t('networth.form_receipt_tooltip')} /></span>
                <select bind:value={form.receiptAttachmentId}>
                  <option value="">{$t('networth.form_link_none')}</option>
                  {#each attachments as att (att.id)}
                    <option value={String(att.id)}>{att.originalName ?? att.filename}</option>
                  {/each}
                </select>
              </label>
            </div>
          {/if}
        {/if}

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

  .lists { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; align-items: start; }
  @media (max-width: 768px) { .lists { grid-template-columns: 1fr; } }
  .list-card { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 1rem; }
  .list-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; gap: 0.5rem; }
  .list-head h2 { font-size: 0.95rem; font-weight: 600; color: var(--text-primary); }
  .head-actions { display: flex; align-items: center; gap: 0.5rem; }
  .view-toggle { display: inline-flex; border: 1px solid var(--border-default); border-radius: var(--radius-sm); overflow: hidden; }
  .vt-btn { display: inline-flex; align-items: center; justify-content: center; padding: 0.28rem 0.4rem; background: var(--bg-surface); color: var(--text-muted); border: none; cursor: pointer; }
  .vt-btn + .vt-btn { border-left: 1px solid var(--border-default); }
  .vt-btn:hover { color: var(--text-primary); }
  .vt-btn.active { background: var(--accent-blue); color: #fff; }
  .btn-add { padding: 0.3rem 0.6rem; background: var(--accent-blue); color: #fff; border: none; border-radius: var(--radius-sm); font-size: 0.72rem; font-weight: 500; cursor: pointer; }
  .btn-add:hover { opacity: 0.9; }
  .empty { font-size: 0.78rem; color: var(--text-muted); text-align: center; padding: 1.5rem 0; }

  .loc-groups { display: flex; flex-direction: column; gap: 1rem; }
  .loc-group { display: flex; flex-direction: column; gap: 0.4rem; }
  .loc-head { display: flex; align-items: center; justify-content: space-between; padding: 0 0.2rem; }
  .loc-name { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.72rem; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.03em; }
  .loc-total { font-size: 0.72rem; font-weight: 600; color: var(--accent-green); }

  .items { display: flex; flex-direction: column; gap: 0.4rem; }
  .item { display: flex; align-items: center; gap: 0.6rem; padding: 0.55rem 0.65rem; background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-md); }
  .item-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .item-name { font-size: 0.82rem; font-weight: 500; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; gap: 0.35rem; }
  .item-type { font-size: 0.65rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .item-amount { font-size: 0.85rem; font-weight: 600; white-space: nowrap; }
  .item-amount.positive { color: var(--accent-green); }
  .item-amount.negative { color: var(--accent-red); }
  .item-actions { display: flex; gap: 0.2rem; }
  .btn-icon { display: inline-flex; align-items: center; justify-content: center; background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 0.2rem; border-radius: var(--radius-sm); }
  .btn-icon:hover { background: var(--bg-hover); color: var(--text-primary); }
  .btn-icon.danger:hover { color: var(--accent-red); }

  .status-chip { font-size: 0.58rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; padding: 0.05rem 0.3rem; border-radius: 999px; }
  .status-chip.sold { background: var(--tag-blue-bg, rgba(59,130,246,.15)); color: var(--accent-blue); }
  .status-chip.disposed { background: var(--tag-red-bg); color: var(--accent-red); }
  .link-badge { display: inline-flex; align-items: center; color: var(--text-muted); }

  .overlay { position: fixed; inset: 0; background: rgba(0,0,0,.58); z-index: 250; display: flex; align-items: center; justify-content: center; padding: 1.5rem; }
  .modal { width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto; background: var(--bg-default); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 1.25rem; box-shadow: 0 24px 70px rgba(0,0,0,.45); }
  .modal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
  .modal-head h2 { font-size: 1rem; font-weight: 600; color: var(--text-primary); }
  .close { display: inline-flex; align-items: center; background: none; border: 0; color: var(--text-muted); cursor: pointer; padding: 0.2rem; }
  .close:hover { color: var(--text-primary); }
  .fld { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); margin-bottom: 0.7rem; }
  .fld .opt { text-transform: none; letter-spacing: 0; }
  .field-label-row { display: inline-flex; align-items: center; gap: 0.3rem; }
  .fld input, .fld select { background: var(--bg-surface); border: 1px solid var(--border-default); color: var(--text-primary); border-radius: var(--radius-md); padding: 0.5rem 0.6rem; font-size: 0.82rem; outline: none; }
  .fld input:focus, .fld select:focus { border-color: var(--accent-blue); }
  .fld-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
  .details-toggle { display: inline-flex; align-items: center; gap: 0.35rem; background: none; border: none; color: var(--accent-blue); font-size: 0.72rem; font-weight: 500; cursor: pointer; padding: 0.1rem 0; margin-bottom: 0.6rem; }
  .details { border-top: 1px solid var(--border-default); padding-top: 0.7rem; margin-bottom: 0.3rem; }
  .form-buttons { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.5rem; }
  .btn-cancel { padding: 0.45rem 0.8rem; background: var(--bg-surface); color: var(--text-secondary); border: 1px solid var(--border-default); border-radius: var(--radius-md); font-size: 0.78rem; cursor: pointer; }
  .btn-submit { padding: 0.45rem 0.9rem; background: var(--accent-blue); color: #fff; border: none; border-radius: var(--radius-md); font-size: 0.78rem; font-weight: 500; cursor: pointer; }
  .btn-submit:disabled, .btn-cancel:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
