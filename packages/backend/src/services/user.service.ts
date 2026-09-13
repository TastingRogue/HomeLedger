import { and, eq, count } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { getDb } from '../db/connection.js';
import { users } from '../db/schema.js';

const SALT_ROUNDS = 12;

export class UserError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'UserError';
    this.code = code;
  }
}

export interface UserSummary {
  id: number;
  email: string;
  name: string;
  role: string;
  disabled: boolean;
  createdAt: string;
}

/**
 * Admin user-management operations. All methods here are intended to be called
 * only from admin-guarded routes (requireRole(['admin'])). They additionally
 * enforce lockout-safety invariants: the instance must always retain at least
 * one enabled admin, and an admin can't lock themselves out.
 */
export class UserService {
  /** Lists all users (admin view). */
  static list(): UserSummary[] {
    const db = getDb();
    return db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        disabled: users.disabled,
        createdAt: users.createdAt,
      })
      .from(users)
      .all();
  }

  /** Number of admins that can still log in (enabled). */
  private static activeAdminCount(): number {
    const db = getDb();
    const row = db
      .select({ n: count() })
      .from(users)
      .where(and(eq(users.role, 'admin'), eq(users.disabled, false)))
      .get();
    return row?.n ?? 0;
  }

  private static getUser(userId: number) {
    const db = getDb();
    const u = db.select().from(users).where(eq(users.id, userId)).get();
    if (!u) throw new UserError('Usuario no encontrado', 'USER_NOT_FOUND');
    return u;
  }

  /**
   * Enable/disable a user. Cannot disable yourself, and cannot disable the last
   * enabled admin (would lock everyone out of admin functions).
   */
  static setDisabled(targetUserId: number, disabled: boolean, actingAdminId: number): UserSummary {
    const db = getDb();
    const target = UserService.getUser(targetUserId);

    if (disabled) {
      if (targetUserId === actingAdminId) {
        throw new UserError('No puedes deshabilitar tu propia cuenta', 'CANNOT_DISABLE_SELF');
      }
      if (target.role === 'admin' && UserService.activeAdminCount() <= 1) {
        throw new UserError('No se puede deshabilitar al último administrador activo', 'LAST_ADMIN');
      }
    }

    db.update(users)
      .set({ disabled, updatedAt: new Date().toISOString() })
      .where(eq(users.id, targetUserId))
      .run();
    return UserService.toSummary(targetUserId);
  }

  /**
   * Permanently delete a user (and, via FK cascade, all their data). Cannot
   * delete yourself or the last admin.
   */
  static delete(targetUserId: number, actingAdminId: number): void {
    const target = UserService.getUser(targetUserId);
    if (targetUserId === actingAdminId) {
      throw new UserError('No puedes eliminar tu propia cuenta', 'CANNOT_DELETE_SELF');
    }
    if (target.role === 'admin' && UserService.activeAdminCount() <= 1 && !target.disabled) {
      throw new UserError('No se puede eliminar al último administrador activo', 'LAST_ADMIN');
    }
    getDb().delete(users).where(eq(users.id, targetUserId)).run();
  }

  /** Admin-set a new password for a user (account recovery without email). */
  static async resetPassword(targetUserId: number, newPassword: string): Promise<void> {
    UserService.getUser(targetUserId);
    if (!newPassword || newPassword.length < 8) {
      throw new UserError('La contraseña debe tener al menos 8 caracteres', 'PASSWORD_TOO_SHORT');
    }
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    getDb()
      .update(users)
      .set({ passwordHash, updatedAt: new Date().toISOString() })
      .where(eq(users.id, targetUserId))
      .run();
  }

  private static toSummary(userId: number): UserSummary {
    const u = UserService.getUser(userId);
    return { id: u.id, email: u.email, name: u.name, role: u.role, disabled: u.disabled, createdAt: u.createdAt };
  }
}
