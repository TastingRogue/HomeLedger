<script lang="ts">
  import { onMount } from 'svelte';
  import { apiGet, apiPut, apiPost } from '$lib/api/client';
  import Icon from '$lib/components/Icon.svelte';
  import Dropdown from '$lib/components/Dropdown.svelte';
  import { preferences, setLocale, setCurrency, currencyConfig, type SupportedCurrency, type SupportedLocale } from '$lib/stores/preferences';
  import { t } from '$lib/i18n';

  // User profile
  let userName = $state('');
  let userEmail = $state('');
  let userRole = $state('');
  let profileLoading = $state(true);
  let profileSaving = $state(false);
  let profileMsg = $state('');

  // Password change
  let showPasswordModal = $state(false);
  let currentPassword = $state('');
  let newPassword = $state('');
  let confirmPassword = $state('');
  let passwordSaving = $state(false);
  let passwordError = $state('');
  let passwordSuccess = $state(false);

  // Sessions
  let revokingAll = $state(false);
  let revokeMsg = $state('');

  // Active tab
  let activeTab = $state('perfil');

  // Preferences (reactive)
  let selectedCurrency = $state<SupportedCurrency>('MXN');
  let selectedLocale = $state<SupportedLocale>('es');

  const currencyOptions: { value: SupportedCurrency; label: string }[] = Object.entries(currencyConfig).map(([k, v]) => ({ value: k as SupportedCurrency, label: `${v.symbol} — ${v.name}` }));
  const localeOptions = [
    { value: 'es' as SupportedLocale, label: 'Español' },
    { value: 'en' as SupportedLocale, label: 'English (US)' },
  ];

  async function loadProfile() {
    profileLoading = true;
    try {
      const data = await apiGet<{ id: number; name: string; email: string; role: string }>('/auth/me');
      userName = data.name;
      userEmail = data.email;
      userRole = data.role;
    } catch { }
    finally { profileLoading = false; }
  }

  async function saveProfile() {
    profileSaving = true; profileMsg = '';
    try {
      await apiPut('/auth/me', { name: userName.trim() });
      profileMsg = $t('settings.profile_updated');
      setTimeout(() => profileMsg = '', 3000);
    } catch (e: unknown) { profileMsg = e instanceof Error ? e.message : 'Error'; }
    finally { profileSaving = false; }
  }

  function openPasswordModal() {
    currentPassword = ''; newPassword = ''; confirmPassword = '';
    passwordError = ''; passwordSuccess = false;
    showPasswordModal = true;
  }

  async function changePassword() {
    if (!currentPassword || !newPassword) { passwordError = $t('settings.fill_all_fields'); return; }
    if (newPassword.length < 6) { passwordError = $t('settings.min_chars'); return; }
    if (newPassword !== confirmPassword) { passwordError = $t('settings.passwords_mismatch'); return; }

    passwordSaving = true; passwordError = '';
    try {
      await apiPost('/auth/change-password', { currentPassword, newPassword });
      passwordSuccess = true;
      setTimeout(() => { showPasswordModal = false; }, 1500);
    } catch (e: unknown) { passwordError = e instanceof Error ? e.message : 'Error'; }
    finally { passwordSaving = false; }
  }

  async function revokeAllSessions() {
    revokingAll = true; revokeMsg = '';
    try {
      await apiPost('/auth/revoke-all-sessions', {});
      revokeMsg = $t('settings.sessions_closed');
      setTimeout(() => { localStorage.removeItem('sf_access_token'); localStorage.removeItem('sf_refresh_token'); window.location.href = '/login'; }, 2000);
    } catch { revokeMsg = $t('settings.sessions_error'); }
    finally { revokingAll = false; }
  }

  function handleCurrencyChange(e: Event) {
    const val = (e.target as HTMLSelectElement).value as SupportedCurrency;
    selectedCurrency = val;
    setCurrency(val);
  }

  function handleLocaleChange(e: Event) {
    const val = (e.target as HTMLSelectElement).value as SupportedLocale;
    selectedLocale = val;
    setLocale(val);
  }

  // Sync dropdown bind:value to store
  $effect(() => {
    setCurrency(selectedCurrency);
  });

  $effect(() => {
    setLocale(selectedLocale);
  });

  onMount(() => {
    loadProfile();
    // Load current preferences
    const unsub = preferences.subscribe(p => {
      selectedCurrency = p.currency;
      selectedLocale = p.locale;
    });
    return unsub;
  });
