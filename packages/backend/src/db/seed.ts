import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { getDb } from './connection.js';
import { categories, users } from './schema.js';

/**
 * Predefined system categories from the Notion export.
 * These are system-wide (isSystem: true, userId: null).
 */
const SYSTEM_CATEGORIES = [
  'Comida',
  'Compras',
  'Corrección',
  'Despensa',
  'Dividendos',
  'Educación',
  'Entretenimiento',
  'Gasolina',
  'ISP',
  'Limpieza',
  'Luz',
  'MX-5',
  'Nómina',
  'Préstamo',
  'Renta',
  'Salud',
  'Telefonía',
  'Transporte',
  'Vales',
] as const;

const SALT_ROUNDS = 12;

/**
 * Seeds predefined categories into the database.
 * Idempotent: skips categories that already exist as system categories.
 */
async function seedCategories(): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();

  const existingCategories = db
    .select({ name: categories.name })
    .from(categories)
    .where(eq(categories.isSystem, true))
    .all();

  const existingNames = new Set(existingCategories.map((c) => c.name));

  const toInsert = SYSTEM_CATEGORIES.filter((name) => !existingNames.has(name));

  if (toInsert.length > 0) {
    db.insert(categories)
      .values(
        toInsert.map((name) => ({
          name,
          userId: null,
          isSystem: true,
          createdAt: now,
        }))
      )
      .run();

    console.log(`[seed] Inserted ${toInsert.length} system categories.`);
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
