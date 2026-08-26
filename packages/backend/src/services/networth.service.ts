import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { getDb } from '../db/connection.js';
import { accounts, assets, liabilities, networthSnapshots } from '../db/schema.js';
import { AccountService } from './account.service.js';

/**
 * Error personalizado para operaciones de patrimonio neto.
 */
export class NetWorthError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'NetWorthError';
    this.code = code;
  }
}

/**
 * Interfaces de entrada para creación/actualización de activos.
 */
export interface CreateAssetInput {
  name: string;
  value: number;
  type: string;
  notes?: string | null;
}

export interface UpdateAssetInput {
  name?: string;
  value?: number;
  type?: string;
  notes?: string | null;
}

/**
 * Interfaces de entrada para creación/actualización de pasivos.
 */
export interface CreateLiabilityInput {
  name: string;
  balance: number;
  type: string;
  notes?: string | null;
}

export interface UpdateLiabilityInput {
  name?: string;
  balance?: number;
  type?: string;
  notes?: string | null;
}

/**
 * Rango de fechas para consultar historial.
 */
export interface DateRange {
  startDate: string;
  endDate: string;
}

/**
 * Servicio de gestión de patrimonio neto.
 * Calcula el patrimonio neto actual basado en cuentas activas, activos y pasivos.
 * Provee historial de snapshots y CRUD para activos y pasivos.
 *
 * Fórmula: netWorth = sum(active account balances) + sum(asset values) - sum(liability balances)
 */
export class NetWorthService {
  /**
   * Calcula el patrimonio neto actual del usuario.
   * total = sum(balances de cuentas activas) + sum(valores de activos) - sum(balances de pasivos)
   *
   * Utiliza AccountService.calculateBalance() para cada cuenta activa.
   */
  static async getCurrent(userId: number) {
    const db = getDb();

    // Obtener todas las cuentas activas del usuario
    const activeAccounts = db
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(eq(accounts.userId, userId), eq(accounts.status, 'Activo')))
      .all();

    // Calcular balance de cada cuenta activa
    let totalAccountBalances = 0;
    for (const account of activeAccounts) {
      const balance = await AccountService.calculateBalance(account.id);
      totalAccountBalances += balance;
    }

    // Sumar valores de todos los activos del usuario
    const assetSumResult = db
      .select({ total: sql<number>`COALESCE(SUM(${assets.value}), 0)` })
      .from(assets)
      .where(eq(assets.userId, userId))
      .get();

    const totalAssetValues = assetSumResult?.total ?? 0;

    // Sumar balances de todos los pasivos del usuario
    const liabilitySumResult = db
      .select({ total: sql<number>`COALESCE(SUM(${liabilities.balance}), 0)` })
      .from(liabilities)
      .where(eq(liabilities.userId, userId))
      .get();

    const totalLiabilityBalances = liabilitySumResult?.total ?? 0;

    // Patrimonio neto = cuentas activas + activos - pasivos
    const totalAssets = totalAccountBalances + totalAssetValues;
    const netWorth = totalAssets - totalLiabilityBalances;

    // Obtener lista de activos y pasivos para el resumen
    const userAssets = db
      .select()
      .from(assets)
      .where(eq(assets.userId, userId))
      .all();

    const userLiabilities = db
      .select()
      .from(liabilities)
      .where(eq(liabilities.userId, userId))
      .all();

