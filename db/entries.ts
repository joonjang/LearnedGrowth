import * as SQLite from "expo-sqlite";

const LATEST = 6; // bump this when schema changes

async function getColumns(
   db: SQLite.SQLiteDatabase,
   table: string
): Promise<string[]> {
   const cols = await db.getAllAsync<{ name: string }>(
      `PRAGMA table_info(${table})`
   );
   return cols.map((c) => c.name);
}

function normalizeDimension(raw: any) {
   if (!raw || typeof raw !== "object") {
      return { score: null, detectedPhrase: null, insight: null };
   }
   return {
      score: typeof raw.score === "string" ? raw.score : null,
      detectedPhrase: typeof raw.detectedPhrase === "string"
         ? raw.detectedPhrase
         : null,
      insight: typeof raw.insight === "string" ? raw.insight : null,
   };
}

function buildAiResponseFromLegacy(
   analysisRaw: string | null | undefined,
   counterBeliefRaw: string | null | undefined
) {
   const counterBelief =
      typeof counterBeliefRaw === "string" ? counterBeliefRaw : counterBeliefRaw ?? null;

   let parsed: any = null;
   if (analysisRaw) {
      try {
         parsed = JSON.parse(analysisRaw);
      } catch (_e) {
         parsed = null;
      }
   }

   if (!parsed && !counterBelief) return null;

   const dimensions = parsed?.dimensions ?? {};

   return {
      safety: { isCrisis: false, crisisMessage: null },
      analysis: {
         dimensions: {
            permanence: normalizeDimension(dimensions.permanence),
            pervasiveness: normalizeDimension(dimensions.pervasiveness),
            personalization: normalizeDimension(dimensions.personalization),
         },
         emotionalLogic:
            typeof parsed?.emotionalLogic === "string"
               ? parsed.emotionalLogic
               : null,
      },
      suggestions: {
         evidenceQuestion: null,
         alternativesQuestion: null,
         usefulnessQuestion: null,
         counterBelief,
      },
   };
}

async function backfillAiResponse(
   db: SQLite.SQLiteDatabase,
   columns: string[]
) {
   if (!columns.includes("ai_response")) return;

   const hasAnalysis = columns.includes("analysis");
   const hasCounterBelief = columns.includes("counter_belief");

   if (!hasAnalysis && !hasCounterBelief) return;

   const selectCols = ["id", "ai_response"];
   if (hasAnalysis) selectCols.push("analysis");
   if (hasCounterBelief) selectCols.push("counter_belief");

   const rows = await db.getAllAsync<Record<string, any>>(
      `SELECT ${selectCols.join(", ")} FROM entries`
   );

   for (const row of rows) {
      if (row.ai_response) continue;

      const aiResponse = buildAiResponseFromLegacy(
         hasAnalysis ? row.analysis : null,
         hasCounterBelief ? row.counter_belief : null
      );

      if (!aiResponse) continue;

      await db.runAsync(
         `UPDATE entries SET ai_response = $ai_response WHERE id = $id`,
         { $ai_response: JSON.stringify(aiResponse), $id: row.id }
      );
   }
}

async function rebuildWithoutLegacyColumns(
   db: SQLite.SQLiteDatabase,
   columns?: string[]
) {
   const cols = columns ?? (await getColumns(db, "entries"));
   const hasAiRetryCount = cols.includes("ai_retry_count");

   await db.execAsync(`
      DROP TABLE IF EXISTS entries_new;
      CREATE TABLE entries_new (
         id TEXT PRIMARY KEY,
         adversity TEXT NOT NULL,
         belief TEXT NOT NULL,
         consequence TEXT,
         dispute TEXT,
         energy TEXT,
         ai_response TEXT,
         ai_retry_count INTEGER NOT NULL DEFAULT 0,
         created_at TEXT NOT NULL,
         updated_at TEXT NOT NULL,
         account_id TEXT,
         dirty_since TEXT,
         is_deleted INTEGER NOT NULL DEFAULT 0 CHECK (is_deleted IN (0,1))
      );
      INSERT INTO entries_new
         (id, adversity, belief, consequence, dispute, energy, ai_response, ai_retry_count, created_at, updated_at, account_id, dirty_since, is_deleted)
      SELECT
         id, adversity, belief, consequence, dispute, energy, ai_response, ${
            hasAiRetryCount ? "ai_retry_count" : "0"
         }, created_at, updated_at, account_id, dirty_since, is_deleted
      FROM entries;
      DROP TABLE entries;
      ALTER TABLE entries_new RENAME TO entries;
      CREATE INDEX IF NOT EXISTS idx_entries_updated_at ON entries(updated_at);
      CREATE INDEX IF NOT EXISTS idx_entries_dirty_since ON entries(dirty_since);
   `);
}

async function migrateToV4(db: SQLite.SQLiteDatabase) {
   let columns = await getColumns(db, "entries");
   if (!columns.includes("ai_response")) {
      await db.execAsync(`ALTER TABLE entries ADD COLUMN ai_response TEXT;`);
      columns = await getColumns(db, "entries");
   }

   await backfillAiResponse(db, columns);

   const needsRebuild =
      columns.includes("analysis") || columns.includes("counter_belief");
   if (needsRebuild) {
      await rebuildWithoutLegacyColumns(db, columns);
   }
}

async function migrateToV5(db: SQLite.SQLiteDatabase) {
   // Rebuild to position ai_response after energy for clarity.
   await rebuildWithoutLegacyColumns(db);
}

async function migrateToV6(db: SQLite.SQLiteDatabase) {
   const columns = await getColumns(db, "entries");
   if (!columns.includes("ai_retry_count")) {
      await db.execAsync(
         `ALTER TABLE entries ADD COLUMN ai_retry_count INTEGER NOT NULL DEFAULT 0;`
      );
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
          consequence TEXT,
          dispute TEXT,
          energy TEXT,
          ai_response TEXT,
          ai_retry_count INTEGER NOT NULL DEFAULT 0,
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

      if (current < 4) {
         await migrateToV4(db);
      }

      if (current < 5) {
         await migrateToV5(db);
      }

      if (current < 6) {
         await migrateToV6(db);
      }

      // finally, set to latest
      if (current < LATEST) {
         await db.execAsync(`PRAGMA user_version = ${LATEST}`);
      }
   });

   return db;
}
