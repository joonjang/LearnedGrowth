import { createDb } from "@/db/entries";
import { Clock } from "@/lib/clock";
import { LearnedGrowthResponse } from "@/models/aiService";
import { DisputeHistoryItem, Entry } from "@/models/entry";
import * as SQLite from "expo-sqlite";
import { EntriesAdapter } from "../models/entriesAdapter";

interface Row {
   id: string;
   adversity: string;
   belief: string;
   ai_response: string | null;
   ai_retry_count: number | null;
   consequence: string | null;
   dispute: string | null;
   energy: string | null;
   dispute_history: string | null;
   created_at: string;
   updated_at: string;
   account_id: string | null;
   dirty_since: string | null;
   is_deleted: number;
}

const DEFAULT_AI_META = {
   category: null,
   tags: [] as string[],
   sentimentScore: null,
   optimismScore: null,
};

function serializeAiResponse(aiResponse?: LearnedGrowthResponse | null) {
   return aiResponse ? JSON.stringify(aiResponse) : null;
}

function serializeDisputeHistory(history?: DisputeHistoryItem[] | null) {
   return JSON.stringify(normalizeDisputeHistory(history ?? []));
}

function parseAiResponse(raw: string | null): LearnedGrowthResponse | null {
   if (!raw) return null;
   try {
      return ensureAiMeta(JSON.parse(raw) as LearnedGrowthResponse);
   } catch (e: any) {
      throw new Error(`Failed to parse ai_response JSON`, { cause: e });
   }
}

function normalizeDisputeHistory(raw: any): DisputeHistoryItem[] {
   if (!Array.isArray(raw)) return [];
   const fallbackTimestamp = new Date().toISOString();
   const items: DisputeHistoryItem[] = [];
   for (const item of raw) {
      if (!item || typeof item !== "object") continue;
      const dispute =
         typeof item.dispute === "string" ? item.dispute.trim() : "";
      if (!dispute) continue;
      const energy = typeof item.energy === "string" ? item.energy : null;
      const createdAt =
         typeof item.createdAt === "string" ? item.createdAt : fallbackTimestamp;
      items.push({ dispute, energy, createdAt });
   }
   return items.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
   );
}

function parseDisputeHistory(raw: string | null): DisputeHistoryItem[] {
   if (!raw) return [];
   try {
      const parsed = JSON.parse(raw);
      const normalized = normalizeDisputeHistory(parsed);
      return normalized.length > 0 ? normalized : [];
   } catch (e: any) {
      throw new Error(`Failed to parse dispute_history JSON`, { cause: e });
   }
}

function ensureAiMeta(aiResponse?: LearnedGrowthResponse | null) {
   if (!aiResponse) return null;
   const meta = aiResponse.meta ?? DEFAULT_AI_META;
   const tags = Array.isArray(meta.tags)
      ? Array.from(
         new Set(
            meta.tags
               .map((tag) => (typeof tag === "string" ? tag.trim() : ""))
               .filter(Boolean)
         )
      )
      : [];

   return {
      ...aiResponse,
      meta: {
         category: typeof meta.category === "string" ? meta.category : null,
         tags,
         sentimentScore:
            typeof meta.sentimentScore === "number" && Number.isFinite(meta.sentimentScore)
               ? meta.sentimentScore
               : null,
         optimismScore:
            typeof meta.optimismScore === "number" && Number.isFinite(meta.optimismScore)
               ? meta.optimismScore
               : null,
      },
   };
}

function cloneAiResponse(
   aiResponse?: LearnedGrowthResponse | null,
   fallbackCreatedAt?: string
): LearnedGrowthResponse | null {
   const normalized = ensureAiMeta(aiResponse);
   if (!normalized) return null;
   const withTimestamp =
      fallbackCreatedAt && !normalized.createdAt
         ? { ...normalized, createdAt: fallbackCreatedAt }
         : normalized;
   return JSON.parse(JSON.stringify(withTimestamp));
}

function cloneDisputeHistory(
   history?: DisputeHistoryItem[] | null
): DisputeHistoryItem[] {
   if (!history || history.length === 0) return [];
   return normalizeDisputeHistory(JSON.parse(JSON.stringify(history)));
}

function normalizeAiRetryCount(raw: any): number {
   if (typeof raw === "number" && Number.isFinite(raw)) return raw;
   if (typeof raw === "string" && raw.trim() !== "") {
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) return parsed;
   }
   return 0;
}

