import { eq, and, sql, gte, lte } from 'drizzle-orm';
import { getDb } from '../db/connection.js';
import { categories, subcategories, transactions } from '../db/schema.js';

/**
 * Error personalizado para operaciones de categorías.
 */
export class CategoryError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'CategoryError';
    this.code = code;
  }
}

/**
 * Resultado de análisis por categoría.
 */
export interface CategoryAnalysisItem {
  categoryId: number;
  categoryName: string;
  total: number;
  percentage: number;
}

/**
 * Servicio de gestión de categorías y análisis de gastos.
 * Implementa lógica de negocio para listar, crear, eliminar categorías
 * y analizar gastos por categoría con cálculo de porcentajes.
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6
 */
export class CategoryService {
  /**
   * Retorna las categorías del usuario (modelo por-usuario: cada usuario tiene
   * su propio conjunto). Cada categoría incluye sus subcategorías.
   */
  static async list(userId: number) {
    const db = getDb();

    const cats = db
      .select()
      .from(categories)
      .where(eq(categories.userId, userId))
      .all();

    // Obtener subcategorías para las categorías encontradas
    const categoryIds = cats.map((c) => c.id);

    if (categoryIds.length === 0) {
      return [];
    }

    const allSubcategories = db
      .select()
      .from(subcategories)
      .where(
        sql`${subcategories.categoryId} IN (${sql.join(
          categoryIds.map((id) => sql`${id}`),
          sql`, `
        )})`
      )
      .all();

    // Agrupar subcategorías por categoryId
    const subcategoryMap = new Map<number, typeof allSubcategories>();
    for (const sub of allSubcategories) {
      const existing = subcategoryMap.get(sub.categoryId) ?? [];
      existing.push(sub);
      subcategoryMap.set(sub.categoryId, existing);
    }

    // Retornar categorías con sus subcategorías
    return cats.map((cat) => ({
      ...cat,
      subcategories: subcategoryMap.get(cat.id) ?? [],
    }));
  }

