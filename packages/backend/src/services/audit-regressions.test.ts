import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import Fastify from 'fastify';
import { BudgetPeriod, TransactionType } from '@homeledger/shared';

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'homeledger-regressions-'));
process.env['DATA_DIR'] = directory;
process.env['JWT_SECRET'] = 'disposable-audit-regression-secret-123456';
const connection = await import('../db/connection.js');
const { AuthService } = await import('./auth.service.js');
const { UserService } = await import('./user.service.js');
const { setRegistrationMode } = await import('../config/registration.js');
const { registerAuthMiddleware } = await import('../middleware/auth.middleware.js');
const { authRoutes } = await import('../routes/v1/auth.routes.js');
const { transferRoutes } = await import('../routes/v1/transfers.routes.js');
const { TransferService } = await import('./transfer.service.js');
const { TransactionService } = await import('./transaction.service.js');
const { GoalService } = await import('./goal.service.js');
const { LoanService } = await import('./loan.service.js');
const { CategoryService } = await import('./category.service.js');
const { BudgetService } = await import('./budget.service.js');
const { BackupService } = await import('./backup.service.js');
const { SnapshotService } = await import('./snapshot.service.js');

const date = '2026-11-09';
let userId: number;
let sourceId: number;
let destinationId: number;
let categoryId: number;
let otherCategoryId: number;

beforeEach(() => {
  connection.closeDatabase();
  // Only the freshly allocated, suite-owned directory is ever removed.
  fs.rmSync(directory, { recursive: true, force: true });
  fs.mkdirSync(directory);
  connection.initializeDatabase();
  const sql = connection.getSqlite();
  userId = Number(
    sql
      .prepare(
        "INSERT INTO users(email,password_hash,name,role,created_at,updated_at) VALUES ('audit@example.test','test','Audit','admin',?,?)",
      )
      .run(date, date).lastInsertRowid,
  );
  const account = sql.prepare(
    "INSERT INTO accounts(user_id,name,type,initial_balance,currency,exchange_rate,created_at,updated_at) VALUES (?,?,'Efectivo',100,'MXN',1,?,?)",
  );
  sourceId = Number(account.run(userId, 'Source', date, date).lastInsertRowid);
  destinationId = Number(account.run(userId, 'Destination', date, date).lastInsertRowid);
  const category = sql.prepare('INSERT INTO categories(user_id,name,created_at) VALUES (?,?,?)');
  categoryId = Number(category.run(userId, 'Category A', date).lastInsertRowid);
  otherCategoryId = Number(category.run(userId, 'Category B', date).lastInsertRowid);
});
afterAll(() => {
  connection.closeDatabase();
  fs.rmSync(directory, { recursive: true, force: true });
});

function createTransfer() {
  return TransferService.create(userId, {
    name: 'Transfer',
    amount: 10,
    date,
    sourceAccountId: sourceId,
    destinationAccountId: destinationId,
  });
}
async function registeredUser() {
  setRegistrationMode('open');
  return AuthService.register({
    email: 'member@example.test',
    password: 'Original-password-123!',
    name: 'Member',
  });
}

