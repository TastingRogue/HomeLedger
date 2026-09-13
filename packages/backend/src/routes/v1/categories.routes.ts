import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { CategoryService, CategoryError } from '../../services/category.service.js';
import { createCategorySchema, updateCategorySchema, createSubcategorySchema } from '../../validators/category.schema.js';
import { getDb } from '../../db/connection.js';
import { subcategories, categories } from '../../db/schema.js';
import { eq, and } from 'drizzle-orm';
import type { TokenPayload } from '../../services/auth.service.js';

/**
 * Maps CategoryError codes to HTTP status codes.
 * CATEGORY_NOT_FOUND → 404
 * DUPLICATE_CATEGORY_NAME → 409
 * CATEGORY_HAS_TRANSACTIONS → 400
 * CATEGORY_NAME_EMPTY → 400
 * CATEGORY_NAME_TOO_LONG → 400
 */
function handleCategoryError(error: CategoryError, reply: FastifyReply): FastifyReply {
  let statusCode: number;

  switch (error.code) {
    case 'CATEGORY_NOT_FOUND':
      statusCode = 404;
      break;
    case 'DUPLICATE_CATEGORY_NAME':
      statusCode = 409;
      break;
    case 'CATEGORY_HAS_TRANSACTIONS':
    case 'CATEGORY_NAME_EMPTY':
    case 'CATEGORY_NAME_TOO_LONG':
      statusCode = 400;
      break;
    default:
      statusCode = 400;
  }

  return reply.status(statusCode).send({
    success: false,
    error: {
      code: error.code,
      message: error.message,
    },
  });
}

/**
 * Registers category API routes.
 * All routes require authentication (handled by global auth middleware).
 *
 * Prefix: /api/v1/categories (applied when registering this plugin)
 *
 * Requirements: 10.4, 10.5
 */
export async function categoryRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /api/v1/categories
   * List all categories with subcategories for the authenticated user.
   */
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const categoriesList = await CategoryService.list(user.userId);

    return reply.status(200).send({
      success: true,
      data: categoriesList,
    });
  });

  /**
   * GET /api/v1/categories/analysis
   * Get category expense analysis with optional date range.
   * Query params: startDate (ISO date), endDate (ISO date)
   */
  app.get('/analysis', async (request: FastifyRequest<{ Querystring: { startDate?: string; endDate?: string } }>, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const { startDate, endDate } = request.query;

    const dateRange = startDate && endDate
      ? { startDate, endDate }
      : undefined;

    const analysis = await CategoryService.getAnalysis(user.userId, dateRange);

    return reply.status(200).send({
      success: true,
      data: analysis,
    });
  });

  /**
   * POST /api/v1/categories
   * Create a new category.
   */
  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as TokenPayload;

    const parsed = createCategorySchema.parse(request.body);

    try {
      const category = await CategoryService.create(user.userId, parsed);

      return reply.status(201).send({
        success: true,
        data: category,
      });
    } catch (error) {
      if (error instanceof CategoryError) {
        return handleCategoryError(error, reply);
      }
      throw error;
    }
  });

  /**
   * PUT /api/v1/categories/:id
   * Edit an existing category.
   */
  app.put('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const id = parseInt(request.params.id, 10);

    if (isNaN(id)) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_PARAM',
          message: 'El ID de la categoría debe ser un número válido',
        },
      });
    }

    const parsed = updateCategorySchema.parse(request.body);

    try {
      const updated = await CategoryService.update(id, user.userId, parsed);

      return reply.status(200).send({
        success: true,
        data: updated,
      });
    } catch (error) {
      if (error instanceof CategoryError) {
        return handleCategoryError(error, reply);
      }
      throw error;
    }
  });

  /**
   * DELETE /api/v1/categories/:id
   * Delete a category (only if unused - no transactions associated).
   */
  app.delete('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const id = parseInt(request.params.id, 10);

    if (isNaN(id)) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_PARAM',
          message: 'El ID de la categoría debe ser un número válido',
        },
      });
    }

    try {
      // Ownership is enforced inside the service (scoped by userId).
      await CategoryService.delete(id, user.userId);

      return reply.status(200).send({
        success: true,
        data: { message: 'Categoría eliminada exitosamente' },
      });
    } catch (error) {
      if (error instanceof CategoryError) {
        return handleCategoryError(error, reply);
      }
      throw error;
    }
  });

  /**
   * POST /api/v1/categories/:id/subcategories
   * Create a subcategory for a given category.
   */
  app.post('/:id/subcategories', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = request.user as TokenPayload;
    const categoryId = parseInt(request.params.id, 10);

    if (isNaN(categoryId)) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_PARAM',
          message: 'El ID de la categoría debe ser un número válido',
        },
      });
    }

    const parsed = createSubcategorySchema.parse(request.body);

    // Verify the parent category exists and belongs to the user.
    const db = getDb();
    const category = db
      .select()
      .from(categories)
      .where(and(eq(categories.id, categoryId), eq(categories.userId, user.userId)))
      .get();

    if (!category) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'CATEGORY_NOT_FOUND',
          message: 'Categoría no encontrada',
        },
      });
    }

    // Check for duplicate subcategory name within the same category
    const existingSubcategory = db
      .select()
      .from(subcategories)
      .where(
        and(
          eq(subcategories.categoryId, categoryId),
          eq(subcategories.name, parsed.name)
        )
      )
      .get();

    if (existingSubcategory) {
      return reply.status(409).send({
        success: false,
        error: {
          code: 'DUPLICATE_SUBCATEGORY_NAME',
          message: 'Ya existe una subcategoría con ese nombre en esta categoría',
        },
      });
    }

    const now = new Date().toISOString();

    const subcategory = db
      .insert(subcategories)
      .values({
        categoryId,
        name: parsed.name,
        createdAt: now,
      })
      .returning()
      .get();

    return reply.status(201).send({
      success: true,
      data: subcategory,
    });
  });

  /**
   * DELETE /api/v1/categories/:id/subcategories/:subId
   * Delete a subcategory. Verifies the parent category is accessible by the user
   * and the subcategory belongs to it. Transactions referencing it have their
   * subcategoryId set to null (FK onDelete: 'set null').
   */
  app.delete('/:id/subcategories/:subId', async (
    request: FastifyRequest<{ Params: { id: string; subId: string } }>,
    reply: FastifyReply,
  ) => {
    const user = request.user as TokenPayload;
    const categoryId = parseInt(request.params.id, 10);
    const subId = parseInt(request.params.subId, 10);
    if (isNaN(categoryId) || isNaN(subId)) {
      return reply.status(400).send({ success: false, error: { code: 'INVALID_PARAM', message: 'ID inválido' } });
    }

    const db = getDb();
    // Parent category must be accessible (system or owned by the user).
    const category = db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.id, categoryId), eq(categories.userId, user.userId)))
      .get();
    if (!category) {
      return reply.status(404).send({ success: false, error: { code: 'CATEGORY_NOT_FOUND', message: 'Categoría no encontrada' } });
    }

    // Subcategory must belong to that category.
    const sub = db
      .select({ id: subcategories.id })
      .from(subcategories)
      .where(and(eq(subcategories.id, subId), eq(subcategories.categoryId, categoryId)))
      .get();
    if (!sub) {
      return reply.status(404).send({ success: false, error: { code: 'SUBCATEGORY_NOT_FOUND', message: 'Subcategoría no encontrada' } });
    }

    db.delete(subcategories).where(eq(subcategories.id, subId)).run();
    return reply.status(200).send({ success: true, data: { message: 'Subcategoría eliminada' } });
  });
}
