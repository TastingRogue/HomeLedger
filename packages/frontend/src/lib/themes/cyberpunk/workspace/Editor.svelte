<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { apiPost, apiPut, apiDelete } from '#lib/api/client.ts';
  import { enumLabel } from '#lib/i18n/labels.ts';
  import { t } from '#lib/i18n/index.ts';
  import type { TranslationKey } from '#lib/i18n/es.ts';
  import { GoalType, BudgetPeriod } from '@homeledger/shared';
  import { number, text, rows, type Row, type Model } from './model';
  let { entity, row, m, close, saved }: { entity: string; row?: Row; m: Model; close: () => void; saved: () => Promise<void> } = $props();
  let dialog: HTMLDialogElement;
  // A keyed editor intentionally snapshots its draft once, keeping later API
  // refreshes from overwriting unsaved input.
  const initial = untrack(() => ({ row, entity, accounts: m.accounts, categories: m.categories }));
  let name = $state(text(initial.row?.name));
  let amount = $state(number(initial.row?.amount ?? initial.row?.targetAmount ?? initial.row?.principal ?? initial.row?.value ?? initial.row?.balance ?? initial.row?.initialBalance));
  let accountId = $state(text(initial.row?.accountId ?? initial.row?.sourceAccountId ?? initial.accounts[0]?.id));
  let destination = $state(text(initial.row?.destinationAccountId ?? initial.accounts[1]?.id));
  let destinationAmount = $state<number | undefined>(initial.row?.destinationAmount == null ? undefined : number(initial.row?.destinationAmount));
  let categoryId = $state(text(initial.row?.categoryId ?? initial.categories[0]?.id));
  let type = $state(text(initial.row?.type) || (initial.entity === 'accounts' ? 'Débito' : 'Gasto'));
  let date = $state(text(initial.row?.date ?? initial.row?.startDate ?? initial.row?.deadline).slice(0, 10) || new Date().toLocaleDateString('en-CA'));
  let bank = $state(text(initial.row?.bank));
  let rate = $state(initial.row?.interestRate == null ? 9.5 : number(initial.row.interestRate));
  let creditLimit = $state(number(initial.row?.creditLimit));
  let term = $state(number(initial.row?.term) || 12);
  let interest = $state(0);
  let cycle = $state(text(initial.row?.cycle) || 'Mensual');
  let match = $state('');
  let allocations = $state<Record<string, number>>(Object.fromEntries(rows(initial.row?.categories).map(c => [text(c.categoryId), number(c.allocated)])));
  let busy = $state(false); let error = $state(''); let removing = $state(false);
  onMount(() => { dialog.showModal(); });
  const entityTitles: Record<string, TranslationKey> = { accounts: 'nav.accounts', transactions: 'nav.transactions', transfers: 'nav.transfers', subscriptions: 'nav.subscriptions', goals: 'nav.goals', loans: 'nav.loans', categories: 'nav.categories', budgets: 'nav.budgets', rules: 'nav.rules', assets: 'networth.assets_section', liabilities: 'networth.liabilities_section' };
  const title = $derived(entity === 'fund' ? m.t('cyberpunk.add_to_savings') : entity === 'payment' ? m.t('loans.record_payment') : `${row?.id ? m.t('receipts.edit') : m.t('import.status_new')} · ${m.t(entityTitles[entity] ?? 'common.type')}`);
  const hasAmount = $derived(!['categories','rules','budgets'].includes(entity));
  async function submit(event: SubmitEvent) {
    event.preventDefault(); busy = true; error = '';
    try {
      let payload: Record<string, unknown> = { name };
      let endpoint = `/${entity}`;
      if (entity === 'transactions') payload = { name, amount, accountId: number(accountId), categoryId: number(categoryId), type, date };
      if (entity === 'transfers') payload = { name, amount, date, sourceAccountId: number(accountId), destinationAccountId: number(destination), ...(destinationAmount == null ? {} : { destinationAmount }) };
      if (entity === 'accounts') payload = { name, initialBalance: amount, type, bank: bank || undefined, currency: text(row?.currency) || m.currency, ...(type === 'Crédito' ? { creditLimit } : {}) };
      if (entity === 'subscriptions') payload = { name, amount, accountId: number(accountId), categoryId: number(categoryId), cycle, startDate: date, autoCharge: row?.autoCharge ?? false };
      if (entity === 'goals') payload = { name, targetAmount: amount, type: row?.type ?? GoalType.ListaDeDeseos, deadline: date };
      if (entity === 'loans') payload = { name, principal: amount, interestRate: rate, term, startDate: date };
      if (entity === 'categories') payload = { name, type, icon: text(row?.icon) || 'tag', color: text(row?.color) || '#6ff4ed' };
      if (entity === 'budgets') payload = { name, period: BudgetPeriod.Mensual, startDate: date, categories: Object.entries(allocations).filter(([, value]) => value > 0).map(([categoryId, allocated]) => ({ categoryId: number(categoryId), allocated })) };
      if (entity === 'rules') payload = { name, priority: number(row?.priority) || 1, conditions: [{ field: 'name', operator: 'contains', value: match }], actions: [{ type: 'setCategory', value: number(categoryId) }], enabled: true };
      if (entity === 'assets' || entity === 'liabilities') { endpoint = `/networth/${entity}`; payload = { name, type: bank || text(row?.type) || 'Other', ...(entity === 'assets' ? { value: amount } : { balance: amount }) }; }
      if (entity === 'fund') { endpoint = `/goals/${row?.id}/fund`; payload = { amount }; }
      if (entity === 'payment') { endpoint = `/loans/${row?.id}/payment`; payload = { amount, principal: Math.round((amount - interest) * 100) / 100, interest, date }; }
      if (row?.id && !['fund','payment'].includes(entity)) await apiPut(`${endpoint}/${row.id}`, payload);
      else await apiPost(endpoint, payload);
      await saved(); close();
    } catch (e) { error = e instanceof Error ? e.message : String(e); }
    finally { busy = false; }
  }
  async function remove() {
    if (!row) return;
    busy = true; error = '';
    try { await apiDelete(`/${entity === 'assets' || entity === 'liabilities' ? 'networth/' : ''}${entity}/${row.id}`); await saved(); close(); }
    catch (e) { error = e instanceof Error ? e.message : String(e); }
    finally { busy = false; }
  }
