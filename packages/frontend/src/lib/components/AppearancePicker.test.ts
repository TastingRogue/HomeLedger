import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
vi.mock('$app/env', () => ({ browser: true }));
import AppearancePicker from './AppearancePicker.svelte';
import { getTheme, setTheme, setUiSkin } from '#lib/stores/theme.ts';

describe('interface appearance', () => {
  beforeEach(() => { setTheme('light'); setUiSkin('normal'); });

  it('switches the whole UI, persists the choice, and restores the original light preference', async () => {
    render(AppearancePicker);
    const cyberpunk = screen.getByRole('radio', { name: /Cyberpunk 2077/ });
    await fireEvent.click(cyberpunk);
    expect(cyberpunk).toBeChecked();
    expect(localStorage.getItem('sf_ui_skin')).toBe('cyberpunk');
    expect(document.documentElement).toHaveAttribute('data-ui', 'cyberpunk');
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(getTheme()).toBe('light');
    await fireEvent.click(screen.getByRole('radio', { name: /Normal/ }));
    expect(document.documentElement).toHaveAttribute('data-ui', 'normal');
    expect(document.documentElement.style.colorScheme).toBe('light');
    expect(localStorage.getItem('sf_theme')).toBe('light');
  });

  it('keeps a dark-mode preference when returning to Normal', async () => {
    setTheme('dark'); setUiSkin('cyberpunk');
    render(AppearancePicker);
    await fireEvent.click(screen.getByRole('radio', { name: /Normal/ }));
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(getTheme()).toBe('dark');
  });
});
