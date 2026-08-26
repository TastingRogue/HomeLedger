<script lang="ts">
  let { value = $bindable(), options }: {
    value: string;
    options: { value: string; label: string }[];
  } = $props();

  let open = $state(false);

  function select(val: string) {
    value = val;
    open = false;
  }

  function toggle() {
    open = !open;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') open = false;
  }

  let currentLabel = $derived(options.find(o => o.value === value)?.label ?? '');
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="dropdown" class:open>
  <button class="dropdown-trigger" onclick={toggle} type="button">
    <span>{currentLabel}</span>
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
  </button>
  {#if open}
    <div class="dropdown-backdrop" onclick={() => open = false} role="presentation"></div>
    <ul class="dropdown-menu" role="listbox">
      {#each options as opt}
        <li>
          <button
            class="dropdown-item"
            class:active={opt.value === value}
            onclick={() => select(opt.value)}
            role="option"
            aria-selected={opt.value === value}
          >
            {opt.label}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .dropdown { position: relative; display: inline-block; }
  .dropdown-trigger {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.25rem 0.5rem;
    font-size: 0.68rem;
    color: var(--text-secondary);
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: border-color 0.15s;
    white-space: nowrap;
  }
  .dropdown-trigger:hover { border-color: var(--text-muted); color: var(--text-primary); }
  .dropdown.open .dropdown-trigger { border-color: var(--accent-purple); color: var(--text-primary); }

  .dropdown-backdrop { position: fixed; inset: 0; z-index: 99; }
  .dropdown-menu {
    position: absolute;
    top: calc(100% + 4px);
    right: 0;
    z-index: 100;
    min-width: 120px;
    background: var(--bg-card, #161e2a);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    padding: 0.25rem;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    list-style: none;
    margin: 0;
  }
  .dropdown-item {
    display: block;
    width: 100%;
    text-align: left;
    padding: 0.35rem 0.6rem;
    font-size: 0.7rem;
    color: var(--text-secondary);
    background: none;
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: background 0.1s, color 0.1s;
  }
  .dropdown-item:hover { background: var(--bg-hover); color: var(--text-primary); }
  .dropdown-item.active { color: var(--accent-purple); background: rgba(139, 92, 246, 0.1); }
</style>