    return {
      totalAssets,
      totalLiabilities: totalLiabilityBalances,
      netWorth,
      accountBalances: totalAccountBalances,
      assetValues: totalAssetValues,
      assets: userAssets,
      liabilities: userLiabilities,
    };
  }

  /**
   * Obtiene el historial de patrimonio neto del usuario dentro de un rango de fechas.
   * Consulta la tabla networthSnapshots ordenada por fecha ascendente.
   */
  static getHistory(userId: number, range: DateRange) {
    const db = getDb();

    const snapshots = db
      .select()
      .from(networthSnapshots)
      .where(
        and(
          eq(networthSnapshots.userId, userId),
          gte(networthSnapshots.date, range.startDate),
          lte(networthSnapshots.date, range.endDate)
        )
      )
      .orderBy(networthSnapshots.date)
      .all();

    return snapshots;
  }

  // ============================================
  // CRUD DE ACTIVOS
  // ============================================

  /**
   * Crea un nuevo activo para el usuario.
   *
   * @throws NetWorthError si los campos obligatorios no son válidos
   */
  static createAsset(userId: number, input: CreateAssetInput) {
    const db = getDb();

    if (!input.name || input.name.trim().length === 0) {
      throw new NetWorthError(
        'El nombre del activo es obligatorio',
        'ASSET_NAME_REQUIRED'
      );
    }

    if (input.value === undefined || input.value === null) {
      throw new NetWorthError(
        'El valor del activo es obligatorio',
        'ASSET_VALUE_REQUIRED'
      );
    }

    if (!input.type || input.type.trim().length === 0) {
      throw new NetWorthError(
        'El tipo del activo es obligatorio',
        'ASSET_TYPE_REQUIRED'
      );
    }

    const now = new Date().toISOString();

    const result = db
      .insert(assets)
      .values({
        userId,
        name: input.name.trim(),
        value: input.value,
        type: input.type,
        notes: input.notes ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();

    return result;
  }

  /**
   * Actualiza un activo existente.
   *
   * @throws NetWorthError si el activo no existe
   */
  static updateAsset(id: number, userId: number, input: UpdateAssetInput) {
    const db = getDb();

    const existing = db
      .select()
      .from(assets)
      .where(and(eq(assets.id, id), eq(assets.userId, userId)))
      .get();

    if (!existing) {
      throw new NetWorthError('Activo no encontrado', 'ASSET_NOT_FOUND');
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (input.name !== undefined) {
      if (input.name.trim().length === 0) {
        throw new NetWorthError(
          'El nombre del activo no puede estar vacío',
          'ASSET_NAME_REQUIRED'
        );
      }
      updateData['name'] = input.name.trim();
    }

    if (input.value !== undefined) {
      updateData['value'] = input.value;
    }

    if (input.type !== undefined) {
      if (input.type.trim().length === 0) {
        throw new NetWorthError(
          'El tipo del activo no puede estar vacío',
          'ASSET_TYPE_REQUIRED'
        );
      }
      updateData['type'] = input.type;
    }

    if (input.notes !== undefined) {
      updateData['notes'] = input.notes ?? null;
    }

    const result = db
      .update(assets)
      .set(updateData)
      .where(eq(assets.id, id))
      .returning()
      .get();

    return result;
  }

  /**
   * Elimina un activo.
   *
   * @throws NetWorthError si el activo no existe
   */
  static deleteAsset(id: number, userId: number) {
    const db = getDb();

    const existing = db
      .select()
      .from(assets)
      .where(and(eq(assets.id, id), eq(assets.userId, userId)))
      .get();

    if (!existing) {
      throw new NetWorthError('Activo no encontrado', 'ASSET_NOT_FOUND');
    }

    db.delete(assets).where(eq(assets.id, id)).run();

    return { deleted: true, id };
  }

  /**
   * Lista todos los activos de un usuario.
   */
  static listAssets(userId: number) {
    const db = getDb();

    return db
      .select()
      .from(assets)
      .where(eq(assets.userId, userId))
      .all();
  }

  /**
   * Obtiene un activo por su ID.
   * Retorna null si no existe.
   */
  static getAssetById(id: number, userId: number) {
    const db = getDb();

    return db
      .select()
      .from(assets)
      .where(and(eq(assets.id, id), eq(assets.userId, userId)))
      .get() ?? null;
  }

  // ============================================
  // CRUD DE PASIVOS
  // ============================================

  /**
   * Crea un nuevo pasivo para el usuario.
   *
   * @throws NetWorthError si los campos obligatorios no son válidos
   */
  static createLiability(userId: number, input: CreateLiabilityInput) {
    const db = getDb();

    if (!input.name || input.name.trim().length === 0) {
      throw new NetWorthError(
        'El nombre del pasivo es obligatorio',
        'LIABILITY_NAME_REQUIRED'
      );
    }

    if (input.balance === undefined || input.balance === null) {
      throw new NetWorthError(
        'El balance del pasivo es obligatorio',
        'LIABILITY_BALANCE_REQUIRED'
      );
    }

    if (!input.type || input.type.trim().length === 0) {
      throw new NetWorthError(
        'El tipo del pasivo es obligatorio',
        'LIABILITY_TYPE_REQUIRED'
      );
    }

    const now = new Date().toISOString();

    const result = db
      .insert(liabilities)
      .values({
        userId,
        name: input.name.trim(),
        balance: input.balance,
        type: input.type,
        notes: input.notes ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();

    return result;
  }

  /**
   * Actualiza un pasivo existente.
   *
   * @throws NetWorthError si el pasivo no existe
   */
  static updateLiability(id: number, userId: number, input: UpdateLiabilityInput) {
    const db = getDb();

    const existing = db
      .select()
      .from(liabilities)
      .where(and(eq(liabilities.id, id), eq(liabilities.userId, userId)))
      .get();

    if (!existing) {
      throw new NetWorthError('Pasivo no encontrado', 'LIABILITY_NOT_FOUND');
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (input.name !== undefined) {
      if (input.name.trim().length === 0) {
        throw new NetWorthError(
          'El nombre del pasivo no puede estar vacío',
          'LIABILITY_NAME_REQUIRED'
        );
      }
      updateData['name'] = input.name.trim();
    }

    if (input.balance !== undefined) {
      updateData['balance'] = input.balance;
    }

    if (input.type !== undefined) {
      if (input.type.trim().length === 0) {
        throw new NetWorthError(
          'El tipo del pasivo no puede estar vacío',
          'LIABILITY_TYPE_REQUIRED'
        );
      }
      updateData['type'] = input.type;
    }

    if (input.notes !== undefined) {
      updateData['notes'] = input.notes ?? null;
    }

    const result = db
      .update(liabilities)
      .set(updateData)
      .where(eq(liabilities.id, id))
      .returning()
      .get();

    return result;
  }

  /**
   * Elimina un pasivo.
   *
   * @throws NetWorthError si el pasivo no existe
   */
  static deleteLiability(id: number, userId: number) {
    const db = getDb();

    const existing = db
      .select()
      .from(liabilities)
      .where(and(eq(liabilities.id, id), eq(liabilities.userId, userId)))
      .get();

    if (!existing) {
      throw new NetWorthError('Pasivo no encontrado', 'LIABILITY_NOT_FOUND');
    }

    db.delete(liabilities).where(eq(liabilities.id, id)).run();

    return { deleted: true, id };
  }

  /**
   * Lista todos los pasivos de un usuario.
   */
  static listLiabilities(userId: number) {
    const db = getDb();

    return db
      .select()
      .from(liabilities)
      .where(eq(liabilities.userId, userId))
      .all();
  }

  /**
   * Obtiene un pasivo por su ID.
   * Retorna null si no existe.
   */
  static getLiabilityById(id: number, userId: number) {
    const db = getDb();

    return db
      .select()
      .from(liabilities)
      .where(and(eq(liabilities.id, id), eq(liabilities.userId, userId)))
      .get() ?? null;
  }

  // ============================================
  // SNAPSHOTS
  // ============================================

  /**
   * Crea un snapshot del patrimonio neto actual.
   * Útil para el scheduler que genera snapshots diarios.
   */
  static async createSnapshot(userId: number) {
    const db = getDb();

    const current = await NetWorthService.getCurrent(userId);
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]!; // YYYY-MM-DD

    const result = db
      .insert(networthSnapshots)
      .values({
        userId,
        totalAssets: current.totalAssets,
        totalLiabilities: current.totalLiabilities,
        netWorth: current.netWorth,
        date: dateStr,
        createdAt: now.toISOString(),
      })
      .returning()
      .get();

    return result;
  }
}
