import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { promisify } from 'node:util';
import { getSqlite, getDatabaseFilePath, closeDatabase, getDb } from '../db/connection.js';
import { getBackupDir, getBackupRetention, SNAPSHOT_PREFIX, SNAPSHOT_EXT } from '../config/backup.js';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

/** SQLite database files start with this 16-byte magic header. */
const SQLITE_HEADER = Buffer.from('SQLite format 3\0', 'latin1');

export class SnapshotError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'SnapshotError';
    this.code = code;
  }
}

export interface SnapshotInfo {
  /** File name only (e.g. homeledger-2026-09-13T03-00-00-000Z.db.gz). */
  name: string;
  /** Compressed size in bytes. */
  size: number;
  /** ISO timestamp derived from the file's mtime. */
  createdAt: string;
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/** A snapshot file is one we created: correct prefix + extension. */
function isSnapshotFile(name: string): boolean {
  return name.startsWith(SNAPSHOT_PREFIX) && name.endsWith(SNAPSHOT_EXT);
}

export class SnapshotService {
  /**
   * Creates a gzip-compressed whole-DB snapshot under DATA_DIR/backups.
   * Uses SQLite's online backup API (safe on a live DB, WAL-aware) to produce a
   * consistent single-file copy, then gzips it (SQLite files compress ~70-90%).
   *
   * @returns info about the created snapshot
   */
  static async createSnapshot(): Promise<SnapshotInfo> {
    const dir = getBackupDir();
    ensureDir(dir);

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const finalName = `${SNAPSHOT_PREFIX}${stamp}${SNAPSHOT_EXT}`;
    const finalPath = path.join(dir, finalName);
    // Temp uncompressed copy produced by the online backup, then gzipped away.
    const tmpDbPath = path.join(dir, `.tmp-${stamp}.db`);

    try {
      // Online backup → consistent single-file .db (handles WAL correctly).
      await getSqlite().backup(tmpDbPath);
      const raw = fs.readFileSync(tmpDbPath);
      const compressed = await gzip(raw);
      // Write to a temp path first, then rename → atomic appearance of the snapshot.
      const tmpGzPath = `${finalPath}.partial`;
      fs.writeFileSync(tmpGzPath, compressed);
      fs.renameSync(tmpGzPath, finalPath);
      const size = fs.statSync(finalPath).size;
      return { name: finalName, size, createdAt: new Date().toISOString() };
    } finally {
      // Always remove the uncompressed temp copy.
      if (fs.existsSync(tmpDbPath)) {
        try { fs.unlinkSync(tmpDbPath); } catch { /* best-effort cleanup */ }
      }
    }
  }

  /** Lists existing snapshots, newest first. */
  static listSnapshots(): SnapshotInfo[] {
    const dir = getBackupDir();
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir)
      .filter(isSnapshotFile)
      .map((name) => {
        const st = fs.statSync(path.join(dir, name));
        return { name, size: st.size, createdAt: st.mtime.toISOString() };
      })
      .sort((a, b) => b.name.localeCompare(a.name)); // ISO-timestamped names sort chronologically
  }

  /**
   * Retention/rotation: keep the newest `keep` snapshots, delete the rest.
   * @returns the number of snapshots deleted
   */
  static applyRetention(keep = getBackupRetention()): number {
    const dir = getBackupDir();
    const snapshots = SnapshotService.listSnapshots(); // newest first
    const toDelete = snapshots.slice(keep);
    for (const snap of toDelete) {
      try { fs.unlinkSync(path.join(dir, snap.name)); } catch { /* best-effort */ }
    }
    return toDelete.length;
  }

  /**
   * Restores the live database from a snapshot. High-risk and destructive:
   * replaces the entire database with the snapshot's contents.
   *
   * Safety: before replacing, the current DB is copied to a `.pre-restore`
   * sibling file so a bad restore can be manually reverted. The connection is
   * closed, the file is swapped, and the connection is reopened.
   */
  static async restoreSnapshot(name: string): Promise<void> {
    // Reject path traversal / non-snapshot names.
    if (!isSnapshotFile(name) || name.includes('/') || name.includes('\\') || name.includes('..')) {
      throw new SnapshotError('Nombre de respaldo inválido.', 'INVALID_SNAPSHOT_NAME');
    }
    const dir = getBackupDir();
    const snapPath = path.join(dir, name);
    if (!fs.existsSync(snapPath)) {
      throw new SnapshotError('El respaldo no existe.', 'SNAPSHOT_NOT_FOUND');
    }

    // Decompress and validate it is a real SQLite database before touching the live DB.
    const decompressed = await gunzip(fs.readFileSync(snapPath));
    if (!decompressed.subarray(0, SQLITE_HEADER.length).equals(SQLITE_HEADER)) {
      throw new SnapshotError('El archivo de respaldo no es una base de datos SQLite válida.', 'INVALID_SNAPSHOT_CONTENT');
    }

    const dbPath = getDatabaseFilePath();

    // Close the live connection so the file handle is released before swapping.
    closeDatabase();

    // Safety copy of the current DB (overwrites any previous pre-restore file).
    try {
      if (fs.existsSync(dbPath)) {
        fs.copyFileSync(dbPath, `${dbPath}.pre-restore`);
      }
    } catch { /* non-fatal: proceed with restore even if the safety copy fails */ }

    // Remove WAL/SHM sidecars so the restored file isn't shadowed by stale WAL.
    for (const suffix of ['-wal', '-shm']) {
      const sidecar = `${dbPath}${suffix}`;
      if (fs.existsSync(sidecar)) {
        try { fs.unlinkSync(sidecar); } catch { /* best-effort */ }
      }
    }

    // Write the restored database into place.
    fs.writeFileSync(dbPath, decompressed);

    // Reopen the connection (getDb lazily recreates it).
    getDb();
  }
}