export class SQLEntriesAdapter implements EntriesAdapter {
   private entries?: Entry[];
   private db?: SQLite.SQLiteDatabase;
   private dbName?: string;
   private clock: Clock;

   constructor(_db: any, clock: Clock, dbName = "entries.db") {
      this.clock = clock;
      if (_db) {
         this.db = _db;
         this.dbName = dbName;
      }
      else this.entries = [];
   }

   private isNativeDbPointerError(err: any) {
      const msg = err?.message ?? "";
      return (
         msg.includes("NativeDatabase.prepareAsync") ||
         msg.includes("NativeDatabase.executeAsync") ||
         msg.includes("NativeDatabase.bind")
      );
   }

   private async withDb<T>(op: (db: SQLite.SQLiteDatabase) => Promise<T>): Promise<T> {
      if (!this.db) throw new Error("SQLite database not initialized");

      try {
         return await op(this.db);
      } catch (err: any) {
         if (!this.isNativeDbPointerError(err)) throw err;

         // Try to reopen the database once and retry the op.
         try {
            const name = this.dbName ?? "entries.db";
            this.db = await createDb(name);
         } catch (reopenErr: any) {
            throw new Error(
               `Failed to reopen entries database: ${reopenErr?.message ?? reopenErr}`
            );
         }

         return await op(this.db);
      }
   }

   private copyEntry(entry: Entry): Entry {
      return {
         ...entry,
         aiRetryCount: entry.aiRetryCount ?? 0,
         aiResponse: cloneAiResponse(entry.aiResponse ?? null),
         disputeHistory: cloneDisputeHistory(entry.disputeHistory),
      };
   }

   private fromRow(row: Row): Entry {
      return {
         id: row.id,
         adversity: row.adversity,
         belief: row.belief,
         aiResponse: parseAiResponse(row.ai_response),
         aiRetryCount: normalizeAiRetryCount(row.ai_retry_count),
         consequence: row.consequence ?? undefined,
         dispute: row.dispute ?? undefined,
         energy: row.energy ?? undefined,
         disputeHistory: parseDisputeHistory(row.dispute_history),
         createdAt: row.created_at,
         updatedAt: row.updated_at,
         accountId: row.account_id ?? null,
         dirtySince: row.dirty_since ?? null,
         isDeleted: !!row.is_deleted,
      };
   }

   async getAll(): Promise<Entry[]> {
      if (!this.db) {
         return this.entries!.filter((e) => !e.isDeleted)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .map((e) => this.copyEntry(e));
      }

      try {
         return await this.withDb(async (db) => {
            const rows = await db.getAllAsync<Row>(`
               SELECT id, adversity, belief, ai_response, ai_retry_count, consequence, dispute, energy,
                 dispute_history, created_at, updated_at, account_id, dirty_since, is_deleted
               FROM entries
               WHERE is_deleted = 0
               ORDER BY created_at DESC
             `);

            return rows.map((row) => this.fromRow(row));
         });
      } catch (e: any) {
         throw new Error(`entries.getAll failed`, { cause: e });
      }
   }

   async getAllIncludingDeleted(): Promise<Entry[]> {
      if (!this.db) {
         return this.entries!
            .slice()
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .map((e) => this.copyEntry(e));
      }

      try {
         return await this.withDb(async (db) => {
            const rows = await db.getAllAsync<Row>(`
               SELECT id, adversity, belief, ai_response, ai_retry_count, consequence, dispute, energy,
                 dispute_history, created_at, updated_at, account_id, dirty_since, is_deleted
               FROM entries
               ORDER BY created_at DESC
             `);

            return rows.map((row) => this.fromRow(row));
         });
      } catch (e: any) {
         throw new Error(`entries.getAllIncludingDeleted failed`, { cause: e });
      }
   }

   async getById(id: string): Promise<Entry | null> {
      if (!this.db) {
         const found = this.entries!.find((e) => e.id === id);
         return found ? this.copyEntry(found) : null;
      }
      try {
         return await this.withDb(async (db) => {
            const row = await db.getFirstAsync<Row>(
               `
             SELECT id, adversity, belief, ai_response, ai_retry_count, consequence, dispute, energy,
                 dispute_history, created_at, updated_at, account_id, dirty_since, is_deleted
               FROM entries
               WHERE id = $id
               LIMIT 1
                `,
               { $id: id }
            );
            return row ? this.fromRow(row) : null;
         });
      } catch (e: any) {
         throw new Error(
            `entries.getById failed for id: ${id}: ${e?.message ?? e}`
         );
      }
   }

