import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { getDb } from './connection.js';
import { categories, users } from './schema.js';
import { getDefaultLocale, type BackendLocale } from '../config/locale.js';

type CategoryType = 'Gasto' | 'Ingreso' | 'Ambos';

/**
 * Designed default categories, keyed by a stable, language-independent `key`.
 * Every user gets their OWN copy of this set at account creation (per-user
 * model — categories are not shared across users). The copy is seeded in the
 * instance's primary language (DEFAULT_LOCALE, chosen by the admin at launch);
 * afterwards each user can freely rename, retype, or delete their own
 * categories — including switching them to another language — without
 * affecting anyone else.
 *
 * `type` follows the schema enum: 'Gasto' (expense), 'Ingreso' (income), or
 * 'Ambos' (both — for categories that legitimately go in either direction).
 *
 * `uncategorized` is each user's default landing category for imported/unmatched
 * transactions; the import service and rules engine look it up by KEY per user
 * (not by name), so it works regardless of the seed language.
 */
const SYSTEM_CATEGORIES: { key: string; es: string; en: string; type: CategoryType }[] = [
  { key: 'income', es: 'Ingresos', en: 'Income', type: 'Ingreso' },
  { key: 'housing', es: 'Vivienda', en: 'Housing', type: 'Gasto' },
  { key: 'groceries', es: 'Despensa', en: 'Groceries', type: 'Gasto' },
  { key: 'dining', es: 'Restaurantes', en: 'Dining Out', type: 'Gasto' },
  { key: 'transportation', es: 'Transporte', en: 'Transportation', type: 'Gasto' },
  { key: 'utilities', es: 'Servicios', en: 'Utilities', type: 'Gasto' },
  { key: 'health', es: 'Salud', en: 'Health', type: 'Gasto' },
  { key: 'entertainment', es: 'Entretenimiento', en: 'Entertainment', type: 'Gasto' },
  { key: 'shopping', es: 'Compras', en: 'Shopping', type: 'Gasto' },
  { key: 'personal', es: 'Personal', en: 'Personal Care', type: 'Gasto' },
  { key: 'education', es: 'Educación', en: 'Education', type: 'Gasto' },
  { key: 'savings', es: 'Ahorro', en: 'Savings', type: 'Ambos' },
  { key: 'debt', es: 'Deudas', en: 'Debt & Loans', type: 'Ambos' },
  { key: 'gifts', es: 'Regalos y donativos', en: 'Gifts & Donations', type: 'Ambos' },
  { key: 'other', es: 'Otros', en: 'Other', type: 'Ambos' },
  { key: 'uncategorized', es: 'Sin categoría', en: 'Uncategorized', type: 'Ambos' },
];

/** Stable key of the default/"uncategorized" system category. */
export const UNCATEGORIZED_KEY = 'uncategorized';

const SALT_ROUNDS = 12;

function localizedName(cat: { es: string; en: string }, locale: BackendLocale): string {
  return locale === 'es' ? cat.es : cat.en;
}

/**
 * Seeds the designed default categories for a single user, in the instance's
 * primary language. Called from every user-creation path (registration, the
 * env-bootstrapped admin, and the CLI create-admin) so a new account always
 * starts with a usable, editable category set of its own.
 *
 * Idempotent per user: keys the user already has are skipped, so calling it
 * again (e.g. a re-run) never duplicates.
 *
 * @param userId - the user to seed categories for
 * @param locale - display language; defaults to the instance DEFAULT_LOCALE
 */
export function seedCategoriesForUser(userId: number, locale: BackendLocale = getDefaultLocale()): void {
  const db = getDb();
  const now = new Date().toISOString();

  const existingKeys = new Set(
    db
      .select({ key: categories.key })
      .from(categories)
      .where(eq(categories.userId, userId))
      .all()
      .map((c) => c.key)
      .filter((k): k is string => k !== null),
  );

  const toInsert = SYSTEM_CATEGORIES.filter((cat) => !existingKeys.has(cat.key));
  if (toInsert.length === 0) {
    return;
  }

  db.insert(categories)
    .values(
      toInsert.map((cat) => ({
        key: cat.key,
        name: localizedName(cat, locale),
        type: cat.type,
        userId,
        isSystem: false,
        createdAt: now,
      }))
    )
    .run();

  console.log(`[seed] Seeded ${toInsert.length} categories for user ${userId} (locale=${locale}).`);
}

/**
 * Seeds the admin user from environment variables (ADMIN_EMAIL, ADMIN_PASSWORD).
 * Idempotent: skips if a user with the admin email already exists.
 */
async function seedAdminUser(): Promise<void> {
  const db = getDb();

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.log('[seed] ADMIN_EMAIL or ADMIN_PASSWORD not set, skipping admin user creation.');
    return;
  }

  const existingAdmin = db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, adminEmail))
    .get();

  if (existingAdmin) {
    console.log(`[seed] Admin user (${adminEmail}) already exists, skipping.`);
    return;
  }

  const now = new Date().toISOString();
  const passwordHash = await bcrypt.hash(adminPassword, SALT_ROUNDS);

  const admin = db.insert(users)
    .values({
      email: adminEmail,
      passwordHash,
      name: 'Admin',
      role: 'admin',
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: users.id })
    .get();

  // Give the bootstrap admin its own default category set (per-user model).
  seedCategoriesForUser(admin.id);

  console.log(`[seed] Admin user created: ${adminEmail}`);
}

/**
 * Main seed function. Runs all seed operations.
 * Safe to call multiple times (idempotent).
 *
 * Note: categories are seeded PER USER (see `seedCategoriesForUser`), not
 * globally — so `seed()` only bootstraps the env-configured admin, which
 * receives its own category set.
 */
export async function seed(): Promise<void> {
  console.log('[seed] Starting database seeding...');
  await seedAdminUser();
  console.log('[seed] Database seeding complete.');
}
