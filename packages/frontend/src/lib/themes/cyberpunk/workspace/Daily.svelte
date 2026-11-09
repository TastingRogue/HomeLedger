<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { allTransactions, inMonth, inBaseCurrency } from '$lib/utils/financial-data';
  import Panel from './Panel.svelte'; import Meter from './Meter.svelte'; import Transactions from './Transactions.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import { apiPost, apiGet } from '$lib/api/client';
  import { search as searchApi, type SearchResult } from '$lib/api/search';
  import { getIntlTag } from '$lib/i18n/registry';
  import { number as n, text, rows, type Model, type Actions, type Row } from './model';
  let { m, a }: { m: Model; a: Actions } = $props();
  let status = $state(''); let query = $state(''); let results = $state<SearchResult | null>(null); let busy = $state(false); let error = $state('');
  const active = $derived(m.subscriptions.filter(row => row.status === 'Activa'));
  const monthly = $derived(active.reduce((sum,row) => sum+n(row.amount)*(row.cycle === 'Semanal' ? 52/12 : 1),0));
  const due = $derived([...active].sort((x,y)=>text(x.nextPaymentDate).localeCompare(text(y.nextPaymentDate))).slice(0,5));
  const visible = $derived(m.subscriptions.filter(row => !status || row.status === status));
  let calendarMonth = $state(new Date().getMonth()); let calendarYear = $state(new Date().getFullYear()); let calendarTx = $state<Row[]>([]);
  const days = $derived(new Date(calendarYear, calendarMonth+1,0).getDate());
  const offset = $derived((new Date(calendarYear,calendarMonth,1).getDay()+6)%7);
  const monthLabel = $derived(new Intl.DateTimeFormat(getIntlTag(m.locale),{month:'long',year:'numeric'}).format(new Date(calendarYear,calendarMonth,1)));
  const weekdays = $derived(Array.from({length:7},(_,i)=>new Intl.DateTimeFormat(getIntlTag(m.locale),{weekday:'short'}).format(new Date(2026,10,2+i))));
  const events = $derived<Row[]>([...inBaseCurrency(active.map(row=>({...row,amount:n(row.amount),accountId:n(row.accountId),date:row.nextPaymentDate,event:'subscription'})),m.accounts),...calendarTx.map(row=>({...row,event:'transaction'}))]);
  function onDay(value: unknown, day: number) { const d=new Date(`${text(value).slice(0,10)}T12:00:00`); return d.getFullYear()===calendarYear && d.getMonth()===calendarMonth && d.getDate()===day; }
  let monthRequest = 0;
  let calendarLoading = $state(false);
  let expandedDays = $state<number[]>([]);
  onDestroy(() => { monthRequest++; });
  async function moveMonth(delta: number) {
    const d = new Date(calendarYear, calendarMonth + delta, 1);
    calendarYear = d.getFullYear(); calendarMonth = d.getMonth(); expandedDays = [];
    const year = calendarYear, month = calendarMonth, request = ++monthRequest;
    calendarLoading = true; calendarTx = []; error = '';
    try {
      const items = await allTransactions();
      if (request === monthRequest) calendarTx = rows(inBaseCurrency(items.filter(row => inMonth(row.date, year, month)), m.accounts));
    } catch (e) { if (request === monthRequest) error = e instanceof Error ? e.message : String(e); }
    finally { if (request === monthRequest) calendarLoading = false; }
  }
  function openEvent(event: Row) {
    void goto(event.event === 'subscription' ? `/suscripciones?edit=${event.id}` : `/transacciones?transaction=${event.id}`);
  }
  onMount(() => { if(m.route==='calendario') void moveMonth(0); });
  let quickType = $state('Gasto'); let amount = $state<number | undefined>(); let accountId = $state(''); let categoryId = $state(''); let note = $state(''); let date = $state(new Date().toLocaleDateString('en-CA'));
  const selectedCategory = $derived(m.categories.find(row=>row.id===n(categoryId)));
  async function quick(event: SubmitEvent) { event.preventDefault(); busy=true;error='';try { await apiPost('/transactions',{ name:note || text(selectedCategory?.name) || m.t('cyberpunk.quick_entry'), amount, accountId:n(accountId),categoryId:n(categoryId),type:quickType,date }); amount=undefined;note='';a.notify(m.t('cyberpunk.transaction_saved'));await a.refresh(); } catch(e) {error=e instanceof Error?e.message:String(e);} finally {busy=false;} }
  async function search(event: SubmitEvent) { event.preventDefault();busy=true;error='';try {results=await searchApi({q:query});}catch(e){error=e instanceof Error?e.message:String(e);}finally{busy=false;} }
