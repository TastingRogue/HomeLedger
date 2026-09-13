import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import Dropdown from './Dropdown.svelte';

vi.mock('$app/environment', () => ({ browser: true }));

// Replace the css-based Svelte transition with an instant no-op so the menu's
// unmount happens synchronously in jsdom (which lacks a real Web Animations
// timeline). We're testing open/close *logic*, not the animation itself.
vi.mock('$lib/motion', () => ({
  popover: () => ({ duration: 0, css: () => '' }),
}));

const OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
];

describe('Dropdown', () => {
  it('shows the label of the current value on the trigger', () => {
    render(Dropdown, { value: 'income', options: OPTIONS });
    expect(screen.getByRole('button', { name: /income/i })).toBeInTheDocument();
    // Menu is closed initially — no listbox rendered.
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('opens the listbox on trigger click and lists every option', async () => {
    render(Dropdown, { value: 'all', options: OPTIONS });
    await fireEvent.click(screen.getByRole('button', { name: /all/i }));

    expect(screen.getByRole('listbox')).toBeInTheDocument();
    const opts = screen.getAllByRole('option');
    expect(opts).toHaveLength(3);
    // The current value is marked selected.
    expect(screen.getByRole('option', { name: 'All' })).toHaveAttribute('aria-selected', 'true');
  });

  it('selecting an option updates the trigger label and closes the menu', async () => {
    render(Dropdown, { value: 'all', options: OPTIONS });
    await fireEvent.click(screen.getByRole('button', { name: /all/i }));
    await fireEvent.click(screen.getByRole('option', { name: 'Expense' }));

    // Trigger reflects the new selection (the bound value drove the label).
    expect(screen.getByRole('button', { name: /expense/i })).toBeInTheDocument();
    // Menu closed after choosing (unmount transition resolves).
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
  });

  it('closes the menu when Escape is pressed', async () => {
    render(Dropdown, { value: 'all', options: OPTIONS });
    await fireEvent.click(screen.getByRole('button', { name: /all/i }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    await fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
  });
});
