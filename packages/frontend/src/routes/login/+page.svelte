<script lang="ts">
  import { goto } from '$app/navigation';
  import { authApi, ApiError } from '$lib/api';
  import { authStore } from '$lib/stores';
  import { t } from '$lib/i18n';
  import Logo from '$lib/components/Logo.svelte';

  let email = $state('');
  let password = $state('');
  let error = $state('');
  let loading = $state(false);

  let emailError = $state('');
  let passwordError = $state('');

  // Second-factor (TOTP) step: shown after the backend replies TOTP_REQUIRED.
  let totpRequired = $state(false);
  let totpCode = $state('');
  let totpError = $state('');

  function validateForm(): boolean {
    let valid = true;
    emailError = '';
    passwordError = '';

    if (!email.trim()) {
      emailError = 'El correo electrónico es obligatorio';
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      emailError = 'Ingresa un correo electrónico válido';
      valid = false;
    }

    if (!password) {
      passwordError = 'La contraseña es obligatoria';
      valid = false;
    }

    return valid;
  }

  async function handleLogin(e: Event) {
    e.preventDefault();
    error = '';
    totpError = '';

    // Skip email/password validation once we're on the second-factor step.
    if (!totpRequired && !validateForm()) return;

    if (totpRequired && !totpCode.trim()) {
      totpError = $t('auth.totp_required_error');
      return;
    }

    loading = true;

    try {
      const response = await authApi.login({
        email: email.trim(),
        password,
        totpCode: totpRequired ? totpCode.trim() : undefined,
      });
      authStore.login(
        { id: 0, name: '', email: email.trim(), role: '' },
        response.accessToken,
        response.refreshToken
      );
      try {
        const user = await authApi.getMe();
        authStore.setUser({ id: user.id, name: user.name, email: user.email, role: user.role });
      } catch { }
      await goto('/dashboard');
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.code === 'TOTP_REQUIRED') {
          // Move to the second-factor step (first time the backend asks for it).
          totpRequired = true;
          error = '';
        } else if (err.code === 'TOTP_INVALID') {
          totpRequired = true;
          totpError = $t('auth.totp_invalid');
        } else if (err.code === 'INVALID_CREDENTIALS') {
          error = $t('auth.invalid_credentials');
        } else {
          error = err.message;
        }
      } else {
        error = $t('auth.connection_error');
      }
    } finally {
      loading = false;
    }
  }

  function cancelTotp() {
    totpRequired = false;
    totpCode = '';
    totpError = '';
    error = '';
  }
</script>

<svelte:head>
  <title>{$t('page_title.login')} - HomeLedger</title>
</svelte:head>