   async add(entry: Entry): Promise<Entry> {
      const aiCreatedAt = entry.aiResponse
         ? entry.aiResponse.createdAt ??
            entry.updatedAt ??
            entry.createdAt ??
            this.clock.nowIso()
         : undefined;
      const aiResponse = cloneAiResponse(entry.aiResponse ?? null, aiCreatedAt);
      const disputeHistory = cloneDisputeHistory(entry.disputeHistory);

      // Memory mode
      if (!this.db) {
         if (this.entries!.some((e) => e.id === entry.id)) {
            throw new Error(`duplicate id: ${entry.id}`);
         }
         const copy: Entry = {
            ...entry,
            aiRetryCount: entry.aiRetryCount ?? 0,
            aiResponse,
            disputeHistory,
         };
         this.entries!.push(copy);
         return this.copyEntry(copy);
      }

      // SQLite mode
      try {
         const row = await this.withDb(async (db) => {
            await db.runAsync(
               `INSERT INTO entries
        (id, adversity, belief, consequence, dispute, energy, dispute_history, ai_response, ai_retry_count,
         created_at, updated_at, account_id, dirty_since, is_deleted)
        VALUES
        ($id, $adversity, $belief, $consequence, $dispute, $energy, $dispute_history, $ai_response, $ai_retry_count,
         $created_at, $updated_at, $account_id, $dirty_since, $is_deleted)`,
               {
                  $id: entry.id,
                  $adversity: entry.adversity,
                  $belief: entry.belief,
                  $consequence: entry.consequence ?? null,
                  $dispute: entry.dispute ?? null,
                  $energy: entry.energy ?? null,
                  $dispute_history: serializeDisputeHistory(disputeHistory),
                  $ai_response: serializeAiResponse(aiResponse),
                  $ai_retry_count: entry.aiRetryCount ?? 0,
                  $created_at: entry.createdAt,
                  $updated_at: entry.updatedAt,
                  $account_id: entry.accountId ?? null,
                  $dirty_since: entry.dirtySince ?? null,
                  $is_deleted: entry.isDeleted ? 1 : 0,
               }
            );

            const inserted = await db.getFirstAsync<Row>(
               `SELECT id, adversity, belief, ai_response, ai_retry_count, consequence, dispute, energy,
                 dispute_history, created_at, updated_at, account_id, dirty_since, is_deleted
          FROM entries
         WHERE id = $id
         LIMIT 1`,
               { $id: entry.id }
            );
            if (!inserted) {
               throw new Error(
                  `entries.add: inserted id not found (${entry.id})`
               );
            }
            return inserted;
         });

         return { ...this.fromRow(row) };
      } catch (e: any) {
         throw new Error(
            `entries.add failed for ${entry.id}: ${e?.message ?? e}`
         );
      }
   }

