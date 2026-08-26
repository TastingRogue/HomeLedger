import { describe, it, expect } from 'vitest';

describe('workspace setup', () => {
  it('should be able to run tests', () => {
    expect(true).toBe(true);
  });

  it('should have vitest and fast-check available', async () => {
    const fc = await import('fast-check');
    expect(fc).toBeDefined();
    expect(fc.integer).toBeDefined();
  });
});
