import { lookup } from 'node:dns';
import { isIP } from 'node:net';
import { Agent } from 'undici';

/** Operator-configured exact hostnames can intentionally target a LAN receiver. */
export function isAllowedWebhookHost(hostname: string): boolean {
  const normalize = (value: string) => value.trim().toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
  return (process.env['WEBHOOK_ALLOWED_HOSTS'] ?? '').split(',').filter(Boolean)
    .some(value => normalize(value) === normalize(hostname));
}

export function isPublicAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const [a = 0, b = 0] = address.split('.').map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || b === 0)) ||
      (a === 198 && (b === 18 || b === 19 || b === 51)) || (a === 203 && b === 0));
  }
  // Only globally routable IPv6 unicast; mapped IPv4, ULA and link-local are excluded.
  if (isIP(address) !== 6) return false;
  const canonical = new URL(`http://[${address}]`).hostname.slice(1, -1);
  return /^[23]/.test(canonical) && !/^(?:2001:(?:db8:|0:|:)|2002:)/i.test(canonical);
}

/** Resolve at connection time so a DNS change cannot bypass the address check. */
export const webhookDispatcher = new Agent({ connect: { lookup(hostname, options, callback) {
  lookup(hostname, { ...options, all: true }, (error, addresses) => {
    if (error) return callback(error, '', 0);
    const first = addresses[0];
    if (!first || (!isAllowedWebhookHost(hostname) && addresses.some(item => !isPublicAddress(item.address)))) {
      return callback(new Error('Webhook destination must resolve to public addresses'), '', 0);
    }
    if (options.all) callback(null, addresses);
    else callback(null, first.address, first.family);
  });
} } });
