<script lang="ts">
  import { onMount } from 'svelte';
  import { apiGet, apiPut, apiPost } from '$lib/api/client';
  import Icon from '$lib/components/Icon.svelte';
  import Dropdown from '$lib/components/Dropdown.svelte';
  import { get } from 'svelte/store';
  import { preferences, setLocale, setCurrency as applyLocalCurrency, currencyConfig, type SupportedLocale, type SupportedCurrency } from '$lib/stores/preferences';
  import { localeOptions as registryLocaleOptions } from '$lib/i18n/registry';
  import { theme, setTheme, type Theme } from '$lib/stores/theme';
  import { t } from '$lib/i18n';
  import { modalPanel, scrim } from '$lib/motion';
  import { ApiError } from '$lib/api/client';
  import {
    listUsers, setUserDisabled, resetUserPassword, deleteUser,
    getRegistration, setRegistration, getInstanceCurrency, setInstanceCurrency,
    type AdminUser, type RegistrationMode,
  } from '$lib/api/users';
  import {
    listSnapshots, createSnapshot, restoreSnapshot,
    type SnapshotInfo,
  } from '$lib/api/backup';
  import {
    getTotpStatus, enrollTotp, confirmTotp, disableTotp,
    listSessions, revokeSession,
    type TotpStatus, type SessionInfo,
  } from '$lib/api/auth';

  // User profile
  let userName = $state('');
  let userEmail = $state('');
  let userRole = $state('');
  let isAdmin = $derived(userRole === 'admin');
  let profileLoading = $state(true);
  let profileSaving = $state(false);
  let profileMsg = $state('');
  let profileMsgSuccess = $state(false);

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

  // ─── TOTP 2FA (P4.12) ───
  let totpStatus = $state<TotpStatus | null>(null);
  let totpLoaded = false;
  let totpBusy = $state(false);
  let totpError = $state('');
  // enrollment modal
  let showTotpModal = $state(false);
  let enrollSecret = $state('');
  let enrollUri = $state('');
  let enrollCode = $state('');
  let backupCodes = $state<string[]>([]);
  // disable modal
  let showDisableTotpModal = $state(false);
  let disableCode = $state('');

  // ─── Active sessions (P4.12) ───
  let sessions = $state<SessionInfo[]>([]);
  let sessionsLoading = $state(false);
  let sessionsError = $state('');

  // Active tab
  let activeTab = $state('perfil');

  // ─── Admin: user management (P1.10) ───
  let users = $state<AdminUser[]>([]);
  let usersLoading = $state(false);
  let usersError = $state('');
  let usersLoaded = false;
  // reset-password modal
  let resetTarget = $state<AdminUser | null>(null);
  let resetPw = $state('');
  let resetSaving = $state(false);
  let resetError = $state('');
  let resetDone = $state('');
  // delete-user modal
  let deleteTarget = $state<AdminUser | null>(null);
  let deleteSaving = $state(false);
  let deleteError = $state('');

  async function loadUsers() {
    usersLoading = true; usersError = '';
    try {
      users = await listUsers();
      usersLoaded = true;
    } catch (e) {
      usersError = e instanceof ApiError ? e.message : $t('common.error');
    } finally { usersLoading = false; }
  }

  async function toggleDisabled(u: AdminUser) {
    usersError = '';
    try {
      const updated = await setUserDisabled(u.id, !u.disabled);
      users = users.map((x) => (x.id === updated.id ? updated : x));
    } catch (e) {
      usersError = e instanceof ApiError ? e.message : $t('common.error');
    }
  }

  function openReset(u: AdminUser) { resetTarget = u; resetPw = ''; resetError = ''; resetDone = ''; }
  async function submitReset() {
    if (!resetTarget) return;
    if (resetPw.length < 8) { resetError = $t('admin.password_min'); return; }
    resetSaving = true; resetError = '';
    try {
      await resetUserPassword(resetTarget.id, resetPw);
      resetDone = $t('admin.reset_done');
      setTimeout(() => { resetTarget = null; }, 1400);
    } catch (e) {
      resetError = e instanceof ApiError ? e.message : $t('common.error');
    } finally { resetSaving = false; }
  }

  function openDelete(u: AdminUser) { deleteTarget = u; deleteError = ''; }
  async function submitDelete() {
    if (!deleteTarget) return;
    deleteSaving = true; deleteError = '';
    try {
      await deleteUser(deleteTarget.id);
      users = users.filter((x) => x.id !== deleteTarget!.id);
      deleteTarget = null;
    } catch (e) {
      deleteError = e instanceof ApiError ? e.message : $t('common.error');
    } finally { deleteSaving = false; }
  }

  // ─── Admin: registration policy (P1.11) ───
  let regMode = $state<RegistrationMode>('first_user_only');
  let regAllowlistText = $state('');
  let regLoading = $state(false);
  let regSaving = $state(false);
  let regMsg = $state('');
  let regMsgSuccess = $state(false);
  let regLoaded = false;
  const regModes: RegistrationMode[] = ['first_user_only', 'open', 'closed'];

  async function loadRegistration() {
    regLoading = true; regMsg = '';
    try {
      const data = await getRegistration();
      regMode = data.mode;
      regAllowlistText = data.allowlist.join('\n');
      regLoaded = true;
    } catch (e) {
      regMsg = e instanceof ApiError ? e.message : $t('common.error'); regMsgSuccess = false;
    } finally { regLoading = false; }
  }

  async function saveRegistration() {
    regSaving = true; regMsg = '';
    try {
      const allowlist = regAllowlistText.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
      const data = await setRegistration({ mode: regMode, allowlist });
      regMode = data.mode;
      regAllowlistText = data.allowlist.join('\n');
      regMsg = $t('admin.saved'); regMsgSuccess = true;
      setTimeout(() => { regMsg = ''; }, 3000);
    } catch (e) {
      regMsg = e instanceof ApiError ? e.message : $t('common.error'); regMsgSuccess = false;
    } finally { regSaving = false; }
  }

  // ─── Admin: instance currency (P1.13 — admin-editable) ───
  let currencyValue = $state('');
  let currencySupported = $state<string[]>([]);
  let currencySaving = $state(false);
  let currencyMsg = $state('');
  let currencyLoaded = false;

  async function loadCurrency() {
    try {
      const data = await getInstanceCurrency();
      currencyValue = data.currency;
      currencySupported = data.supported;
      currencyLoaded = true;
    } catch { /* non-admins never call this; ignore */ }
  }

  async function saveCurrency() {
    currencySaving = true; currencyMsg = '';
    try {
      const data = await setInstanceCurrency(currencyValue);
      currencyValue = data.currency;
      // Reflect instance-wide currency immediately in the UI display.
      applyLocalCurrency(data.currency as SupportedCurrency);
      currencyMsg = $t('admin.saved');
      setTimeout(() => { currencyMsg = ''; }, 3000);
    } catch (e) {
      currencyMsg = e instanceof ApiError ? e.message : $t('common.error');
    } finally { currencySaving = false; }
  }

  // ─── Admin: whole-DB snapshots (P1.8) ───
  let snapshots = $state<SnapshotInfo[]>([]);
  let snapsLoading = $state(false);
  let snapsError = $state('');
  let snapsMsg = $state('');
  let creatingSnap = $state(false);
  let snapsLoaded = false;
  // restore modal
  let restoreTarget = $state<SnapshotInfo | null>(null);
  let restoreConfirmText = $state('');
  let restoring = $state(false);
  let restoreError = $state('');
  let restoreDone = $state('');

  async function loadSnapshots() {
    snapsLoading = true; snapsError = '';
    try {
      snapshots = await listSnapshots();
      snapsLoaded = true;
    } catch (e) {
      snapsError = e instanceof ApiError ? e.message : $t('common.error');
    } finally { snapsLoading = false; }
  }

  async function handleCreateSnapshot() {
    creatingSnap = true; snapsError = ''; snapsMsg = '';
    try {
      const res = await createSnapshot();
      snapsMsg = res.rotatedOut > 0
        ? $t('admin.snap_created_rotated', { n: res.rotatedOut })
        : $t('admin.snap_created');
      await loadSnapshots();
      setTimeout(() => { snapsMsg = ''; }, 4000);
    } catch (e) {
      snapsError = e instanceof ApiError ? e.message : $t('common.error');
    } finally { creatingSnap = false; }
  }

  function openRestore(s: SnapshotInfo) { restoreTarget = s; restoreConfirmText = ''; restoreError = ''; restoreDone = ''; }
  async function submitRestore() {
    if (!restoreTarget) return;
    restoring = true; restoreError = '';
    try {
      await restoreSnapshot(restoreTarget.name, true);
      restoreDone = $t('admin.restore_done');
    } catch (e) {
      restoreError = e instanceof ApiError ? e.message : $t('common.error');
    } finally { restoring = false; }
  }

  function fmtBytes(n: number): string {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  }

  // Lazy-load each admin dataset the first time its tab is opened.
  $effect(() => {
    if (activeTab === 'seguridad') {
      if (!totpLoaded) { totpLoaded = true; loadTotpStatus(); }
      loadSessions();
    }
  });

  $effect(() => {
    if (!isAdmin) return;
    if (activeTab === 'usuarios' && !usersLoaded) loadUsers();
    if (activeTab === 'registro') {
      if (!regLoaded) loadRegistration();
      if (!currencyLoaded) loadCurrency();
    }
    if (activeTab === 'respaldos' && !snapsLoaded) loadSnapshots();
  });

  // Preferences (reactive). Initialize synchronously from the persisted store
  // so the sync $effect below never fires with a stale default that would
  // clobber the saved locale/currency when the page mounts.

  let selectedLocale = $state<SupportedLocale>(get(preferences).locale);
  let selectedTheme = $state<Theme>(get(theme));

  // Built from the language registry so adding a language needs no change here.
  const localeOptions = registryLocaleOptions;
  const themeOptions = $derived([
    { value: 'dark' as Theme, label: $t('settings.theme_dark') },
    { value: 'light' as Theme, label: $t('settings.theme_light') },
  ]);

  async function loadProfile() {
    profileLoading = true;
    try {
      const data = await apiGet<{ id: number; name: string; email: string; role: string }>('/auth/me');
      userName = data.name;
      userEmail = data.email;
      userRole = data.role;
    } catch (e) {
      profileMsg = e instanceof Error ? e.message : $t('common.error_loading_profile');
    }
    finally { profileLoading = false; }
  }

  async function saveProfile() {
    profileSaving = true; profileMsg = ''; profileMsgSuccess = false;
    try {
      await apiPut('/auth/me', { name: userName.trim() });
      profileMsg = $t('settings.profile_updated'); profileMsgSuccess = true;
      setTimeout(() => { profileMsg = ''; profileMsgSuccess = false; }, 3000);
    } catch (e: unknown) { profileMsg = e instanceof Error ? e.message : $t('common.error'); profileMsgSuccess = false; }
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

  // ─── TOTP 2FA (P4.12) ───
  async function loadTotpStatus() {
    try {
      totpStatus = await getTotpStatus();
    } catch { totpStatus = { enabled: false, pending: false, backupCodesRemaining: 0 }; }
  }

  async function openTotpEnroll() {
    totpError = ''; enrollCode = ''; backupCodes = [];
    totpBusy = true;
    try {
      const e = await enrollTotp();
      enrollSecret = e.secret;
      enrollUri = e.otpauthUri;
      showTotpModal = true;
    } catch (e: unknown) { totpError = e instanceof Error ? e.message : 'Error'; }
    finally { totpBusy = false; }
  }

  async function confirmTotpEnroll() {
    if (!enrollCode.trim()) { totpError = $t('settings.totp_code_required'); return; }
    totpBusy = true; totpError = '';
    try {
      const res = await confirmTotp(enrollCode.trim());
      backupCodes = res.backupCodes;
      await loadTotpStatus();
    } catch (e: unknown) {
      totpError = e instanceof ApiError && e.code === 'TOTP_INVALID' ? $t('settings.totp_invalid') : (e instanceof Error ? e.message : 'Error');
    }
    finally { totpBusy = false; }
  }

  function closeTotpModal() {
    showTotpModal = false;
    enrollSecret = ''; enrollUri = ''; enrollCode = ''; backupCodes = []; totpError = '';
  }

  function openDisableTotp() {
    disableCode = ''; totpError = ''; showDisableTotpModal = true;
  }

  async function confirmDisableTotp() {
    if (!disableCode.trim()) { totpError = $t('settings.totp_code_required'); return; }
    totpBusy = true; totpError = '';
    try {
      await disableTotp(disableCode.trim());
      showDisableTotpModal = false;
      await loadTotpStatus();
    } catch (e: unknown) {
      totpError = e instanceof ApiError && e.code === 'TOTP_INVALID' ? $t('settings.totp_invalid') : (e instanceof Error ? e.message : 'Error');
    }
    finally { totpBusy = false; }
  }

  function copyBackupCodes() {
    if (backupCodes.length && navigator.clipboard) {
      navigator.clipboard.writeText(backupCodes.join('\n')).catch(() => {});
    }
  }

  // ─── Active sessions (P4.12) ───
  async function loadSessions() {
    sessionsLoading = true; sessionsError = '';
    try {
      sessions = await listSessions();
    } catch (e: unknown) { sessionsError = e instanceof Error ? e.message : 'Error'; }
    finally { sessionsLoading = false; }
  }

  async function revokeOneSession(id: number, current: boolean) {
    try {
      await revokeSession(id);
      if (current) {
        localStorage.removeItem('sf_access_token');
        localStorage.removeItem('sf_refresh_token');
        window.location.href = '/login';
        return;
      }
      await loadSessions();
    } catch (e: unknown) { sessionsError = e instanceof Error ? e.message : 'Error'; }
  }

  function formatSessionDate(iso: string | null): string {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleString(); } catch { return iso; }
  }



  function handleLocaleChange(e: Event) {
    const val = (e.target as HTMLSelectElement).value as SupportedLocale;
    selectedLocale = val;
    setLocale(val);
  }

  // Currency is instance-wide (single-currency per install), not user-editable
  // here — it is applied from /api/v1/config. Only locale/theme sync from the UI.
  $effect(() => {
    setLocale(selectedLocale);
  });

  $effect(() => {
    setTheme(selectedTheme);
  });

  onMount(() => {
    loadProfile();
  });
