import { browser } from '$app/environment';

/**
 * Optional client-side app lock (P4.14).
 *
 * This is a LOCAL, opt-in gate that hides the app UI behind a biometric
 * (WebAuthn platform authenticator) or a numeric PIN. It is purely a
 * render-gate on the client — it does NOT replace the JWT session and never
 * touches the server. If someone bypasses it in devtools they still can't call
 * the API without a valid token; it's a convenience lock (like a phone applock),
 * not a server-enforced control.
 *
 * Config is stored in localStorage:
 *   - sf_lock_enabled  : '1' when the lock is on
 *   - sf_lock_method   : 'webauthn' | 'pin'
 *   - sf_lock_cred     : base64 WebAuthn credential id (webauthn method)
 *   - sf_lock_pin      : "<saltHex>:<sha256Hex>" (pin method)
 */

const K_ENABLED = 'sf_lock_enabled';
const K_METHOD = 'sf_lock_method';
const K_CRED = 'sf_lock_cred';
const K_PIN = 'sf_lock_pin';

export type LockMethod = 'webauthn' | 'pin';

export interface LockConfig {
  enabled: boolean;
  method: LockMethod | null;
}

export function getLockConfig(): LockConfig {
  if (!browser) return { enabled: false, method: null };
  const enabled = localStorage.getItem(K_ENABLED) === '1';
  const method = localStorage.getItem(K_METHOD) as LockMethod | null;
  return { enabled, method };
}

export function isLockEnabled(): boolean {
  return getLockConfig().enabled;
}

/** Whether the current browser exposes a WebAuthn platform authenticator API. */
export function webauthnSupported(): boolean {
  return (
    browser &&
    typeof window.PublicKeyCredential !== 'undefined' &&
    typeof navigator.credentials?.create === 'function'
  );
}

// ── base64url helpers for the credential id ──
function bufToB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str);
}
function b64ToBuf(b64: string): ArrayBuffer {
  const str = atob(b64);
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
  return bytes.buffer;
}

// ── PIN hashing (SubtleCrypto SHA-256 with a random salt) ──
function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function hashPin(pin: string, saltHex: string): Promise<string> {
  const data = new TextEncoder().encode(`${saltHex}:${pin}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return toHex(digest);
}

/**
 * Register a WebAuthn platform credential and enable the lock (webauthn method).
 * Throws if the user cancels or the platform authenticator is unavailable.
 */
export async function enableWebauthnLock(userLabel: string): Promise<void> {
  if (!webauthnSupported()) throw new Error('WEBAUTHN_UNSUPPORTED');
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userId = crypto.getRandomValues(new Uint8Array(16));
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: 'HomeLedger' },
      user: { id: userId, name: userLabel || 'HomeLedger', displayName: userLabel || 'HomeLedger' },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 }, // ES256
        { type: 'public-key', alg: -257 }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
      },
      timeout: 60000,
    },
  })) as PublicKeyCredential | null;
  if (!cred) throw new Error('WEBAUTHN_CANCELLED');
  localStorage.setItem(K_CRED, bufToB64(cred.rawId));
  localStorage.setItem(K_METHOD, 'webauthn');
  localStorage.setItem(K_ENABLED, '1');
}

/** Enable the lock with a numeric PIN (fallback method). */
export async function enablePinLock(pin: string): Promise<void> {
  if (!browser) return;
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = toHex(salt.buffer);
  const hash = await hashPin(pin, saltHex);
  localStorage.setItem(K_PIN, `${saltHex}:${hash}`);
  localStorage.setItem(K_METHOD, 'pin');
  localStorage.setItem(K_ENABLED, '1');
}

/** Turn the lock off and clear all stored lock material. */
export function disableLock(): void {
  if (!browser) return;
  localStorage.removeItem(K_ENABLED);
  localStorage.removeItem(K_METHOD);
  localStorage.removeItem(K_CRED);
  localStorage.removeItem(K_PIN);
}

/**
 * Attempt to unlock via WebAuthn (get assertion with the stored credential id).
 * Returns true on success. Throws on cancel/error so the caller can message it.
 */
export async function unlockWebauthn(): Promise<boolean> {
  const credB64 = localStorage.getItem(K_CRED);
  if (!credB64) return false;
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials: [{ type: 'public-key', id: b64ToBuf(credB64) }],
      userVerification: 'required',
      timeout: 60000,
    },
  });
  return !!assertion;
}

/** Verify a PIN against the stored salted hash. */
export async function unlockPin(pin: string): Promise<boolean> {
  const stored = localStorage.getItem(K_PIN);
  if (!stored) return false;
  const [saltHex, expected] = stored.split(':');
  if (!saltHex || !expected) return false;
  const actual = await hashPin(pin, saltHex);
  // Length-equal compare (values are hex of fixed length; not timing-critical
  // client-side, but avoid short-circuit surprises).
  return actual === expected;
}