</script>

<svelte:head><title>{$t('settings.title')} - HomeLedger</title></svelte:head>

<div class="page">
  <header class="page-header">
    <div>
      <h1>{$t('settings.title')}</h1>
      <p class="page-subtitle">{$t('settings.subtitle')}</p>
    </div>
  </header>

  <div class="settings-layout">
    <!-- Tabs -->
    <nav class="settings-tabs">
      <button class="tab-item" class:active={activeTab === 'perfil'} onclick={() => activeTab = 'perfil'}>
        <Icon name="building" size={15} /> {$t('settings.profile')}
      </button>
      <button class="tab-item" class:active={activeTab === 'seguridad'} onclick={() => activeTab = 'seguridad'}>
        <Icon name="settings" size={15} /> {$t('settings.security')}
      </button>
      <button class="tab-item" class:active={activeTab === 'datos'} onclick={() => activeTab = 'datos'}>
        <Icon name="save" size={15} /> {$t('settings.data')}
      </button>
    </nav>

    <!-- Content -->
    <div class="settings-content">

      {#if activeTab === 'perfil'}
        {#if profileLoading}
          <div class="loading-state">{$t('settings.loading_profile')}</div>
        {:else}
          <div class="card">
            <h3 class="card-title">{$t('settings.personal_info')}</h3>
            <div class="form-grid">
              <div class="form-field">
                <label for="cfg-name">{$t('settings.name_label')}</label>
                <input id="cfg-name" type="text" bind:value={userName} placeholder={$t('settings.name_placeholder')} />
              </div>
              <div class="form-field">
                <label for="cfg-email">{$t('settings.email_label')}</label>
                <input id="cfg-email" type="email" value={userEmail} disabled title={$t('settings.email_tooltip')} />
              </div>
              <div class="form-field">
                <label for="cfg-role">{$t('settings.role_label')}</label>
                <input id="cfg-role" type="text" value={userRole === 'admin' ? $t('settings.role_admin') : $t('settings.role_user')} disabled />
              </div>
            </div>
            <div class="card-footer">
              {#if profileMsg}<span class="msg" class:success={profileMsg === 'Perfil actualizado'}>{profileMsg}</span>{/if}
              <button class="btn-save" onclick={saveProfile} disabled={profileSaving}>
                {profileSaving ? $t('common.saving') : $t('settings.save_changes')}
              </button>
            </div>
          </div>

          <div class="card">
            <h3 class="card-title">{$t('settings.preferences')}</h3>
            <div class="pref-row">
              <div class="pref-info">
                <span class="pref-label">{$t('settings.currency')}</span>
                <span class="pref-desc">{$t('settings.currency_desc')}</span>
              </div>
              <Dropdown bind:value={selectedCurrency} options={currencyOptions} />
            </div>
            <div class="pref-row">
              <div class="pref-info">
                <span class="pref-label">{$t('settings.language')}</span>
                <span class="pref-desc">{$t('settings.language_desc')}</span>
              </div>
              <Dropdown bind:value={selectedLocale} options={localeOptions} />
            </div>
            <div class="pref-row">
              <div class="pref-info">
                <span class="pref-label">{$t('settings.timezone')}</span>
                <span class="pref-desc">{$t('settings.timezone_desc')}</span>
              </div>
              <span class="pref-value">America/Mexico_City</span>
            </div>
            <div class="pref-row">
              <div class="pref-info">
                <span class="pref-label">{$t('settings.theme')}</span>
                <span class="pref-desc">{$t('settings.theme_desc')}</span>
              </div>
              <span class="pref-value">{$t('settings.theme_dark')}</span>
            </div>
          </div>
        {/if}

      {:else if activeTab === 'seguridad'}
        <div class="card">
          <h3 class="card-title">{$t('settings.password_title')}</h3>
          <div class="pref-row">
            <div class="pref-info">
              <span class="pref-label">{$t('settings.change_password')}</span>
              <span class="pref-desc">{$t('settings.change_password_desc')}</span>
            </div>
            <button class="btn-action-sm" onclick={openPasswordModal}>{$t('settings.change_btn')}</button>
          </div>
        </div>

        <div class="card">
          <h3 class="card-title">{$t('settings.sessions_title')}</h3>
          <div class="pref-row">
            <div class="pref-info">
              <span class="pref-label">{$t('settings.close_all_sessions')}</span>
              <span class="pref-desc">{$t('settings.close_sessions_desc')}</span>
            </div>
            <button class="btn-action-sm danger" onclick={revokeAllSessions} disabled={revokingAll}>
              {revokingAll ? '...' : $t('settings.close_all_btn')}
            </button>
          </div>
          {#if revokeMsg}<p class="card-msg">{revokeMsg}</p>{/if}
        </div>

        <div class="card">
          <h3 class="card-title">{$t('settings.privacy_title')}</h3>
          <div class="pref-row">
            <div class="pref-info">
              <span class="pref-label">{$t('settings.local_storage')}</span>
              <span class="pref-desc">{$t('settings.local_desc')}</span>
            </div>
            <span class="badge-green">{$t('settings.local_badge')}</span>
          </div>
        </div>

      {:else if activeTab === 'datos'}
        <div class="card">
          <h3 class="card-title">{$t('settings.data_management')}</h3>
          <div class="pref-row">
            <div class="pref-info">
              <span class="pref-label">{$t('settings.import_export')}</span>
              <span class="pref-desc">{$t('settings.import_export_desc')}</span>
            </div>
            <a href="/importar" class="btn-action-sm">{$t('settings.go_to_data')}</a>
          </div>
          <div class="pref-row">
            <div class="pref-info">
              <span class="pref-label">{$t('settings.database')}</span>
              <span class="pref-desc">{$t('settings.database_desc')}</span>
            </div>
            <span class="pref-value">SQLite</span>
          </div>
        </div>

        <div class="card">
          <h3 class="card-title">{$t('settings.about')}</h3>
          <div class="pref-row">
            <div class="pref-info">
              <span class="pref-label">{$t('settings.version')}</span>
              <span class="pref-desc">HomeLedger ES</span>
            </div>
            <span class="pref-value">0.1.0</span>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

<!-- Password Change Modal -->
{#if showPasswordModal}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="modal-backdrop" onclick={() => showPasswordModal = false} role="presentation">
    <div class="modal-content" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1">
      <div class="modal-header">
        <h3 class="modal-title">{$t('settings.change_password')}</h3>
        <button class="modal-close" onclick={() => showPasswordModal = false}>&times;</button>
      </div>
      {#if passwordSuccess}
        <div class="modal-success">{$t('settings.password_updated')}</div>
      {:else}
        <form class="modal-form" onsubmit={(e) => { e.preventDefault(); changePassword(); }}>
          <div class="form-field">
            <label for="cfg-current-pw">{$t('settings.current_password')}</label>
            <input id="cfg-current-pw" type="password" bind:value={currentPassword} required />
          </div>
          <div class="form-field">
            <label for="cfg-new-pw">{$t('settings.new_password')}</label>
            <input id="cfg-new-pw" type="password" bind:value={newPassword} required minlength={6} />
          </div>
          <div class="form-field">
            <label for="cfg-confirm-pw">{$t('settings.confirm_password')}</label>
            <input id="cfg-confirm-pw" type="password" bind:value={confirmPassword} required />
          </div>
          {#if passwordError}<p class="modal-error">{passwordError}</p>{/if}
          <div class="modal-actions">
            <button type="button" class="btn-cancel" onclick={() => showPasswordModal = false}>{$t('common.cancel')}</button>
            <button type="submit" class="btn-submit" disabled={passwordSaving}>
              {passwordSaving ? '...' : $t('settings.change_password_btn')}
            </button>
          </div>
        </form>
      {/if}
    </div>
  </div>
{/if}

<style>
  .page { width: 100%; margin: 0; }
  .page-header { margin-bottom: 1.25rem; }
  .page-header h1 { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); }
  .page-subtitle { font-size: 0.8rem; color: var(--text-muted); margin-top: 0.15rem; }

  .settings-layout { display: flex; flex-direction: column; gap: 1rem; }

  /* Tabs */
  .settings-tabs { display: flex; gap: 0; border-bottom: 1px solid var(--border-default); margin-bottom: 0.5rem; }
  .tab-item { display: flex; align-items: center; gap: 0.4rem; padding: 0.55rem 1rem; background: none; border: none; border-bottom: 2px solid transparent; font-size: 0.82rem; font-weight: 500; color: var(--text-secondary); cursor: pointer; margin-bottom: -1px; }
  .tab-item:hover { color: var(--text-primary); }
  .tab-item.active { color: var(--accent-purple); border-bottom-color: var(--accent-purple); }

  /* Content */
  .settings-content { display: flex; flex-direction: column; gap: 1rem; }

  .card { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 1.25rem; }
  .card-title { font-size: 0.9rem; font-weight: 600; color: var(--text-primary); margin: 0 0 1rem; }

  .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 0.85rem; }
  .form-field { display: flex; flex-direction: column; gap: 0.25rem; }
  .form-field label { font-size: 0.7rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; }
  .form-field input:disabled { opacity: 0.6; cursor: not-allowed; }

  .card-footer { display: flex; align-items: center; justify-content: flex-end; gap: 0.75rem; margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid var(--border-subtle); }
  .btn-save { padding: 0.4rem 1rem; font-size: 0.8rem; font-weight: 600; background: var(--accent-purple); color: #fff; border: none; border-radius: var(--radius-sm); cursor: pointer; }
  .btn-save:disabled { opacity: 0.5; }
  .btn-save:hover:not(:disabled) { opacity: 0.9; }
  .msg { font-size: 0.75rem; }
  .msg.success { color: var(--accent-green); }

  /* Preference rows */
  .pref-row { display: flex; align-items: center; justify-content: space-between; padding: 0.7rem 0; border-bottom: 1px solid var(--border-subtle); gap: 1rem; }
  .pref-row:last-child { border-bottom: none; }
  .pref-info { display: flex; flex-direction: column; gap: 0.1rem; }
  .pref-label { font-size: 0.82rem; font-weight: 500; color: var(--text-primary); }
  .pref-desc { font-size: 0.68rem; color: var(--text-muted); }
  .pref-value { font-size: 0.78rem; color: var(--text-secondary); }

  .btn-action-sm { padding: 0.35rem 0.7rem; font-size: 0.75rem; font-weight: 500; background: var(--bg-elevated); border: 1px solid var(--border-default); border-radius: var(--radius-sm); color: var(--text-secondary); cursor: pointer; text-decoration: none; }
  .btn-action-sm:hover { background: var(--bg-hover); color: var(--text-primary); }
  .btn-action-sm.danger { border-color: var(--accent-red); color: var(--accent-red); }
  .btn-action-sm.danger:hover { background: var(--tag-red-bg); }

  .badge-green { font-size: 0.7rem; font-weight: 600; padding: 0.2rem 0.5rem; background: var(--tag-green-bg); color: var(--accent-green); border-radius: var(--radius-full); }
  .card-msg { font-size: 0.75rem; color: var(--accent-green); margin-top: 0.5rem; }

  .loading-state { padding: 2rem; text-align: center; color: var(--text-muted); font-size: 0.85rem; }

  @media (max-width: 640px) {
    .form-grid { grid-template-columns: 1fr; }
    .pref-row { flex-direction: column; align-items: flex-start; }
  }
</style>
