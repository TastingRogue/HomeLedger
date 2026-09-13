import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { ApiError } from '$lib/api';
import LoginPage from './+page.svelte';

// SvelteKit virtual modules the component imports. `browser: true` lets the
// auth store persist to localStorage (jsdom provides it) on a successful login.
vi.mock('$app/environment', () => ({ browser: true }));
const goto = vi.fn();
vi.mock('$app/navigation', () => ({ goto: (...args: unknown[]) => goto(...args) }));

// Mock the API surface the page uses. Keep the real ApiError so the page's
// `err instanceof ApiError` branch behaves like production.
const login = vi.fn();
const getMe = vi.fn();
vi.mock('$lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('$lib/api')>();
  return {
    ...actual,
    authApi: {
      login: (...args: unknown[]) => login(...args),
      getMe: (...args: unknown[]) => getMe(...args),
    },
  };
});

describe('login page', () => {
  beforeEach(() => {
    localStorage.clear();
    goto.mockReset();
    login.mockReset();
    getMe.mockReset();
  });

  it('renders the email + password fields and a submit button', () => {
    render(LoginPage);
    expect(screen.getByLabelText(/correo|email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña|password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /iniciar|log in|sign in/i })).toBeInTheDocument();
  });

  it('shows client-side validation errors and does not call the API on empty submit', async () => {
    render(LoginPage);
    await fireEvent.submit(screen.getByRole('button', { name: /iniciar|log in|sign in/i }).closest('form')!);

    expect(login).not.toHaveBeenCalled();
    // Two field-level alerts (email + password required).
    const alerts = await screen.findAllByRole('alert');
    expect(alerts.length).toBeGreaterThanOrEqual(2);
  });

  it('validates email format before calling the API', async () => {
    render(LoginPage);
    await fireEvent.input(screen.getByLabelText(/correo|email/i), { target: { value: 'not-an-email' } });
    await fireEvent.input(screen.getByLabelText(/contraseña|password/i), { target: { value: 'secret' } });
    await fireEvent.submit(screen.getByRole('button', { name: /iniciar|log in|sign in/i }).closest('form')!);

    expect(login).not.toHaveBeenCalled();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('submits valid credentials, stores tokens, fetches the profile, and navigates', async () => {
    login.mockResolvedValue({ accessToken: 'access-1', refreshToken: 'refresh-1' });
    getMe.mockResolvedValue({ id: 7, name: 'Ada', email: 'ada@example.com', role: 'user' });

    render(LoginPage);
    await fireEvent.input(screen.getByLabelText(/correo|email/i), { target: { value: 'ada@example.com' } });
    await fireEvent.input(screen.getByLabelText(/contraseña|password/i), { target: { value: 'secret' } });
    await fireEvent.submit(screen.getByRole('button', { name: /iniciar|log in|sign in/i }).closest('form')!);

    await waitFor(() => expect(login).toHaveBeenCalledWith({ email: 'ada@example.com', password: 'secret' }));
    await waitFor(() => expect(goto).toHaveBeenCalledWith('/dashboard'));
    expect(localStorage.getItem('sf_access_token')).toBe('access-1');
    expect(localStorage.getItem('sf_refresh_token')).toBe('refresh-1');
  });

  it('trims whitespace around the email before submitting', async () => {
    login.mockResolvedValue({ accessToken: 'a', refreshToken: 'b' });
    getMe.mockResolvedValue({ id: 1, name: '', email: 'ada@example.com', role: 'user' });

    render(LoginPage);
    await fireEvent.input(screen.getByLabelText(/correo|email/i), { target: { value: '  ada@example.com  ' } });
    await fireEvent.input(screen.getByLabelText(/contraseña|password/i), { target: { value: 'secret' } });
    await fireEvent.submit(screen.getByRole('button', { name: /iniciar|log in|sign in/i }).closest('form')!);

    await waitFor(() => expect(login).toHaveBeenCalledWith({ email: 'ada@example.com', password: 'secret' }));
  });

  it('surfaces a friendly message on invalid credentials and does not navigate', async () => {
    login.mockRejectedValue(new ApiError(401, 'INVALID_CREDENTIALS', 'nope'));

    render(LoginPage);
    await fireEvent.input(screen.getByLabelText(/correo|email/i), { target: { value: 'ada@example.com' } });
    await fireEvent.input(screen.getByLabelText(/contraseña|password/i), { target: { value: 'wrong' } });
    await fireEvent.submit(screen.getByRole('button', { name: /iniciar|log in|sign in/i }).closest('form')!);

    await waitFor(() => expect(login).toHaveBeenCalled());
    expect(goto).not.toHaveBeenCalled();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(localStorage.getItem('sf_access_token')).toBeNull();
  });

  it('shows a connection error when the API throws a non-ApiError', async () => {
    login.mockRejectedValue(new Error('network down'));

    render(LoginPage);
    await fireEvent.input(screen.getByLabelText(/correo|email/i), { target: { value: 'ada@example.com' } });
    await fireEvent.input(screen.getByLabelText(/contraseña|password/i), { target: { value: 'secret' } });
    await fireEvent.submit(screen.getByRole('button', { name: /iniciar|log in|sign in/i }).closest('form')!);

    await waitFor(() => expect(login).toHaveBeenCalled());
    expect(goto).not.toHaveBeenCalled();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
