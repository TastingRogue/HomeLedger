<script lang="ts">
  import type { Snippet } from 'svelte';
  import { t } from '#lib/i18n/index.ts';
  import './workspace.css';
  let { kind, children }: { kind:'login'|'register'|'offline'; children:Snippet }=$props();
  const title=$derived($t(kind==='login'?'page_title.login':kind==='register'?'page_title.register':'offline.title'));
</script>
<main class="cp-auth-frame" data-auth={kind}>
  <header class="cp-auth-page-heading"><h1>{title}</h1><p>{$t('cyberpunk.auth_tagline')}</p></header>
  <div class="cp-auth-panel"><header class="cp-auth-brand"><span class="cp-ribbon">HomeLedger</span><small>{$t('cyberpunk.auth_tagline')}</small></header>{#if kind!=='offline'}<h2 class="cp-auth-title">{title}</h2>{/if}{@render children()}</div>
</main>
