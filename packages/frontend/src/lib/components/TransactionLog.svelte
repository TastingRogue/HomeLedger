<script lang="ts">
  import { formatCurrency, formatDateShort } from '#lib/utils/format.ts';
  import { t } from '#lib/i18n/index.ts';
  interface Entry { id:number;name:string;amount:number;type:string;date:string;categoryName?:string|null;accountName?:string|null }
  let {items,open,edit,remove}:{items:Entry[];open:(row:Entry)=>void;edit:(row:Entry)=>void;remove:(row:Entry)=>void}=$props();
</script>
<section class="cp-panel">
  <header class="cp-panel-head"><h2>{$t('transactions.title')}</h2></header>
  <div class="cp-panel-body cp-table-wrap"><table class="cp-table"><thead><tr><th>{$t('transactions.col_date')}</th><th>{$t('transactions.col_name')}</th><th>{$t('transactions.col_category')}</th><th>{$t('transactions.col_account')}</th><th class="cp-right">{$t('transactions.col_amount')}</th><th></th></tr></thead><tbody>
    {#each items as row(row.id)}<tr><td>{formatDateShort(row.date)}</td><td><button class="cp-text-button" onclick={()=>open(row)}>{row.name}</button></td><td>{row.categoryName||'—'}</td><td>{row.accountName||'—'}</td><td class="cp-number cp-right" class:cp-red={row.type==='Gasto'} class:cp-cyan={row.type==='Ingreso'}>{row.type==='Gasto'?'−':'+'}{formatCurrency(Math.abs(row.amount))}</td><td><button class="cp-link" onclick={()=>edit(row)}>{$t('common.edit')}</button> <button class="cp-link cp-red" onclick={()=>remove(row)}>{$t('common.delete')}</button></td></tr>{/each}
  </tbody></table></div>
</section>
