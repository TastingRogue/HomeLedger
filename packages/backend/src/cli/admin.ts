/**
 * HomeLedger admin recovery CLI.
 *
 * A headless escape hatch for account recovery that operates directly on the
 * database — it works even when you are locked out of the app (forgot the admin
 * password, the only admin was disabled, or there is no admin at all). It runs
 * migrations first, so the schema is always current, and respects DATA_DIR.
 *
 * Local (from repo root):
 *   npm run admin -w packages/backend -- <command> [args]
 * In Docker:
 *   docker exec -it <container> node dist/cli/admin.js <command> [args]
 *
 * Commands:
 *   list-users
 *   reset-password <email> [password]     (generates a strong password if omitted)
 *   create-admin <email> [password] [name]
 *   promote <email>                        (make a user an admin)
 *   enable <email>                         (re-enable a disabled account)
 *
 * This tool never prints stored password hashes and only prints a generated
 * password once, so it can be copied and then rotated.
 */
import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { initializeDatabase, getDb, closeDatabase } from '../db/connection.js';
import { users } from '../db/schema.js';
import { seedCategoriesForUser } from '../db/seed.js';

const SALT_ROUNDS = 12;

function usage(): void {
  console.log(`HomeLedger admin recovery CLI

Usage:
  admin list-users
  admin reset-password <email> [password]
  admin create-admin <email> [password] [name]
  admin promote <email>
  admin enable <email>

If [password] is omitted for reset-password/create-admin, a strong random
password is generated and printed once.`);
}

/** Generates a readable but strong random password. */
function generatePassword(): string {
  // 18 url-safe chars ≈ 108 bits of entropy.
  return crypto.randomBytes(14).toString('base64url').slice(0, 18);
}

function findUser(email: string) {
  const db = getDb();
  return db.select().from(users).where(eq(users.email, email.trim().toLowerCase())).get()
    ?? db.select().from(users).where(eq(users.email, email.trim())).get();
}

async function resetPassword(email: string, password?: string): Promise<void> {
  const user = findUser(email);
  if (!user) throw new Error(`No existe un usuario con el correo "${email}".`);
  const pw = password ?? generatePassword();
  if (pw.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.');
  const passwordHash = await bcrypt.hash(pw, SALT_ROUNDS);
  getDb().update(users).set({ passwordHash, updatedAt: new Date().toISOString() }).where(eq(users.id, user.id)).run();
  console.log(`Contraseña restablecida para ${user.email}.`);
  if (!password) console.log(`Nueva contraseña (cópiala ahora): ${pw}`);
}

async function createAdmin(email: string, password?: string, name?: string): Promise<void> {
  if (findUser(email)) throw new Error(`Ya existe un usuario con el correo "${email}".`);
  const pw = password ?? generatePassword();
  if (pw.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.');
  const now = new Date().toISOString();
  const passwordHash = await bcrypt.hash(pw, SALT_ROUNDS);
  const created = getDb()
    .insert(users)
    .values({ email: email.trim(), passwordHash, name: name ?? 'Admin', role: 'admin', disabled: false, createdAt: now, updatedAt: now })
    .returning({ id: users.id })
    .get();
  // Give the new admin its own default category set (per-user model).
  seedCategoriesForUser(created.id);
  console.log(`Administrador creado: ${email}`);
  if (!password) console.log(`Contraseña (cópiala ahora): ${pw}`);
}

function promote(email: string): void {
  const user = findUser(email);
  if (!user) throw new Error(`No existe un usuario con el correo "${email}".`);
  getDb().update(users).set({ role: 'admin', updatedAt: new Date().toISOString() }).where(eq(users.id, user.id)).run();
  console.log(`${user.email} ahora es administrador.`);
}

function enable(email: string): void {
  const user = findUser(email);
  if (!user) throw new Error(`No existe un usuario con el correo "${email}".`);
  getDb().update(users).set({ disabled: false, updatedAt: new Date().toISOString() }).where(eq(users.id, user.id)).run();
  console.log(`Cuenta habilitada: ${user.email}`);
}

function listUsers(): void {
  const rows = getDb()
    .select({ id: users.id, email: users.email, name: users.name, role: users.role, disabled: users.disabled })
    .from(users)
    .all();
  if (rows.length === 0) {
    console.log('No hay usuarios. Usa "create-admin <email>" para crear el primero.');
    return;
  }
  console.log('ID  ROLE   DISABLED  EMAIL (NAME)');
  for (const u of rows) {
    console.log(`${String(u.id).padEnd(3)} ${u.role.padEnd(6)} ${(u.disabled ? 'yes' : 'no').padEnd(8)} ${u.email} (${u.name})`);
  }
}

async function main(): Promise<void> {
  const [cmd, ...args] = process.argv.slice(2);
  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
    usage();
    return;
  }

  // Ensure the schema is current before touching data.
  initializeDatabase();

  switch (cmd) {
    case 'list-users':
      listUsers();
      break;
    case 'reset-password':
      if (!args[0]) throw new Error('Uso: reset-password <email> [password]');
      await resetPassword(args[0], args[1]);
      break;
    case 'create-admin':
      if (!args[0]) throw new Error('Uso: create-admin <email> [password] [name]');
      await createAdmin(args[0], args[1], args[2]);
      break;
    case 'promote':
      if (!args[0]) throw new Error('Uso: promote <email>');
      promote(args[0]);
      break;
    case 'enable':
      if (!args[0]) throw new Error('Uso: enable <email>');
      enable(args[0]);
      break;
    default:
      console.error(`Comando desconocido: ${cmd}\n`);
      usage();
      process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 1;
  })
  .finally(() => {
    closeDatabase();
  });
