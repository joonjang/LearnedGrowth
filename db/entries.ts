import * as SQLite from "expo-sqlite";

const LATEST = 2; // bump this when schema changes

export async function createDb(dbName = "entries.db"): Promise<SQLite.SQLiteDatabase> {
   const db = await SQLite.openDatabaseAsync(dbName);

   // Always-on PRAGMAs
   await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);

   await db.withTransactionAsync(async () => {
      const row = await db.getFirstAsync<{ user_version: number }>(
         "PRAGMA user_version"
      );
      const current = row?.user_version ?? 0;

      if (current < 1) {
         // migration step 1
         await db.execAsync(`
        CREATE TABLE IF NOT EXISTS entries (
          id TEXT PRIMARY KEY,
          adversity TEXT NOT NULL,
          belief TEXT NOT NULL,
          consequence TEXT,
          dispute TEXT,
          energy TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          account_id TEXT,
          dirty_since TEXT,
          is_deleted INTEGER NOT NULL DEFAULT 0 CHECK (is_deleted IN (0,1))
        );
        CREATE INDEX IF NOT EXISTS idx_entries_updated_at ON entries(updated_at);
        CREATE INDEX IF NOT EXISTS idx_entries_dirty_since ON entries(dirty_since);
      `);
      }

      if (current < 2) {
         await db.execAsync(`
          ALTER TABLE entries ADD COLUMN analysis TEXT;
        `);
      }

      // finally, set to latest
      if (current < LATEST) {
         await db.execAsync(`PRAGMA user_version = ${LATEST}`);
      }
   });

   return db;
}
