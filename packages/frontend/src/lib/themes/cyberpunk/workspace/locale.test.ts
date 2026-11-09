import { describe, expect, it } from 'vitest';
import { buildModel, emptyData, routes } from './model';

describe('Cyberpunk locale support', () => {
  it('uses Portuguese dictionaries for route headings and workspace controls', () => {
    const model = buildModel(emptyData(), 'cuentas', 'pt-BR', 'BRL');
    const accountRoute = routes.find((route) => route[0] === 'cuentas');
    if (!accountRoute) throw new Error('Missing accounts route');
    expect(model.t(accountRoute[1])).toBe('Contas');
    expect(model.t(accountRoute[3])).toBe('Suas contas e cartões de crédito');
    expect(model.t('cyberpunk.add_funds')).toBe('Adicionar fundos');
    expect(model.money(1234.5)).toContain('1.234,5');
  });
});