</script>

<svelte:window onkeydown={(e) => {
  if (e.key !== 'Escape') return;
  if (restoreTarget) restoreTarget = null;
  else if (deleteTarget) deleteTarget = null;
  else if (resetTarget) resetTarget = null;
  else if (showPasswordModal) showPasswordModal = false;
}} />

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
      {#if isAdmin}
        <button class="tab-item" class:active={activeTab === 'usuarios'} onclick={() => activeTab = 'usuarios'}>
          <Icon name="building" size={15} /> {$t('admin.tab_users')}
        </button>
        <button class="tab-item" class:active={activeTab === 'registro'} onclick={() => activeTab = 'registro'}>
          <Icon name="settings" size={15} /> {$t('admin.tab_registration')}
        </button>
        <button class="tab-item" class:active={activeTab === 'respaldos'} onclick={() => activeTab = 'respaldos'}>
          <Icon name="save" size={15} /> {$t('admin.tab_snapshots')}
        </button>
      {/if}
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
              {#if profileMsg}<span class="msg" class:success={profileMsgSuccess}>{profileMsg}</span>{/if}
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
              <!-- Single-currency per install: the instance currency is set by the
                   admin (env DISPLAY_CURRENCY / admin API), shown here read-only. -->
              <span class="pref-value">{currencyConfig[$preferences.currency]?.symbol} — {currencyConfig[$preferences.currency]?.name}</span>
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
              <Dropdown bind:value={selectedTheme} options={themeOptions} />
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

        <!-- ─── Two-factor authentication (P4.12) ─── -->
        <div class="card">
          <h3 class="card-title">{$t('settings.totp_title')}</h3>
          <div class="pref-row">
            <div class="pref-info">
              <span class="pref-label">
                {$t('settings.totp_label')}
                {#if totpStatus?.enabled}
                  <span class="badge-green">{$t('settings.totp_on')}</span>
                {:else}
                  <span class="badge-muted">{$t('settings.totp_off')}</span>
                {/if}
              </span>
              <span class="pref-desc">{$t('settings.totp_desc')}</span>
              {#if totpStatus?.enabled}
                <span class="pref-desc">{$t('settings.totp_backup_remaining')}: {totpStatus.backupCodesRemaining}</span>
              {/if}
            </div>
            {#if totpStatus?.enabled}
              <button class="btn-action-sm danger" onclick={openDisableTotp} disabled={totpBusy}>{$t('settings.totp_disable_btn')}</button>
            {:else}
              <button class="btn-action-sm" onclick={openTotpEnroll} disabled={totpBusy}>{totpBusy ? '...' : $t('settings.totp_enable_btn')}</button>
            {/if}
          </div>
        </div>

        <!-- ─── Active sessions (P4.12) ─── -->
        <div class="card">
          <h3 class="card-title">{$t('settings.sessions_title')}</h3>
          <p class="card-desc">{$t('settings.sessions_desc')}</p>
          {#if sessionsLoading}
            <div class="loading-state">{$t('common.loading')}</div>
          {:else if sessionsError}
            <p class="card-msg error">{sessionsError}</p>
          {:else if sessions.length === 0}
            <p class="card-desc">{$t('settings.sessions_empty')}</p>
          {:else}
            <ul class="session-list">
              {#each sessions as s (s.id)}
                <li class="session-item">
                  <div class="session-info">
                    <span class="session-ua">
                      {s.userAgent || $t('settings.session_unknown_device')}
                      {#if s.current}<span class="badge-green">{$t('settings.session_current')}</span>{/if}
                    </span>
                    <span class="session-meta">
                      {s.ip || '—'} · {$t('settings.session_last_used')}: {formatSessionDate(s.lastUsedAt)}
                    </span>
                  </div>
                  <button class="btn-action-sm danger" onclick={() => revokeOneSession(s.id, s.current)}>
                    {s.current ? $t('settings.session_revoke_current') : $t('settings.session_revoke')}
                  </button>
                </li>
              {/each}
            </ul>
          {/if}
          <div class="pref-row" style="margin-top:0.6rem;">
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

      {:else if activeTab === 'usuarios' && isAdmin}
        <!-- ─── Admin: User management (P1.10) ─── -->
        <div class="card">
          <h3 class="card-title">{$t('admin.users_title')}</h3>
          {#if usersError}<div class="form-alert" role="alert">{usersError}</div>{/if}
          {#if usersLoading}
            <div class="loading-state">{$t('common.loading')}</div>
          {:else if users.length === 0}
            <div class="loading-state">{$t('admin.no_users')}</div>
          {:else}
            <div class="admin-table" role="table">
              {#each users as u (u.id)}
                <div class="admin-row" role="row">
                  <div class="admin-user">
                    <span class="admin-name">{u.name}
                      {#if u.role === 'admin'}<span class="role-pill">{$t('settings.role_admin')}</span>{/if}
                      {#if u.disabled}<span class="disabled-pill">{$t('admin.disabled')}</span>{/if}
                    </span>
                    <span class="admin-email">{u.email}</span>
                  </div>
                  <div class="admin-actions">
                    <button class="btn-action-sm" onclick={() => toggleDisabled(u)}>
                      {u.disabled ? $t('admin.enable') : $t('admin.disable')}
                    </button>
                    <button class="btn-action-sm" onclick={() => openReset(u)}>{$t('admin.reset_password')}</button>
                    <button class="btn-action-sm danger" onclick={() => openDelete(u)}>{$t('common.delete')}</button>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>

      {:else if activeTab === 'registro' && isAdmin}
        <!-- ─── Admin: Registration policy (P1.11) ─── -->
        <div class="card">
          <h3 class="card-title">{$t('admin.registration_title')}</h3>
          {#if regLoading}
            <div class="loading-state">{$t('common.loading')}</div>
          {:else}
            <div class="reg-modes">
              {#each regModes as m}
                <label class="reg-mode" class:selected={regMode === m}>
                  <input type="radio" name="reg-mode" value={m} bind:group={regMode} />
                  <span class="reg-mode-label">{$t(`admin.mode_${m}`)}</span>
                  <span class="reg-mode-desc">{$t(`admin.mode_${m}_desc`)}</span>
                </label>
              {/each}
            </div>

            {#if regMode === 'open'}
              <div class="form-field allowlist-field">
                <label for="reg-allowlist">{$t('admin.allowlist_label')}</label>
                <textarea id="reg-allowlist" rows="4" bind:value={regAllowlistText} placeholder={$t('admin.allowlist_placeholder')}></textarea>
                <span class="pref-desc">{$t('admin.allowlist_desc')}</span>
              </div>
            {/if}

            <div class="card-footer">
              {#if regMsg}<span class="msg" class:success={regMsgSuccess}>{regMsg}</span>{/if}
              <button class="btn-save" onclick={saveRegistration} disabled={regSaving}>
                {regSaving ? $t('common.saving') : $t('settings.save_changes')}
              </button>
            </div>
          {/if}
        </div>

        <div class="card">
          <h3 class="card-title">{$t('admin.currency_title')}</h3>
          <div class="pref-row">
            <div class="pref-info">
              <span class="pref-label">{$t('settings.currency')}</span>
              <span class="pref-desc">{$t('admin.currency_desc')}</span>
            </div>
            <select bind:value={currencyValue} class="currency-select">
              {#each currencySupported as c}
                <option value={c}>{currencyConfig[c as SupportedCurrency]?.symbol ?? ''} — {c}</option>
              {/each}
            </select>
          </div>
          <div class="card-footer">
            {#if currencyMsg}<span class="msg success">{currencyMsg}</span>{/if}
            <button class="btn-save" onclick={saveCurrency} disabled={currencySaving || !currencyValue}>
              {currencySaving ? $t('common.saving') : $t('settings.save_changes')}
            </button>
          </div>
        </div>

      {:else if activeTab === 'respaldos' && isAdmin}
        <!-- ─── Admin: DB snapshots (P1.8) ─── -->
        <div class="card">
          <div class="snap-head">
            <h3 class="card-title" style="margin:0">{$t('admin.snapshots_title')}</h3>
            <button class="btn-save" onclick={handleCreateSnapshot} disabled={creatingSnap}>
              {creatingSnap ? $t('common.saving') : $t('admin.create_snapshot')}
            </button>
          </div>
          <p class="pref-desc snap-desc">{$t('admin.snapshots_desc')}</p>
          {#if snapsMsg}<div class="card-msg">{snapsMsg}</div>{/if}
          {#if snapsError}<div class="form-alert" role="alert">{snapsError}</div>{/if}
          {#if snapsLoading}
            <div class="loading-state">{$t('common.loading')}</div>
          {:else if snapshots.length === 0}
            <div class="loading-state">{$t('admin.no_snapshots')}</div>
          {:else}
            <div class="admin-table">
              {#each snapshots as s (s.name)}
                <div class="admin-row">
                  <div class="admin-user">
                    <span class="admin-name snap-name">{s.name}</span>
                    <span class="admin-email">{new Date(s.createdAt).toLocaleString()} · {fmtBytes(s.size)}</span>
                  </div>
                  <div class="admin-actions">
                    <button class="btn-action-sm danger" onclick={() => openRestore(s)}>{$t('admin.restore')}</button>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</div>

<!-- Password Change Modal -->
{#if showPasswordModal}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="modal-backdrop" onclick={() => showPasswordModal = false} role="presentation" transition:scrim>
    <div class="modal-content" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1" transition:modalPanel>
      <div class="modal-header">
        <h3 class="modal-title">{$t('settings.change_password')}</h3>
        <button class="modal-close" onclick={() => showPasswordModal = false} aria-label={$t('common.close')}>&times;</button>
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

<!-- TOTP enroll modal (P4.12) -->
{#if showTotpModal}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="modal-backdrop" onclick={closeTotpModal} role="presentation" transition:scrim>
    <div class="modal-content" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1" transition:modalPanel>
      <div class="modal-header">
        <h3 class="modal-title">{$t('settings.totp_enroll_title')}</h3>
        <button class="modal-close" onclick={closeTotpModal} aria-label={$t('common.close')}>&times;</button>
      </div>

      {#if backupCodes.length > 0}
        <!-- Step 2: show backup codes once -->
        <div class="modal-form">
          <div class="modal-success">{$t('settings.totp_enabled_ok')}</div>
          <p class="pref-desc">{$t('settings.totp_backup_intro')}</p>
          <ul class="backup-codes">
            {#each backupCodes as code (code)}<li>{code}</li>{/each}
          </ul>
          <div class="modal-actions">
            <button type="button" class="btn-cancel" onclick={copyBackupCodes}>{$t('settings.totp_copy_codes')}</button>
            <button type="button" class="btn-submit" onclick={closeTotpModal}>{$t('common.done')}</button>
          </div>
        </div>
      {:else}
        <!-- Step 1: show secret + otpauth URI, confirm with a code -->
        <form class="modal-form" onsubmit={(e) => { e.preventDefault(); confirmTotpEnroll(); }}>
          <p class="pref-desc">{$t('settings.totp_enroll_intro')}</p>
          <div class="form-field">
            <label for="totp-secret">{$t('settings.totp_secret_label')}</label>
            <input id="totp-secret" type="text" value={enrollSecret} readonly />
          </div>
          <p class="pref-desc totp-uri">{enrollUri}</p>
          <div class="form-field">
            <label for="totp-confirm-code">{$t('settings.totp_confirm_label')}</label>
            <input id="totp-confirm-code" type="text" inputmode="numeric" autocomplete="one-time-code" bind:value={enrollCode} placeholder="000000" />
          </div>
          {#if totpError}<p class="modal-error">{totpError}</p>{/if}
          <div class="modal-actions">
            <button type="button" class="btn-cancel" onclick={closeTotpModal}>{$t('common.cancel')}</button>
            <button type="submit" class="btn-submit" disabled={totpBusy}>{totpBusy ? '...' : $t('settings.totp_confirm_btn')}</button>
          </div>
        </form>
      {/if}
    </div>
  </div>
{/if}

<!-- TOTP disable modal (P4.12) -->
{#if showDisableTotpModal}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="modal-backdrop" onclick={() => (showDisableTotpModal = false)} role="presentation" transition:scrim>
    <div class="modal-content modal-sm" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1" transition:modalPanel>
      <div class="modal-header">
        <h3 class="modal-title">{$t('settings.totp_disable_title')}</h3>
        <button class="modal-close" onclick={() => (showDisableTotpModal = false)} aria-label={$t('common.close')}>&times;</button>
      </div>
      <form class="modal-form" onsubmit={(e) => { e.preventDefault(); confirmDisableTotp(); }}>
        <p class="pref-desc">{$t('settings.totp_disable_intro')}</p>
        <div class="form-field">
          <label for="totp-disable-code">{$t('settings.totp_confirm_label')}</label>
          <input id="totp-disable-code" type="text" inputmode="numeric" autocomplete="one-time-code" bind:value={disableCode} placeholder="000000" />
        </div>
        {#if totpError}<p class="modal-error">{totpError}</p>{/if}
        <div class="modal-actions">
          <button type="button" class="btn-cancel" onclick={() => (showDisableTotpModal = false)}>{$t('common.cancel')}</button>
          <button type="submit" class="btn-danger-solid" disabled={totpBusy}>{totpBusy ? '...' : $t('settings.totp_disable_btn')}</button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Admin: reset user password (P1.10) -->
{#if resetTarget}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="modal-backdrop" onclick={() => (resetTarget = null)} role="presentation" transition:scrim>
    <div class="modal-content" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1" transition:modalPanel>
      <div class="modal-header">
        <h3 class="modal-title">{$t('admin.reset_title')}</h3>
        <button class="modal-close" onclick={() => (resetTarget = null)} aria-label={$t('common.close')}>&times;</button>
      </div>
      {#if resetDone}
        <div class="modal-success">{resetDone}</div>
      {:else}
        <form class="modal-form" onsubmit={(e) => { e.preventDefault(); submitReset(); }}>
          <p class="pref-desc">{$t('admin.reset_for', { name: resetTarget.name })}</p>
          <div class="form-field">
            <label for="admin-reset-pw">{$t('admin.new_password')}</label>
            <input id="admin-reset-pw" type="password" bind:value={resetPw} required minlength={8} autocomplete="new-password" />
          </div>
          {#if resetError}<p class="modal-error">{resetError}</p>{/if}
          <div class="modal-actions">
            <button type="button" class="btn-cancel" onclick={() => (resetTarget = null)}>{$t('common.cancel')}</button>
            <button type="submit" class="btn-submit" disabled={resetSaving}>{resetSaving ? '...' : $t('admin.reset_password')}</button>
          </div>
        </form>
      {/if}
    </div>
  </div>
{/if}

<!-- Admin: delete user (P1.10) -->
{#if deleteTarget}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="modal-backdrop" onclick={() => (deleteTarget = null)} role="presentation" transition:scrim>
    <div class="modal-content modal-sm" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1" transition:modalPanel>
      <div class="modal-header">
        <h3 class="modal-title">{$t('admin.delete_title')}</h3>
        <button class="modal-close" onclick={() => (deleteTarget = null)} aria-label={$t('common.close')}>&times;</button>
      </div>
      <div class="modal-form">
        <p class="confirm-text">{$t('admin.delete_confirm', { name: deleteTarget.name })}</p>
        {#if deleteError}<p class="modal-error">{deleteError}</p>{/if}
        <div class="modal-actions">
          <button type="button" class="btn-cancel" onclick={() => (deleteTarget = null)}>{$t('common.cancel')}</button>
          <button type="button" class="btn-danger-solid" onclick={submitDelete} disabled={deleteSaving}>
            {deleteSaving ? '...' : $t('common.delete')}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Admin: restore DB snapshot (P1.8) — DESTRUCTIVE -->
{#if restoreTarget}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="modal-backdrop" onclick={() => (restoreTarget = null)} role="presentation" transition:scrim>
    <div class="modal-content" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1" transition:modalPanel>
      <div class="modal-header">
        <h3 class="modal-title">{$t('admin.restore_title')}</h3>
        <button class="modal-close" onclick={() => (restoreTarget = null)} aria-label={$t('common.close')}>&times;</button>
      </div>
      {#if restoreDone}
        <div class="modal-form">
          <div class="modal-success">{restoreDone}</div>
          <p class="pref-desc">{$t('admin.restore_reload_hint')}</p>
          <div class="modal-actions">
            <button type="button" class="btn-submit" onclick={() => window.location.reload()}>{$t('admin.reload')}</button>
          </div>
        </div>
      {:else}
        <div class="modal-form">
          <p class="confirm-text danger-text">{$t('admin.restore_warning')}</p>
          <p class="file-info">{restoreTarget.name}</p>
          <div class="form-field">
            <label for="restore-confirm">{$t('admin.restore_type_confirm')}</label>
            <input id="restore-confirm" type="text" bind:value={restoreConfirmText} placeholder="RESTORE" autocomplete="off" />
          </div>
          {#if restoreError}<p class="modal-error">{restoreError}</p>{/if}
          <div class="modal-actions">
            <button type="button" class="btn-cancel" onclick={() => (restoreTarget = null)}>{$t('common.cancel')}</button>
            <button type="button" class="btn-danger-solid" onclick={submitRestore} disabled={restoring || restoreConfirmText !== 'RESTORE'}>
              {restoring ? '...' : $t('admin.restore')}
            </button>
          </div>
        </div>
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
  .badge-muted { font-size: 0.7rem; font-weight: 600; padding: 0.2rem 0.5rem; background: var(--bg-muted, var(--border-default)); color: var(--text-muted); border-radius: var(--radius-full); }
  .card-msg { font-size: 0.75rem; color: var(--accent-green); margin-top: 0.5rem; }
  .card-msg.error { color: var(--accent-red); }
  .card-desc { font-size: 0.78rem; color: var(--text-muted); margin-bottom: 0.6rem; }

  /* Active-session list (P4.12) */
  .session-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; }
  .session-item { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; padding: 0.6rem 0.7rem; border: 1px solid var(--border-default); border-radius: var(--radius-md); }
  .session-info { display: flex; flex-direction: column; gap: 0.2rem; min-width: 0; }
  .session-ua { font-size: 0.8rem; font-weight: 500; color: var(--text-primary); display: flex; align-items: center; gap: 0.4rem; overflow: hidden; text-overflow: ellipsis; }
  .session-meta { font-size: 0.7rem; color: var(--text-muted); }

  /* TOTP enrollment (P4.12) */
  .totp-uri { word-break: break-all; font-family: var(--font-mono, monospace); font-size: 0.68rem; background: var(--bg-muted, rgba(0,0,0,0.04)); padding: 0.4rem 0.5rem; border-radius: var(--radius-sm); }
  .backup-codes { list-style: none; margin: 0.5rem 0; padding: 0.6rem 0.7rem; display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.35rem; background: var(--bg-muted, rgba(0,0,0,0.04)); border-radius: var(--radius-md); font-family: var(--font-mono, monospace); font-size: 0.82rem; letter-spacing: 0.05em; }

  .loading-state { padding: 2rem; text-align: center; color: var(--text-muted); font-size: 0.85rem; }

  @media (max-width: 640px) {
    .form-grid { grid-template-columns: 1fr; }
    .pref-row { flex-direction: column; align-items: flex-start; }
  }

  /* ─── Admin panels ─── */
  .form-alert { font-size: 0.78rem; color: var(--accent-red); background: var(--tag-red-bg); padding: 0.4rem 0.65rem; border-radius: var(--radius-sm); margin-bottom: 0.75rem; }

  .admin-table { display: flex; flex-direction: column; }
  .admin-row { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; padding: 0.6rem 0; border-bottom: 1px solid var(--border-subtle); }
  .admin-row:last-child { border-bottom: none; }
  .admin-user { display: flex; flex-direction: column; gap: 0.15rem; min-width: 0; }
  .admin-name { font-size: 0.82rem; font-weight: 500; color: var(--text-primary); display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; }
  .admin-email { font-size: 0.7rem; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; }
  .snap-name { font-family: var(--font-mono); font-size: 0.72rem; word-break: break-all; }
  .role-pill { font-size: 0.6rem; font-weight: 600; padding: 0.1rem 0.35rem; border-radius: var(--radius-full); background: var(--tag-purple-bg); color: var(--accent-purple); text-transform: uppercase; letter-spacing: 0.03em; }
  .disabled-pill { font-size: 0.6rem; font-weight: 600; padding: 0.1rem 0.35rem; border-radius: var(--radius-full); background: var(--tag-red-bg); color: var(--accent-red); text-transform: uppercase; letter-spacing: 0.03em; }
  .admin-actions { display: flex; gap: 0.35rem; flex-shrink: 0; flex-wrap: wrap; justify-content: flex-end; }

  /* Registration modes */
  .reg-modes { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem; }
  .reg-mode { display: grid; grid-template-columns: auto 1fr; grid-template-rows: auto auto; column-gap: 0.6rem; align-items: center; padding: 0.65rem 0.8rem; border: 1px solid var(--border-default); border-radius: var(--radius-md); cursor: pointer; }
  .reg-mode.selected { border-color: var(--accent-purple); background: var(--sidebar-active-bg); }
  .reg-mode input { grid-row: 1 / 3; width: auto; }
  .reg-mode-label { font-size: 0.82rem; font-weight: 500; color: var(--text-primary); }
  .reg-mode-desc { font-size: 0.68rem; color: var(--text-muted); grid-column: 2; }
  .allowlist-field { margin-bottom: 0.5rem; }
  .allowlist-field textarea { font-family: var(--font-mono); font-size: 0.78rem; resize: vertical; }
  .currency-select { max-width: 220px; }

  .snap-head { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; margin-bottom: 0.35rem; }
  .snap-desc { margin-bottom: 0.75rem; }
  .danger-text { color: var(--accent-red); font-weight: 500; }
  .confirm-text { font-size: 0.85rem; color: var(--text-secondary); line-height: 1.45; }
  .file-info { font-size: 0.72rem; color: var(--text-muted); font-family: var(--font-mono); word-break: break-all; margin: 0.25rem 0 0.5rem; }
</style>
