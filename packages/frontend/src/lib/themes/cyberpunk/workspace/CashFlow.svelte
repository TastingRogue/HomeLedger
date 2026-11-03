<script lang="ts">
  import BarChart from '$lib/components/BarChart.svelte';
  import type { CashFlowProps } from '../../view-actions';
  import { preferences } from '$lib/stores/preferences';
  import { getIntlTag } from '$lib/i18n/registry';
  let {labels,income,expenses,incomeLabel,expenseLabel,height=230}:CashFlowProps=$props();
  const formatter=$derived(new Intl.NumberFormat(getIntlTag($preferences.locale),{style:'currency',currency:$preferences.currency,currencyDisplay:'narrowSymbol',maximumFractionDigits:0}));
</script>
<BarChart {labels} {height} grid formatValue={value=>formatter.format(value)} datasets={[
  {label:incomeLabel,data:income,backgroundColor:'#48ddd3',borderRadius:0},
  {label:expenseLabel,data:expenses.map(value=>-Math.abs(value)),backgroundColor:'#ff6068',borderRadius:0},
]}/>