describe('security regression coverage', () => {
  it('creates only one first administrator for concurrent registration', async () => {
    connection.getSqlite().exec('DELETE FROM accounts; DELETE FROM categories; DELETE FROM users;');
    setRegistrationMode('first_user_only');
    const results = await Promise.allSettled(
      [1, 2].map((n) =>
        AuthService.register({
          email: `first${n}@example.test`,
          password: 'Test-password-123!',
          name: 'First',
        }),
      ),
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(connection.getSqlite().prepare('SELECT COUNT(*) AS n FROM users').get()).toEqual({
      n: 1,
    });
  });

  it('blocks disabled users over HTTP with JWT, API key and refresh credentials', async () => {
    const member = await registeredUser();
    const key = await AuthService.generateApiKey(member.user.id, 'integration');
    UserService.setDisabled(member.user.id, true, userId);
    const app = Fastify();
    registerAuthMiddleware(app);
    app.get('/api/v1/private', async () => ({ ok: true }));
    await app.register(authRoutes, { prefix: '/api/v1/auth' });
    try {
      for (const headers of [
        { authorization: `Bearer ${member.accessToken}` },
        { 'x-api-key': key.key },
      ]) {
        expect(
          (await app.inject({ method: 'GET', url: '/api/v1/private', headers })).statusCode,
        ).toBe(401);
      }
      expect(
        (
          await app.inject({
            method: 'POST',
            url: '/api/v1/auth/refresh',
            payload: { refreshToken: member.refreshToken },
          })
        ).statusCode,
      ).toBe(401);
    } finally {
      await app.close();
    }
  });

  it('invalidates old JWT and refresh sessions after password recovery, preserving integration keys', async () => {
    const member = await registeredUser();
    const key = await AuthService.generateApiKey(member.user.id, 'integration');
    await UserService.resetPassword(member.user.id, 'Replacement-password-123!');
    expect(() => AuthService.validateToken(member.accessToken)).toThrow();
    await expect(AuthService.refresh(member.refreshToken)).rejects.toThrow();
    expect(await AuthService.validateApiKey(key.key)).not.toBeNull();
    const session = await AuthService.login({
      email: member.user.email,
      password: 'Replacement-password-123!',
    });
    expect(AuthService.validateToken(session.accessToken).userId).toBe(member.user.id);
  });

  it('rejects JWTs after user deletion and uses the current role', async () => {
    const member = await registeredUser();
    connection.getSqlite().prepare("UPDATE users SET role='viewer' WHERE id=?").run(member.user.id);
    expect(AuthService.validateToken(member.accessToken).role).toBe('viewer');
    UserService.delete(member.user.id, userId);
    expect(() => AuthService.validateToken(member.accessToken)).toThrow();
  });
});

describe('financial regression coverage', () => {
  it('validates transfer edits over HTTP and persists destination amounts', async () => {
    const transfer = createTransfer();
    const app = Fastify();
    app.addHook('onRequest', async (request) => {
      Object.assign(request, { user: { userId, role: 'admin' } });
    });
    await app.register(transferRoutes, { prefix: '/transfers' });
    try {
      for (const payload of [
        { amount: -5 },
        { amount: 0 },
        { amount: 1.001 },
        { amount: 'invalid' },
        { date: 'invalid' },
      ]) {
        expect(
          (await app.inject({ method: 'PUT', url: `/transfers/${transfer.id}`, payload }))
            .statusCode,
        ).toBe(422);
      }
      expect(
        (
          await app.inject({
            method: 'PUT',
            url: `/transfers/${transfer.id}`,
            payload: { amount: 500 },
          })
        ).statusCode,
      ).toBe(400);
      connection
        .getSqlite()
        .prepare("UPDATE accounts SET currency='USD',exchange_rate=20 WHERE id=?")
        .run(destinationId);
      expect(
        (
          await app.inject({
            method: 'PUT',
            url: `/transfers/${transfer.id}`,
            payload: { name: 'New' },
          })
        ).statusCode,
      ).toBe(400);
      const response = await app.inject({
        method: 'PUT',
        url: `/transfers/${transfer.id}`,
        payload: { destinationAmount: 0.5 },
      });
      expect(response.statusCode).toBe(200);
      expect(response.json().data.destinationAmount).toBe(0.5);
      connection
        .getSqlite()
        .prepare("UPDATE accounts SET currency='MXN',exchange_rate=1 WHERE id=?")
        .run(destinationId);
      expect(
        TransferService.update(transfer.id, userId, { name: 'Same currency' }).destinationAmount,
      ).toBeNull();
    } finally {
      await app.close();
    }
  });

  it('excludes the old transfer when checking funds and rejects inactive accounts', () => {
    const transfer = createTransfer();
    expect(TransferService.update(transfer.id, userId, { amount: 100 }).amount).toBe(100);
    connection
      .getSqlite()
      .prepare("UPDATE accounts SET status='Inactivo' WHERE id=?")
      .run(destinationId);
    expect(() => TransferService.update(transfer.id, userId, { name: 'Inactive' })).toThrow();
  });

  it('requires a new conversion when changing a cross-currency leg or amount', () => {
    connection
      .getSqlite()
      .prepare("UPDATE accounts SET currency='USD',exchange_rate=20 WHERE id=?")
      .run(destinationId);
    const transfer = TransferService.create(userId, {
      name: 'FX',
      amount: 20,
      destinationAmount: 1,
      date,
      sourceAccountId: sourceId,
      destinationAccountId: destinationId,
    });
    expect(() => TransferService.update(transfer.id, userId, { amount: 40 })).toThrow();
    expect(
      TransferService.update(transfer.id, userId, { amount: 40, destinationAmount: 2 })
        .destinationAmount,
    ).toBe(2);
  });

  it('keeps split amounts consistent and attributes converted spending to split categories', () => {
    connection
      .getSqlite()
      .prepare("UPDATE accounts SET currency='USD',exchange_rate=20 WHERE id=?")
      .run(sourceId);
    const transaction = TransactionService.create(userId, {
      name: 'Split',
      amount: 100,
      type: TransactionType.Gasto,
      date,
      accountId: sourceId,
      categoryId,
    });
    TransactionService.split(transaction.id, userId, [
      { categoryId, amount: 25 },
      { categoryId: otherCategoryId, amount: 75 },
    ]);
    expect(() => TransactionService.update(transaction.id, userId, { amount: 200 })).toThrow();
    expect(TransactionService.getById(transaction.id, userId)?.amount).toBe(100);
    const budget = BudgetService.create(userId, {
      name: 'Budget',
      period: BudgetPeriod.Mensual,
      startDate: '2026-11-01',
      categories: [
        { categoryId, allocated: 1000 },
        { categoryId: otherCategoryId, allocated: 1000 },
      ],
    });
    expect(budget.categories.find((c) => c.categoryId === categoryId)?.spent).toBe(500);
    expect(budget.categories.find((c) => c.categoryId === otherCategoryId)?.spent).toBe(1500);
  });

  it('reports split and unsplit transactions once in base currency', async () => {
    connection
      .getSqlite()
      .prepare("UPDATE accounts SET currency='USD',exchange_rate=20 WHERE id=?")
      .run(sourceId);
    const transaction = TransactionService.create(userId, {
      name: 'Split',
      amount: 100,
      type: TransactionType.Gasto,
      date,
      accountId: sourceId,
      categoryId,
    });
    TransactionService.split(transaction.id, userId, [
      { categoryId: otherCategoryId, amount: 100 },
    ]);
    TransactionService.create(userId, {
      name: 'Local',
      amount: 30,
      type: TransactionType.Gasto,
      date,
      accountId: destinationId,
      categoryId,
    });
    const analysis = await CategoryService.getAnalysis(userId, {
      startDate: '2026-11-01',
      endDate: '2026-11-30',
    });
    expect(analysis.map((c) => [c.categoryId, c.total])).toEqual([
      [otherCategoryId, 2000],
      [categoryId, 30],
    ]);
  });

  it('reopens a completed goal when increasing its target and preserves surplus when lowering it', () => {
    const goal = GoalService.create(userId, {
      name: 'Goal',
      targetAmount: 100,
      type: 'Lista de Deseos',
    });
    GoalService.fund(goal.id, userId, { amount: 100 });
    expect(GoalService.update(goal.id, userId, { targetAmount: 200 }).status).toBe('Activa');
    expect(GoalService.fund(goal.id, userId, { amount: 10 }).savedAmount).toBe(110);
    expect(GoalService.update(goal.id, userId, { targetAmount: 50 }).status).toBe('Completada');
    expect(GoalService.getById(goal.id, userId)?.savedAmount).toBe(110);
    expect(() => GoalService.fund(goal.id, userId, { amount: 10 })).toThrow();
  });

  it('rolls back a loan payment when updating its balance fails', () => {
    const loan = LoanService.create(userId, {
      name: 'Loan',
      principal: 100,
      interestRate: 0,
      term: 12,
      startDate: date,
    });
    connection
      .getSqlite()
      .exec(
        "CREATE TRIGGER fail_loan BEFORE UPDATE ON loans BEGIN SELECT RAISE(ABORT, 'injected failure'); END",
      );
    expect(() =>
      LoanService.recordPayment(loan.id, userId, { amount: 10, principal: 10, interest: 0, date }),
    ).toThrow();
    expect(LoanService.listPayments(loan.id, userId)).toHaveLength(0);
    expect(LoanService.getById(loan.id, userId).remainingAmount).toBe(100);
  });
});

describe('restore regression coverage', () => {
  function backupWithFile() {
    const backup = BackupService.export(userId);
    backup.data.attachments.push({
      id: 1,
      filename: 'receipt.txt',
      mimeType: 'text/plain',
      fileBase64: Buffer.from('receipt').toString('base64'),
      size: 7,
    });
    return backup;
  }
  it('rolls back replacement when attachment files cannot be written', () => {
    const backup = backupWithFile();
    fs.writeFileSync(path.join(directory, 'attachments'), 'obstruction');
    expect(() => BackupService.import(userId, backup, true)).toThrow();
    expect(connection.getSqlite().prepare('SELECT id FROM accounts ORDER BY id').all()).toEqual([
      { id: sourceId },
      { id: destinationId },
    ]);
    expect(fs.readFileSync(path.join(directory, 'attachments'), 'utf8')).toBe('obstruction');
  });
  it('cleans promoted attachment files after a later SQL error', () => {
    const backup = backupWithFile();
    connection
      .getSqlite()
      .exec(
        "CREATE TRIGGER fail_attachment BEFORE INSERT ON attachments BEGIN SELECT RAISE(ABORT, 'injected failure'); END",
      );
    expect(() => BackupService.import(userId, backup, true)).toThrow();
    expect(fs.readdirSync(path.join(directory, 'attachments'))).toEqual([]);
    expect(connection.getSqlite().prepare('SELECT id FROM accounts ORDER BY id').all()).toEqual([
      { id: sourceId },
      { id: destinationId },
    ]);
  });
  it('restores attachment contents and warns when a backup contains metadata only', () => {
    const backup = backupWithFile();
    BackupService.import(userId, backup, true);
    const attachment = connection.getSqlite().prepare('SELECT path FROM attachments').get() as {
      path: string;
    };
    expect(fs.readFileSync(attachment.path, 'utf8')).toBe('receipt');
    (backup.data.attachments[0] as Record<string, unknown>)['fileBase64'] = null;
    expect(BackupService.previewImport(userId, backup).warnings).toEqual(
      expect.arrayContaining([expect.stringContaining('adjunto')]),
    );
  });
  it('rejects a snapshot truncated after its SQLite header without replacing live data', async () => {
    fs.mkdirSync(path.join(directory, 'backups'));
    const name = 'homeledger-truncated.db.gz';
    fs.writeFileSync(
      path.join(directory, 'backups', name),
      gzipSync(Buffer.from('SQLite format 3\0broken')),
    );
    await expect(SnapshotService.restoreSnapshot(name)).rejects.toThrow();
    expect(connection.getSqlite().prepare('SELECT id FROM users').all()).toEqual([{ id: userId }]);
  });
  it('restores a validated snapshot and retains a safety copy', async () => {
    const snapshot = await SnapshotService.createSnapshot();
    connection.getSqlite().prepare("UPDATE users SET name='After snapshot' WHERE id=?").run(userId);
    await SnapshotService.restoreSnapshot(snapshot.name);
    expect(connection.getSqlite().prepare('SELECT name FROM users').get()).toEqual({
      name: 'Audit',
    });
    expect(fs.existsSync(path.join(directory, 'homeledger.db.pre-restore'))).toBe(true);
  });
  it('aborts before replacement if the safety copy fails', async () => {
    const snapshot = await SnapshotService.createSnapshot();
    connection.getSqlite().prepare("UPDATE users SET name='Keep me' WHERE id=?").run(userId);
    const copy = vi.spyOn(fs, 'copyFileSync').mockImplementation(() => {
      throw new Error('injected copy failure');
    });
    try {
      await expect(SnapshotService.restoreSnapshot(snapshot.name)).rejects.toThrow(
        'injected copy failure',
      );
    } finally {
      copy.mockRestore();
    }
    expect(connection.getSqlite().prepare('SELECT name FROM users').get()).toEqual({
      name: 'Keep me',
    });
  });
  it('recovers the previous database if reopening the replacement fails', async () => {
    const snapshot = await SnapshotService.createSnapshot();
    connection.getSqlite().prepare("UPDATE users SET name='Recover me' WHERE id=?").run(userId);
    const initialize = vi.spyOn(connection, 'initializeDatabase').mockImplementationOnce(() => {
      throw new Error('injected migration failure');
    });
    try {
      await expect(SnapshotService.restoreSnapshot(snapshot.name)).rejects.toThrow(
        'injected migration failure',
      );
    } finally {
      initialize.mockRestore();
    }
    expect(connection.getSqlite().prepare('SELECT name FROM users').get()).toEqual({
      name: 'Recover me',
    });
  });
});
