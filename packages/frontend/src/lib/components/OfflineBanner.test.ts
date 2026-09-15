import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/svelte';
import OfflineBanner from './OfflineBanner.svelte';

vi.mock('$app/environment', () => ({ browser: true }));

describe('OfflineBanner (P4.14)', () => {
  beforeEach(() => {
    // Default: online.
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  });

  it('is hidden when online', async () => {
    render(OfflineBanner);
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });

  it('shows when offline at mount', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    render(OfflineBanner);
    expect(await screen.findByRole('status')).toBeInTheDocument();
  });

  it('reacts to online/offline events', async () => {
    render(OfflineBanner);
    // Go offline.
    await fireEvent(window, new Event('offline'));
    expect(await screen.findByRole('status')).toBeInTheDocument();
    // Back online.
    await fireEvent(window, new Event('online'));
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
  });
});
