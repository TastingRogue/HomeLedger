<script lang="ts">
  import { t } from '$lib/i18n';
  import { preferences } from '$lib/stores/preferences';

  let { value = $bindable(), showTime = false }: { value: string; showTime?: boolean } = $props();

  let open = $state(false);
  let viewYear = $state(new Date().getFullYear());
  let viewMonth = $state(new Date().getMonth());
  let triggerEl: HTMLButtonElement;
  let dropdownStyle = $state('');

  // Localized month and weekday names derived from the active locale, so the
  // calendar follows the app language (es/en) without hardcoded arrays.
  const localeTag = $derived($preferences.locale === 'en' ? 'en-US' : 'es-MX');
  const monthNames = $derived(
    Array.from({ length: 12 }, (_, m) => {
      const name = new Intl.DateTimeFormat(localeTag, { month: 'long' }).format(new Date(2000, m, 1));
      return name.charAt(0).toUpperCase() + name.slice(1);
    })
  );
  // Week starts on Monday (grid uses Mon..Sun). 2024-01-01 is a Monday.
  const dayNames = $derived(
    Array.from({ length: 7 }, (_, i) => {
      const d = new Intl.DateTimeFormat(localeTag, { weekday: 'short' }).format(new Date(2024, 0, 1 + i));
      return d.charAt(0).toUpperCase() + d.slice(1);
    })
  );

  let selectedDate = $derived.by(() => {
    if (!value) return null;
    return new Date(value);
  });

  let displayText = $derived.by(() => {
    if (!selectedDate) return $t('datepicker.select_date');
    const d = selectedDate;
    const date = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
    if (showTime) {
      const time = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
      return `${date} ${time}`;
    }
    return date;
  });

  let calendarDays = $derived.by(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);
    let startDay = firstDay.getDay() - 1;
    if (startDay < 0) startDay = 6;

    const days: { date: number; month: number; year: number; isCurrentMonth: boolean; isToday: boolean; isSelected: boolean }[] = [];

    // Previous month days
    const prevMonthLast = new Date(viewYear, viewMonth, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      const d = prevMonthLast - i;
      days.push({ date: d, month: viewMonth - 1, year: viewYear, isCurrentMonth: false, isToday: false, isSelected: false });
    }

    // Current month days
    const today = new Date();
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const isToday = d === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
      const isSelected = selectedDate ? d === selectedDate.getDate() && viewMonth === selectedDate.getMonth() && viewYear === selectedDate.getFullYear() : false;
      days.push({ date: d, month: viewMonth, year: viewYear, isCurrentMonth: true, isToday, isSelected });
    }

    // Next month days to fill grid
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      days.push({ date: d, month: viewMonth + 1, year: viewYear, isCurrentMonth: false, isToday: false, isSelected: false });
    }

    return days;
  });

  function toggle() {
    open = !open;
    if (open) {
      if (selectedDate) {
        viewYear = selectedDate.getFullYear();
        viewMonth = selectedDate.getMonth();
      }
      // Position the dropdown relative to the trigger
      if (triggerEl) {
        const rect = triggerEl.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        if (spaceBelow < 320) {
          // Open above
          dropdownStyle = `bottom: ${window.innerHeight - rect.top + 4}px; left: ${rect.left}px;`;
        } else {
          // Open below
          dropdownStyle = `top: ${rect.bottom + 4}px; left: ${rect.left}px;`;
        }
      }
    }
  }

  function prevMonth() {
    if (viewMonth === 0) { viewMonth = 11; viewYear--; }
    else viewMonth--;
  }

  function nextMonth() {
    if (viewMonth === 11) { viewMonth = 0; viewYear++; }
    else viewMonth++;
  }

  function selectDay(day: typeof calendarDays[0]) {
    const d = new Date(day.year, day.month, day.date);
    if (showTime && selectedDate) {
      d.setHours(selectedDate.getHours(), selectedDate.getMinutes());
    }
    value = d.toISOString().slice(0, showTime ? 16 : 10);
    if (!showTime) open = false;
  }

  function setToday() {
    const now = new Date();
    value = now.toISOString().slice(0, showTime ? 16 : 10);
    viewYear = now.getFullYear();
    viewMonth = now.getMonth();
    if (!showTime) open = false;
  }

  function handleTimeChange(e: Event) {
    const input = e.target as HTMLInputElement;
    if (!selectedDate || !input.value) return;
    const [h, m] = input.value.split(':').map(Number);
    const d = new Date(selectedDate);
    d.setHours(h ?? 0, m ?? 0);
    value = d.toISOString().slice(0, 16);
  }

  let timeValue = $derived.by(() => {
    if (!selectedDate) return '';
    return `${selectedDate.getHours().toString().padStart(2, '0')}:${selectedDate.getMinutes().toString().padStart(2, '0')}`;
  });
