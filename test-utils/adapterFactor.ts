import { createDb } from '@/db/entries';
import { SQLEntriesAdapter } from '@/db/entriesAdapter.sqlite';
import { TestClock } from './testClock';

// ——— factory (memory backend) ———
export async function makeMemory() {
   const clock = new TestClock();
   const adapter = new SQLEntriesAdapter(null, clock);
   return { adapter, clock, cleanup: async () => {} };
}

// ——— factory (SQLite backend) ———
export async function makeSqlite() {
   const clock = new TestClock();
   const dbName = `test-${Math.random().toString(36).slice(2)}.db`;
   const db = await createDb(dbName);
   const adapter = new SQLEntriesAdapter(db, clock);
   const cleanup = async () => {
      try {
         await db.execAsync('DELETE FROM entries;'); // wipe rows, keep schema
      } catch (e) {
         console.warn('cleanup failed', e);
      }
   };
   return { name: 'sqlite', adapter, clock, cleanup };
}
