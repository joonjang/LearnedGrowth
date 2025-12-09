import { Clock } from "@/lib/clock";
import { LearnedGrowthResponse } from "@/models/aiService";
import { Entry } from "@/models/entry";
import * as SQLite from "expo-sqlite";
import { EntriesAdapter } from "../models/entriesAdapter";

interface Row {
   id: string;
   adversity: string;
   belief: string;
   ai_response: string | null;
   consequence: string | null;
   dispute: string | null;
   energy: string | null;
   created_at: string;
   updated_at: string;
   account_id: string | null;
   dirty_since: string | null;
   is_deleted: number;
}

function serializeAiResponse(aiResponse?: LearnedGrowthResponse | null) {
   return aiResponse ? JSON.stringify(aiResponse) : null;
}

function parseAiResponse(raw: string | null): LearnedGrowthResponse | null {
   if (!raw) return null;
   try {
      return JSON.parse(raw) as LearnedGrowthResponse;
   } catch (e: any) {
      throw new Error(`Failed to parse ai_response JSON`, { cause: e });
   }
}

function cloneAiResponse(
   aiResponse?: LearnedGrowthResponse | null
): LearnedGrowthResponse | null {
   return aiResponse ? JSON.parse(JSON.stringify(aiResponse)) : null;
}

export class SQLEntriesAdapter implements EntriesAdapter {
   private entries?: Entry[];
   private db?: SQLite.SQLiteDatabase;
   private clock: Clock;

   constructor(_db: any, clock: Clock) {
      this.clock = clock;
      if (_db) this.db = _db;
      else this.entries = [];
   }

   private copyEntry(entry: Entry): Entry {
      return {
         ...entry,
         aiResponse: cloneAiResponse(entry.aiResponse ?? null),
      };
   }

   private fromRow(row: Row): Entry {
      return {
         id: row.id,
         adversity: row.adversity,
         belief: row.belief,
         aiResponse: parseAiResponse(row.ai_response),
         consequence: row.consequence ?? undefined,
         dispute: row.dispute ?? undefined,
         energy: row.energy ?? undefined,
         createdAt: row.created_at,
         updatedAt: row.updated_at,
         accountId: row.account_id ?? null,
         dirtySince: row.dirty_since ?? null,
         isDeleted: !!row.is_deleted,
      };
   }

   // TODO: create getAllDeleted() for deleted entries

   async getAll(): Promise<Entry[]> {
      if (!this.db) {
         return this.entries!.filter((e) => !e.isDeleted)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .map((e) => this.copyEntry(e));
      }

      try {
         const rows = await this.db.getAllAsync<Row>(`
            SELECT id, adversity, belief, ai_response, consequence, dispute, energy,
              created_at, updated_at, account_id, dirty_since, is_deleted
            FROM entries
            WHERE is_deleted = 0
            ORDER BY created_at DESC
          `);

         return rows.map((row) => this.fromRow(row));
      } catch (e: any) {
         throw new Error(`entries.getAll failed`, { cause: e });
      }
   }

   async getById(id: string): Promise<Entry | null> {
      if (!this.db) {
         const found = this.entries!.find((e) => e.id === id);
         return found ? this.copyEntry(found) : null;
      }
      try {
         const row = await this.db.getFirstAsync<Row>(
            `
          SELECT id, adversity, belief, ai_response, consequence, dispute, energy,
              created_at, updated_at, account_id, dirty_since, is_deleted
            FROM entries
            WHERE id = $id
            LIMIT 1
             `,
            { $id: id }
         );
         return row ? this.fromRow(row) : null;
      } catch (e: any) {
         throw new Error(
            `entries.getById failed for id: ${id}: ${e?.message ?? e}`
         );
      }
   }

   async add(entry: Entry): Promise<Entry> {
      // Memory mode
      if (!this.db) {
         if (this.entries!.some((e) => e.id === entry.id)) {
            throw new Error(`duplicate id: ${entry.id}`);
         }
         const copy = this.copyEntry(entry);
         this.entries!.push(copy);
         return this.copyEntry(copy);
      }

      // SQLite mode
      try {
         await this.db.runAsync(
            `INSERT INTO entries
       (id, adversity, belief, consequence, dispute, energy, ai_response,
        created_at, updated_at, account_id, dirty_since, is_deleted)
       VALUES
       ($id, $adversity, $belief, $consequence, $dispute, $energy, $ai_response,
        $created_at, $updated_at, $account_id, $dirty_since, $is_deleted)`,
            {
               $id: entry.id,
               $adversity: entry.adversity,
               $belief: entry.belief,
               $consequence: entry.consequence ?? null,
               $dispute: entry.dispute ?? null,
               $energy: entry.energy ?? null,
               $ai_response: serializeAiResponse(entry.aiResponse ?? null),
               $created_at: entry.createdAt,
               $updated_at: entry.updatedAt,
               $account_id: entry.accountId ?? null,
               $dirty_since: entry.dirtySince ?? null,
               $is_deleted: entry.isDeleted ? 1 : 0,
            }
         );

         const row = await this.db.getFirstAsync<Row>(
            `SELECT id, adversity, belief, ai_response, consequence, dispute, energy,
              created_at, updated_at, account_id, dirty_since, is_deleted
         FROM entries
        WHERE id = $id
        LIMIT 1`,
            { $id: entry.id }
         );
         if (!row)
            throw new Error(`entries.add: inserted id not found (${entry.id})`);

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
            ? cloneAiResponse(patch.aiResponse ?? null)
            : cloneAiResponse(current.aiResponse ?? null);
         const merged: Entry = {
            ...current,
            ...patch,
            aiResponse: nextAiResponse,
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
            ? cloneAiResponse(patch.aiResponse ?? null)
            : cloneAiResponse(current.aiResponse ?? null);

         const merged: Entry = {
            ...current,
            ...patch, // patch fields; createdAt/id stay from current
            aiResponse: nextAiResponse,
            dirtySince: current.dirtySince ?? now,
            updatedAt: now,
         };

         await this.db.runAsync(
            `UPDATE entries
         SET adversity   = $adversity,
              belief      = $belief,
              ai_response = $ai_response,
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

         const row = await this.db.getFirstAsync<Row>(
            `SELECT id, adversity, belief, ai_response, consequence, dispute, energy,
              created_at, updated_at, account_id, dirty_since, is_deleted
         FROM entries
        WHERE id = $id
        LIMIT 1`,
            { $id: id }
         );
         if (!row) throw new Error(`entries.update failed to read back ${id}`);

         return this.fromRow(row);
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
         await this.db.runAsync(
            `UPDATE entries
              SET is_deleted  = 1,
                  updated_at  = $now,
                  dirty_since = COALESCE(dirty_since, $now)
            WHERE id = $id`,
            { $id: id, $now: now }
         );
      } catch (e: any) {
         throw new Error(
            `entries.remove failed to remove for ${id}: ${e?.message ?? e}`
         );
      }
   }

   async clear(): Promise<void> {
      if (!this.db) {
         this.entries = [];
         return;
      }
      await this.db.runAsync("DELETE FROM entries");
   }
}
