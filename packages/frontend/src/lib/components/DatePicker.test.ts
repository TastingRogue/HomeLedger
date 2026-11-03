import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import DatePicker from './DatePicker.svelte';

describe('DatePicker local calendar values', () => {
  it('displays a date-only record on the same calendar day', () => {
    render(DatePicker, { value: '2026-11-01' });
    expect(screen.getByRole('button', { name: '01/11/2026' })).toBeInTheDocument();
  });

  it('keeps the chosen local time when selecting another day', async () => {
    const { container } = render(DatePicker, { value: '2026-11-01T18:30', showTime: true });
    await fireEvent.click(screen.getByRole('button', { name: '01/11/2026 18:30' }));
    const day = [...container.querySelectorAll<HTMLButtonElement>('.dp-day:not(.other-month)')]
      .find(button => button.textContent?.trim() === '2')!;
    await fireEvent.click(day);
    expect(screen.getByRole('button', { name: '02/11/2026 18:30' })).toBeInTheDocument();
    await fireEvent.change(container.querySelector('input[type="time"]')!, { target: { value: '22:15' } });
    expect(screen.getByRole('button', { name: '02/11/2026 22:15' })).toBeInTheDocument();
  });
});
