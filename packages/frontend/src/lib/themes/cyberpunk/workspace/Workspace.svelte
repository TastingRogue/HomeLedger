<script lang="ts">
  import { setContext, untrack, type Snippet } from 'svelte';
  import { VIEW_ACTIONS, type ViewActions, type ViewActionHost } from '#lib/themes/view-actions.ts';
  import Icon from '#lib/components/Icon.svelte';
  import { logout } from '#lib/api/auth.ts';
  import { userProfile } from '#lib/stores/user.ts';
  import { preferences } from '#lib/stores/preferences.ts';
  import { getIntlTag } from '#lib/i18n/registry.ts';
  import Operations from './Operations.svelte'; import Planning from './Planning.svelte';
  import Daily from './Daily.svelte'; import Analysis from './Analysis.svelte'; import Administration from './Administration.svelte'; import Editor from './Editor.svelte';
  import { routes, loadWorkspace, emptyData, buildModel, type Row, type Actions } from './model';
  import './workspace.css';
  import './dashboard.css';
  import './dashboard-accounts.css';
  import CashFlow from './CashFlow.svelte';
  import './shared-controls.css';
  import './reports.css';
  import './receipt-popup.css';
  let { path, children }: { path: string; children: Snippet } = $props();
  let data=$state(emptyData()); let loading=$state(true); let error=$state(''); let notice=$state(''); let menuOpen=$state(false);
  let edit=$state<{entity:string;row?:Row}|null>(null); let notificationTimer:ReturnType<typeof setTimeout>|undefined;
  const route=$derived(path.split('/')[1]||'dashboard');
  const current=$derived(routes.find(row=>row[0]===route)??routes[0]);
  const m=$derived(buildModel(data,route,$preferences.locale,$preferences.currency));
  const View=$derived(['dashboard','cuentas','transacciones','transferencias'].includes(route)?Operations:['presupuestos','metas','prestamos','patrimonio'].includes(route)?Planning:['suscripciones','calendario','registro-rapido','buscar'].includes(route)?Daily:['categorias','reglas','reportes','alertas'].includes(route)?Analysis:Administration);
  let revision=0; let pageRevision=$state(0);
  async function refresh(){const version=++revision;if(['dashboard','transacciones','reportes','buscar'].includes(route)){pageRevision=untrack(()=>pageRevision)+1;loading=false;return;}try{error='';const next=await loadWorkspace(route);if(version===revision)data=next;}catch(e){if(version===revision)error=e instanceof Error?e.message:String(e);}finally{if(version===revision)loading=false;}}
  $effect(()=>{const selected=path;loading=true;data=emptyData();menuOpen=false;edit=null;void selected;void refresh();return()=>{revision++;if(notificationTimer)clearTimeout(notificationTimer);};});
  const commands = new Map<string, ViewActions[string]>();
  const host:ViewActionHost={charts:{cashFlow:CashFlow,categoryColors:['#ff6068','#fcee0a','#48ddd3','#70aaff','#ffbb70','#bf8cff','#f88ac2','#7d9499']},register(actions){for(const [name,action] of Object.entries(actions))commands.set(name,action);return()=>{for(const [name,action] of Object.entries(actions))if(commands.get(name)===action)commands.delete(name);};},run(name,row){const action=commands.get(name);if(!action)return false;try{void Promise.resolve(action(row)).catch(e=>{error=e instanceof Error?e.message:String(e);});}catch(e){error=e instanceof Error?e.message:String(e);}return true;}};
  setContext(VIEW_ACTIONS,host);
  function manage(){ /* Reserved for older contributed compositions. */ }
  $effect(()=>{let pending:ReturnType<typeof setTimeout>|undefined;const update=()=>{if(['dashboard','transacciones','reportes','buscar'].includes(route))return;if(pending)clearTimeout(pending);pending=setTimeout(()=>{host.run('view.refresh');void refresh();},150);};window.addEventListener('homeledger:data-changed',update);return()=>{window.removeEventListener('homeledger:data-changed',update);if(pending)clearTimeout(pending);};});
  const a:Actions={edit:(entity,row)=>{if(!host.run(`${entity}.${row?.id?'edit':'create'}`,row))edit={entity,row};},manage,refresh,notify:message=>{notice=message;if(notificationTimer)clearTimeout(notificationTimer);notificationTimer=setTimeout(()=>notice='',5000);}};
  $effect(() => { const update = () => { host.run('view.refresh'); void refresh(); }; window.addEventListener('homeledger:quick-entry-saved', update); return () => window.removeEventListener('homeledger:quick-entry-saved', update); });
  async function signOut(){await logout();userProfile.set(null);window.location.assign('/login');}
