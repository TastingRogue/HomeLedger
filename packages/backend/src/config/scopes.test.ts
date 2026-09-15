import { describe, it, expect } from 'vitest';
import { isValidScope, scopesSatisfy, normalizeScopes, ALL_SCOPES } from './scopes.js';

describe('scopes (P4.13)', () => {
  describe('isValidScope', () => {
    it('accepts known scopes and wildcards', () => {
      expect(isValidScope('read:transactions')).toBe(true);
      expect(isValidScope('write:accounts')).toBe(true);
      expect(isValidScope('read:*')).toBe(true);
      expect(isValidScope('write:*')).toBe(true);
    });
    it('rejects unknown scopes', () => {
      expect(isValidScope('delete:everything')).toBe(false);
      expect(isValidScope('read:bogus')).toBe(false);
      expect(isValidScope('')).toBe(false);
    });
  });

  describe('scopesSatisfy', () => {
    it('empty/null grant = full access', () => {
      expect(scopesSatisfy(null, 'write:transactions')).toBe(true);
      expect(scopesSatisfy([], 'read:accounts')).toBe(true);
    });
    it('exact match', () => {
      expect(scopesSatisfy(['read:transactions'], 'read:transactions')).toBe(true);
      expect(scopesSatisfy(['read:transactions'], 'write:transactions')).toBe(false);
    });
    it('write:* satisfies anything', () => {
      expect(scopesSatisfy(['write:*'], 'write:accounts')).toBe(true);
      expect(scopesSatisfy(['write:*'], 'read:reports')).toBe(true);
    });
    it('read:* satisfies any read', () => {
      expect(scopesSatisfy(['read:*'], 'read:budgets')).toBe(true);
      expect(scopesSatisfy(['read:*'], 'write:budgets')).toBe(false);
    });
    it('write:<resource> implies read:<resource>', () => {
      expect(scopesSatisfy(['write:transactions'], 'read:transactions')).toBe(true);
      expect(scopesSatisfy(['write:transactions'], 'read:accounts')).toBe(false);
    });
  });

  describe('normalizeScopes', () => {
    it('dedupes, trims and drops invalid; empty => null', () => {
      expect(normalizeScopes(['read:transactions', ' read:transactions ', 'bogus'])).toEqual(['read:transactions']);
      expect(normalizeScopes([])).toBeNull();
      expect(normalizeScopes(['nope'])).toBeNull();
      expect(normalizeScopes(undefined)).toBeNull();
      expect(normalizeScopes('read:x')).toBeNull();
    });
    it('every ALL_SCOPES entry is valid', () => {
      for (const s of ALL_SCOPES) expect(isValidScope(s)).toBe(true);
    });
  });
});
