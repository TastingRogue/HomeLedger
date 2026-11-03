import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('$app/environment', () => ({ browser: true }));
import { logout } from './auth';
import { getAccessToken, getRefreshToken, setTokens } from './client';

describe('logout', () => {
  beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

  it('revokes the refresh token before removing local credentials', async () => {
    setTokens('access', 'refresh');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, options) => {
      expect(getRefreshToken()).toBe('refresh');
      expect(options?.body).toBe(JSON.stringify({ refreshToken: 'refresh' }));
      expect(options?.headers).toMatchObject({ Authorization: 'Bearer access' });
      return new Response(JSON.stringify({ success: true }));
    });
    await logout();
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/auth/logout', expect.anything());
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it('removes local credentials even when the server cannot be reached', async () => {
    setTokens('access', 'refresh');
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Offline'));
    await logout();
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });
});
