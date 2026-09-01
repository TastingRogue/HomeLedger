<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { hasToken, clearTokens } from '$lib/api';
  import '$lib/styles/shared.css';
  import Icon from '$lib/components/Icon.svelte';
  import { t } from '$lib/i18n';
  import { userProfile, loadUserProfile } from '$lib/stores/user';
  import type { Snippet } from 'svelte';

  let { children }: { children: Snippet } = $props();
  let ready = $state(false);
  let sidebarOpen = $state(false);

  onMount(() => {
    if (hasToken()) {
      ready = true;
      loadUserProfile();
    } else {
      window.location.href = '/login';
    }
  });

  function handleLogout() {
    clearTokens();
    goto('/login');
  }

  function toggleSidebar() {
    sidebarOpen = !sidebarOpen;
  }

  function closeSidebar() {
    sidebarOpen = false;
  }

  const navSections = $derived([
    {
      title: $t('nav.navigation'),
      color: 'var(--accent-orange)',
      items: [
        { href: '/dashboard', label: $t('nav.dashboard'), icon: 'layout-dashboard' },
        { href: '/cuentas', label: $t('nav.accounts'), icon: 'building' },
        { href: '/transacciones', label: $t('nav.transactions'), icon: 'coins' },
        { href: '/transferencias', label: $t('nav.transfers'), icon: 'arrow-left-right' },
        { href: '/suscripciones', label: $t('nav.subscriptions'), icon: 'repeat' },
      ],
    },
    {
      title: $t('nav.planning'),
      color: 'var(--accent-purple)',
      items: [
        { href: '/metas', label: $t('nav.goals'), icon: 'target' },
        { href: '/presupuestos', label: $t('nav.budgets'), icon: 'clipboard' },
      ],
    },
    {
      title: $t('nav.analysis'),
      color: 'var(--accent-green)',
      items: [
        { href: '/categorias', label: $t('nav.categories'), icon: 'tag' },
        { href: '/reportes', label: $t('nav.reports'), icon: 'bar-chart' },
        { href: '/patrimonio', label: $t('nav.networth'), icon: 'trending-up' },
        { href: '/recibos', label: $t('nav.receipts'), icon: 'receipt' },
        { href: '/alertas', label: $t('nav.alerts'), icon: 'bell' },
      ],
    },
    {
      title: $t('nav.configuration'),
      color: 'var(--text-muted)',
      items: [
        { href: '/configuracion', label: $t('nav.settings'), icon: 'settings' },
        { href: '/importar', label: $t('nav.data'), icon: 'save' },
      ],
    },
  ]);
</script>

