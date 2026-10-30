import { describe, it, expect } from 'vitest';
import { isValidScope, scopesSatisfy, normalizeScopes, requiredScopeFor, ALL_SCOPES } from './scopes.js';

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
  describe('requiredScopeFor', () => {
    it('maps resource routes to read/write scopes by method', () => {
      expect(requiredScopeFor('GET', '/api/v1/transactions?page=2')).toBe('read:transactions');
      expect(requiredScopeFor('POST', '/api/v1/transactions/quick')).toBe('write:transactions');
      expect(requiredScopeFor('PUT', '/api/v1/budgets/3')).toBe('write:budgets');
      expect(requiredScopeFor('DELETE', '/api/v1/accounts/1/')).toBe('write:accounts');
      expect(requiredScopeFor('GET', '/api/v1/reports/cashflow')).toBe('read:reports');
    });
    it('requires a wildcard for routes that have no scope of their own', () => {
      expect(requiredScopeFor('POST', '/api/v1/api-keys')).toBe('write:*');
      expect(requiredScopeFor('GET', '/api/v1/backup/export')).toBe('read:*');
      expect(requiredScopeFor('GET', '/api/v1/search')).toBe('read:*');
    });
    it('maps Home Assistant routes to read:reports and leaves MCP to its own checks', () => {
      expect(requiredScopeFor('GET', '/api/v1/ha/status')).toBe('read:reports');
      expect(requiredScopeFor('POST', '/api/v1/mcp')).toBeNull();
    });
    it('a key with only resource scopes cannot satisfy a wildcard route', () => {
      expect(scopesSatisfy(['write:transactions'], requiredScopeFor('POST', '/api/v1/api-keys')!)).toBe(false);
      expect(scopesSatisfy(['write:*'], requiredScopeFor('POST', '/api/v1/api-keys')!)).toBe(true);
      expect(scopesSatisfy(null, requiredScopeFor('POST', '/api/v1/api-keys')!)).toBe(true);
    });
  });
});