</script>
<dialog bind:this={dialog} class="cp-dialog" onclose={close} oncancel={(event) => { if (busy) event.preventDefault(); }} aria-label={title}>
  <header class="cp-dialog-head"><h2>{title}</h2><button type="button" class="cp-icon-button" aria-label={m.t('common.close')} onclick={close} disabled={busy}>×</button></header>
  <form onsubmit={submit}>
    {#if error}<p class="cp-error" role="alert">{error}</p>{/if}
    {#if removing}<p>{m.t('cyberpunk.delete_this_record_this_action_cannot_be_undone')}</p><div class="cp-form-actions"><button type="button" class="cp-button ghost" onclick={() => removing = false}>{m.t('receipts.cancel')}</button><button type="button" class="cp-button danger" onclick={remove} disabled={busy}>{m.t('receipts.delete')}</button></div>
    {:else}
      {#if !['fund','payment'].includes(entity)}<label>{m.t('receipts.form_name')}<input required maxlength="100" bind:value={name}/></label>{/if}
      {#if hasAmount}<label>{entity === 'accounts' ? m.t('cyberpunk.initial_balance') : m.t('receipts.form_amount')}<input type="number" required step="0.01" min={entity === 'accounts' ? undefined : 0.01} bind:value={amount}/></label>{/if}
      {#if ['transactions','subscriptions','transfers'].includes(entity)}<label>{m.t('search.filter_account')}<select required bind:value={accountId}>{#each m.accounts as account}<option value={text(account.id)}>{text(account.name)}</option>{/each}</select></label>{/if}
      {#if entity === 'transfers'}<label>{m.t('cyberpunk.destination_account')}<select required bind:value={destination}>{#each m.accounts.filter(c => c.id !== number(accountId)) as account}<option value={text(account.id)}>{text(account.name)}</option>{/each}</select></label>{#if m.accounts.find(c => c.id === number(accountId))?.currency !== m.accounts.find(c => c.id === number(destination))?.currency}<label>{m.t('cyberpunk.amount_in_destination_currency')}<input type="number" min="0.01" step="0.01" required bind:value={destinationAmount}/></label>{/if}{/if}
      {#if ['transactions','subscriptions','rules'].includes(entity)}<label>{m.t('search.filter_category')}<select required bind:value={categoryId}>{#each m.categories as category}<option value={text(category.id)}>{text(category.name)}</option>{/each}</select></label>{/if}
      {#if ['transactions','accounts','categories'].includes(entity)}<label>{m.t('search.filter_type')}<select bind:value={type}>{#each entity === 'accounts' ? ['Débito','Crédito','Inversión','Vales','Efectivo'] : entity === 'categories' ? ['Gasto','Ingreso','Ambos'] : ['Gasto','Ingreso'] as option}<option value={option}>{enumLabel($t, option)}</option>{/each}</select></label>{/if}
      {#if entity === 'accounts' && type === 'Crédito'}<label>{m.t('accounts.credit_limit_label')}<input type="number" min="0" step="0.01" required bind:value={creditLimit}/></label>{/if}
      {#if ['accounts','assets','liabilities'].includes(entity)}<label>{entity === 'accounts' ? m.t('accounts.form_bank') : m.t('search.filter_type')}<input bind:value={bank}/></label>{/if}
      {#if !['accounts','categories','rules','assets','liabilities','fund'].includes(entity)}<label>{m.t('receipts.form_date')}<input type="date" required bind:value={date}/></label>{/if}
      {#if entity === 'subscriptions'}<label>{m.t('cyberpunk.frequency')}<select bind:value={cycle}><option value="Mensual">{m.t('subscriptions.monthly')}</option><option value="Semanal">{m.t('subscriptions.weekly')}</option></select></label>{/if}
      {#if entity === 'loans'}<div class="cp-two"><label>{m.t('cyberpunk.annual_interest_placeholder')}<input type="number" min="0" max="100" step="0.01" bind:value={rate}/></label><label>{m.t('cyberpunk.months_placeholder')}<input type="number" min="1" max="600" bind:value={term}/></label></div>{/if}
      {#if entity === 'payment'}<label>{m.t('cyberpunk.interest_portion')}<input type="number" step="0.01" min="0" max={amount} bind:value={interest}/></label>{/if}
      {#if entity === 'rules'}<label>{m.t('cyberpunk.description_contains')}<input required bind:value={match}/></label>{/if}
      {#if entity === 'budgets'}<fieldset><legend>{m.t('cyberpunk.category_allocations')}</legend>{#each m.categories.filter(c => c.type !== 'Ingreso') as category}<label>{text(category.name)}<input type="number" min="0" step="0.01" bind:value={allocations[text(category.id)]}/></label>{/each}</fieldset>{/if}
      <div class="cp-form-actions">{#if row?.id && !['fund','payment','goals','accounts'].includes(entity)}<button class="cp-button ghost cp-red" type="button" onclick={() => removing = true}>{m.t('receipts.delete')}</button>{/if}<button class="cp-button ghost" type="button" onclick={close} disabled={busy}>{m.t('receipts.cancel')}</button><button class="cp-button" disabled={busy}>{busy ? '…' : m.t('receipts.save')}</button></div>
    {/if}
  </form>
</dialog>
