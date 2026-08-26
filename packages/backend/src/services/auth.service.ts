import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { eq, count } from 'drizzle-orm';
import { getDb } from '../db/connection.js';
import { users, refreshTokens, apiKeys } from '../db/schema.js';
import type { RegisterSchema, LoginSchema } from '../validators/auth.schema.js';

const SALT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

export interface TokenPayload {
  userId: number;
  email: string;
  role: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface RegisterResult {
  user: {
    id: number;
    email: string;
    name: string;
    role: string;
  };
  accessToken: string;
  refreshToken: string;
}

export interface GeneratedApiKey {
  id: number;
  name: string;
  key: string;
  keyPrefix: string;
  createdAt: string;
}

function getJwtSecret(): string {
  const secret = process.env['JWT_SECRET'];
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return secret;
}

export class AuthService {
  /**
   * Register a new user. First user automatically gets 'admin' role.
   * Returns the new user info along with access and refresh tokens.
   */
  static async register(input: RegisterSchema): Promise<RegisterResult> {
    const db = getDb();

    // Check if email already exists
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);

    if (existing.length > 0) {
      throw new AuthError('El correo electrónico ya está registrado', 'EMAIL_EXISTS');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

    // Determine role: first user = admin, subsequent = user
    const userCountResult = await db.select({ value: count() }).from(users);
    const userCount = userCountResult[0]?.value ?? 0;
    const role = userCount === 0 ? 'admin' : 'user';

    const now = new Date().toISOString();

    // Insert user
    const result = db
      .insert(users)
      .values({
        email: input.email,
        passwordHash,
        name: input.name,
        role,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();

    // Generate tokens
    const tokenPayload: TokenPayload = {
      userId: result.id,
      email: result.email,
      role: result.role,
    };

    const accessToken = AuthService.generateAccessToken(tokenPayload);
    const refreshToken = await AuthService.createRefreshToken(result.id);

    return {
      user: {
        id: result.id,
        email: result.email,
        name: result.name,
        role: result.role,
      },
      accessToken,
      refreshToken,
    };
  }

  /**
   * Authenticate user with email and password.
   * Returns access token (15min) and refresh token (7 days).
   */
  static async login(input: LoginSchema): Promise<AuthTokens> {
    const db = getDb();

    // Find user by email
    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);

    if (user.length === 0) {
      throw new AuthError('Credenciales inválidas', 'INVALID_CREDENTIALS');
    }

    const foundUser = user[0]!;

    // Validate password
    const isValid = await bcrypt.compare(input.password, foundUser.passwordHash);
    if (!isValid) {
      throw new AuthError('Credenciales inválidas', 'INVALID_CREDENTIALS');
    }

    // Generate tokens
    const tokenPayload: TokenPayload = {
      userId: foundUser.id,
      email: foundUser.email,
      role: foundUser.role,
    };

    const accessToken = AuthService.generateAccessToken(tokenPayload);
    const refreshToken = await AuthService.createRefreshToken(foundUser.id);

    return { accessToken, refreshToken };
  }

  /**
   * Validate a refresh token and issue a new access token.
   */
  static async refresh(refreshTokenValue: string): Promise<{ accessToken: string }> {
    const db = getDb();

    // Find the refresh token in DB
    const tokenRecord = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.token, refreshTokenValue))
      .limit(1);

    if (tokenRecord.length === 0) {
      throw new AuthError('Token de actualización inválido', 'INVALID_REFRESH_TOKEN');
    }

    const record = tokenRecord[0]!;

    // Check if token is expired
    const expiresAt = new Date(record.expiresAt);
    if (expiresAt <= new Date()) {
      // Clean up expired token
      db.delete(refreshTokens).where(eq(refreshTokens.id, record.id)).run();
      throw new AuthError('Token de actualización expirado', 'REFRESH_TOKEN_EXPIRED');
    }

