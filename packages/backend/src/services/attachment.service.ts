import { eq, and, desc } from 'drizzle-orm';
import { getDb, getSqlite } from '../db/connection.js';
import { attachments } from '../db/schema.js';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// Store attachments under DATA_DIR so they live on the same persistent volume as
// the database. In Docker DATA_DIR is /data (mounted volume); locally it falls
// back to ./data. Previously this used process.cwd()/data, which in the
// container resolved to /app/data — outside the volume — so files were lost on
// every rebuild while the DB records (in DATA_DIR) survived.
const DATA_DIR = process.env['DATA_DIR']
  ? path.resolve(process.env['DATA_DIR'])
  : path.resolve(process.cwd(), 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'attachments');

// Ensure upload directory exists (lazy, no crash if it fails at import time)
try {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
} catch {
  // Will be created on first upload
}

export interface AttachmentRecord {
  id: number;
  userId: number;
  transactionId: number | null;
  transferId: number | null;
  filename: string;
  originalName: string | null;
  mimeType: string;
  size: number;
  path: string;
  createdAt: string;
}

export class AttachmentService {
  /**
   * Upload and save an attachment file.
   */
  static save(
    userId: number,
    file: { filename: string; data: Buffer; mimetype: string },
    linkTo?: { transactionId?: number; transferId?: number }
  ): AttachmentRecord {
    const db = getDb();
    const ext = path.extname(file.filename) || '.bin';
    const storedName = `${crypto.randomUUID()}${ext}`;
    const filePath = path.join(UPLOAD_DIR, storedName);

    // Write file to disk
    fs.writeFileSync(filePath, file.data);

    const now = new Date().toISOString();
    const record = db
      .insert(attachments)
      .values({
        userId,
        transactionId: linkTo?.transactionId ?? null,
        transferId: linkTo?.transferId ?? null,
        filename: storedName,
        originalName: file.filename,
        mimeType: file.mimetype,
        size: file.data.length,
        path: filePath,
        createdAt: now,
      })
      .returning()
      .get();

    return record as unknown as AttachmentRecord;
  }

  /**
   * List attachments for a user, optionally filtered by transaction or transfer.
   */
  static list(userId: number, filter?: { transactionId?: number; transferId?: number }): AttachmentRecord[] {
    const db = getDb();
    const results = db.select().from(attachments).where(eq(attachments.userId, userId)).orderBy(desc(attachments.createdAt)).all();

    let filtered = results as unknown as AttachmentRecord[];
    if (filter?.transactionId) {
      filtered = filtered.filter(a => a.transactionId === filter.transactionId);
    }
    if (filter?.transferId) {
      filtered = filtered.filter(a => a.transferId === filter.transferId);
    }
    return filtered;
  }

  /**
   * Get a single attachment by ID (verify ownership).
   */
  static getById(id: number, userId: number): AttachmentRecord | null {
    const db = getDb();
    const record = db
      .select()
      .from(attachments)
      .where(and(eq(attachments.id, id), eq(attachments.userId, userId)))
      .get();
    return (record as unknown as AttachmentRecord) ?? null;
  }

  /**
   * Get the file path on disk for an attachment.
   */
  static getFilePath(record: AttachmentRecord): string {
    // If path is absolute use it, otherwise resolve from UPLOAD_DIR
    if (path.isAbsolute(record.path)) return record.path;
    return path.join(UPLOAD_DIR, record.filename);
  }

  /**
   * Delete an attachment (file + record).
   */
  static delete(id: number, userId: number): boolean {
    const db = getDb();
    const record = this.getById(id, userId);
    if (!record) return false;

    const filePath = this.getFilePath(record);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Explicitly remove any receipt analysis tied to this attachment. The FK has
    // ON DELETE CASCADE, but receipt_analyses/receipt_items are created via raw
    // SQL and may not exist yet; guard by table existence and do it explicitly.
    const sqlite = getSqlite();
    const tableExists = (name: string): boolean =>
      !!sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?").get(name);
    if (tableExists('receipt_analyses')) {
      if (tableExists('receipt_items')) {
        sqlite.prepare('DELETE FROM receipt_items WHERE analysis_id IN (SELECT id FROM receipt_analyses WHERE attachment_id = ?)').run(id);
      }
      sqlite.prepare('DELETE FROM receipt_analyses WHERE attachment_id = ?').run(id);
    }

    db.delete(attachments).where(eq(attachments.id, id)).run();
    return true;
  }

  /**
   * Link an existing attachment to a transaction or transfer.
   */
  static link(id: number, userId: number, linkTo: { transactionId?: number; transferId?: number }): AttachmentRecord | null {
    const db = getDb();
    const record = db
      .update(attachments)
      .set({
        transactionId: linkTo.transactionId ?? null,
        transferId: linkTo.transferId ?? null,
      })
      .where(and(eq(attachments.id, id), eq(attachments.userId, userId)))
      .returning()
      .get();

    return (record as unknown as AttachmentRecord) ?? null;
  }
}
