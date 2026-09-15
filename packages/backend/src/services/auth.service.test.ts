import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { AuthService, AuthError } from './auth.service.js';
import { generateTotp } from '../utils/totp.js';
import { setRegistrationMode, setRegistrationAllowlist } from '../config/registration.js';
import { getDb, closeDatabase } from '../db/connection.js';
import { users, refreshTokens, apiKeys, categories } from '../db/schema.js';
import jwt from 'jsonwebtoken';
import fs from 'node:fs';
import path from 'node:path';

// Set test environment variables
process.env['JWT_SECRET'] = 'test-secret-key-for-unit-tests-only';
process.env['DATA_DIR'] = './data/test-auth';

describe('AuthService', () => {
  beforeAll(() => {
    const db = getDb();
    // Create tables if they don't exist (using raw SQL for testing)
    const sqlite = db as unknown as { $client: { exec: (sql: string) => void } };
    // Migration should have run, but we'll ensure tables exist
    sqlite.$client.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        disabled INTEGER NOT NULL DEFAULT 0,
        totp_secret TEXT,
        totp_enabled INTEGER NOT NULL DEFAULT 0,
        totp_backup_codes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users(email);
      
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        user_agent TEXT,
        ip TEXT,
        last_used_at TEXT
      );
      CREATE UNIQUE INDEX IF NOT EXISTS refresh_tokens_token_unique ON refresh_tokens(token);
      
      CREATE TABLE IF NOT EXISTS api_keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        key TEXT NOT NULL,
        scopes TEXT,
        created_at TEXT NOT NULL,
        last_used_at TEXT
      );
      CREATE UNIQUE INDEX IF NOT EXISTS api_keys_key_unique ON api_keys("key");

      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        key TEXT,
        name TEXT NOT NULL,
        icon TEXT,
        color TEXT,
        type TEXT NOT NULL DEFAULT 'Ambos',
        is_system INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS categories_user_id_idx ON categories(user_id);
    `);
  });

  beforeEach(() => {
    const db = getDb();
    // Clean tables before each test (categories cascade from users, but delete
    // explicitly to be safe since register() now seeds per-user categories).
    db.delete(apiKeys).run();
    db.delete(refreshTokens).run();
    db.delete(categories).run();
    db.delete(users).run();
    // Default registration to 'open' for the pre-existing auth tests (they
    // register multiple users). P1.11-specific tests set their own mode.
    setRegistrationMode('open');
    setRegistrationAllowlist([]);
  });

  afterAll(() => {
    closeDatabase();
    // Clean up test database
    const dbPath = path.resolve('./data/test-auth/homeledger.db');
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
    const walPath = dbPath + '-wal';
    if (fs.existsSync(walPath)) {
      fs.unlinkSync(walPath);
    }
    const shmPath = dbPath + '-shm';
    if (fs.existsSync(shmPath)) {
      fs.unlinkSync(shmPath);
    }
    const dir = path.resolve('./data/test-auth');
    if (fs.existsSync(dir)) {
      fs.rmdirSync(dir);
    }
  });

  describe('register()', () => {
    it('should register the first user as admin', async () => {
      const result = await AuthService.register({
        email: 'admin@test.com',
        password: 'password123',
        name: 'Admin User',
      });

      expect(result.user.email).toBe('admin@test.com');
      expect(result.user.name).toBe('Admin User');
      expect(result.user.role).toBe('admin');
      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
    });

    it('should register subsequent users with role user', async () => {
      // Register first user (admin)
      await AuthService.register({
        email: 'admin@test.com',
        password: 'password123',
        name: 'Admin',
      });

      // Register second user
      const result = await AuthService.register({
        email: 'user@test.com',
        password: 'password456',
        name: 'Regular User',
      });

      expect(result.user.role).toBe('user');
    });

    it('should reject duplicate email', async () => {
      await AuthService.register({
        email: 'user@test.com',
        password: 'password123',
        name: 'User 1',
      });

      await expect(
        AuthService.register({
          email: 'user@test.com',
          password: 'password456',
          name: 'User 2',
        })
      ).rejects.toThrow(AuthError);
    });

    it('should return a valid JWT access token', async () => {
      const result = await AuthService.register({
        email: 'admin@test.com',
        password: 'password123',
        name: 'Admin',
      });

      const decoded = jwt.verify(result.accessToken, process.env['JWT_SECRET']!) as Record<string, unknown>;
      expect(decoded['userId']).toBe(result.user.id);
      expect(decoded['email']).toBe('admin@test.com');
      expect(decoded['role']).toBe('admin');
    });
  });

  describe('registration policy (P1.11)', () => {
    const first = { email: 'admin@test.com', password: 'password123', name: 'Admin' };
    const second = { email: 'user2@test.com', password: 'password123', name: 'User2' };

    it('first_user_only: first user allowed, second blocked', async () => {
      setRegistrationMode('first_user_only');
      const admin = await AuthService.register(first);
      expect(admin.user.role).toBe('admin');

      await expect(AuthService.register(second)).rejects.toThrow('registro está deshabilitado');
      await expect(AuthService.register(second)).rejects.toMatchObject({ code: 'REGISTRATION_CLOSED' });
    });

    it('closed: even the first user is blocked once one exists', async () => {
      setRegistrationMode('open');
      await AuthService.register(first); // bootstrap an admin while open
      setRegistrationMode('closed');
      await expect(AuthService.register(second)).rejects.toMatchObject({ code: 'REGISTRATION_CLOSED' });
    });

    it('open with allowlist: only listed emails may register', async () => {
      setRegistrationMode('open');
      await AuthService.register(first); // first user always allowed
      setRegistrationAllowlist(['allowed@test.com']);

      await expect(AuthService.register(second)).rejects.toMatchObject({ code: 'EMAIL_NOT_ALLOWED' });

      const ok = await AuthService.register({ email: 'ALLOWED@test.com', password: 'password123', name: 'Allowed' });
      expect(ok.user.email).toBe('ALLOWED@test.com'); // case-insensitive match on allowlist
    });

    it('open without allowlist: anyone may register', async () => {
      setRegistrationMode('open');
      setRegistrationAllowlist([]);
      await AuthService.register(first);
      const ok = await AuthService.register(second);
      expect(ok.user.role).toBe('user');
    });
  });

  describe('login()', () => {
    beforeEach(async () => {
      await AuthService.register({
        email: 'user@test.com',
        password: 'mypassword',
        name: 'Test User',
      });
    });

    it('should return tokens for valid credentials', async () => {
      const result = await AuthService.login({
        email: 'user@test.com',
        password: 'mypassword',
      });

      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
    });

    it('should reject invalid email', async () => {
      await expect(
        AuthService.login({
          email: 'wrong@test.com',
          password: 'mypassword',
        })
      ).rejects.toThrow(AuthError);
    });

    it('should reject invalid password', async () => {
      await expect(
        AuthService.login({
          email: 'user@test.com',
          password: 'wrongpassword',
        })
      ).rejects.toThrow(AuthError);
    });
  });

  describe('refresh()', () => {
    it('should issue a new access token for valid refresh token', async () => {
      const registerResult = await AuthService.register({
        email: 'user@test.com',
        password: 'password123',
        name: 'User',
      });

      const result = await AuthService.refresh(registerResult.refreshToken);
      expect(result.accessToken).toBeTruthy();

      const decoded = jwt.verify(result.accessToken, process.env['JWT_SECRET']!) as Record<string, unknown>;
      expect(decoded['email']).toBe('user@test.com');
    });

    it('should reject an invalid refresh token', async () => {
      await expect(
        AuthService.refresh('invalid-token-value')
      ).rejects.toThrow(AuthError);
    });
  });

  describe('logout()', () => {
    it('should invalidate the refresh token', async () => {
      const registerResult = await AuthService.register({
        email: 'user@test.com',
        password: 'password123',
        name: 'User',
      });

      await AuthService.logout(registerResult.refreshToken);

      // Refresh should now fail
      await expect(
        AuthService.refresh(registerResult.refreshToken)
      ).rejects.toThrow(AuthError);
    });
  });

  describe('validateToken()', () => {
    it('should return payload for a valid token', async () => {
      const registerResult = await AuthService.register({
        email: 'user@test.com',
        password: 'password123',
        name: 'User',
      });

      const payload = AuthService.validateToken(registerResult.accessToken);
      expect(payload.email).toBe('user@test.com');
      expect(payload.userId).toBe(registerResult.user.id);
    });

    it('should throw for an invalid token', () => {
      expect(() => AuthService.validateToken('invalid.token.here')).toThrow(AuthError);
    });

    it('should throw for an expired token', () => {
      const secret = process.env['JWT_SECRET']!;
      const expiredToken = jwt.sign(
        { userId: 1, email: 'test@test.com', role: 'user' },
        secret,
        { expiresIn: '-1s' }
      );

      expect(() => AuthService.validateToken(expiredToken)).toThrow(AuthError);
    });
  });

  describe('generateApiKey()', () => {
    it('should generate a 64-character hex API key', async () => {
      const registerResult = await AuthService.register({
        email: 'user@test.com',
        password: 'password123',
        name: 'User',
      });

      const apiKey = await AuthService.generateApiKey(registerResult.user.id, 'My Key');
      expect(apiKey.key).toHaveLength(64);
      expect(apiKey.key).toMatch(/^[a-f0-9]{64}$/);
      expect(apiKey.name).toBe('My Key');
      expect(apiKey.keyPrefix).toBe(apiKey.key.substring(0, 8));
    });
  });

  describe('revokeApiKey()', () => {
    it('should revoke an existing API key', async () => {
      const registerResult = await AuthService.register({
        email: 'user@test.com',
        password: 'password123',
        name: 'User',
      });

      const apiKey = await AuthService.generateApiKey(registerResult.user.id, 'My Key');
      await AuthService.revokeApiKey(apiKey.id, registerResult.user.id);

      // Validate should return null after revocation
      const result = await AuthService.validateApiKey(apiKey.key);
      expect(result).toBeNull();
    });

    it('should throw when revoking non-existent key', async () => {
      await expect(AuthService.revokeApiKey(99999, 1)).rejects.toThrow(AuthError);
    });
  });

  describe('validateApiKey()', () => {
    it('should return user payload for a valid API key', async () => {
      const registerResult = await AuthService.register({
        email: 'user@test.com',
        password: 'password123',
        name: 'User',
      });

      const apiKey = await AuthService.generateApiKey(registerResult.user.id, 'My Key');
      const result = await AuthService.validateApiKey(apiKey.key);

      expect(result).not.toBeNull();
      expect(result!.payload.userId).toBe(registerResult.user.id);
      expect(result!.payload.email).toBe('user@test.com');
      expect(result!.scopes).toBeNull(); // no scopes = full access
    });

    it('should return null for an invalid API key', async () => {
      const result = await AuthService.validateApiKey('invalid-key');
      expect(result).toBeNull();
    });
  });

  describe('scoped API keys (P4.13)', () => {
    async function registerUser() {
      return AuthService.register({ email: 'user@test.com', password: 'password123', name: 'User' });
    }

    it('persists and surfaces scopes on create + validate', async () => {
      const r = await registerUser();
      const created = await AuthService.generateApiKey(r.user.id, 'Scoped', ['read:transactions', 'write:accounts']);
      expect(created.scopes).toEqual(['read:transactions', 'write:accounts']);

      const validation = await AuthService.validateApiKey(created.key);
      expect(validation!.scopes).toEqual(['read:transactions', 'write:accounts']);
    });

    it('drops invalid/duplicate scopes and treats empty as full access', async () => {
      const r = await registerUser();
      const created = await AuthService.generateApiKey(r.user.id, 'Cleaned', ['read:transactions', 'read:transactions', 'bogus:scope']);
      expect(created.scopes).toEqual(['read:transactions']);

      const full = await AuthService.generateApiKey(r.user.id, 'Full', []);
      expect(full.scopes).toBeNull();
      const validation = await AuthService.validateApiKey(full.key);
      expect(validation!.scopes).toBeNull();
    });

    it('lists a user\'s keys without secrets', async () => {
      const r = await registerUser();
      await AuthService.generateApiKey(r.user.id, 'A', ['read:reports']);
      await AuthService.generateApiKey(r.user.id, 'B', null);
      const list = AuthService.listApiKeys(r.user.id);
      expect(list.length).toBe(2);
      // Metadata only — no `key`/hash field present.
      expect(Object.keys(list[0]!)).toEqual(expect.arrayContaining(['id', 'name', 'scopes', 'createdAt', 'lastUsedAt']));
      expect((list[0] as unknown as Record<string, unknown>)['key']).toBeUndefined();
    });
  });

  describe('TOTP 2FA (P4.12)', () => {
    async function registerUser() {
      return AuthService.register({ email: 'user@test.com', password: 'password123', name: 'User' });
    }

    it('is disabled by default', async () => {
      const r = await registerUser();
      const status = AuthService.getTotpStatus(r.user.id);
      expect(status.enabled).toBe(false);
      expect(status.pending).toBe(false);
      expect(status.backupCodesRemaining).toBe(0);
    });

    it('enrollment produces a secret + otpauth URI but stays disabled until confirmed', async () => {
      const r = await registerUser();
      const enrollment = await AuthService.beginTotpEnrollment(r.user.id);
      expect(enrollment.secret).toBeTruthy();
      expect(enrollment.otpauthUri.startsWith('otpauth://totp/')).toBe(true);

      const status = AuthService.getTotpStatus(r.user.id);
      expect(status.enabled).toBe(false);
      expect(status.pending).toBe(true);
    });

    it('confirm requires a valid code and then enables + returns backup codes', async () => {
      const r = await registerUser();
      const { secret } = await AuthService.beginTotpEnrollment(r.user.id);

      await expect(AuthService.confirmTotpEnrollment(r.user.id, '000000')).rejects.toMatchObject({ code: 'TOTP_INVALID' });

      const code = generateTotp(secret);
      const { backupCodes } = await AuthService.confirmTotpEnrollment(r.user.id, code);
      expect(backupCodes).toHaveLength(10);

      const status = AuthService.getTotpStatus(r.user.id);
      expect(status.enabled).toBe(true);
      expect(status.backupCodesRemaining).toBe(10);
    });

    it('login requires the second factor once enabled', async () => {
      const r = await registerUser();
      const { secret } = await AuthService.beginTotpEnrollment(r.user.id);
      await AuthService.confirmTotpEnrollment(r.user.id, generateTotp(secret));

      // No code -> TOTP_REQUIRED
      await expect(
        AuthService.login({ email: 'user@test.com', password: 'password123' }),
      ).rejects.toMatchObject({ code: 'TOTP_REQUIRED' });

      // Wrong code -> TOTP_INVALID
      await expect(
        AuthService.login({ email: 'user@test.com', password: 'password123', totpCode: '000000' }),
      ).rejects.toMatchObject({ code: 'TOTP_INVALID' });

      // Correct code -> tokens
      const ok = await AuthService.login({ email: 'user@test.com', password: 'password123', totpCode: generateTotp(secret) });
      expect(ok.accessToken).toBeTruthy();
    });

    it('a backup code logs in once and is then consumed', async () => {
      const r = await registerUser();
      const { secret } = await AuthService.beginTotpEnrollment(r.user.id);
      const { backupCodes } = await AuthService.confirmTotpEnrollment(r.user.id, generateTotp(secret));
      const code = backupCodes[0]!;

      const ok = await AuthService.login({ email: 'user@test.com', password: 'password123', totpCode: code });
      expect(ok.accessToken).toBeTruthy();
      expect(AuthService.getTotpStatus(r.user.id).backupCodesRemaining).toBe(9);

      // Reusing the same backup code fails.
      await expect(
        AuthService.login({ email: 'user@test.com', password: 'password123', totpCode: code }),
      ).rejects.toMatchObject({ code: 'TOTP_INVALID' });
    });

    it('disable requires a valid factor and clears 2FA', async () => {
      const r = await registerUser();
      const { secret } = await AuthService.beginTotpEnrollment(r.user.id);
      await AuthService.confirmTotpEnrollment(r.user.id, generateTotp(secret));

      await expect(AuthService.disableTotp(r.user.id, '000000')).rejects.toMatchObject({ code: 'TOTP_INVALID' });

      await AuthService.disableTotp(r.user.id, generateTotp(secret));
      const status = AuthService.getTotpStatus(r.user.id);
      expect(status.enabled).toBe(false);
      expect(status.backupCodesRemaining).toBe(0);

      // Login no longer requires a second factor.
      const ok = await AuthService.login({ email: 'user@test.com', password: 'password123' });
      expect(ok.accessToken).toBeTruthy();
    });
  });

  describe('sessions (P4.12)', () => {
    it('records session metadata and lists sessions', async () => {
      const r = await AuthService.register({ email: 'user@test.com', password: 'password123', name: 'User' });
      // register created one session; login creates another with metadata.
      await AuthService.login(
        { email: 'user@test.com', password: 'password123' },
        { ip: '10.0.0.5', userAgent: 'Mozilla/5.0 Test' },
      );

      const sessions = AuthService.listSessions(r.user.id, r.refreshToken);
      expect(sessions.length).toBe(2);
      const withMeta = sessions.find((s) => s.ip === '10.0.0.5');
      expect(withMeta).toBeTruthy();
      expect(withMeta!.userAgent).toBe('Mozilla/5.0 Test');
      const current = sessions.find((s) => s.current);
      expect(current).toBeTruthy();
    });

    it('revokes a single session and rejects unknown ids', async () => {
      const r = await AuthService.register({ email: 'user@test.com', password: 'password123', name: 'User' });
      const sessions = AuthService.listSessions(r.user.id);
      const sessionId = sessions[0]!.id;

      AuthService.revokeSession(sessionId, r.user.id);
      expect(AuthService.listSessions(r.user.id).length).toBe(0);

      expect(() => AuthService.revokeSession(999999, r.user.id)).toThrow(AuthError);
    });
  });
});
