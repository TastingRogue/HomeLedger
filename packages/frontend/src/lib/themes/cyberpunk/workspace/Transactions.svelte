<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import type { Model, Actions, Row } from './model';
  import { text, number } from './model';
  let { m, a, items }: { m: Model; a: Actions; items: Row[] } = $props();
</script>
<div class="cp-table-wrap"><table class="cp-table"><thead><tr><th>{m.l('Date','Fecha')}</th><th>{m.l('Description','Descripción')}</th><th>{m.l('Category','Categoría')}</th><th>{m.l('Account','Cuenta')}</th><th class="cp-right">{m.l('Amount','Monto')}</th><th><span class="cp-sr">{m.l('Actions','Acciones')}</span></th></tr></thead><tbody>
  {#each items as item (item.id)}<tr><td>{m.date(item.date)}</td><td><button class="cp-text-button" onclick={() => a.edit('transactions', item)}>{text(item.name)}</button></td><td>{text(item.categoryName) || m.category(item.categoryId)}</td><td>{text(item.accountName) || m.account(item.accountId)}</td><td class:cp-red={item.type === 'Gasto'} class:cp-cyan={item.type === 'Ingreso'} class="cp-right cp-number">{item.type === 'Gasto' ? '−' : '+'}{m.money(number(item.amount))}</td><td><button class="cp-icon-button" aria-label={`${m.l('Edit','Editar')} ${text(item.name)}`} onclick={() => a.edit('transactions', item)}><Icon name="more-horizontal" size={16}/></button></td></tr>
  {:else}<tr><td colspan="6" class="cp-empty">{m.l('No transactions to display.','No hay movimientos para mostrar.')}</td></tr>{/each}
</tbody></table></div>