</script>

<svelte:window on:keydown={(e) => { if (e.key === 'Escape') open = false; }} />

<div class="datepicker" class:open>
  <button class="dp-trigger" onclick={toggle} type="button" bind:this={triggerEl}>
    <span class="dp-text">{displayText}</span>
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
  </button>

  {#if open}
    <div class="dp-backdrop" onclick={() => open = false} role="presentation"></div>
    <div class="dp-dropdown" style={dropdownStyle}>
      <div class="dp-nav">
        <button type="button" onclick={prevMonth} class="dp-nav-btn">‹</button>
        <span class="dp-month-label">{monthNames[viewMonth]} {viewYear}</span>
        <button type="button" onclick={nextMonth} class="dp-nav-btn">›</button>
      </div>

      <div class="dp-grid">
        {#each dayNames as day}
          <span class="dp-day-name">{day}</span>
        {/each}
        {#each calendarDays as day}
          <button
            type="button"
            class="dp-day"
            class:other-month={!day.isCurrentMonth}
            class:today={day.isToday}
            class:selected={day.isSelected}
            onclick={() => selectDay(day)}
          >
            {day.date}
          </button>
        {/each}
      </div>

      {#if showTime}
        <div class="dp-time">
          <label>Hora
          <input type="time" value={timeValue} onchange={handleTimeChange} />
          </label>
        </div>
      {/if}

      <div class="dp-footer">
        <button type="button" class="dp-today-btn" onclick={setToday}>{$t('datepicker.today')}</button>
      </div>
    </div>
  {/if}
</div>

<style>
  .datepicker { position: relative; display: inline-block; width: 100%; }

  .dp-trigger {
    display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;
    width: 100%; padding: 0.45rem 0.65rem;
    font-size: 0.82rem; color: var(--text-primary);
    background: var(--bg-elevated); border: 1px solid var(--border-default);
    border-radius: var(--radius-sm); cursor: pointer; transition: border-color 0.15s;
  }
  .dp-trigger:hover { border-color: var(--text-muted); }
  .datepicker.open .dp-trigger { border-color: var(--accent-purple); }
  .dp-text { flex: 1; text-align: left; }

  .dp-backdrop { position: fixed; inset: 0; z-index: 1099; }

  .dp-dropdown {
    position: fixed; z-index: 1100;
    background: var(--bg-card); border: 1px solid var(--border-default);
    border-radius: var(--radius-md); padding: 0.75rem;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5); min-width: 260px;
  }

  .dp-nav { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; }
  .dp-nav-btn { background: none; border: none; color: var(--text-secondary); font-size: 1.1rem; cursor: pointer; padding: 0.2rem 0.5rem; border-radius: var(--radius-sm); }
  .dp-nav-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
  .dp-month-label { font-size: 0.8rem; font-weight: 600; color: var(--text-primary); }

  .dp-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
  .dp-day-name { font-size: 0.6rem; font-weight: 600; color: var(--text-muted); text-align: center; padding: 0.25rem 0; }

  .dp-day {
    font-size: 0.72rem; padding: 0.35rem; text-align: center;
    border: none; background: none; color: var(--text-primary);
    border-radius: var(--radius-sm); cursor: pointer; transition: background 0.1s;
  }
  .dp-day:hover { background: var(--bg-hover); }
  .dp-day.other-month { color: var(--text-muted); opacity: 0.4; }
  .dp-day.today { border: 1px solid var(--accent-purple); }
  .dp-day.selected { background: var(--accent-purple); color: #fff; }

  .dp-time { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0; border-top: 1px solid var(--border-subtle); margin-top: 0.5rem; }
  .dp-time label { font-size: 0.65rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; }
  .dp-time input { flex: 1; padding: 0.3rem 0.4rem; font-size: 0.78rem; background: var(--bg-elevated); border: 1px solid var(--border-default); border-radius: var(--radius-sm); color: var(--text-primary); }

  .dp-footer { display: flex; justify-content: center; padding-top: 0.5rem; border-top: 1px solid var(--border-subtle); margin-top: 0.5rem; }
  .dp-today-btn { background: none; border: none; color: var(--accent-purple); font-size: 0.72rem; font-weight: 600; cursor: pointer; padding: 0.25rem 0.5rem; border-radius: var(--radius-sm); }
  .dp-today-btn:hover { background: rgba(139, 92, 246, 0.1); }
</style>