<div class="login-container">
  <div class="login-card">
    <div class="brand-mark"><Logo size={56} /></div>
    <h1 class="login-title">HomeLedger</h1>
    <p class="login-subtitle">{$t('auth.login_title')}</p>

    {#if error}
      <div class="error-message" role="alert">{error}</div>
    {/if}

    <form onsubmit={handleLogin} novalidate>
      {#if !totpRequired}
        <div class="form-group">
          <label for="email">{$t('auth.email_label')}</label>
          <input
            id="email"
            type="email"
            bind:value={email}
            placeholder={$t('auth.email_placeholder')}
            autocomplete="email"
            disabled={loading}
            class:input-error={emailError}
            aria-describedby={emailError ? 'email-error' : undefined}
            aria-invalid={emailError ? 'true' : undefined}
          />
          {#if emailError}
            <span id="email-error" class="field-error" role="alert">{emailError}</span>
          {/if}
        </div>

        <div class="form-group">
          <label for="password">{$t('auth.password_label')}</label>
          <input
            id="password"
            type="password"
            bind:value={password}
            placeholder={$t('auth.password_placeholder')}
            autocomplete="current-password"
            disabled={loading}
            class:input-error={passwordError}
            aria-describedby={passwordError ? 'password-error' : undefined}
            aria-invalid={passwordError ? 'true' : undefined}
          />
          {#if passwordError}
            <span id="password-error" class="field-error" role="alert">{passwordError}</span>
          {/if}
        </div>
      {:else}
        <div class="form-group">
          <label for="totp">{$t('auth.totp_label')}</label>
          <input
            id="totp"
            type="text"
            inputmode="numeric"
            autocomplete="one-time-code"
            bind:value={totpCode}
            placeholder={$t('auth.totp_placeholder')}
            disabled={loading}
            class:input-error={totpError}
            aria-describedby={totpError ? 'totp-error' : 'totp-hint'}
            aria-invalid={totpError ? 'true' : undefined}
          />
          {#if totpError}
            <span id="totp-error" class="field-error" role="alert">{totpError}</span>
          {:else}
            <span id="totp-hint" class="field-hint">{$t('auth.totp_hint')}</span>
          {/if}
        </div>
      {/if}

      <button type="submit" class="submit-btn" disabled={loading}>
        {#if loading}
          <span class="spinner" aria-hidden="true"></span>
          {$t('auth.logging_in')}
        {:else if totpRequired}
          {$t('auth.totp_verify_btn')}
        {:else}
          {$t('auth.login_btn')}
        {/if}
      </button>
    </form>

    {#if totpRequired}
      <button type="button" class="link-btn" onclick={cancelTotp}>{$t('auth.totp_back')}</button>
    {:else}
      <p class="register-link">
        {$t('auth.no_account')}
        <a href="/register">{$t('auth.go_register')}</a>
      </p>
    {/if}
  </div>
</div>

<style>
  .login-container {
    /* widened from 360px for a less cramped card */
    width: 100%; max-width: 440px; margin: 0 auto;
    display: flex; align-items: center; justify-content: center;
    /* The parent .auth-layout is already min-height:100vh and centers content;
       don't stack a second viewport height + padding here (caused an always-on
       vertical scrollbar). */
    padding: var(--spacing-md);
  }

  .login-card {
    width: 100%; padding: 2rem; border-radius: var(--radius-lg);
    background: var(--bg-surface); border: 1px solid var(--border-default);
    box-shadow: var(--shadow-lg);
  }

  .brand-mark {
    margin: 0 auto 1rem;
    display: flex; align-items: center; justify-content: center;
    line-height: 0;
  }

  .login-title { font-size: 1.2rem; font-weight: 700; color: var(--text-primary); text-align: center; margin-bottom: 0.15rem; }
  .login-subtitle { text-align: center; color: var(--text-muted); margin-bottom: 1.2rem; font-size: 0.82rem; }

  .error-message {
    background: var(--tag-red-bg); color: var(--accent-red);
    padding: 0.5rem 0.7rem; border-radius: var(--radius-sm);
    font-size: 0.78rem; margin-bottom: 0.8rem;
  }

  .form-group { margin-bottom: 0.9rem; }
  .form-group label { display: block; font-size: 0.75rem; font-weight: 500; color: var(--text-secondary); margin-bottom: 0.25rem; }
  .form-group input { width: 100%; }
  .form-group input:focus { border-color: var(--accent-blue); box-shadow: 0 0 0 1px var(--accent-blue); }
  .input-error { border-color: var(--accent-red) !important; }
  .input-error:focus { box-shadow: 0 0 0 1px var(--accent-red) !important; }
  .field-error { display: block; font-size: 0.68rem; color: var(--accent-red); margin-top: 0.2rem; }
  .field-hint { display: block; font-size: 0.68rem; color: var(--text-muted); margin-top: 0.2rem; }
  .link-btn { display: block; margin: 1rem auto 0; background: none; border: none; color: var(--accent-blue); font-size: 0.78rem; cursor: pointer; }
  .link-btn:hover { text-decoration: underline; }

  .submit-btn {
    width: 100%; padding: 0.6rem; background: var(--accent-blue); color: #fff;
    border: none; border-radius: var(--radius-md); font-size: 0.88rem; font-weight: 600;
    cursor: pointer; margin-top: 0.5rem;
    display: flex; align-items: center; justify-content: center; gap: 0.4rem;
  }
  .submit-btn:hover:not(:disabled) { background: var(--color-primary-hover); }
  .submit-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  .spinner { width: 0.9rem; height: 0.9rem; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .register-link { text-align: center; font-size: 0.78rem; color: var(--text-muted); margin-top: 1rem; }
  .register-link a { color: var(--accent-blue); text-decoration: none; font-weight: 500; }
  .register-link a:hover { text-decoration: underline; }
</style>
