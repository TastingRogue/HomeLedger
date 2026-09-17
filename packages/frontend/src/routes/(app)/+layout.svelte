<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { hasToken, clearTokens } from '$lib/api';
  import '$lib/styles/shared.css';
  import Icon from '$lib/components/Icon.svelte';
  import Logo from '$lib/components/Logo.svelte';
  import OfflineBanner from '$lib/components/OfflineBanner.svelte';
  import LockScreen from '$lib/components/LockScreen.svelte';
  import { isLockEnabled } from '$lib/stores/lock';
  import { t } from '$lib/i18n';
  import { userProfile, loadUserProfile } from '$lib/stores/user';
  import type { Snippet } from 'svelte';

  let { children }: { children: Snippet } = $props();
  let ready = $state(false);
  let sidebarOpen = $state(false);
  // Optional client-side app lock (P4.14): when enabled, the app UI stays hidden
  // behind LockScreen until the user unlocks (biometric or PIN).
  let locked = $state(false);

  onMount(() => {
    if (hasToken()) {
      locked = isLockEnabled();
      ready = true;
      loadUserProfile();
    } else {
      window.location.href = '/login';
    }
  });

  function unlock() {
    locked = false;
  }

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
        { href: '/buscar', label: $t('nav.search'), icon: 'search' },
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
        { href: '/prestamos', label: $t('nav.loans'), icon: 'credit-card' },
      ],
    },
    {
      title: $t('nav.analysis'),
      color: 'var(--accent-green)',
      items: [
        { href: '/categorias', label: $t('nav.categories'), icon: 'tag' },
        { href: '/reglas', label: $t('nav.rules'), icon: 'zap' },
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

  // Quick-add FAB: hide it on the quick-add screen itself.
  const showFab = $derived($page.url.pathname !== '/registro-rapido');
</script>

{#if ready && locked}
  <LockScreen onUnlocked={unlock} />
{/if}

{#if ready}
  <OfflineBanner />
  <div class="app-layout">
    <!-- Sidebar overlay (mobile) -->
    {#if sidebarOpen}
      <div class="sidebar-overlay" onclick={closeSidebar} role="presentation"></div>
    {/if}

    <!-- Sidebar -->
    <nav class="sidebar" class:open={sidebarOpen} aria-label={$t('a11y.main_nav')}>
      <div class="sidebar-top">
        <div class="brand">
          <span class="brand-icon"><Logo size={28} /></span>
          <span class="brand-name">HomeLedger</span>
        </div>
        <button class="sidebar-close" onclick={closeSidebar} aria-label={$t('a11y.close_menu')}>×</button>
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
    <button class="mobile-toggle" onclick={toggleSidebar} aria-label={$t('a11y.open_menu')}>
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

    <!-- Quick-add floating action button (P4.14) -->
    {#if showFab}
      <a href="/registro-rapido" class="quick-fab" aria-label={$t('nav.quick_add')} title={$t('nav.quick_add')}>
        <Icon name="plus-circle" size={24} />
      </a>
    {/if}
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
    min-height: 100dvh;
    background: var(--bg-deep);
    /* Clamp the whole shell to the viewport width so nothing can create a
       page-level horizontal scroll on mobile. Wide data tables scroll inside
       their own .table-wrap (overflow-x:auto), so this outer clamp doesn't
       break them — it only stops the entire page from shifting sideways. */
    max-width: 100%;
    overflow-x: hidden;
  }

  /* ─── Sidebar ─── */
  .sidebar {
    position: fixed;
    top: 0;
    left: -235px;
    width: 235px;
    height: 100vh;
    /* Translucent structural chrome (P3.D, apple-design §12): a heavier material
       for a structural region, with content/canvas showing faintly through.
       Solidified under prefers-reduced-transparency by the global block in app.css. */
    background: var(--sidebar-bg-glass);
    backdrop-filter: var(--material-blur);
    -webkit-backdrop-filter: var(--material-blur);
    border-right: 1px solid var(--sidebar-border);
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
    border-bottom: 1px solid var(--sidebar-border);
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .brand-icon {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 0;
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
    background: var(--sidebar-active-bg);
    color: var(--sidebar-active-text);
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
    border-top: 1px solid var(--sidebar-border);
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
    /* Translucent floating chrome (apple-design §12): a material layer over the
       canvas rather than a flat opaque box. Solidified under
       prefers-reduced-transparency by the global block in app.css. */
    background: var(--surface-glass);
    backdrop-filter: var(--material-blur);
    -webkit-backdrop-filter: var(--material-blur);
    border: 1px solid var(--border-default);
    color: var(--text-secondary);
    padding: 0.4rem;
    border-radius: var(--radius-md);
    /* Apple touch-target minimum (§10). */
    min-width: 40px;
    min-height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: var(--shadow-sm);
    /* Instant press feedback (§1). */
    transition: transform var(--transition-fast), background var(--transition-fast), color var(--transition-fast);
  }

  .mobile-toggle:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .mobile-toggle:active {
    transform: scale(0.96);
  }

  /* ─── Main Content ─── */
  .main-content {
    flex: 1;
    /* CRITICAL: a flex item defaults to min-width:auto, which refuses to shrink
       below its content's width. Without this, any wide child (a table with a
       min-width, a nowrap row, a wide grid) forces .main-content — and thus the
       whole page — wider than the viewport, shifting everything right and
       clipping the right edge on mobile. min-width:0 lets it stay within the
       viewport so wide children scroll/wrap inside their own box instead. */
    min-width: 0;
    padding: 1.25rem;
    padding-top: 3rem;
    /* Fill the layout (which is min-height:100dvh) via flex:1 — do NOT also set
       min-height:100dvh here. Stacking a 100dvh min-height on top of the
       parent's, plus this element's own padding and the footer, made the box
       taller than the viewport and forced a permanent vertical scrollbar. */
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

  /* ─── Quick-add FAB (P4.14) ─── */
  .quick-fab {
    position: fixed;
    right: 1rem;
    bottom: 1rem;
    z-index: 120;
    width: 52px;
    height: 52px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--accent-blue);
    color: #fff;
    box-shadow: var(--shadow-lg, 0 6px 20px rgba(0, 0, 0, 0.35));
    text-decoration: none;
    transition: transform var(--transition-fast, 0.15s ease), background var(--transition-fast, 0.15s ease);
  }
  .quick-fab:hover {
    background: var(--color-primary-hover, #2563eb);
    transform: translateY(-1px);
  }
  /* Keep clear of the safe-area on notched phones. */
  @supports (padding: max(0px)) {
    .quick-fab {
      right: max(1rem, env(safe-area-inset-right));
      bottom: max(1rem, env(safe-area-inset-bottom));
    }
  }
  /* On wide screens the sidebar is sticky; nudge the FAB so it never overlaps. */
  @media (min-width: 1024px) {
    .quick-fab {
      right: 1.5rem;
      bottom: 1.5rem;
    }
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

  /* Phones/tablets (below the 1024px desktop cutoff where the hamburger shows):
     the fixed .mobile-toggle sits at top-left (0.5rem, 36px). Reserve a top strip
     for it so page titles/headers never render underneath it, and tighten side
     padding to reclaim width on small screens. (apple-design §16 wayfinding:
     chrome gets its own space instead of floating over content.) */
  @media (max-width: 1023px) {
    .main-content {
      /* 0.5rem toggle offset + 36px button + 0.5rem breathing room ≈ 3.25rem */
      padding-top: 3.25rem;
    }
  }

  /* Phones: leave room at the bottom so the quick-add FAB never covers content
     or the footer (P4.14), and reduce side padding so cards/tables get more width. */
  @media (max-width: 640px) {
    .main-content {
      padding-left: 0.85rem;
      padding-right: 0.85rem;
      padding-bottom: 5rem;
    }
  }
</style>
