import { and, eq, inArray } from 'drizzle-orm';
import { getDb, getSqlite } from '../db/connection.js';
import { tags, transactionTags, transactions } from '../db/schema.js';

/**
 * Error personalizado para operaciones de etiquetas (tags).
 */
export class TagError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'TagError';
    this.code = code;
  }
}

export interface CreateTagInput {
  name: string;
  color?: string | null;
}

/**
 * Servicio de etiquetas (P4.1 Fase 2).
 *
 * Las etiquetas son reutilizables por usuario: existe un catálogo `tags` por
 * usuario y una tabla puente `transaction_tags` (M2M) que las asocia a
 * transacciones. El nombre se normaliza (trim) y es único por usuario.
 */
export class TagService {
  /** Lista todas las etiquetas del usuario, orden alfabético. */
  static list(userId: number) {
    const db = getDb();
    return db
      .select()
      .from(tags)
      .where(eq(tags.userId, userId))
      .orderBy(tags.name)
      .all();
  }

  /**
   * Obtiene una etiqueta existente por nombre (normalizado) o la crea.
   * Idempotente: nunca duplica una etiqueta para el mismo usuario.
   */
  static getOrCreate(userId: number, name: string, color?: string | null) {
    const db = getDb();
    const normalized = name.trim();
    if (normalized.length === 0) {
      throw new TagError('El nombre de la etiqueta es obligatorio', 'TAG_NAME_REQUIRED');
    }
    if (normalized.length > 40) {
      throw new TagError('El nombre de la etiqueta no puede exceder 40 caracteres', 'TAG_NAME_TOO_LONG');
    }

    const existing = db
      .select()
      .from(tags)
      .where(and(eq(tags.userId, userId), eq(tags.name, normalized)))
      .get();
    if (existing) return existing;

    return db
      .insert(tags)
      .values({ userId, name: normalized, color: color ?? null, createdAt: new Date().toISOString() })
      .returning()
      .get();
  }

  /** Crea una etiqueta (o devuelve la existente con el mismo nombre). */
  static create(userId: number, input: CreateTagInput) {
    return TagService.getOrCreate(userId, input.name, input.color);
  }

  /**
   * Elimina una etiqueta del catálogo del usuario. La FK en cascada quita
   * automáticamente sus asociaciones en `transaction_tags`.
   */
  static delete(id: number, userId: number) {
    const db = getDb();
    const existing = db
      .select({ id: tags.id })
      .from(tags)
      .where(and(eq(tags.id, id), eq(tags.userId, userId)))
      .get();
    if (!existing) {
      throw new TagError('Etiqueta no encontrada', 'TAG_NOT_FOUND');
    }
    db.delete(tags).where(eq(tags.id, id)).run();
    return { deleted: true, id };
  }

  /** Devuelve las etiquetas asociadas a una transacción. */
  static listForTransaction(transactionId: number) {
    const db = getDb();
    return db
      .select({ id: tags.id, userId: tags.userId, name: tags.name, color: tags.color, createdAt: tags.createdAt })
      .from(transactionTags)
      .innerJoin(tags, eq(transactionTags.tagId, tags.id))
      .where(eq(transactionTags.transactionId, transactionId))
      .orderBy(tags.name)
      .all();
  }

  /**
   * Reemplaza el conjunto de etiquetas de una transacción por los nombres dados.
   * Crea las que no existan (getOrCreate). Operación atómica.
   *
   * @throws TagError si la transacción no pertenece al usuario.
   */
  static setForTransaction(transactionId: number, userId: number, tagNames: string[]) {
    const db = getDb();
    const sqlite = getSqlite();

    const tx = db
      .select({ id: transactions.id })
      .from(transactions)
      .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)))
      .get();
    if (!tx) {
      throw new TagError('La transacción no existe o no pertenece al usuario', 'TRANSACTION_NOT_FOUND');
    }

    // De-duplicate + drop empties, preserving order.
    const seen = new Set<string>();
    const names: string[] = [];
    for (const raw of tagNames) {
      const n = raw.trim();
      if (n.length === 0) continue;
      const key = n.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      names.push(n);
    }

    return sqlite.transaction(() => {
      db.delete(transactionTags).where(eq(transactionTags.transactionId, transactionId)).run();
      const attached = [];
      for (const n of names) {
        const tag = TagService.getOrCreate(userId, n);
        db.insert(transactionTags).values({ transactionId, tagId: tag.id }).run();
        attached.push(tag);
      }
      return attached;
    })();
  }

  /**
   * Attaches a single tag (by id) to a transaction. Idempotent (ignores if the
   * pair already exists). Both must belong to the user.
   */
  static attach(transactionId: number, tagId: number, userId: number) {
    const db = getDb();
    const tx = db.select({ id: transactions.id }).from(transactions)
      .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId))).get();
    if (!tx) throw new TagError('La transacción no existe o no pertenece al usuario', 'TRANSACTION_NOT_FOUND');
    const tag = db.select({ id: tags.id }).from(tags)
      .where(and(eq(tags.id, tagId), eq(tags.userId, userId))).get();
    if (!tag) throw new TagError('Etiqueta no encontrada', 'TAG_NOT_FOUND');

    const exists = db.select({ t: transactionTags.transactionId }).from(transactionTags)
      .where(and(eq(transactionTags.transactionId, transactionId), eq(transactionTags.tagId, tagId))).get();
    if (!exists) {
      db.insert(transactionTags).values({ transactionId, tagId }).run();
    }
    return { attached: true };
  }

  /** Detaches a tag from a transaction (no error if not attached). */
  static detach(transactionId: number, tagId: number, userId: number) {
    const db = getDb();
    const tx = db.select({ id: transactions.id }).from(transactions)
      .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId))).get();
    if (!tx) throw new TagError('La transacción no existe o no pertenece al usuario', 'TRANSACTION_NOT_FOUND');
    db.delete(transactionTags)
      .where(and(eq(transactionTags.transactionId, transactionId), eq(transactionTags.tagId, tagId)))
      .run();
    return { detached: true };
  }

  /**
   * Bulk-loads tags for a set of transaction ids → Map(transactionId → tags[]).
   * Used to enrich a transaction list without an N+1 query.
   */
  static mapForTransactions(transactionIds: number[]): Map<number, { id: number; name: string; color: string | null }[]> {
    const map = new Map<number, { id: number; name: string; color: string | null }[]>();
    if (transactionIds.length === 0) return map;
    const db = getDb();
    const rows = db
      .select({
        transactionId: transactionTags.transactionId,
        id: tags.id,
        name: tags.name,
        color: tags.color,
      })
      .from(transactionTags)
      .innerJoin(tags, eq(transactionTags.tagId, tags.id))
      .where(inArray(transactionTags.transactionId, transactionIds))
      .orderBy(tags.name)
      .all();
    for (const r of rows) {
      const arr = map.get(r.transactionId) ?? [];
      arr.push({ id: r.id, name: r.name, color: r.color });
      map.set(r.transactionId, arr);
    }
    return map;
  }
}
