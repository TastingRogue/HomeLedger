import { describe, it, expect, beforeEach, vi } from 'vitest';

// The token helpers early-return unless SvelteKit's `$app/environment` reports
// `browser === true`. Under Vitest/SSR that flag is false, so force it true to
// exercise the real browser code path (localStorage read/write).
vi.mock('$app/environment', () => ({ browser: true }));

import {
  ApiError,
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  hasToken,
} from './client';
describe('client token management', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('reports no token on a fresh store', () => {
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(hasToken()).toBe(false);
  });

  it('stores and reads back access + refresh tokens', () => {
    setTokens('access-abc', 'refresh-xyz');
    expect(getAccessToken()).toBe('access-abc');
    expect(getRefreshToken()).toBe('refresh-xyz');
    expect(hasToken()).toBe(true);
  });

  it('clears tokens (and the cached user)', () => {
    setTokens('a', 'b');
    localStorage.setItem('sf_user', '{"id":1}');
    clearTokens();
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(localStorage.getItem('sf_user')).toBeNull();
    expect(hasToken()).toBe(false);
  });
});

describe('ApiError', () => {
  it('carries status, code, message, and optional details', () => {
    const err = new ApiError(422, 'VALIDATION', 'Invalid', { name: ['required'] });
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('ApiError');
    expect(err.status).toBe(422);
    expect(err.code).toBe('VALIDATION');
    expect(err.message).toBe('Invalid');
    expect(err.details).toEqual({ name: ['required'] });
  });

  it('works without details', () => {
    const err = new ApiError(500, 'SERVER_ERROR', 'Boom');
    expect(err.details).toBeUndefined();
  });
});
