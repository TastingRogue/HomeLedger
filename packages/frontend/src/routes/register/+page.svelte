<script lang="ts">
  import { goto } from '$app/navigation';
  import { authApi, ApiError } from '$lib/api';
  import { authStore } from '$lib/stores';

  let name = $state('');
  let email = $state('');
  let password = $state('');
  let confirmPassword = $state('');
  let error = $state('');
  let loading = $state(false);

  let nameError = $state('');
  let emailError = $state('');
  let passwordError = $state('');
  let confirmPasswordError = $state('');

  function validateForm(): boolean {
    let valid = true;
    nameError = ''; emailError = ''; passwordError = ''; confirmPasswordError = '';

    if (!name.trim()) { nameError = 'El nombre es obligatorio'; valid = false; }
    else if (name.trim().length < 2) { nameError = 'El nombre debe tener al menos 2 caracteres'; valid = false; }

    if (!email.trim()) { emailError = 'El correo electrónico es obligatorio'; valid = false; }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { emailError = 'Ingresa un correo electrónico válido'; valid = false; }

    if (!password) { passwordError = 'La contraseña es obligatoria'; valid = false; }
    else if (password.length < 8) { passwordError = 'La contraseña debe tener al menos 8 caracteres'; valid = false; }

    if (!confirmPassword) { confirmPasswordError = 'Confirma tu contraseña'; valid = false; }
    else if (password !== confirmPassword) { confirmPasswordError = 'Las contraseñas no coinciden'; valid = false; }

    return valid;
  }

  async function handleRegister(e: Event) {
    e.preventDefault();
    error = '';
    if (!validateForm()) return;
    loading = true;
    try {
      const response = await authApi.register({ name: name.trim(), email: email.trim(), password });
      authStore.login(
        { id: response.user.id, name: response.user.name, email: response.user.email, role: response.user.role },
        response.accessToken, response.refreshToken
      );
      await goto('/dashboard');
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.code === 'EMAIL_EXISTS') error = 'El correo electrónico ya está registrado';
        else error = err.message;
      } else { error = 'Error de conexión. Intenta de nuevo.'; }
    } finally { loading = false; }
  }
</script>

<svelte:head>
  <title>Crear Cuenta - HomeLedger</title>
</svelte:head>

<div class="register-container">
  <div class="register-card">
    <div class="brand-mark">HL</div>
    <h1 class="register-title">HomeLedger</h1>
    <p class="register-subtitle">Crear Cuenta</p>

    {#if error}
      <div class="error-message" role="alert">{error}</div>
    {/if}

    <form onsubmit={handleRegister} novalidate>
      <div class="form-group">
        <label for="name">Nombre</label>
        <input id="name" type="text" bind:value={name} placeholder="Tu nombre completo" autocomplete="name" disabled={loading} class:input-error={nameError} aria-describedby={nameError ? 'name-error' : undefined} aria-invalid={nameError ? 'true' : undefined} />
        {#if nameError}<span id="name-error" class="field-error" role="alert">{nameError}</span>{/if}
      </div>

      <div class="form-group">
        <label for="email">Correo electrónico</label>
        <input id="email" type="email" bind:value={email} placeholder="tu@correo.com" autocomplete="email" disabled={loading} class:input-error={emailError} aria-describedby={emailError ? 'email-error' : undefined} aria-invalid={emailError ? 'true' : undefined} />
        {#if emailError}<span id="email-error" class="field-error" role="alert">{emailError}</span>{/if}
      </div>

      <div class="form-group">
        <label for="password">Contraseña</label>
        <input id="password" type="password" bind:value={password} placeholder="Mínimo 8 caracteres" autocomplete="new-password" disabled={loading} class:input-error={passwordError} aria-describedby={passwordError ? 'password-error' : undefined} aria-invalid={passwordError ? 'true' : undefined} />
        {#if passwordError}<span id="password-error" class="field-error" role="alert">{passwordError}</span>{/if}
      </div>

      <div class="form-group">
        <label for="confirmPassword">Confirmar contraseña</label>
        <input id="confirmPassword" type="password" bind:value={confirmPassword} placeholder="Repite tu contraseña" autocomplete="new-password" disabled={loading} class:input-error={confirmPasswordError} aria-describedby={confirmPasswordError ? 'confirm-error' : undefined} aria-invalid={confirmPasswordError ? 'true' : undefined} />
        {#if confirmPasswordError}<span id="confirm-error" class="field-error" role="alert">{confirmPasswordError}</span>{/if}
      </div>

      <button type="submit" class="submit-btn" disabled={loading}>
        {#if loading}
          <span class="spinner" aria-hidden="true"></span>
          Creando cuenta...
        {:else}
          Registrarse
        {/if}
      </button>
    </form>

    <p class="login-link">
      ¿Ya tienes cuenta?
      <a href="/login">Iniciar Sesión</a>
    </p>
  </div>
</div>

<style>
  .register-container {
    width: 100%; max-width: 360px; margin: 0 auto;
    display: flex; align-items: center; justify-content: center;
    min-height: 100vh; min-height: 100dvh; padding: var(--spacing-md);
  }

  .register-card {
    width: 100%; padding: 1.5rem; border-radius: var(--radius-lg);
    background: var(--bg-surface); border: 1px solid var(--border-default);
  }

  .brand-mark {
    width: 40px; height: 40px; margin: 0 auto 0.8rem;
    border-radius: var(--radius-md); background: var(--accent-blue);
    color: #fff; font-size: 0.9rem; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
  }

  .register-title { font-size: 1.2rem; font-weight: 700; color: var(--text-primary); text-align: center; margin-bottom: 0.15rem; }
  .register-subtitle { text-align: center; color: var(--text-muted); margin-bottom: 1.2rem; font-size: 0.82rem; }

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
    width: 100%; padding: 0.55rem; background: var(--accent-blue); color: #fff;
    border: none; border-radius: var(--radius-sm); font-size: 0.88rem; font-weight: 500;
    cursor: pointer; margin-top: 0.4rem;
    display: flex; align-items: center; justify-content: center; gap: 0.4rem;
  }
  .submit-btn:hover:not(:disabled) { background: var(--color-primary-hover); }
  .submit-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  .spinner { width: 0.9rem; height: 0.9rem; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .login-link { text-align: center; font-size: 0.78rem; color: var(--text-muted); margin-top: 1rem; }
  .login-link a { color: var(--accent-blue); text-decoration: none; font-weight: 500; }
  .login-link a:hover { text-decoration: underline; }
</style>
