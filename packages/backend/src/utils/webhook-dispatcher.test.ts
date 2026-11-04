import { describe, it, expect, vi, afterEach } from 'vitest';
import { isPublicAddress, isAllowedWebhookHost } from './webhook-dispatcher.js';

describe('webhook network boundaries', () => {
  afterEach(() => vi.unstubAllEnvs());
  it('allows only exact operator-approved LAN hosts', () => {
    vi.stubEnv('WEBHOOK_ALLOWED_HOSTS', 'homeassistant.local');
    expect(isAllowedWebhookHost('HomeAssistant.local.')).toBe(true);
    expect(isAllowedWebhookHost('homeassistant.local.attacker.test')).toBe(false);
    expect(isAllowedWebhookHost('169.254.169.254')).toBe(false);
  });
  it.each(['127.0.0.1', '10.0.0.1', '169.254.169.254', '192.168.1.1', '172.16.0.1', '100.64.0.1', '::1', '::ffff:127.0.0.1', 'fe80::1', 'fd00::1', '2001:db8::1', '2001::1', '2002:7f00:1::'])('blocks %s', address => {
    expect(isPublicAddress(address)).toBe(false);
  });
  it.each(['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111'])('allows public %s', address => {
    expect(isPublicAddress(address)).toBe(true);
  });
});