    // Find the associated user
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, record.userId))
      .limit(1);

    if (user.length === 0) {
      throw new AuthError('Usuario no encontrado', 'USER_NOT_FOUND');
    }

    const foundUser = user[0]!;

    // Generate new access token
    const tokenPayload: TokenPayload = {
      userId: foundUser.id,
      email: foundUser.email,
      role: foundUser.role,
    };

    const accessToken = AuthService.generateAccessToken(tokenPayload);

    return { accessToken };
  }

  /**
   * Invalidate a refresh token (logout).
   */
  static async logout(refreshTokenValue: string): Promise<void> {
    const db = getDb();
    db.delete(refreshTokens).where(eq(refreshTokens.token, refreshTokenValue)).run();
  }

  /**
   * Verify a JWT token's signature and expiration.
   * Returns the decoded token payload.
   */
  static validateToken(token: string): TokenPayload {
    const secret = getJwtSecret();

    try {
      const decoded = jwt.verify(token, secret) as jwt.JwtPayload & TokenPayload;
      return {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthError('Token expirado', 'TOKEN_EXPIRED');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthError('Token inválido', 'INVALID_TOKEN');
      }
      throw new AuthError('Error de validación del token', 'TOKEN_VALIDATION_ERROR');
    }
  }

  /**
   * Generate a new API key for a user.
   * Returns the raw key (only shown once) and stores a hash in the database.
   */
  static async generateApiKey(userId: number, name: string): Promise<GeneratedApiKey> {
    const db = getDb();

    // Generate a random 64-character hex string
    const rawKey = crypto.randomBytes(32).toString('hex');

    // Store the hash of the key in the database
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const now = new Date().toISOString();

    const result = db
      .insert(apiKeys)
      .values({
        userId,
        name,
        key: keyHash,
        createdAt: now,
      })
      .returning()
      .get();

    return {
      id: result.id,
      name: result.name,
      key: rawKey,
      keyPrefix: rawKey.substring(0, 8),
      createdAt: result.createdAt,
    };
  }

  /**
   * Revoke (delete) an API key by its ID.
   */
  static async revokeApiKey(keyId: number): Promise<void> {
    const db = getDb();
    const deleted = db.delete(apiKeys).where(eq(apiKeys.id, keyId)).returning().all();

    if (deleted.length === 0) {
      throw new AuthError('API key no encontrada', 'API_KEY_NOT_FOUND');
    }
  }

  /**
   * Validate an API key by hashing it and checking against stored hashes.
   */
  static async validateApiKey(rawKey: string): Promise<TokenPayload | null> {
    const db = getDb();

    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const keyRecord = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.key, keyHash))
      .limit(1);

    if (keyRecord.length === 0) {
      return null;
    }

    const record = keyRecord[0]!;

    // Update last used timestamp
    db.update(apiKeys)
      .set({ lastUsedAt: new Date().toISOString() })
      .where(eq(apiKeys.id, record.id))
      .run();

    // Get the user
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, record.userId))
      .limit(1);

    if (user.length === 0) {
      return null;
    }

    const foundUser = user[0]!;

    return {
      userId: foundUser.id,
      email: foundUser.email,
      role: foundUser.role,
    };
  }

  // =========================================
  // Private helpers
  // =========================================

  private static generateAccessToken(payload: TokenPayload): string {
    const secret = getJwtSecret();
    return jwt.sign(payload, secret, { expiresIn: ACCESS_TOKEN_EXPIRY });
  }

  private static async createRefreshToken(userId: number): Promise<string> {
    const db = getDb();

    // Generate a secure random token
    const token = crypto.randomBytes(48).toString('hex');

    // Calculate expiration (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    const now = new Date().toISOString();

    db.insert(refreshTokens)
      .values({
        userId,
        token,
        expiresAt: expiresAt.toISOString(),
        createdAt: now,
      })
      .run();

    return token;
  }
}

/**
 * Custom error class for authentication errors.
 */
export class AuthError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
  }
}
