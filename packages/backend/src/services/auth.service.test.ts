import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { AuthService, AuthError } from './auth.service.js';
import { getDb, closeDatabase } from '../db/connection.js';
import { users, refreshTokens, apiKeys } from '../db/schema.js';
import jwt from 'jsonwebtoken';

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
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users(email);
      
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS refresh_tokens_token_unique ON refresh_tokens(token);
      
      CREATE TABLE IF NOT EXISTS api_keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        key TEXT NOT NULL,
        created_at TEXT NOT NULL,
        last_used_at TEXT
      );
      CREATE UNIQUE INDEX IF NOT EXISTS api_keys_key_unique ON api_keys("key");
    `);
  });

  beforeEach(() => {
    const db = getDb();
    // Clean tables before each test
    db.delete(apiKeys).run();
    db.delete(refreshTokens).run();
    db.delete(users).run();
  });

  afterAll(() => {
    closeDatabase();
    // Clean up test database
    const fs = require('fs');
    const path = require('path');
    const dbPath = path.resolve('./data/test-auth/smart-finance.db');
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
      await AuthService.revokeApiKey(apiKey.id);

      // Validate should return null after revocation
      const result = await AuthService.validateApiKey(apiKey.key);
      expect(result).toBeNull();
    });

    it('should throw when revoking non-existent key', async () => {
      await expect(AuthService.revokeApiKey(99999)).rejects.toThrow(AuthError);
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
      const payload = await AuthService.validateApiKey(apiKey.key);

      expect(payload).not.toBeNull();
      expect(payload!.userId).toBe(registerResult.user.id);
      expect(payload!.email).toBe('user@test.com');
    });

    it('should return null for an invalid API key', async () => {
      const result = await AuthService.validateApiKey('invalid-key');
      expect(result).toBeNull();
    });
  });
});
