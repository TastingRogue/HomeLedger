/**
 * Motion primitives (P3.B).
 *
 * Reusable Svelte transitions for the app's shared modals, built to the
 * apple-design house style:
 *  - Critically damped by default (no gratuitous overshoot); a modal that just
 *    appeared should not bounce (§4).
 *  - Enter and exit run along the SAME path so a dismiss mirrors the present (§7).
 *  - Modals "materialize" — scale + opacity move together, with a touch of blur
 *    that resolves as the surface arrives, rather than a flat fade (§12).
 *  - Reduced motion is honoured: movement/blur are dropped for a plain opacity
 *    cross-fade (§14). We read `prefersReducedMotion` at transition-build time.
 *
 * These are `css`-based transitions (transform/opacity/filter only), so they run
 * on the compositor and are cheap. Svelte generates a keyframe animation from the
 * `css` function and plays it forward on enter / reversed on exit, which gives the
 * symmetric path for free.
 */
import { cubicOut } from 'svelte/easing';
import { prefersReducedMotion } from 'svelte/motion';
import type { TransitionConfig } from 'svelte/transition';

/**
 * House motion tokens. Durations are the web mapping of the skill's
 * response values (a critically damped spring with response ~0.3–0.4s settles
 * visually in roughly this window). Kept here so every surface shares one feel.
 */
export const MOTION = {
  /** Modal panel present/dismiss. */
  modalDuration: 260,
  /** Backdrop scrim fade — a hair faster so the dim leads the panel slightly. */
  scrimDuration: 200,
  /** Reduced-motion cross-fade — short, purely informational. */
  reducedDuration: 140,
  easing: cubicOut,
} as const;

/**
 * Modal panel entrance/exit: a materialize. Scales from 0.96→1 while fading in
 * and resolving a small blur, all on the same eased curve so the surface reads
 * as a real material arriving. Symmetric: Svelte reverses it on exit.
 *
 * Under reduced motion this becomes a plain, quick opacity cross-fade with no
 * transform or blur.
 */
export function modalPanel(_node: Element, params?: { duration?: number }): TransitionConfig {
  const reduced = prefersReducedMotion.current;
  if (reduced) {
    return {
      duration: MOTION.reducedDuration,
      easing: MOTION.easing,
      css: (t) => `opacity: ${t};`,
    };
  }
  return {
    duration: params?.duration ?? MOTION.modalDuration,
    easing: MOTION.easing,
    // t goes 0→1 on enter (and 1→0 on exit, reversed by Svelte).
    css: (t) => {
      const scale = 0.96 + 0.04 * t;
      const blur = 8 * (1 - t);
      return `opacity: ${t}; transform: scale(${scale}); filter: blur(${blur}px);`;
    },
  };
}

/**
 * Backdrop scrim: a simple opacity fade. Same under reduced motion (opacity is
 * not vestibular), just governed by the scrim duration.
 */
export function scrim(_node: Element, _params?: unknown): TransitionConfig {
  const reduced = prefersReducedMotion.current;
  return {
    duration: reduced ? MOTION.reducedDuration : MOTION.scrimDuration,
    easing: MOTION.easing,
    css: (t) => `opacity: ${t};`,
  };
}
