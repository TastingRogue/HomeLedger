import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import LockScreen from './LockScreen.svelte';

vi.mock('$app/environment', () => ({ browser: true }));

// Mock the lock store so we control method + unlock outcomes.
const getLockConfig = vi.fn();
const unlockWebauthn = vi.fn();
const unlockPin = vi.fn();
vi.mock('$lib/stores/lock', () => ({
  getLockConfig: () => getLockConfig(),
  unlockWebauthn: () => unlockWebauthn(),
  unlockPin: (pin: string) => unlockPin(pin),
}));

describe('LockScreen (P4.14)', () => {
  beforeEach(() => {
    getLockConfig.mockReset();
    unlockWebauthn.mockReset();
    unlockPin.mockReset();
  });

  it('unlocks via PIN and calls onUnlocked', async () => {
    getLockConfig.mockReturnValue({ enabled: true, method: 'pin' });
    unlockPin.mockResolvedValue(true);
    const onUnlocked = vi.fn();
    render(LockScreen, { props: { onUnlocked } });

    const input = screen.getByLabelText(/PIN/i);
    await fireEvent.input(input, { target: { value: '1234' } });
    await fireEvent.click(screen.getByRole('button', { name: /desbloquear|unlock/i }));

    await waitFor(() => expect(onUnlocked).toHaveBeenCalledTimes(1));
    expect(unlockPin).toHaveBeenCalledWith('1234');
  });

  it('shows an error on a wrong PIN and does not unlock', async () => {
    getLockConfig.mockReturnValue({ enabled: true, method: 'pin' });
    unlockPin.mockResolvedValue(false);
    const onUnlocked = vi.fn();
    render(LockScreen, { props: { onUnlocked } });

    const input = screen.getByLabelText(/PIN/i);
    await fireEvent.input(input, { target: { value: '9999' } });
    await fireEvent.click(screen.getByRole('button', { name: /desbloquear|unlock/i }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(onUnlocked).not.toHaveBeenCalled();
  });

  it('auto-prompts biometrics and unlocks on success', async () => {
    getLockConfig.mockReturnValue({ enabled: true, method: 'webauthn' });
    unlockWebauthn.mockResolvedValue(true);
    const onUnlocked = vi.fn();
    render(LockScreen, { props: { onUnlocked } });

    await waitFor(() => expect(unlockWebauthn).toHaveBeenCalled());
    await waitFor(() => expect(onUnlocked).toHaveBeenCalledTimes(1));
  });
});