   async update(id: string, patch: Partial<Entry>): Promise<Entry> {
      const now = this.clock.nowIso();

      // Memory mode
      if (!this.db) {
         const i = this.entries!.findIndex((e) => e.id === id);
         if (i === -1) throw new Error(`Entry ${id} not found`);

         const current = this.entries![i];
         const nextAiResponse = Object.prototype.hasOwnProperty.call(
            patch,
            "aiResponse"
         )
            ? cloneAiResponse(
               patch.aiResponse ?? null,
               patch.aiResponse
                  ? patch.aiResponse.createdAt ?? patch.updatedAt ?? now
                  : undefined
            )
            : cloneAiResponse(current.aiResponse ?? null);
         const nextDisputeHistory = Object.prototype.hasOwnProperty.call(
            patch,
            "disputeHistory"
         )
            ? cloneDisputeHistory(patch.disputeHistory)
            : cloneDisputeHistory(current.disputeHistory);
         const merged: Entry = {
            ...current,
            ...patch,
            aiResponse: nextAiResponse,
            disputeHistory: nextDisputeHistory,
            dirtySince: current.dirtySince ?? now,
            updatedAt: now,
         };
         const stored = this.copyEntry(merged);
         this.entries![i] = stored;
         return this.copyEntry(stored);
      }

      // SQLite mode
      try {
         const current = await this.getById(id);
         if (!current) throw new Error(`Entry ${id} not found`);

         const nextAiResponse = Object.prototype.hasOwnProperty.call(
            patch,
            "aiResponse"
         )
            ? cloneAiResponse(
               patch.aiResponse ?? null,
               patch.aiResponse
                  ? patch.aiResponse.createdAt ?? patch.updatedAt ?? now
                  : undefined
            )
            : cloneAiResponse(current.aiResponse ?? null);
         const nextDisputeHistory = Object.prototype.hasOwnProperty.call(
            patch,
            "disputeHistory"
         )
            ? cloneDisputeHistory(patch.disputeHistory)
            : cloneDisputeHistory(current.disputeHistory);

         const merged: Entry = {
            ...current,
            ...patch, // patch fields; createdAt/id stay from current
            aiResponse: nextAiResponse,
            disputeHistory: nextDisputeHistory,
            dirtySince: current.dirtySince ?? now,
            updatedAt: now,
         };

         return await this.withDb(async (db) => {
            await db.runAsync(
               `UPDATE entries
            SET adversity   = $adversity,
                 belief      = $belief,
                 ai_response = $ai_response,
                 dispute_history = $dispute_history,
                 ai_retry_count = $ai_retry_count,
                 consequence = $consequence,
                 dispute     = $dispute,
                 energy      = $energy,
                 updated_at  = $updated_at,
                 account_id  = $account_id,
                 dirty_since = COALESCE(dirty_since, $dirty_since),
                 is_deleted  = $is_deleted
           WHERE id = $id`,
               {
                  $id: merged.id,
                  $adversity: merged.adversity,
                  $belief: merged.belief,
                  $ai_response: serializeAiResponse(merged.aiResponse ?? null),
                  $dispute_history: serializeDisputeHistory(merged.disputeHistory),
                  $ai_retry_count: merged.aiRetryCount ?? 0,
                  $consequence: merged.consequence ?? null,
                  $dispute: merged.dispute ?? null,
                  $energy: merged.energy ?? null,
                  // NOTE: don't set created_at here
                  $updated_at: merged.updatedAt,
                  $account_id: merged.accountId ?? null,
                  $dirty_since: merged.dirtySince ?? null,
                  $is_deleted: merged.isDeleted ? 1 : 0,
               }
            );

            const row = await db.getFirstAsync<Row>(
               `SELECT id, adversity, belief, ai_response, ai_retry_count, consequence, dispute, energy,
                 dispute_history, created_at, updated_at, account_id, dirty_since, is_deleted
          FROM entries
         WHERE id = $id
         LIMIT 1`,
               { $id: id }
            );
            if (!row) throw new Error(`entries.update failed to read back ${id}`);

            return this.fromRow(row);
         });
      } catch (e: any) {
         throw new Error(`entries.update failed for ${id}: ${e?.message ?? e}`);
      }
   }

   async remove(id: string): Promise<void> {
      const now = this.clock.nowIso();

      if (!this.db) {
         const i = this.entries!.findIndex((e) => e.id === id);
         if (i === -1) return;

         const current = this.entries![i];

         this.entries![i] = {
            ...current,
            isDeleted: true,
            dirtySince: current.dirtySince ?? now,
            updatedAt: now,
         };

         return;
      }

      try {
         await this.withDb((db) =>
            db.runAsync(
               `UPDATE entries
                 SET is_deleted  = 1,
                     updated_at  = $now,
                     dirty_since = COALESCE(dirty_since, $now)
               WHERE id = $id`,
               { $id: id, $now: now }
            )
         );
      } catch (e: any) {
         throw new Error(
            `entries.remove failed to remove for ${id}: ${e?.message ?? e}`
         );
      }
   }

   async hardDelete(id: string): Promise<void> {
      if (!this.db) {
         const i = this.entries!.findIndex((e) => e.id === id);
         if (i === -1) return;
         this.entries!.splice(i, 1);
         return;
      }

      try {
         await this.withDb((db) =>
            db.runAsync(`DELETE FROM entries WHERE id = $id`, { $id: id })
         );
      } catch (e: any) {
         throw new Error(
            `entries.hardDelete failed for ${id}: ${e?.message ?? e}`
         );
      }
   }

   async clear(): Promise<void> {
      if (!this.db) {
         this.entries = [];
         return;
      }
      await this.withDb((db) => db.runAsync("DELETE FROM entries"));
   }
}
