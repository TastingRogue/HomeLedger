import { and, eq, isNull } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { getDb } from './connection.js';
import { categories, users } from './schema.js';
import { getDefaultLocale, type BackendLocale } from '../config/locale.js';

type CategoryType = 'Gasto' | 'Ingreso' | 'Ambos';

/**
 * Designed default system categories, keyed by a stable, language-independent
 * `key`. These are system-wide (isSystem: true, userId: null) and shared across
 * all users. They are seeded in the host's primary language (DEFAULT_LOCALE),
 * chosen by the admin at launch; individual users can then delete these and
 * create their own in any language.
 *
 * `type` follows the schema enum: 'Gasto' (expense), 'Ingreso' (income), or
 * 'Ambos' (both — for categories that legitimately go in either direction).
 *
 * `uncategorized` is the default landing category for imported/unmatched
 * transactions; the import service and rules engine look it up by KEY (not name)
 * so it works regardless of the seed language.
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
 * Seeds the designed system categories in the host's primary language.
 *
 * Idempotent and safe for both fresh installs and upgrades:
 * - New designed categories are keyed by `key`; any key already present is left
 *   untouched (so we never duplicate on re-seed).
 * - Legacy upgrade: installs seeded before the `key` column existed have the old
 *   Notion-export Spanish categories with `key = NULL`. We backfill the critical
 *   `uncategorized` key onto a pre-existing "Corrección" row so the import/rules
 *   default lookup keeps working. We do NOT delete or rename the other legacy
 *   categories — transactions reference them by id (FK is `restrict`).
 */
async function seedCategories(): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();
  const locale = getDefaultLocale();

  // --- Legacy upgrade backfill: adopt an old "Corrección" row as uncategorized.
  const legacyDefault = db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.isSystem, true), eq(categories.name, 'Corrección'), isNull(categories.key)))
    .get();
  if (legacyDefault) {
    db.update(categories).set({ key: UNCATEGORIZED_KEY }).where(eq(categories.id, legacyDefault.id)).run();
    console.log('[seed] Backfilled key="uncategorized" onto legacy "Corrección" category.');
  }

  // --- Seed designed categories by key (skip keys already present).
  const existingKeys = new Set(
    db
      .select({ key: categories.key })
      .from(categories)
      .where(eq(categories.isSystem, true))
      .all()
      .map((c) => c.key)
      .filter((k): k is string => k !== null),
  );

  const toInsert = SYSTEM_CATEGORIES.filter((cat) => !existingKeys.has(cat.key));

  if (toInsert.length > 0) {
    db.insert(categories)
      .values(
        toInsert.map((cat) => ({
          key: cat.key,
          name: localizedName(cat, locale),
          type: cat.type,
          userId: null,
          isSystem: true,
          createdAt: now,
        }))
      )
      .run();

    console.log(`[seed] Inserted ${toInsert.length} system categories (locale=${locale}).`);
  } else {
    console.log('[seed] System categories already exist, skipping.');
  }
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

  db.insert(users)
    .values({
      email: adminEmail,
      passwordHash,
      name: 'Admin',
      role: 'admin',
      createdAt: now,
      updatedAt: now,
    })
    .run();

  console.log(`[seed] Admin user created: ${adminEmail}`);
}

/**
 * Main seed function. Runs all seed operations.
 * Safe to call multiple times (idempotent).
 */
export async function seed(): Promise<void> {
  console.log('[seed] Starting database seeding...');
  await seedCategories();
  await seedAdminUser();
  console.log('[seed] Database seeding complete.');
}
