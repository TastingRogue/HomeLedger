import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { eq, and, count } from 'drizzle-orm';
import { getDb } from '../db/connection.js';
import { users, refreshTokens, apiKeys } from '../db/schema.js';
import { getRegistrationMode, getRegistrationAllowlist } from '../config/registration.js';
import { seedCategoriesForUser } from '../db/seed.js';
import { desc } from 'drizzle-orm';
import {
  generateSecret,
  buildOtpauthUri,
  verifyTotp,
  generateBackupCodes,
  hashBackupCode,
} from '../utils/totp.js';
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

/** Client metadata captured at login so sessions can be reviewed/revoked. */
export interface SessionContext {
  ip?: string | null;
  userAgent?: string | null;
}

export interface SessionInfo {
  id: number;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string;
  current: boolean;
}

export interface TotpEnrollment {
  secret: string;
  otpauthUri: string;
}

export interface TotpStatus {
  enabled: boolean;
  pending: boolean;
  backupCodesRemaining: number;
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

    // Determine role: first user = admin, subsequent = user
    const userCountResult = await db.select({ value: count() }).from(users);
    const userCount = userCountResult[0]?.value ?? 0;
    const role = userCount === 0 ? 'admin' : 'user';

    // Enforce the registration policy. The very first user is ALWAYS allowed
    // (bootstraps the admin); after that the admin-controlled policy applies.
    if (userCount > 0) {
      const mode = getRegistrationMode();
      if (mode === 'closed' || mode === 'first_user_only') {
        throw new AuthError('El registro está deshabilitado. Contacta al administrador.', 'REGISTRATION_CLOSED');
      }
      // mode === 'open': if an allowlist is configured, the email must be on it.
      const allowlist = getRegistrationAllowlist();
      if (allowlist.length > 0 && !allowlist.includes(input.email.trim().toLowerCase())) {
        throw new AuthError('Este correo no está autorizado para registrarse.', 'EMAIL_NOT_ALLOWED');
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

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

    // Every new user gets their own default category set (per-user model).
    seedCategoriesForUser(result.id);

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
  static async login(input: LoginSchema, session: SessionContext = {}): Promise<AuthTokens> {
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

    // Disabled accounts cannot log in.
    if (foundUser.disabled) {
      throw new AuthError('La cuenta está deshabilitada. Contacta al administrador.', 'ACCOUNT_DISABLED');
    }

    // Second factor: when TOTP is enabled, a valid TOTP code OR one-time backup
    // code is required. TOTP is fully offline (RFC 6238).
    if (foundUser.totpEnabled) {
      const provided = (input.totpCode ?? '').trim();
      if (!provided) {
        throw new AuthError('Se requiere el código de verificación de dos pasos', 'TOTP_REQUIRED');
      }
      const secondFactorOk = AuthService.verifySecondFactor(foundUser.id, foundUser.totpSecret, foundUser.totpBackupCodes, provided);
      if (!secondFactorOk) {
        throw new AuthError('Código de verificación inválido', 'TOTP_INVALID');
      }
    }

    // Generate tokens
    const tokenPayload: TokenPayload = {
      userId: foundUser.id,
      email: foundUser.email,
      role: foundUser.role,
    };

    const accessToken = AuthService.generateAccessToken(tokenPayload);
    const refreshToken = await AuthService.createRefreshToken(foundUser.id, session);

    return { accessToken, refreshToken };
  }

  /**
   * Verify a supplied second factor against a user's TOTP secret or backup codes.
   * If a backup code matches, it is consumed (removed) so it can't be reused.
   * Returns true when the factor is valid.
   */
  private static verifySecondFactor(
    userId: number,
    totpSecret: string | null,
    backupCodesJson: string | null,
    provided: string,
  ): boolean {
    const normalized = provided.replace(/\s+/g, '');

    // Try TOTP first (6-digit codes).
    if (totpSecret && /^\d{6}$/.test(normalized)) {
      if (verifyTotp(totpSecret, normalized)) {
        return true;
      }
    }

    // Fall back to one-time backup codes.
    if (backupCodesJson) {
      let hashes: string[] = [];
      try {
        hashes = JSON.parse(backupCodesJson) as string[];
      } catch {
        hashes = [];
      }
      const providedHash = hashBackupCode(provided);
      const idx = hashes.indexOf(providedHash);
      if (idx !== -1) {
        // Consume the used code.
        hashes.splice(idx, 1);
        const db = getDb();
        db.update(users)
          .set({ totpBackupCodes: JSON.stringify(hashes), updatedAt: new Date().toISOString() })
          .where(eq(users.id, userId))
          .run();
        return true;
      }
    }

    return false;
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

    // Track recent activity for the session list.
    db.update(refreshTokens)
      .set({ lastUsedAt: new Date().toISOString() })
      .where(eq(refreshTokens.id, record.id))
      .run();

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
  static async revokeApiKey(keyId: number, userId: number): Promise<void> {
    const db = getDb();
    // Scope to the caller's own keys so a user can never revoke another user's key.
    const deleted = db
      .delete(apiKeys)
      .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, userId)))
      .returning()
      .all();

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

  private static async createRefreshToken(userId: number, session: SessionContext = {}): Promise<string> {
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
        ip: session.ip ?? null,
        userAgent: session.userAgent ?? null,
        lastUsedAt: now,
      })
      .run();