{#if ready}
  <div class="app-layout">
    <!-- Sidebar overlay (mobile) -->
    {#if sidebarOpen}
      <div class="sidebar-overlay" onclick={closeSidebar} role="presentation"></div>
    {/if}

    <!-- Sidebar -->
    <nav class="sidebar" class:open={sidebarOpen} aria-label="Navegación principal">
      <div class="sidebar-top">
        <div class="brand">
          <span class="brand-icon"><Icon name="dollar-sign" size={18} /></span>
          <span class="brand-name">HomeLedger</span>
        </div>
        <button class="sidebar-close" onclick={closeSidebar} aria-label="Cerrar menú">×</button>
      </div>

      <div class="nav-sections">
        {#each navSections as section}
          <div class="nav-section">
            <h3 class="section-header" style="color: {section.color}">{section.title}</h3>
            <ul class="nav-list">
              {#each section.items as item (item.href)}
                <li>
                  <a
                    href={item.href}
                    class="nav-link"
                    class:active={$page.url.pathname === item.href}
                    onclick={closeSidebar}
                  >
                    <span class="nav-icon"><Icon name={item.icon} size={16} /></span>
                    <span class="nav-label">{item.label}</span>
                  </a>
                </li>
              {/each}
            </ul>
          </div>
        {/each}
      </div>

      <div class="sidebar-footer">
        <div class="user-section">
          <div class="user-avatar">{($userProfile?.name ?? 'U')[0].toUpperCase()}</div>
          <div class="user-info">
            <span class="user-name">{$userProfile?.name ?? '...'}</span>
            <span class="user-role">Ver perfil</span>
          </div>
        </div>
        <button class="logout-btn" onclick={handleLogout}>
          Cerrar Sesión
        </button>
      </div>
    </nav>

    <!-- Mobile toggle -->
    <button class="mobile-toggle" onclick={toggleSidebar} aria-label="Abrir menú">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M2 4h14M2 9h14M2 14h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </button>

    <!-- Main content -->
    <main class="main-content">
      {@render children()}
      <footer class="app-footer">
        <span>{$t('footer.rights')}</span>
      </footer>
    </main>
  </div>
{:else}
  <div class="auth-check">
    <div class="auth-spinner"></div>
    <p>Verificando sesión...</p>
  </div>
{/if}

<style>
  .app-layout {
    display: flex;
    min-height: 100vh;
    background: var(--bg-deep);
  }

  /* ─── Sidebar ─── */
  .sidebar {
    position: fixed;
    top: 0;
    left: -235px;
    width: 235px;
    height: 100vh;
    background: #0a0f16;
    border-right: 1px solid var(--border-default);
    display: flex;
    flex-direction: column;
    z-index: 200;
    transition: left 0.2s ease;
    overflow-y: auto;
  }

  .sidebar.open {
    left: 0;
  }

  .sidebar-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 150;
  }

  .sidebar-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.85rem 0.75rem;
    border-bottom: 1px solid var(--border-default);
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .brand-icon {
    width: 28px;
    height: 28px;
    background: rgba(245, 158, 11, 0.15);
    color: #f59e0b;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .brand-name {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-primary);
    letter-spacing: -0.01em;
  }

  .sidebar-close {
    display: block;
    background: none;
    color: var(--text-muted);
    font-size: 1.25rem;
    padding: 0.25rem;
    line-height: 1;
    border-radius: var(--radius-sm);
  }

  .sidebar-close:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  /* ─── Nav Sections ─── */
  .nav-sections {
    flex: 1;
    padding: 0.5rem 0;
    overflow-y: auto;
  }

  .nav-section {
    padding: 0 0.5rem;
    margin-bottom: 0.25rem;
  }

  .section-header {
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 0.5rem 0.5rem 0.2rem;
    margin: 0;
  }

  .nav-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .nav-link {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4rem 0.6rem;
    text-decoration: none;
    color: var(--text-secondary);
    font-size: 0.8rem;
    font-weight: 400;
    border-radius: var(--radius-md);
    transition: background var(--transition-fast), color var(--transition-fast);
    border-left: none;
    margin: 1px 0;
  }

  .nav-link:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .nav-link.active {
    background: rgba(139, 92, 246, 0.15);
    color: #a78bfa;
    font-weight: 500;
  }

  .nav-icon {
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .nav-label {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* ─── Sidebar Footer ─── */
  .sidebar-footer {
    padding: 0.75rem;
    border-top: 1px solid var(--border-default);
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .user-section {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.35rem;
    border-radius: var(--radius-md);
  }

  .user-avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--accent-purple);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7rem;
    font-weight: 600;
    flex-shrink: 0;
  }

  .user-info {
    display: flex;
    flex-direction: column;
  }

  .user-name {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--text-primary);
  }

  .user-role {
    font-size: 0.6rem;
    color: var(--text-muted);
  }

  .logout-btn {
    width: 100%;
    padding: 0.35rem 0.5rem;
    background: none;
    border: none;
    border-radius: var(--radius-sm);
    font-size: 0.75rem;
    color: var(--text-muted);
    cursor: pointer;
    text-align: left;
    transition: background var(--transition-fast), color var(--transition-fast);
  }

  .logout-btn:hover {
    background: var(--bg-hover);
    color: var(--accent-red);
  }

  /* ─── Mobile Toggle ─── */
  .mobile-toggle {
    position: fixed;
    top: 0.5rem;
    left: 0.5rem;
    z-index: 100;
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    color: var(--text-secondary);
    padding: 0.4rem;
    border-radius: var(--radius-sm);
    min-width: 36px;
    min-height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .mobile-toggle:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  /* ─── Main Content ─── */
  .main-content {
    flex: 1;
    padding: 1.25rem;
    padding-top: 3rem;
    min-height: 100vh;
    background: var(--bg-default);
    display: flex;
    flex-direction: column;
  }

  .app-footer {
    margin-top: auto;
    padding: 0.75rem 0 0.5rem;
    text-align: center;
    font-size: 0.65rem;
    color: var(--text-muted);
    border-top: 1px solid var(--border-subtle);
  }

  /* ─── Auth Check ─── */
  .auth-check {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    min-height: 100vh;
    color: var(--text-muted);
    background: var(--bg-deep);
    font-size: 0.85rem;
  }

  .auth-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid var(--border-default);
    border-top-color: var(--accent-blue);
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* ─── Desktop ─── */
  @media (min-width: 1024px) {
    .mobile-toggle {
      display: none;
    }

    .sidebar {
      position: sticky;
      top: 0;
      left: 0;
      width: 235px;
      transition: none;
    }

    .sidebar.open {
      left: 0;
    }

    .sidebar-overlay {
      display: none;
    }

    .sidebar-close {
      display: none;
    }

    .main-content {
      padding: 1.25rem 1.5rem;
      padding-top: 1.25rem;
    }
  }

  @media (min-width: 1600px) {
    .main-content {
      padding: 1.25rem 1.5rem;
    }
  }

  @media (min-width: 1920px) {
    .main-content {
      padding: 1.25rem 2rem;
    }
  }
</style>
