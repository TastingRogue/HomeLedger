<script lang="ts">
  import { goto } from '$app/navigation';
  import { authApi, ApiError } from '$lib/api';
  import { authStore } from '$lib/stores';

  let email = $state('');
  let password = $state('');
  let error = $state('');
  let loading = $state(false);

  let emailError = $state('');
  let passwordError = $state('');

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

    if (!validateForm()) return;

    loading = true;

    try {
      const response = await authApi.login({ email: email.trim(), password });
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
        if (err.code === 'INVALID_CREDENTIALS') {
          error = 'Correo electrónico o contraseña incorrectos';
        } else {
          error = err.message;
        }
      } else {
        error = 'Error de conexión. Intenta de nuevo.';
      }
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Iniciar Sesión - HomeLedger</title>
</svelte:head>

<div class="login-container">
  <div class="login-card">
    <div class="brand-mark">HL</div>
    <h1 class="login-title">HomeLedger</h1>
    <p class="login-subtitle">Iniciar Sesión</p>

    {#if error}
      <div class="error-message" role="alert">{error}</div>
    {/if}

    <form onsubmit={handleLogin} novalidate>
      <div class="form-group">
        <label for="email">Correo electrónico</label>
        <input
          id="email"
          type="email"
          bind:value={email}
          placeholder="tu@correo.com"
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
        <label for="password">Contraseña</label>
        <input
          id="password"
          type="password"
          bind:value={password}
          placeholder="••••••••"
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

      <button type="submit" class="submit-btn" disabled={loading}>
        {#if loading}
          <span class="spinner" aria-hidden="true"></span>
          Iniciando sesión...
        {:else}
          Iniciar Sesión
        {/if}
      </button>
    </form>

    <p class="register-link">
      ¿Primera vez aquí?
      <a href="/register">Crear cuenta</a>
    </p>
  </div>
</div>

<style>
  .login-container {
    width: 100%; max-width: 360px; margin: 0 auto;
    display: flex; align-items: center; justify-content: center;
    min-height: 100vh; min-height: 100dvh; padding: var(--spacing-md);
  }

  .login-card {
    width: 100%; padding: 2rem; border-radius: var(--radius-lg);
    background: var(--bg-surface); border: 1px solid var(--border-default);
    box-shadow: var(--shadow-lg);
  }

  .brand-mark {
    width: 48px; height: 48px; margin: 0 auto 1rem;
    border-radius: var(--radius-lg); background: var(--accent-purple);
    color: #fff; font-size: 1rem; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
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
