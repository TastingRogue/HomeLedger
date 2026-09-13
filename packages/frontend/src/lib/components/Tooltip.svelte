<script lang="ts">
  import Icon from './Icon.svelte';
  import { browser } from '$app/environment';

  // A small help affordance: an info icon that reveals a themed popover with a
  // short explanation on hover AND keyboard focus. The popover is positioned with
  // `position: fixed` (computed from the trigger) so it is NEVER clipped by a
  // scrollable/overflow parent like a modal, and it's clamped to the viewport so
  // it can't get cut off at an edge.
  let { text, label = 'Help', size = 14 }: {
    text: string;
    /** Accessible name for the trigger button. */
    label?: string;
    size?: number;
  } = $props();

  let open = $state(false);
  let trigger: HTMLButtonElement;
  let tipId = `tt-${Math.random().toString(36).slice(2, 9)}`;

  // Computed fixed position + which side the arrow is on.
  let posX = $state(0);
  let posY = $state(0);
  let placement = $state<'top' | 'bottom'>('top');
  let arrowLeft = $state(0); // px offset of the arrow within the popover
  let viewportH = $state(0);

  // Move the popover to <body> so it can't affect any ancestor's layout/overflow
  // (a fixed child still counts toward a scroll container's scrollWidth, which
  // was adding a horizontal scrollbar to the modal).
  function portal(node: HTMLElement) {
    document.body.appendChild(node);
    return { destroy() { node.remove(); } };
  }

  const POP_WIDTH = 240;   // matches max-width in CSS
  const GAP = 8;           // space between icon and popover
  const MARGIN = 8;        // min distance from viewport edge

  function place() {
    if (!browser || !trigger) return;
    const r = trigger.getBoundingClientRect();
    const vw = window.innerWidth;
    viewportH = window.innerHeight;
    const centerX = r.left + r.width / 2;

    // Horizontal: center on the trigger, then clamp so the box stays on screen.
    let left = centerX - POP_WIDTH / 2;
    left = Math.max(MARGIN, Math.min(left, vw - POP_WIDTH - MARGIN));
    posX = left;
    // Arrow points at the trigger center, relative to the (possibly clamped) box.
    arrowLeft = Math.max(12, Math.min(centerX - left, POP_WIDTH - 12));

    // Vertical: prefer above; flip below if there isn't room.
    if (r.top < 120) { placement = 'bottom'; posY = r.bottom + GAP; }
    else { placement = 'top'; posY = r.top - GAP; }
  }

  function show() { place(); open = true; }
  function hide() { open = false; }
  function toggle() { if (open) hide(); else show(); }
  function onKey(e: KeyboardEvent) { if (e.key === 'Escape') { open = false; trigger?.blur(); } }
</script>

<svelte:window on:scroll={hide} on:resize={hide} />

<span class="tooltip" onmouseenter={show} onmouseleave={hide} role="presentation">
  <button
    type="button"
    class="tt-trigger"
    bind:this={trigger}
    aria-label={label}
    aria-describedby={open ? tipId : undefined}
    aria-expanded={open}
    onclick={toggle}
    onfocus={show}
    onblur={hide}
    onkeydown={onKey}
  >
    <Icon name="help-circle" {size} />
  </button>
  {#if open}
    <span
      use:portal
      class="tt-pop tt-{placement}"
      id={tipId}
      role="tooltip"
      style="left: {posX}px; {placement === 'top' ? 'bottom' : 'top'}: {placement === 'top' ? viewportH - posY : posY}px; --arrow-left: {arrowLeft}px;"
    >{text}</span>
  {/if}
</span>

<style>
  .tooltip { position: relative; display: inline-flex; vertical-align: middle; }

  .tt-trigger {
    display: inline-flex; align-items: center; justify-content: center;
    padding: 0; margin: 0; border: none; background: none; cursor: help;
    color: var(--text-muted); border-radius: var(--radius-full);
    transition: color var(--transition-fast);
  }
  .tt-trigger:hover, .tt-trigger:focus-visible { color: var(--accent-blue); outline: none; }
  .tt-trigger:focus-visible { box-shadow: 0 0 0 2px var(--color-primary-glow); }

  /* Fixed + portaled to <body>, so no scrollable/overflow ancestor (modals!)
     can clip it or gain a scrollbar from it. Styles are :global because the node
     is moved out of this component's scoped DOM subtree. */
  :global(.tt-pop) {
    position: fixed;
    z-index: 2000;
    width: max-content;
    max-width: 240px;
    padding: 0.5rem 0.65rem;
    background: var(--bg-elevated);
    color: var(--text-secondary);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    font-size: 0.72rem;
    font-weight: 400;
    line-height: 1.4;
    text-transform: none;
    letter-spacing: normal;
    white-space: normal;
    pointer-events: none;
    animation: tt-in 0.1s ease-out;
  }
  /* Arrow, positioned under/over the trigger via --arrow-left. */
  :global(.tt-pop)::after {
    content: '';
    position: absolute;
    left: var(--arrow-left);
    transform: translateX(-50%);
    border: 5px solid transparent;
  }
  :global(.tt-pop.tt-top)::after { top: 100%; border-top-color: var(--border-default); }
  :global(.tt-pop.tt-bottom)::after { bottom: 100%; border-bottom-color: var(--border-default); }

  @keyframes tt-in { from { opacity: 0; } to { opacity: 1; } }
  @media (prefers-reduced-motion: reduce) { :global(.tt-pop) { animation: none; } }
</style>
