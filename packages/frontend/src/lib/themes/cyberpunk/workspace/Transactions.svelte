<script lang="ts">
  import Icon from '#lib/components/Icon.svelte';
  import type { Model, Actions, Row } from './model';
  import { text, number } from './model';
  let { m, a, items }: { m: Model; a: Actions; items: Row[] } = $props();
</script>
<div class="cp-table-wrap"><table class="cp-table"><thead><tr><th>{m.t('receipts.form_date')}</th><th>{m.t('dashboard.description')}</th><th>{m.t('search.filter_category')}</th><th>{m.t('search.filter_account')}</th><th class="cp-right">{m.t('receipts.form_amount')}</th><th><span class="cp-sr">{m.t('common.actions')}</span></th></tr></thead><tbody>
  {#each items as item (item.id)}<tr><td>{m.date(item.date)}</td><td><button class="cp-text-button" onclick={() => a.edit('transactions', item)}>{text(item.name)}</button></td><td>{text(item.categoryName) || m.category(item.categoryId)}</td><td>{text(item.accountName) || m.account(item.accountId)}</td><td class:cp-red={item.type === 'Gasto'} class:cp-cyan={item.type === 'Ingreso'} class="cp-right cp-number">{item.type === 'Gasto' ? '−' : '+'}{m.money(number(item.amount))}</td><td><button class="cp-icon-button" aria-label={`${m.t('receipts.edit')} ${text(item.name)}`} onclick={() => a.edit('transactions', item)}><Icon name="more-horizontal" size={16}/></button></td></tr>
  {:else}<tr><td colspan="6" class="cp-empty">{m.t('cyberpunk.no_transactions_to_display')}</td></tr>{/each}
</tbody></table></div>
