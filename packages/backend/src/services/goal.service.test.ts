import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { GoalService, GoalError } from './goal.service.js';
import { getDb, getSqlite, closeDatabase } from '../db/connection.js';
import { users, goals } from '../db/schema.js';
import fs from 'node:fs';
import path from 'node:path';

process.env['DATA_DIR'] = './data/test-goal';

describe('GoalService', () => {
  let userId: number;

  beforeAll(() => {
    const sqlite = getSqlite();
    sqlite.exec(`
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

      CREATE TABLE IF NOT EXISTS goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        target_amount REAL NOT NULL,
        saved_amount REAL NOT NULL DEFAULT 0,
        type TEXT NOT NULL,
        deadline TEXT,
        status TEXT NOT NULL DEFAULT 'Activa',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS goals_user_id_idx ON goals(user_id);
      CREATE INDEX IF NOT EXISTS goals_user_id_status_idx ON goals(user_id, status);
    `);
  });

  beforeEach(() => {
    const db = getDb();
    db.delete(goals).run();
    db.delete(users).run();

    const now = new Date().toISOString();
    const user = db
      .insert(users)
      .values({
        email: 'test@test.com',
        passwordHash: 'hashed',
        name: 'Test User',
        role: 'user',
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();
    userId = user.id;
  });

  afterAll(() => {
    closeDatabase();
    const dbPath = path.resolve('./data/test-goal/smart-finance.db');
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    const walPath = dbPath + '-wal';
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
    const shmPath = dbPath + '-shm';
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
    const dir = path.resolve('./data/test-goal');
    if (fs.existsSync(dir)) fs.rmdirSync(dir);
  });

  describe('create()', () => {
    it('should create a goal with savedAmount=0 and status Activa', () => {
      const result = GoalService.create(userId, {
        name: 'Moto Chopper',
        targetAmount: 50000,
        type: 'Lista de Deseos' as any,
      });

      expect(result.id).toBeDefined();
      expect(result.name).toBe('Moto Chopper');
      expect(result.targetAmount).toBe(50000);
      expect(result.savedAmount).toBe(0);
      expect(result.type).toBe('Lista de Deseos');
      expect(result.status).toBe('Activa');
      expect(result.progress).toBe(0);
    });

    it('should create a Deuda type goal', () => {
      const result = GoalService.create(userId, {
        name: 'Pagar Pr�stamo',
        targetAmount: 10000,
        type: 'Deuda' as any,
      });

      expect(result.type).toBe('Deuda');
      expect(result.savedAmount).toBe(0);
    });

    it('should create a goal with optional deadline', () => {
      const result = GoalService.create(userId, {
        name: 'Vacaciones',
        targetAmount: 25000,
        type: 'Lista de Deseos' as any,
        deadline: '2025-12-31T00:00:00.000Z',
      });

      expect(result.deadline).toBe('2025-12-31T00:00:00.000Z');
    });

    it('should throw error for invalid goal type', () => {
      expect(() =>
        GoalService.create(userId, {
          name: 'Invalid',
          targetAmount: 1000,
          type: 'InvalidType' as any,
        })
      ).toThrow(GoalError);
    });
  });

  describe('fund()', () => {
    it('should increment savedAmount by the funded amount', () => {
      const goal = GoalService.create(userId, {
        name: 'Meta Test',
        targetAmount: 10000,
        type: 'Lista de Deseos' as any,
      });

      const result = GoalService.fund(goal.id, userId, { amount: 2500 });

      expect(result.savedAmount).toBe(2500);
      expect(result.progress).toBe(25);
      expect(result.fundedAmount).toBe(2500);
      expect(result.status).toBe('Activa');
    });

    it('should cap funded amount at targetAmount - savedAmount', () => {
      const goal = GoalService.create(userId, {
        name: 'Meta Cap',
        targetAmount: 5000,
        type: 'Lista de Deseos' as any,
      });

      // Fund with more than the target
      const result = GoalService.fund(goal.id, userId, { amount: 8000 });

      expect(result.savedAmount).toBe(5000);
      expect(result.fundedAmount).toBe(5000);
      expect(result.progress).toBe(100);
    });

    it('should set status to Completada when reaching 100%', () => {
      const goal = GoalService.create(userId, {
        name: 'Meta Completar',
        targetAmount: 1000,
        type: 'Deuda' as any,
      });

      const result = GoalService.fund(goal.id, userId, { amount: 1000 });

      expect(result.status).toBe('Completada');
      expect(result.progress).toBe(100);
      expect(result.savedAmount).toBe(1000);
    });

    it('should cap partial funding when remaining is less than requested', () => {
      const goal = GoalService.create(userId, {
        name: 'Meta Parcial',
        targetAmount: 1000,
        type: 'Lista de Deseos' as any,
      });

      // First fund 800
      GoalService.fund(goal.id, userId, { amount: 800 });

      // Try to fund 500 more (only 200 remaining)
      const result = GoalService.fund(goal.id, userId, { amount: 500 });

      expect(result.savedAmount).toBe(1000);
      expect(result.fundedAmount).toBe(200);
      expect(result.status).toBe('Completada');
    });

    it('should throw error when goal is already completed', () => {
      const goal = GoalService.create(userId, {
        name: 'Meta Completada',
        targetAmount: 100,
        type: 'Lista de Deseos' as any,
      });

      GoalService.fund(goal.id, userId, { amount: 100 });

      expect(() =>
        GoalService.fund(goal.id, userId, { amount: 50 })
      ).toThrow('La meta ya est� completada');
    });

    it('should throw error for non-existent goal', () => {
      expect(() =>
        GoalService.fund(99999, userId, { amount: 100 })
      ).toThrow(GoalError);
    });
  });

  describe('withdraw()', () => {
    it('should decrement savedAmount by the withdrawn amount', () => {
      const goal = GoalService.create(userId, {
        name: 'Meta Retiro',
        targetAmount: 10000,
        type: 'Lista de Deseos' as any,
      });

      GoalService.fund(goal.id, userId, { amount: 5000 });
      const result = GoalService.withdraw(goal.id, userId, { amount: 2000 });

      expect(result.savedAmount).toBe(3000);
      expect(result.withdrawnAmount).toBe(2000);
      expect(result.progress).toBe(30);
    });

    it('should cap withdrawal at savedAmount (floor of 0)', () => {
      const goal = GoalService.create(userId, {
        name: 'Meta Floor',
        targetAmount: 10000,
        type: 'Lista de Deseos' as any,
      });

      GoalService.fund(goal.id, userId, { amount: 3000 });

      // Try to withdraw more than saved
      const result = GoalService.withdraw(goal.id, userId, { amount: 5000 });

      expect(result.savedAmount).toBe(0);
      expect(result.withdrawnAmount).toBe(3000);
      expect(result.progress).toBe(0);
    });

    it('should revert status to Activa when withdrawing from a completed goal', () => {
      const goal = GoalService.create(userId, {
        name: 'Meta Revertir',
        targetAmount: 1000,
        type: 'Lista de Deseos' as any,
      });

      GoalService.fund(goal.id, userId, { amount: 1000 });

      // Withdraw to drop below 100%
      const result = GoalService.withdraw(goal.id, userId, { amount: 100 });

      expect(result.status).toBe('Activa');
      expect(result.savedAmount).toBe(900);
      expect(result.progress).toBe(90);
    });

    it('should throw error for non-existent goal', () => {
      expect(() =>
        GoalService.withdraw(99999, userId, { amount: 100 })
      ).toThrow(GoalError);
    });

    it('should handle withdrawing 0 effectively when savedAmount is 0', () => {
      const goal = GoalService.create(userId, {
        name: 'Meta Vac�a',
        targetAmount: 10000,
        type: 'Lista de Deseos' as any,
      });

      const result = GoalService.withdraw(goal.id, userId, { amount: 500 });

      expect(result.savedAmount).toBe(0);
      expect(result.withdrawnAmount).toBe(0);
    });
  });

  describe('calculateProgress()', () => {
    it('should calculate progress as percentage', () => {
      expect(GoalService.calculateProgress(5000, 10000)).toBe(50);
      expect(GoalService.calculateProgress(2500, 10000)).toBe(25);
      expect(GoalService.calculateProgress(7500, 10000)).toBe(75);
    });

    it('should cap progress at 100%', () => {
      expect(GoalService.calculateProgress(15000, 10000)).toBe(100);
      expect(GoalService.calculateProgress(10000, 10000)).toBe(100);
    });

    it('should return 0 for zero savedAmount', () => {
      expect(GoalService.calculateProgress(0, 10000)).toBe(0);
    });

    it('should return 0 if targetAmount is 0 or negative', () => {
      expect(GoalService.calculateProgress(100, 0)).toBe(0);
      expect(GoalService.calculateProgress(100, -5)).toBe(0);
    });
  });

  describe('list()', () => {
    it('should return all goals for a user', () => {
      GoalService.create(userId, {
        name: 'Meta 1',
        targetAmount: 1000,
        type: 'Lista de Deseos' as any,
      });
      GoalService.create(userId, {
        name: 'Meta 2',
        targetAmount: 2000,
        type: 'Deuda' as any,
      });

      const result = GoalService.list(userId);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no goals exist', () => {
      const result = GoalService.list(userId);
      expect(result).toHaveLength(0);
    });

    it('should include progress field in results', () => {
      const goal = GoalService.create(userId, {
        name: 'Meta Progreso',
        targetAmount: 10000,
        type: 'Lista de Deseos' as any,
      });
      GoalService.fund(goal.id, userId, { amount: 3000 });

      const result = GoalService.list(userId);
      expect(result[0]!.progress).toBe(30);
    });
  });

  describe('getById()', () => {
    it('should return a goal by id', () => {
      const created = GoalService.create(userId, {
        name: 'Find Me',
        targetAmount: 5000,
        type: 'Lista de Deseos' as any,
      });

      const found = GoalService.getById(created.id, userId);
      expect(found).not.toBeNull();
      expect(found!.name).toBe('Find Me');
      expect(found!.progress).toBe(0);
    });

    it('should return null for non-existent goal', () => {
      const found = GoalService.getById(99999, userId);
      expect(found).toBeNull();
    });
  });

  describe('update()', () => {
    it('should update goal name', () => {
      const goal = GoalService.create(userId, {
        name: 'Original',
        targetAmount: 5000,
        type: 'Lista de Deseos' as any,
      });

      const result = GoalService.update(goal.id, userId, { name: 'Actualizada' });
      expect(result.name).toBe('Actualizada');
    });

    it('should update targetAmount', () => {
      const goal = GoalService.create(userId, {
        name: 'Meta',
        targetAmount: 5000,
        type: 'Lista de Deseos' as any,
      });

      const result = GoalService.update(goal.id, userId, { targetAmount: 8000 });
      expect(result.targetAmount).toBe(8000);
    });

    it('should throw error for non-existent goal', () => {
      expect(() =>
        GoalService.update(99999, userId, { name: 'No Existe' })
      ).toThrow(GoalError);
    });
  });
});
