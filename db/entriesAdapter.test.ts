import { SQLEntriesAdapter } from '@/db/entriesAdapter.sqlite';
import { Entry } from '@/models/entry';
import { makeMemory, makeSqlite } from '@/test-utils/adapterFactory';
import { TestClock } from '@/test-utils/testClock';

describe.each([
   ['memory', makeMemory],
   ['sqlite', makeSqlite],
])('%s backend', (_name, make) => {
   describe('entries database adapter tests', () => {
      let db: SQLEntriesAdapter;
      let clock: TestClock;
      let entry: Entry;
      let cleanup: () => Promise<void> | void;

      beforeEach(async () => {
         const ctx = await make();
         clock = ctx.clock;
         db = ctx.adapter;
         cleanup = ctx.cleanup;

         // reset state
         await db.clear();

         entry = {
            id: '123',
            adversity: 'Test adversity',
            belief: 'Test belief',
            analysis: null,
            createdAt: clock.nowIso(),
            updatedAt: clock.nowIso(),
            dirtySince: null,
            isDeleted: false,
            accountId: null,
         };
      });

      afterEach(async () => {
         await cleanup?.();
      });

      describe('CREATE', () => {
         it('adds and retrieves entries', async () => {
            await db.add(entry);
            const all = await db.getAll();
            expect(all).toHaveLength(1);
            expect(all[0].adversity).toBe('Test adversity');
         });

         it("add does not mutate caller's object", async () => {
            const input = { ...entry };
            await db.add(input);
            input.belief = 'mutated';
            const stored = await db.getById('123');
            expect(stored!.belief).toBe('Test belief');
         });

         it('dirty stays null on add', async () => {
            await db.add(entry);
            expect((await db.getById('123'))!.dirtySince).toBeNull();
         });

         it('duplicate id on add', async () => {
            await db.add(entry);
            await expect(db.add(entry)).rejects.toThrow();
         });
      });

      describe('READ', () => {
         it('getById returns null when missing', async () => {
            expect(await db.getById('missing')).toBeNull();
         });

         it('getAll ordering is by createdAt DESC', async () => {
            const a = { ...entry, id: 'a' };
            await db.add(a);
            clock.advanceMs(1000);
            const b = {
               ...entry,
               id: 'b',
               createdAt: clock.nowIso(),
               updatedAt: clock.nowIso(),
            };
            await db.add(b);
            const all = await db.getAll();
            expect(all.map((e) => e.id)).toEqual(['b', 'a']);
         });

         it('getAll returns copies (no external mutation)', async () => {
            await db.add(entry);
            const [e] = await db.getAll();
            e.belief = 'mutated';
            const again = await db.getAll();
            expect(again[0].belief).not.toBe('mutated');
         });

         it('text data robustness', async () => {
            await db.add({
               ...entry,
               id: 'u',
               adversity: '仕事🙂',
               belief: 'café',
            });
            const got = await db.getById('u');
            expect(got!.adversity).toBe('仕事🙂');
         });
         it('persists analysis JSON and returns clones', async () => {
            const analysis = {
               dimensions: {
                  permanence: {
                     score: 'optimistic',
                     detectedPhrase: 'phrase a',
                     insight: 'insight a',
                  },
                  pervasiveness: {
                     score: 'pessimistic',
                     detectedPhrase: 'phrase b',
                     insight: 'insight b',
                  },
                  personalization: {
                     score: 'mixed',
                     detectedPhrase: 'phrase c',
                     insight: 'insight c',
                  },
               },
               emotionalLogic: 'sample logic',
            };

            await db.add({ ...entry, id: 'an1', analysis });
            const saved = await db.getById('an1');
            expect(saved?.analysis).toEqual(analysis);

            if (saved?.analysis) {
               saved.analysis.emotionalLogic = 'changed';
            }

            const again = await db.getById('an1');
            expect(again?.analysis?.emotionalLogic).toBe('sample logic');
         });
         it('getAll excludes deleted but getById still returns them', async () => {
            await db.add(entry);
            await db.remove('123');
            const all = await db.getAll();
            expect(all.find((e) => e.id === '123')).toBeUndefined(); // excluded
            const soft = await db.getById('123');
            expect(soft?.isDeleted).toBe(true); // still retrievable
         });
      });

      describe('UPDATE', () => {
         it('update missing id', async () => {
            await expect(db.update('nope', { belief: 'Z' })).rejects.toThrow(
               /not found/i
            );
         });

         it('createdAt never changes on update', async () => {
            await db.add(entry);
            const created = (await db.getById('123'))!.createdAt;
            clock.advanceMs(1000);
            const updated = await db.update('123', { belief: 'Z' });
            expect(updated.createdAt).toBe(created);
         });

         it('updates should bump updatedAt', async () => {
            const initial = clock.nowIso();

            // add entry at start time
            const before = await db.add(entry);

            // advance the clock
            clock.advanceMs(60_000); // +1 min

            // update entry
            const updated = await db.update('123', { belief: 'Z' });

            // prove time changed
            expect(before.updatedAt).toBe(initial);
            expect(updated.createdAt).toBe(initial);
            expect(updated.updatedAt).toBe(clock.nowIso());
            expect(updated.belief).toBe('Z');
            expect(updated.dirtySince).toBe(clock.nowIso());
         });

         it('second update keeps original dirtySince', async () => {
            await db.add(entry);

            clock.advanceMs(1000);
            const u1 = await db.update('123', { belief: 'B2' });
            const firstDirty = u1.dirtySince;

            clock.advanceMs(1000);
            const u2 = await db.update('123', { belief: 'B3' });
            expect(u2.dirtySince).toBe(firstDirty); // unchanged
            expect(u2.updatedAt).toBe(clock.nowIso()); // bumped
         });

         it('update doesnt unset fields when patch omits them', async () => {
            await db.add(entry);
            clock.advanceMs(1000);
            const updated = await db.update('123', {}); // empty patch
            expect(updated.belief).toBe(entry.belief);
         });
         it('empty patch keeps values, bumps updatedAt, and sets dirtySince on first change', async () => {
            await db.add(entry);
            const before = await db.getById('123');
            clock.advanceMs(1000);
            const updated = await db.update('123', {}); // empty patch considered an update
            expect(updated.belief).toBe(before!.belief); // unchanged fields
            expect(updated.updatedAt).toBe(clock.nowIso()); // bumped
            // dirtySince set now if it was null before (first change)
            if (before!.dirtySince === null) {
               expect(updated.dirtySince).toBe(clock.nowIso());
            } else {
               expect(updated.dirtySince).toBe(before!.dirtySince);
            }
         });
      });

      describe('DELETE', () => {
         it('clear removes all rows', async () => {
            await db.add(entry);
            await db.clear();
            expect((await db.getAll()).length).toBe(0);
         });
         it('remove is idempotent', async () => {
            await db.add(entry);
            await db.remove('123');
            await expect(db.remove('123')).resolves.toBeUndefined();
         });

         it('remove keeps createdAt stable', async () => {
            await db.add(entry);
            const created = (await db.getById('123'))!.createdAt;
            clock.advanceMs(1000);
            await db.remove('123');
            expect((await db.getById('123'))!.createdAt).toBe(created);
         });

         it('marks entry as deleted and sets dirtySince', async () => {
            await db.add(entry);

            const before = await db.getById('123');

            clock.advanceMs(60_000); // 👈 prove a new time
            await db.remove('123');

            const after = await db.getById('123');
            expect(after?.isDeleted).toBe(true);
            expect(before?.dirtySince).toBeNull();
            expect(after?.dirtySince).toBe(clock.nowIso());
            expect(after?.updatedAt).toBe(clock.nowIso());
            expect(after?.updatedAt).not.toBe(before?.updatedAt);
         });

         it('second remove still idempotent and keep first dirtySince', async () => {
            await db.add(entry);
            clock.advanceMs(1000);
            await db.remove('123');
            const first = await db.getById('123');
            clock.advanceMs(1000);
            await db.remove('123');
            const second = await db.getById('123');
            expect(second!.dirtySince).toBe(first!.dirtySince); // unchanged
         });
      });
   });
});
