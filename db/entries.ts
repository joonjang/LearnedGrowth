import * as SQLite from "expo-sqlite";

const LATEST = 3; // bump this when schema changes

async function ensureColumn(
   db: SQLite.SQLiteDatabase,
   table: string,
   column: string,
   ddl: string
) {
   const cols = await db.getAllAsync<{ name: string }>(
      `PRAGMA table_info(${table})`
   );
   const exists = cols.some((c) => c.name === column);
   if (!exists) {
      await db.execAsync(ddl);
   }
}

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
          analysis TEXT,
          counter_belief TEXT,
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

      await ensureColumn(
         db,
         "entries",
         "analysis",
         `ALTER TABLE entries ADD COLUMN analysis TEXT;`
      );

      // ensure counter_belief exists even if past versions were out-of-sync
      await ensureColumn(
         db,
         "entries",
         "counter_belief",
         `ALTER TABLE entries ADD COLUMN counter_belief TEXT;`
      );

      // finally, set to latest
      if (current < LATEST) {
         await db.execAsync(`PRAGMA user_version = ${LATEST}`);
      }
   });

   return db;
}