</script>


<svelte:head><title>{m.t(current[1])} · HomeLedger</title></svelte:head>
<div class="cp-workspace" class:menu-open={menuOpen} data-view={route}>
  <div class="cp-hud"><span>■ HOMELEDGER / {$userProfile?.name || m.t('cyberpunk.my_finances')}</span><span>{new Intl.DateTimeFormat(getIntlTag(m.locale),{dateStyle:'medium'}).format(new Date())}</span></div>
  <aside class="cp-sidebar" aria-label={m.t('a11y.main_nav')}>
    <a class="cp-brand" href="/dashboard">HomeLedger</a>
    <nav>{#each routes.filter(row=>!['configuracion','buscar','registro-rapido','respaldo'].includes(row[0])) as item}<a href={`/${item[0]}`} class:active={route===item[0]} aria-current={route===item[0]?'page':undefined} onclick={()=>menuOpen=false}><Icon name={item[2]} size={17}/><span>{m.t(item[1])}</span></a>{/each}</nav>
    <div class="cp-sidebar-bottom">{#each routes.filter(row=>['buscar','respaldo','configuracion'].includes(row[0])) as item}<a href={`/${item[0]}`} class:active={route===item[0]} aria-current={route===item[0]?'page':undefined}><Icon name={item[2]} size={17}/><span>{m.t(item[1])}</span></a>{/each}<button onclick={signOut}><Icon name="log-out" size={17}/>{m.t('settings.session_revoke_current')}</button></div>
  </aside>
  {#if menuOpen}<button class="cp-menu-scrim" aria-label={m.t('a11y.close_menu')} onclick={()=>menuOpen=false}></button>{/if}
  <div class="cp-mobile-bar"><button class="cp-icon-button" aria-label={m.t('cyberpunk.toggle_navigation')} aria-expanded={menuOpen} onclick={()=>menuOpen=!menuOpen}><Icon name="menu" size={23}/></button><a href="/dashboard">HomeLedger</a><a href="/alertas" aria-label={m.t('nav.alerts')}><Icon name="bell" size={21}/></a></div>
  <main class="cp-main" id="cp-content">
    <header class="cp-page-heading"><div><h1>{m.t(current[1])}</h1><p>{m.t(current[3])}</p></div><div class="cp-heading-actions"><span class="cp-date-badge">{new Intl.DateTimeFormat(getIntlTag(m.locale),{month:'short',year:'numeric'}).format(new Date())}</span><button class="cp-icon-button" aria-label={m.t('cyberpunk.refresh_data')} onclick={refresh}><Icon name="refresh-cw" size={17}/></button><a class="cp-button small" href="/registro-rapido">+ {m.t('cyberpunk.quick_entry')}</a></div></header>
    {#if notice}<div class="cp-notice" role="status">✓ {notice}</div>{/if}
    {#if error}<div class="cp-error" role="alert">{error}<button class="cp-button ghost small" onclick={refresh}>{m.t('offline.retry')}</button></div>{/if}
    {#if loading}<div class="cp-loading" role="status"><span></span>{m.t('cyberpunk.loading_your_finances')}</div>{:else}{#key path}<div class="cp-view">{#if route === 'registro-rapido'}<a class="cp-link" href="/dashboard">{m.t('nav.dashboard')}</a>{:else if route === 'dashboard'}<div class="cp-dashboard">{#key pageRevision}{@render children()}{/key}</div>{:else}{#if ['transacciones','reportes','buscar'].includes(route)}<div class="cp-shared-view">{#key pageRevision}{@render children()}{/key}</div>{:else}<View {m} {a}>{@render children()}</View>{#if ['cuentas','transferencias','suscripciones','presupuestos','metas','prestamos','patrimonio','categorias','reglas','recibos'].includes(route)}<div class="cp-route-controller">{@render children()}</div>{/if}{/if}{/if}</div>{/key}{/if}
  </main>
  {#if edit}{#key edit}<Editor entity={edit.entity} row={edit.row} {m} close={()=>edit=null} saved={refresh}/>{/key}{/if}
</div>