  /**
   * Crea una nueva categoría para un usuario.
   * Valida que el nombre sea único entre las categorías del usuario y las del sistema.
   * Nombre máximo: 50 caracteres.
   *
   * @throws CategoryError si el nombre está vacío, excede 50 caracteres o ya existe
   */
  static async create(userId: number, input: { name: string; icon?: string; color?: string; type?: string }) {
    const db = getDb();

    const name = input.name.trim();

    // Validar nombre no vacío
    if (!name) {
      throw new CategoryError(
        'El nombre de la categoría no puede estar vacío',
        'CATEGORY_NAME_EMPTY'
      );
    }

    // Validar longitud máxima
    if (name.length > 50) {
      throw new CategoryError(
        'El nombre de la categoría no puede exceder 50 caracteres',
        'CATEGORY_NAME_TOO_LONG'
      );
    }

    // Validar nombre único entre las categorías del usuario
    const existing = db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.name, name), eq(categories.userId, userId)))
      .get();

    if (existing) {
      throw new CategoryError(
        'Ya existe una categoría con ese nombre',
        'DUPLICATE_CATEGORY_NAME'
      );
    }

    const now = new Date().toISOString();

    const result = db
      .insert(categories)
      .values({
        userId,
        name,
        icon: input.icon ?? null,
        color: input.color ?? null,
        type: (input.type as 'Gasto' | 'Ingreso' | 'Ambos') ?? 'Ambos',
        isSystem: false,
        createdAt: now,
      })
      .returning()
      .get();

    return result;
  }

  /**
   * Actualiza una categoría del usuario (nombre, icono, color, tipo).
   * Valida que el nombre sea único entre las categorías del usuario.
   *
   * @throws CategoryError si la categoría no existe/no es del usuario, o el nombre ya existe
   */
  static async update(categoryId: number, userId: number, input: { name?: string; icon?: string | null; color?: string | null; type?: string }) {
    const db = getDb();

    // The category must exist and belong to this user (per-user model — every
    // category is owned by a user and freely editable by its owner).
    const category = db
      .select()
      .from(categories)
      .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)))
      .get();

    if (!category) {
      throw new CategoryError(
        'Categoría no encontrada',
        'CATEGORY_NOT_FOUND'
      );
    }

    // Validar nombre si se proporcionó
    if (input.name !== undefined) {
      const name = input.name.trim();

      if (!name) {
        throw new CategoryError(
          'El nombre de la categoría no puede estar vacío',
          'CATEGORY_NAME_EMPTY'
        );
      }

      if (name.length > 50) {
        throw new CategoryError(
          'El nombre de la categoría no puede exceder 50 caracteres',
          'CATEGORY_NAME_TOO_LONG'
        );
      }

      // Validar nombre único entre las categorías del usuario (excluir la actual)
      const existing = db
        .select({ id: categories.id })
        .from(categories)
        .where(and(eq(categories.name, name), eq(categories.userId, userId)))
        .get();

      if (existing && existing.id !== categoryId) {
        throw new CategoryError(
          'Ya existe una categoría con ese nombre',
          'DUPLICATE_CATEGORY_NAME'
        );
      }
    }

    // Construir los campos a actualizar
    const updateFields: Record<string, unknown> = {};
    if (input.name !== undefined) updateFields.name = input.name.trim();
    if (input.icon !== undefined) updateFields.icon = input.icon;
    if (input.color !== undefined) updateFields.color = input.color;
    if (input.type !== undefined) updateFields.type = input.type;

    if (Object.keys(updateFields).length === 0) {
      return category;
    }

    const result = db
      .update(categories)
      .set(updateFields)
      .where(eq(categories.id, categoryId))
      .returning()
      .get();

    return result;
  }

  /**
   * Elimina una categoría del usuario, solo si no tiene transacciones asociadas.
   *
   * @throws CategoryError si la categoría no existe/no es del usuario, o tiene transacciones asociadas
   */
  static async delete(categoryId: number, userId: number) {
    const db = getDb();

    // The category must exist and belong to this user.
    const category = db
      .select()
      .from(categories)
      .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)))
      .get();

    if (!category) {
      throw new CategoryError(
        'Categoría no encontrada',
        'CATEGORY_NOT_FOUND'
      );
    }

    // Verificar si existen transacciones asociadas
    const transactionCount = db
      .select({ count: sql<number>`COUNT(*)` })
      .from(transactions)
      .where(eq(transactions.categoryId, categoryId))
      .get();

    if (transactionCount && transactionCount.count > 0) {
      throw new CategoryError(
        'No se puede eliminar la categoría porque tiene transacciones asociadas',
        'CATEGORY_HAS_TRANSACTIONS'
      );
    }

    // Eliminar la categoría (las subcategorías se eliminan en cascada por FK)
    db.delete(categories)
      .where(eq(categories.id, categoryId))
      .run();
  }

  /**
   * Calcula el análisis de gastos por categoría para un rango de fechas.
   * - Suma todos los gastos (Transacciones de tipo "Gasto") por categoría
   * - Por defecto usa el mes actual (primer día al último día)
   * - Ordena por total descendente
   * - Excluye categorías con total de MX$0.00
   * - Calcula el porcentaje: (totalCategoría / totalGeneral) * 100
   */
  static async getAnalysis(
    userId: number,
    dateRange?: { startDate: string; endDate: string }
  ): Promise<CategoryAnalysisItem[]> {
    const db = getDb();

    // Determinar rango de fechas (por defecto: mes actual)
    let startDate: string;
    let endDate: string;

    if (dateRange) {
      startDate = dateRange.startDate;
      endDate = dateRange.endDate;
    } else {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      startDate = firstDay.toISOString().split('T')[0]!;
      endDate = lastDay.toISOString().split('T')[0]!;
    }

    // Consultar totales por categoría para gastos en el rango de fechas
    const results = db
      .select({
        categoryId: transactions.categoryId,
        categoryName: categories.name,
        total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
      })
      .from(transactions)
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, 'Gasto'),
          gte(transactions.date, startDate),
          lte(transactions.date, endDate + 'T23:59:59.999Z')
        )
      )
      .groupBy(transactions.categoryId, categories.name)
      .all();

    // Filtrar categorías con total > 0
    const nonZero = results.filter((r) => r.total > 0);

    // Calcular el gran total
    const grandTotal = nonZero.reduce((sum, r) => sum + r.total, 0);

    // Calcular porcentajes y ordenar por total descendente
    const analysis: CategoryAnalysisItem[] = nonZero
      .map((r) => ({
        categoryId: r.categoryId,
        categoryName: r.categoryName,
        total: r.total,
        percentage: grandTotal > 0 ? (r.total / grandTotal) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);

    return analysis;
  }
}