    return token;
  }

  // =========================================
  // TOTP 2FA (P4.12) — offline, opt-in
  // =========================================

  /**
   * Begin TOTP enrollment: generate (or reuse a pending) secret and store it,
   * but keep 2FA disabled until the user confirms a valid code. Returns the
   * secret and the otpauth:// URI for the authenticator app.
   */
  static async beginTotpEnrollment(userId: number): Promise<TotpEnrollment> {
    const db = getDb();
    const user = db.select().from(users).where(eq(users.id, userId)).get();
    if (!user) {
      throw new AuthError('Usuario no encontrado', 'USER_NOT_FOUND');
    }
    if (user.totpEnabled) {
      throw new AuthError('La verificación en dos pasos ya está activada', 'TOTP_ALREADY_ENABLED');
    }

    const secret = generateSecret();
    db.update(users)
      .set({ totpSecret: secret, updatedAt: new Date().toISOString() })
      .where(eq(users.id, userId))
      .run();

    return {
      secret,
      otpauthUri: buildOtpauthUri(secret, user.email, 'HomeLedger'),
    };
  }

  /**
   * Confirm enrollment: verify a code against the pending secret; on success
   * enable 2FA and generate one-time backup codes (returned in plaintext ONCE).
   */
  static async confirmTotpEnrollment(userId: number, code: string): Promise<{ backupCodes: string[] }> {
    const db = getDb();
    const user = db.select().from(users).where(eq(users.id, userId)).get();
    if (!user) {
      throw new AuthError('Usuario no encontrado', 'USER_NOT_FOUND');
    }
    if (user.totpEnabled) {
      throw new AuthError('La verificación en dos pasos ya está activada', 'TOTP_ALREADY_ENABLED');
    }
    if (!user.totpSecret) {
      throw new AuthError('No hay una inscripción de 2FA pendiente', 'TOTP_NOT_PENDING');
    }
    if (!verifyTotp(user.totpSecret, (code ?? '').trim())) {
      throw new AuthError('Código de verificación inválido', 'TOTP_INVALID');
    }

    const { plaintext, hashes } = generateBackupCodes(10);
    db.update(users)
      .set({
        totpEnabled: true,
        totpBackupCodes: JSON.stringify(hashes),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, userId))
      .run();

    return { backupCodes: plaintext };
  }

  /**
   * Disable TOTP 2FA. Requires a valid current TOTP or backup code so a
   * hijacked access token alone can't turn it off.
   */
  static async disableTotp(userId: number, code: string): Promise<void> {
    const db = getDb();
    const user = db.select().from(users).where(eq(users.id, userId)).get();
    if (!user) {
      throw new AuthError('Usuario no encontrado', 'USER_NOT_FOUND');
    }
    if (!user.totpEnabled) {
      throw new AuthError('La verificación en dos pasos no está activada', 'TOTP_NOT_ENABLED');
    }
    const ok = AuthService.verifySecondFactor(userId, user.totpSecret, user.totpBackupCodes, (code ?? '').trim());
    if (!ok) {
      throw new AuthError('Código de verificación inválido', 'TOTP_INVALID');
    }

    db.update(users)
      .set({
        totpEnabled: false,
        totpSecret: null,
        totpBackupCodes: null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, userId))
      .run();
  }

  /**
   * Report the current 2FA status for a user.
   */
  static getTotpStatus(userId: number): TotpStatus {
    const db = getDb();
    const user = db.select().from(users).where(eq(users.id, userId)).get();
    if (!user) {
      throw new AuthError('Usuario no encontrado', 'USER_NOT_FOUND');
    }
    let remaining = 0;
    if (user.totpBackupCodes) {
      try {
        remaining = (JSON.parse(user.totpBackupCodes) as string[]).length;
      } catch {
        remaining = 0;
      }
    }
    return {
      enabled: user.totpEnabled,
      pending: !user.totpEnabled && !!user.totpSecret,
      backupCodesRemaining: remaining,
    };
  }

  // =========================================
  // Sessions (P4.12) — list + revoke
  // =========================================

  /**
   * List a user's active sessions (refresh tokens), most-recent first.
   * The session matching `currentToken` is flagged as current.
   */
  static listSessions(userId: number, currentToken?: string): SessionInfo[] {
    const db = getDb();
    const rows = db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.userId, userId))
      .orderBy(desc(refreshTokens.createdAt))
      .all();

    return rows.map((r) => ({
      id: r.id,
      ip: r.ip ?? null,
      userAgent: r.userAgent ?? null,
      createdAt: r.createdAt,
      lastUsedAt: r.lastUsedAt ?? null,
      expiresAt: r.expiresAt,
      current: !!currentToken && r.token === currentToken,
    }));
  }

  /**
   * Revoke a single session by id, scoped to the owning user.
   */
  static revokeSession(sessionId: number, userId: number): void {
    const db = getDb();
    const deleted = db
      .delete(refreshTokens)
      .where(and(eq(refreshTokens.id, sessionId), eq(refreshTokens.userId, userId)))
      .returning()
      .all();
    if (deleted.length === 0) {
      throw new AuthError('Sesión no encontrada', 'SESSION_NOT_FOUND');
    }
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
