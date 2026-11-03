<script lang="ts">
  import type { Snippet } from 'svelte';
  import { preferences } from '$lib/stores/preferences';
  import './workspace.css';
  let { kind, children }: { kind:'login'|'register'|'offline'; children:Snippet }=$props();
  const title=$derived(kind==='login'?($preferences.locale==='es'?'Iniciar sesión':'Sign in'):kind==='register'?($preferences.locale==='es'?'Crear cuenta':'Create account'):($preferences.locale==='es'?'Sin conexión':'Offline'));
</script>
<main class="cp-auth-frame" data-auth={kind}>
  <header class="cp-auth-page-heading"><h1>{title}</h1><p>{$preferences.locale==='es'?'Tus finanzas, en control':'Your finances, in control'}</p></header>
  <div class="cp-auth-panel"><header class="cp-auth-brand"><span class="cp-ribbon">HomeLedger</span><small>{$preferences.locale==='es'?'Tus finanzas, en control':'Your finances, in control'}</small></header>{#if kind!=='offline'}<h2 class="cp-auth-title">{title}</h2>{/if}{@render children()}</div>
</main>
