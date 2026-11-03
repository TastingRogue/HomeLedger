import { describe, it, expect } from 'vitest';
import { getAlertTitle, getAlertMessage } from './alert-copy';
import { en } from '../i18n/en';
import type { Translate } from '../i18n/labels';

const tr: Translate = (key, params) => Object.entries(params ?? {}).reduce(
  (value, [name, replacement]) => value.replaceAll(`{${name}}`, String(replacement)),
  (en as Record<string, string>)[key] ?? key
);

describe('alert copy shared by themes', () => {
  it('localizes stored server alerts and legacy stringified metadata', () => {
    const alert = { type: 'payment_due', title: 'Pago próximo: Internet', message: 'Spanish stored message',
      data: JSON.stringify({ subscriptionName: 'Internet', daysRemaining: 3, amount: 599 }) };
    expect(getAlertTitle(alert, tr)).toContain('Internet');
    expect(getAlertTitle(alert, tr)).not.toContain('Pago');
    expect(getAlertMessage(alert, tr)).toContain('3');
    expect(getAlertMessage(alert, tr)).not.toContain('Spanish');
  });
  it('preserves custom text for unknown notification types', () => {
    expect(getAlertTitle({type:'custom', title:'Example'}, tr)).toBe('Example');
  });
});