</script>
{#if error}<p class="cp-error" role="alert">{error}</p>{/if}
{#if m.route === 'suscripciones'}
  <div class="cp-toolbar"><div class="cp-tabs">{#each [['',m.t('search.entity_all')],['Activa',m.t('loans.status_active')],['Inactiva',m.t('cyberpunk.paused')]] as [value,label]}<button class:active={status === value} onclick={()=>status=value}>{label}</button>{/each}</div><button class="cp-button" onclick={()=>a.edit('subscriptions')}>+ {m.t('cyberpunk.new_subscription')}</button></div>
  <div class="cp-asymmetric"><Panel title={m.t('cyberpunk.monthly_summary')}><strong class="cp-hero-number">{m.money(monthly)}</strong><p class="cp-muted">{m.t('cyberpunk.estimated_monthly_cost')} · {active.length} {m.t('cyberpunk.active')}</p>{#each m.categories.filter(c=>active.some(s=>s.categoryId===c.id)) as category}<div class="cp-summary-category"><span>{text(category.name)}</span><strong class="cp-number">{m.money(active.filter(row=>row.categoryId===category.id).reduce((sum,row)=>sum+n(row.amount),0))}</strong></div>{/each}</Panel><Panel title={m.t('cyberpunk.upcoming_renewals')}><table class="cp-table"><thead><tr><th>{m.t('receipts.form_date')}</th><th>{m.t('cyberpunk.service')}</th><th>{m.t('receipts.form_amount')}</th></tr></thead><tbody>{#each due as row}<tr><td>{m.date(row.nextPaymentDate)}</td><td>{text(row.name)}</td><td class="cp-number">{m.money(row.amount)}</td></tr>{:else}<tr><td colspan="3" class="cp-empty">{m.t('cyberpunk.no_upcoming_renewals')}</td></tr>{/each}</tbody></table></Panel></div>
  <Panel title={m.t('cyberpunk.all_subscriptions')}><div class="cp-table-wrap"><table class="cp-table"><thead><tr><th>{m.t('cyberpunk.service')}</th><th>{m.t('search.filter_category')}</th><th>{m.t('receipts.form_amount')}</th><th>{m.t('cyberpunk.frequency')}</th><th>{m.t('cyberpunk.next_payment')}</th><th>{m.t('common.status')}</th><th></th></tr></thead><tbody>{#each visible as row}<tr><td><button class="cp-text-button" onclick={()=>a.edit('subscriptions',row)}>{text(row.name)}</button></td><td>{m.category(row.categoryId)}</td><td class="cp-number">{m.money(row.amount)}</td><td>{row.cycle==='Mensual'?m.t('subscriptions.monthly'):m.t('subscriptions.weekly')}</td><td>{m.date(row.nextPaymentDate)}</td><td class="cp-cyan">{row.status==='Activa'?m.t('loans.status_active'):m.t('cyberpunk.paused')}</td><td><button class="cp-icon-button" aria-label={m.t('cyberpunk.edit_subscription')} onclick={()=>a.edit('subscriptions',row)}>···</button><button class="cp-link cp-red" onclick={()=>a.edit('subscription-delete',row)}>{m.t('receipts.delete')}</button></td></tr>{:else}<tr><td class="cp-empty" colspan="7">{m.t('cyberpunk.no_subscriptions_in_this_view')}</td></tr>{/each}</tbody></table></div></Panel>
{:else if m.route === 'calendario'}
  <div class="cp-toolbar"><div class="cp-tabs"><button class="active">{m.t('cyberpunk.monthly_view')}</button><a href="/suscripciones">{m.t('nav.subscriptions')}</a></div><div class="cp-calendar-controls"><button class="cp-button small ghost" aria-label={m.t('cyberpunk.previous_month')} onclick={()=>moveMonth(-1)}>‹</button><strong>{monthLabel}</strong><button class="cp-button small ghost" aria-label={m.t('cyberpunk.next_month')} onclick={()=>moveMonth(1)}>›</button></div></div>
  {#if calendarLoading}<p role="status">{m.t('cyberpunk.loading_calendar')}</p>{/if}
  <div class="cp-calendar-agenda">
    {#each Array.from({length:days},(_,i)=>i+1) as day}
      {@const dayEvents=events.filter(row=>onDay(row.date,day))}
      {#if dayEvents.length}<Panel title={`${day} · ${monthLabel}`}>
        {#each dayEvents as event}<button class="cp-agenda-event" onclick={()=>openEvent(event)}><span>{text(event.name)}</span><strong class="cp-number">{m.money(event.amount)}</strong><small>{event.event==='subscription'?m.t('cyberpunk.subscription'):event.type==='Ingreso'?m.t('search.type_income'):m.t('search.type_expense')}</small></button>{/each}
      </Panel>{/if}
    {/each}
    {#if !calendarLoading&&!events.some(row=>inMonth(text(row.date),calendarYear,calendarMonth))}<p class="cp-empty">{m.t('cyberpunk.no_events_this_month')}</p>{/if}
  </div>
  <div class="cp-calendar-layout"><Panel title={m.t('cyberpunk.payment_calendar')}><div class="cp-calendar">{#each weekdays as day}<div class="cp-weekday">{day}</div>{/each}{#each Array(offset) as _}<div class="cp-calendar-day empty"></div>{/each}{#each Array.from({length:days},(_,i)=>i+1) as day}<div class="cp-calendar-day" class:today={day===new Date().getDate() && calendarMonth===new Date().getMonth() && calendarYear===new Date().getFullYear()}><span class="cp-day-number">{day}</span>{#each events.filter(row=>onDay(row.date,day)).slice(0,expandedDays.includes(day)?undefined:3) as event}<button class="cp-calendar-event" class:income={event.type==='Ingreso'} class:subscription={event.event==='subscription'} onclick={()=>openEvent(event)}><b>{text(event.name)}</b><span>{m.money(event.amount)}</span></button>{/each}{#if events.filter(row=>onDay(row.date,day)).length>3}<button class="cp-link" onclick={()=>expandedDays=expandedDays.includes(day)?expandedDays.filter(value=>value!==day):[...expandedDays,day]}>{expandedDays.includes(day)?m.t('cyberpunk.show_less'):`+${events.filter(row=>onDay(row.date,day)).length-3}`}</button>{/if}</div>{/each}</div></Panel><div class="cp-stack"><Panel title={m.t('cyberpunk.month_summary')}><div class="cp-key-values"><span>{m.t('search.type_income')}</span><strong class="cp-cyan">{m.money(calendarTx.filter(row=>row.type==='Ingreso').reduce((sum,row)=>sum+n(row.amount),0))}</strong><span>{m.t('dashboard.expenses')}</span><strong class="cp-red">{m.money(calendarTx.filter(row=>row.type==='Gasto').reduce((sum,row)=>sum+n(row.amount),0))}</strong><span>{m.t('cyberpunk.upcoming_subscriptions')}</span><strong class="cp-yellow">{m.money(events.filter(row=>row.event==='subscription'&&inMonth(text(row.date),calendarYear,calendarMonth)).reduce((sum,row)=>sum+n(row.amount),0))}</strong></div></Panel><Panel title={m.t('cyberpunk.by_category')}>{#each m.categories.filter(c=>calendarTx.some(row=>row.categoryId===c.id&&row.type==='Gasto')) as category}<div class="cp-summary-category"><span>{text(category.name)}</span><b class="cp-number cp-red">{m.money(calendarTx.filter(row=>row.categoryId===category.id&&row.type==='Gasto').reduce((sum,row)=>sum+n(row.amount),0))}</b></div>{/each}</Panel></div></div>
{:else if m.route === 'registro-rapido'}
  <div class="cp-tabs">{#each [['Gasto',m.t('search.type_expense')],['Ingreso',m.t('search.type_income')]] as [value,label]}<button class:active={quickType===value} onclick={()=>{quickType=value;categoryId='';}}>{label}</button>{/each}</div>
  <form class="cp-quick-entry" onsubmit={quick}>
    <Panel title={m.t('cyberpunk.details')}><label>{m.t('receipts.form_amount')}<div class="cp-amount-input"><span>{m.currency}</span><input aria-label={m.t('receipts.form_amount')} type="number" inputmode="decimal" min="0.01" step="0.01" required bind:value={amount}/></div></label><label>{m.t('search.filter_account')}<select required bind:value={accountId}><option value="">{m.t('cyberpunk.choose_an_account')}</option>{#each m.accounts as row}<option value={text(row.id)}>{text(row.name)}</option>{/each}</select></label><label>{m.t('receipts.form_date')}<input type="date" bind:value={date} required/></label><label>{m.t('cyberpunk.description_optional')}<input bind:value={note}/></label><button class="cp-button" disabled={busy || !categoryId}>{busy?'…':m.t('cyberpunk.save_transaction')} →</button></Panel>
    <Panel title={m.t('nav.categories')}><div class="cp-category-picker">{#each m.categories.filter(row=>row.type===quickType||row.type==='Ambos') as row}<button type="button" class:active={categoryId===text(row.id)} onclick={()=>categoryId=text(row.id)}><Icon name={text(row.icon)||'tag'} size={22}/>{text(row.name)}</button>{:else}<p class="cp-empty">{m.t('cyberpunk.create_a_category_to_continue')}</p>{/each}</div></Panel>
    <Panel title={m.t('backup.preview_title')}><div class="cp-entry-preview"><Icon name={text(selectedCategory?.icon)||'wallet'} size={42}/><h3>{text(selectedCategory?.name)||m.t('cyberpunk.choose_a_category')}</h3><strong class="cp-hero-number">{m.money(amount)}</strong><p>{m.date(date)}</p><p>{m.account(accountId)}</p><p class="cp-muted">{note}</p></div></Panel>
  </form>
{:else}
  <form class="cp-search-form" onsubmit={search}><label class="cp-search-field"><span class="cp-sr">{m.t('nav.search')}</span><Icon name="search" size={23}/><input required bind:value={query} placeholder={m.t('cyberpunk.search_transactions_receipts_or_subscriptions')}/></label><button class="cp-button" disabled={busy}>{busy?'…':m.t('nav.search')}</button></form>
  {#if results}<div class="cp-tabs"><span class="cp-tab-count">{m.t('cyberpunk.results')} ({results.totalCount})</span></div><div class="cp-search-results"><Panel title={`${m.t('nav.transactions')} (${results.transactions.length})`}><Transactions {m} {a} items={rows(results.transactions)}/></Panel><Panel title={`${m.t('nav.subscriptions')} (${results.subscriptions.length})`}>{#each results.subscriptions as row}<div class="cp-search-hit"><Icon name="repeat" size={24}/><div><b>{row.name}</b><small>{row.accountName} · {m.date(row.nextPaymentDate)}</small></div><strong class="cp-number">{m.money(row.amount)}</strong><a href="/suscripciones" class="cp-link">→</a></div>{:else}<p class="cp-empty">{m.t('cyberpunk.no_matching_subscriptions')}</p>{/each}</Panel><Panel title={`${m.t('search.entity_receipts')} (${results.receipts.length})`}>{#each results.receipts as row}<a class="cp-search-hit" href="/recibos"><Icon name="file-text" size={24}/><span>{row.merchant||m.t('cyberpunk.receipt')}</span><strong class="cp-number">{m.money(row.total)}</strong></a>{:else}<p class="cp-empty">{m.t('cyberpunk.no_matching_receipts')}</p>{/each}</Panel></div>{:else}<p class="cp-search-empty"><Icon name="search" size={48}/>{m.t('cyberpunk.find_the_details_behind_any_transaction')}</p>{/if}
{/if}
