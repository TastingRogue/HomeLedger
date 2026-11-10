import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('$app/environment', () => ({ browser: true }));
import { get } from 'svelte/store';
import { t } from './index';
import { setLocale } from '../stores/preferences';
import { formatCurrency, formatPercentage, formatDate } from '../utils/format';
import { apiRequest } from '../api/client';
import { apiErrorDetails, apiErrorMessage } from './api-errors';

afterEach(() => { setLocale('en'); localStorage.clear(); vi.unstubAllGlobals(); });
describe('Brazilian Portuguese across shared UI paths', () => {
  it('formats money, percentages and calendar dates', () => {
    setLocale('pt-BR');
    localStorage.setItem('sf_preferences', JSON.stringify({currency:'BRL'}));
    expect(formatCurrency(-1234.56)).toBe('-R$\u00a01.234,56');
    expect(formatPercentage(33.3)).toBe('33,3%');
    expect(formatDate('2026-11-10')).toBe('10 de novembro de 2026');
  });
  it('translates errors and normalizes string and array field details', () => {
    setLocale('pt-BR');
    const tr = get(t);
    expect(apiErrorMessage(tr, 'FORBIDDEN', 403)).toBe(tr('api_error.permission'));
    expect(apiErrorDetails(tr, { name:'Campo obligatorio', amount:['Valor inválido'] })).toEqual({name:[tr('api_error.required')], amount:[tr('api_error.field')]});
    expect(apiErrorDetails(tr, { day:'El día de corte debe estar entre 1 y 31', name:'El nombre no puede exceder 50 caracteres' })).toEqual({day:['Use um valor entre 1 e 31.'],name:['Use no máximo 50 caracteres.']});
  });
  it('preserves the two-factor challenge on an unauthenticated login', async () => {
    setLocale('pt-BR');
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({success:false,error:{code:'TOTP_REQUIRED',message:'Código requerido'}}), {status:401}));
    vi.stubGlobal('fetch', fetch);
    await expect(apiRequest('/auth/login', {method:'POST',body:{},skipAuth:true})).rejects.toMatchObject({code:'TOTP_REQUIRED', message:get(t)('auth.totp_required_error')});
    expect(new Headers(fetch.mock.calls[0]?.[1].headers).get('Accept-Language')).toBe('pt-BR');
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
