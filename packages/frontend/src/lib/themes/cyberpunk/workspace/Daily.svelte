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
  async function quick(event: SubmitEvent) { event.preventDefault(); busy=true;error='';try { await apiPost('/transactions',{ name:note || text(selectedCategory?.name) || m.l('Quick entry','Registro rápido'), amount, accountId:n(accountId),categoryId:n(categoryId),type:quickType,date }); amount=undefined;note='';a.notify(m.l('Transaction saved.','Movimiento guardado.'));await a.refresh(); } catch(e) {error=e instanceof Error?e.message:String(e);} finally {busy=false;} }
  async function search(event: SubmitEvent) { event.preventDefault();busy=true;error='';try {results=await searchApi({q:query});}catch(e){error=e instanceof Error?e.message:String(e);}finally{busy=false;} }
</script>
{#if error}<p class="cp-error" role="alert">{error}</p>{/if}
{#if m.route === 'suscripciones'}
  <div class="cp-toolbar"><div class="cp-tabs">{#each [['',m.l('All','Todas')],['Activa',m.l('Active','Activas')],['Inactiva',m.l('Paused','Pausadas')]] as [value,label]}<button class:active={status === value} onclick={()=>status=value}>{label}</button>{/each}</div><button class="cp-button" onclick={()=>a.edit('subscriptions')}>+ {m.l('New subscription','Nueva suscripción')}</button></div>
  <div class="cp-asymmetric"><Panel title={m.l('Monthly summary','Resumen mensual')}><strong class="cp-hero-number">{m.money(monthly)}</strong><p class="cp-muted">{m.l('Estimated monthly cost','Costo mensual estimado')} · {active.length} {m.l('active','activas')}</p>{#each m.categories.filter(c=>active.some(s=>s.categoryId===c.id)) as category}<div class="cp-summary-category"><span>{text(category.name)}</span><strong class="cp-number">{m.money(active.filter(row=>row.categoryId===category.id).reduce((sum,row)=>sum+n(row.amount),0))}</strong></div>{/each}</Panel><Panel title={m.l('Upcoming renewals','Próximos vencimientos')}><table class="cp-table"><thead><tr><th>{m.l('Date','Fecha')}</th><th>{m.l('Service','Servicio')}</th><th>{m.l('Amount','Monto')}</th></tr></thead><tbody>{#each due as row}<tr><td>{m.date(row.nextPaymentDate)}</td><td>{text(row.name)}</td><td class="cp-number">{m.money(row.amount)}</td></tr>{:else}<tr><td colspan="3" class="cp-empty">{m.l('No upcoming renewals.','No hay renovaciones próximas.')}</td></tr>{/each}</tbody></table></Panel></div>
  <Panel title={m.l('All subscriptions','Todas las suscripciones')}><div class="cp-table-wrap"><table class="cp-table"><thead><tr><th>{m.l('Service','Servicio')}</th><th>{m.l('Category','Categoría')}</th><th>{m.l('Amount','Monto')}</th><th>{m.l('Frequency','Frecuencia')}</th><th>{m.l('Next payment','Próximo pago')}</th><th>{m.l('Status','Estado')}</th><th></th></tr></thead><tbody>{#each visible as row}<tr><td><button class="cp-text-button" onclick={()=>a.edit('subscriptions',row)}>{text(row.name)}</button></td><td>{m.category(row.categoryId)}</td><td class="cp-number">{m.money(row.amount)}</td><td>{row.cycle==='Mensual'?m.l('Monthly','Mensual'):m.l('Weekly','Semanal')}</td><td>{m.date(row.nextPaymentDate)}</td><td class="cp-cyan">{row.status==='Activa'?m.l('Active','Activa'):m.l('Paused','Pausada')}</td><td><button class="cp-icon-button" aria-label={m.l('Edit subscription','Editar suscripción')} onclick={()=>a.edit('subscriptions',row)}>···</button><button class="cp-link cp-red" onclick={()=>a.edit('subscription-delete',row)}>{m.l('Delete','Eliminar')}</button></td></tr>{:else}<tr><td class="cp-empty" colspan="7">{m.l('No subscriptions in this view.','No hay suscripciones en esta vista.')}</td></tr>{/each}</tbody></table></div></Panel>
{:else if m.route === 'calendario'}
  <div class="cp-toolbar"><div class="cp-tabs"><button class="active">{m.l('Monthly view','Vista mensual')}</button><a href="/suscripciones">{m.l('Subscriptions','Suscripciones')}</a></div><div class="cp-calendar-controls"><button class="cp-button small ghost" aria-label={m.l('Previous month','Mes anterior')} onclick={()=>moveMonth(-1)}>‹</button><strong>{monthLabel}</strong><button class="cp-button small ghost" aria-label={m.l('Next month','Mes siguiente')} onclick={()=>moveMonth(1)}>›</button></div></div>
  {#if calendarLoading}<p role="status">{m.l('Loading calendar…','Cargando calendario…')}</p>{/if}
  <div class="cp-calendar-agenda">
    {#each Array.from({length:days},(_,i)=>i+1) as day}
      {@const dayEvents=events.filter(row=>onDay(row.date,day))}
      {#if dayEvents.length}<Panel title={`${day} · ${monthLabel}`}>
        {#each dayEvents as event}<button class="cp-agenda-event" onclick={()=>openEvent(event)}><span>{text(event.name)}</span><strong class="cp-number">{m.money(event.amount)}</strong><small>{event.event==='subscription'?m.l('Subscription','Suscripción'):event.type==='Ingreso'?m.l('Income','Ingreso'):m.l('Expense','Gasto')}</small></button>{/each}
      </Panel>{/if}
    {/each}
    {#if !calendarLoading&&!events.some(row=>inMonth(text(row.date),calendarYear,calendarMonth))}<p class="cp-empty">{m.l('No events this month.','No hay eventos este mes.')}</p>{/if}
  </div>
  <div class="cp-calendar-layout"><Panel title={m.l('Payment calendar','Calendario de pagos')}><div class="cp-calendar">{#each weekdays as day}<div class="cp-weekday">{day}</div>{/each}{#each Array(offset) as _}<div class="cp-calendar-day empty"></div>{/each}{#each Array.from({length:days},(_,i)=>i+1) as day}<div class="cp-calendar-day" class:today={day===new Date().getDate() && calendarMonth===new Date().getMonth() && calendarYear===new Date().getFullYear()}><span class="cp-day-number">{day}</span>{#each events.filter(row=>onDay(row.date,day)).slice(0,expandedDays.includes(day)?undefined:3) as event}<button class="cp-calendar-event" class:income={event.type==='Ingreso'} class:subscription={event.event==='subscription'} onclick={()=>openEvent(event)}><b>{text(event.name)}</b><span>{m.money(event.amount)}</span></button>{/each}{#if events.filter(row=>onDay(row.date,day)).length>3}<button class="cp-link" onclick={()=>expandedDays=expandedDays.includes(day)?expandedDays.filter(value=>value!==day):[...expandedDays,day]}>{expandedDays.includes(day)?m.l("Show less","Ver menos"):`+${events.filter(row=>onDay(row.date,day)).length-3}`}</button>{/if}</div>{/each}</div></Panel><div class="cp-stack"><Panel title={m.l('Month summary','Resumen del mes')}><div class="cp-key-values"><span>{m.l('Income','Ingresos')}</span><strong class="cp-cyan">{m.money(calendarTx.filter(row=>row.type==='Ingreso').reduce((sum,row)=>sum+n(row.amount),0))}</strong><span>{m.l('Expenses','Gastos')}</span><strong class="cp-red">{m.money(calendarTx.filter(row=>row.type==='Gasto').reduce((sum,row)=>sum+n(row.amount),0))}</strong><span>{m.l('Upcoming subscriptions','Próximas suscripciones')}</span><strong class="cp-yellow">{m.money(events.filter(row=>row.event==='subscription'&&inMonth(text(row.date),calendarYear,calendarMonth)).reduce((sum,row)=>sum+n(row.amount),0))}</strong></div></Panel><Panel title={m.l('By category','Por categoría')}>{#each m.categories.filter(c=>calendarTx.some(row=>row.categoryId===c.id&&row.type==='Gasto')) as category}<div class="cp-summary-category"><span>{text(category.name)}</span><b class="cp-number cp-red">{m.money(calendarTx.filter(row=>row.categoryId===category.id&&row.type==='Gasto').reduce((sum,row)=>sum+n(row.amount),0))}</b></div>{/each}</Panel></div></div>
{:else if m.route === 'registro-rapido'}
  <div class="cp-tabs">{#each [['Gasto',m.l('Expense','Gasto')],['Ingreso',m.l('Income','Ingreso')]] as [value,label]}<button class:active={quickType===value} onclick={()=>{quickType=value;categoryId='';}}>{label}</button>{/each}</div>
  <form class="cp-quick-entry" onsubmit={quick}>
    <Panel title={m.l('Details','Detalles')}><label>{m.l('Amount','Monto')}<div class="cp-amount-input"><span>{m.currency}</span><input aria-label={m.l('Amount','Monto')} type="number" inputmode="decimal" min="0.01" step="0.01" required bind:value={amount}/></div></label><label>{m.l('Account','Cuenta')}<select required bind:value={accountId}><option value="">{m.l('Choose an account','Selecciona cuenta')}</option>{#each m.accounts as row}<option value={text(row.id)}>{text(row.name)}</option>{/each}</select></label><label>{m.l('Date','Fecha')}<input type="date" bind:value={date} required/></label><label>{m.l('Description (optional)','Descripción (opcional)')}<input bind:value={note}/></label><button class="cp-button" disabled={busy || !categoryId}>{busy?'…':m.l('Save transaction','Guardar movimiento')} →</button></Panel>
    <Panel title={m.l('Categories','Categorías')}><div class="cp-category-picker">{#each m.categories.filter(row=>row.type===quickType||row.type==='Ambos') as row}<button type="button" class:active={categoryId===text(row.id)} onclick={()=>categoryId=text(row.id)}><Icon name={text(row.icon)||'tag'} size={22}/>{text(row.name)}</button>{:else}<p class="cp-empty">{m.l('Create a category to continue.','Crea una categoría para continuar.')}</p>{/each}</div></Panel>
    <Panel title={m.l('Preview','Vista previa')}><div class="cp-entry-preview"><Icon name={text(selectedCategory?.icon)||'wallet'} size={42}/><h3>{text(selectedCategory?.name)||m.l('Choose a category','Selecciona una categoría')}</h3><strong class="cp-hero-number">{m.money(amount)}</strong><p>{m.date(date)}</p><p>{m.account(accountId)}</p><p class="cp-muted">{note}</p></div></Panel>
  </form>
{:else}
  <form class="cp-search-form" onsubmit={search}><label class="cp-search-field"><span class="cp-sr">{m.l('Search','Buscar')}</span><Icon name="search" size={23}/><input required bind:value={query} placeholder={m.l('Search transactions, receipts or subscriptions…','Busca movimientos, recibos o suscripciones…')}/></label><button class="cp-button" disabled={busy}>{busy?'…':m.l('Search','Buscar')}</button></form>
  {#if results}<div class="cp-tabs"><span class="cp-tab-count">{m.l('Results','Resultados')} ({results.totalCount})</span></div><div class="cp-search-results"><Panel title={`${m.l('Transactions','Movimientos')} (${results.transactions.length})`}><Transactions {m} {a} items={rows(results.transactions)}/></Panel><Panel title={`${m.l('Subscriptions','Suscripciones')} (${results.subscriptions.length})`}>{#each results.subscriptions as row}<div class="cp-search-hit"><Icon name="repeat" size={24}/><div><b>{row.name}</b><small>{row.accountName} · {m.date(row.nextPaymentDate)}</small></div><strong class="cp-number">{m.money(row.amount)}</strong><a href="/suscripciones" class="cp-link">→</a></div>{:else}<p class="cp-empty">{m.l('No matching subscriptions.','No hay suscripciones coincidentes.')}</p>{/each}</Panel><Panel title={`${m.l('Receipts','Recibos')} (${results.receipts.length})`}>{#each results.receipts as row}<a class="cp-search-hit" href="/recibos"><Icon name="file-text" size={24}/><span>{row.merchant||m.l('Receipt','Recibo')}</span><strong class="cp-number">{m.money(row.total)}</strong></a>{:else}<p class="cp-empty">{m.l('No matching receipts.','No hay recibos coincidentes.')}</p>{/each}</Panel></div>{:else}<p class="cp-search-empty"><Icon name="search" size={48}/>{m.l('Find the details behind any transaction.','Encuentra los detalles de cualquier movimiento.')}</p>{/if}
{/if}
