// Vitest setup for frontend component/DOM tests.
// - Registers jest-dom matchers (toBeInTheDocument, toBeDisabled, ...).
// - Pulls in @testing-library/svelte's Vitest integration so mounted
//   components are unmounted automatically after each test (no cross-test DOM leak).
import '@testing-library/jest-dom/vitest';
import '@testing-library/svelte/vitest';
import { vi } from 'vitest';

// jsdom doesn't implement matchMedia. Svelte's MediaQuery (used by our motion
// helpers for prefers-reduced-motion) calls it at module load, so polyfill a
// minimal no-match implementation. Defaults to "not matching" — reduced-motion
// off — which is fine for behaviour tests.
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

// jsdom lacks the Web Animations API. Svelte's css-based transitions call
// element.animate() when a transitioning element mounts/unmounts. Provide a
// minimal stub that returns an Animation-like object which reports "finished"
// immediately so transitions complete without throwing.
if (!Element.prototype.animate) {
  Element.prototype.animate = function animate() {
    return {
      cancel: () => {},
      finish: () => {},
      play: () => {},
      pause: () => {},
      reverse: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      finished: Promise.resolve(),
      onfinish: null,
      currentTime: 0,
      playState: 'finished',
    } as unknown as Animation;
  };
}
