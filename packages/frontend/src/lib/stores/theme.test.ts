import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('$app/env', () => ({ browser: true }));

describe('appearance persistence', () => {
  beforeEach(() => { vi.resetModules(); localStorage.clear(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('restores a saved skin on reload without losing the underlying light mode', async () => {
    localStorage.setItem('sf_ui_skin', 'cyberpunk');
    localStorage.setItem('sf_theme', 'light');
    const { setUiSkin, getTheme } = await import('./theme');
    expect(document.documentElement).toHaveAttribute('data-ui', 'cyberpunk');
    expect(document.documentElement.style.colorScheme).toBe('dark');
    setUiSkin('normal');
    expect(getTheme()).toBe('light');
    expect(document.documentElement.style.colorScheme).toBe('light');
  });

  it('recovers from invalid stored preferences', async () => {
    localStorage.setItem('sf_ui_skin', 'unknown');
    localStorage.setItem('sf_theme', 'unknown');
    const { getTheme } = await import('./theme');
    expect(getTheme()).toBe('dark');
    expect(document.documentElement).toHaveAttribute('data-ui', 'normal');
  });

  it('works when browser storage is blocked', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Blocked'); });
    const { setUiSkin } = await import('./theme');
    expect(() => setUiSkin('cyberpunk')).not.toThrow();
    expect(document.documentElement).toHaveAttribute('data-ui', 'cyberpunk');
  });
});
