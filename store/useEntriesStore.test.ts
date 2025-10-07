// useEntriesStore.test.ts

import { EntriesService } from '@/models/entriesService';
import { Entry } from '@/models/entry';
import { EntriesState } from '@/models/entryState';
import { customEntry } from '@/test-utils/builders';
import {
   makeEntriesServiceMock,
   storeGetEntryId,
   storeHasError,
   storeHasPending,
} from '@/test-utils/makeEntriesServiceMock';
import { TestClock } from '@/test-utils/testClock';
import { StoreApi, UseBoundStore } from 'zustand';
import { createEntriesStore } from './useEntriesStore';

describe('useEntries store tests', () => {
   let clock: TestClock;
   let store: UseBoundStore<StoreApi<EntriesState>>;
   let service: jest.Mocked<EntriesService>;

   beforeEach(() => {
      service = makeEntriesServiceMock();
      clock = new TestClock(); // provides clock.nowIso()
      store = createEntriesStore(service, clock);
      jest.clearAllMocks();
   });

   describe('hydrate()', () => {
      it('loads entries, filters soft-deleted, sorts by updatedAt DESC, sets lastHydratedAt', async () => {
         const E1 = customEntry({
            id: 'e1',
            updatedAt: '2025-01-01T00:00:10.000Z',
         });
         const E2 = customEntry({
            id: 'e2',
            isDeleted: true,
            updatedAt: '2025-01-01T00:00:20.000Z',
         });
         const E3 = customEntry({
            id: 'e3',
            updatedAt: '2025-01-01T00:00:05.000Z',
         });

         service.listEntries.mockResolvedValueOnce([E1, E2, E3]);

         expect(store.getState().lastHydratedAt).toBeNull();

         const p = store.getState().hydrate();
         expect(store.getState().isHydrating).toBe(true);

         await p;

         const st = store.getState();
         expect(service.listEntries).toHaveBeenCalledTimes(1);
         expect(st.isHydrating).toBe(false);
         expect(st.lastHydratedAt).toBe(clock.nowIso());
         // E2 filtered, E1 before E3 due to updatedAt DESC
         expect(st.allIds).toEqual(['e1', 'e3']);
         expect(st.byId['e1']).toMatchObject({ id: 'e1', isDeleted: false });
         expect(st.byId['e3']).toMatchObject({ id: 'e3', isDeleted: false });
         expect(st.byId['e2']).toBeUndefined();
         expect(storeHasError(store)).toBe(false);
      });

      it('records global error on failure and keeps prior state', async () => {
         // Seed a prior good state
         service.listEntries.mockResolvedValueOnce([
            customEntry({ id: 'seed' }),
         ]);
         await store.getState().hydrate();

         // Next hydrate fails
         service.listEntries.mockRejectedValueOnce(new Error('boom'));
         await store.getState().hydrate();

         const st = store.getState();
         expect(st.isHydrating).toBe(false);
         expect(storeHasError(store, 'global')).toBe(true);
         // Prior state preserved
         expect(st.byId['seed']).toBeDefined();
      });

      it('replaces state with empty list when service returns []', async () => {
         // seed
         service.listEntries.mockResolvedValueOnce([customEntry({ id: 'e1' })]);
         await store.getState().hydrate();

         // hydrate → empty
         service.listEntries.mockResolvedValueOnce([]);
         await store.getState().hydrate();

         const st = store.getState();
         expect(st.byId).toEqual({});
         expect(st.allIds).toEqual([]);
      });

      it('updates lastHydratedAt using clock; overlapping calls toggle correctly', async () => {
         // lastHydratedAt changes across hydrates
         service.listEntries.mockResolvedValueOnce([customEntry({ id: 'e1' })]);
         await store.getState().hydrate();
         const first = store.getState().lastHydratedAt;

         clock.advanceMs(1000);
         service.listEntries.mockResolvedValueOnce([customEntry({ id: 'e1' })]);
         await store.getState().hydrate();
         expect(store.getState().lastHydratedAt).not.toBe(first);
         expect(store.getState().lastHydratedAt).toBe(clock.nowIso());
      });

      it('isHydrating toggles correctly with overlapping hydrate calls (stable with fake timers)', async () => {
         jest.useFakeTimers();
         service.listEntries.mockImplementation(
            () => new Promise((res) => setTimeout(() => res([]), 50))
         );

         const p1 = store.getState().hydrate();
         const p2 = store.getState().hydrate(); // second call during first
         expect(store.getState().isHydrating).toBe(true);

         jest.advanceTimersByTime(60);
         await Promise.all([p1, p2]);

         expect(store.getState().isHydrating).toBe(false);
         jest.useRealTimers();
      });

      it('hydrate resolves out-of-order without stale overwrite', async () => {
         let r1!: (v: Entry[]) => void;
         let r2!: (v: Entry[]) => void;

         service.listEntries
            .mockImplementationOnce(() => new Promise((res) => (r1 = res)))
            .mockImplementationOnce(() => new Promise((res) => (r2 = res)));

         const p1 = store.getState().hydrate(); // older
         const p2 = store.getState().hydrate(); // newer

         // Newer resolves first:
         r2([customEntry({ id: 'new' })]);
         await p2;

         // Older resolves late:
         r1([customEntry({ id: 'old' })]);
         await p1;

         // Expect final state matches the last call (newer)
         expect(store.getState().allIds).toEqual(['new']);
      });
   });

   describe('refresh() (non-blocking)', () => {
      it('merges latest when no pending; does not toggle isHydrating', async () => {
         const oldE1 = customEntry({
            id: 'e1',
            adversity: 'old',
            updatedAt: '2025-01-01T00:00:00.000Z',
         });
         const newE1 = customEntry({
            id: 'e1',
            adversity: 'new',
            updatedAt: '2025-01-01T00:00:10.000Z',
         });

         service.listEntries.mockResolvedValueOnce([oldE1]);
         await store.getState().hydrate();

         service.listEntries.mockResolvedValueOnce([newE1]);
         const p = store.getState().refresh();

         // Non-blocking: should NOT flip isHydrating
         expect(store.getState().isHydrating).toBe(false);

         await expect(p).resolves.toBeUndefined();

         const st = store.getState();
         expect(service.listEntries).toHaveBeenCalledTimes(2);
         expect(st.byId['e1']).toMatchObject({ id: 'e1', adversity: 'new' });
         expect(st.errors.global).toBeUndefined(); // success clears global error (if any)
      });

      it('does not clobber entries that have a pending update', async () => {
         const serverOld = customEntry({ id: 'e1', adversity: 'old' });

         // initial hydrate
         service.listEntries.mockResolvedValueOnce([serverOld]);
         await store.getState().hydrate();

         // Keep the first update pending:
         let resolveUpdate!: (v: Entry) => void;
         service.updateEntry.mockImplementationOnce(
            () => new Promise<Entry>((res) => (resolveUpdate = res))
         );
         const pUpdate = store.getState().update('e1', { adversity: 'local' });

         // While pending, server still has old
         service.listEntries.mockResolvedValueOnce([serverOld]);
         await store.getState().refresh();

         // Assert: local optimistic value preserved, still pending
         let st = store.getState();
         expect(st.byId['e1'].adversity).toBe('local');
         expect(st.pending['e1']).toBeDefined();

         // Now finish the update:
         resolveUpdate(customEntry({ id: 'e1', adversity: 'local' }));
         await pUpdate;

         st = store.getState();
         expect(st.pending['e1']).toBeUndefined();
      });

      it('records global error and leaves state intact on failure', async () => {
         const e1 = customEntry({ id: 'e1' });
         service.listEntries.mockResolvedValueOnce([e1]);
         await store.getState().hydrate();

         service.listEntries.mockRejectedValueOnce(new Error('boom'));
         await store.getState().refresh();

         const st = store.getState();
         expect(st.byId['e1']).toBeDefined(); // preserved
         expect(st.errors.global).toBeDefined();
         expect(st.isHydrating).toBe(false);
      });

      it('preserves ordering rule (updatedAt DESC) after refresh', async () => {
         const a = customEntry({
            id: 'a',
            updatedAt: '2025-01-01T00:00:00.000Z',
         });
         const b = customEntry({
            id: 'b',
            updatedAt: '2025-01-01T00:00:10.000Z',
         });
         service.listEntries.mockResolvedValueOnce([a, b]);
         await store.getState().hydrate();

         // server repeats same list; store still sorts
         service.listEntries.mockResolvedValueOnce([a, b]);
         await store.getState().refresh();

         expect(store.getState().allIds).toEqual(['b', 'a']);
      });
   });

   describe('create()', () => {
      it('optimistic + success commits canonical entry', async () => {
         const draft = customEntry({
            id: 'temp-id',
            createdAt: clock.nowIso(),
            updatedAt: clock.nowIso(),
         });
         const canonical = customEntry({
            id: 'e100',
            belief: 'server',
            updatedAt: '2025-09-28T01:00:00.000Z',
         });

         service.createEntry.mockResolvedValueOnce(canonical);

         const promise = store.getState().create(draft);

         // optimistic state
         expect(storeGetEntryId(store, 'temp-id')).toBeTruthy();
         expect(storeHasPending(store, 'temp-id')).toBe(true);

         const committed = await promise;

         expect(service.createEntry).toHaveBeenCalledTimes(1);
         expect(store.getState().isHydrating).toBe(false);

         // committed state
         expect(committed).toEqual(canonical);
         expect(store.getState().byId['e100']).toMatchObject(canonical);
         expect(store.getState().allIds[0]).toBe('e100');
         expect(storeHasPending(store, 'temp-id')).toBe(false);
         expect(storeHasError(store, 'e100')).toBe(false);

         const st = store.getState();
         expect(st.byId['temp-id']).toBeUndefined();
         expect(st.allIds).not.toContain('temp-id');
         expect(st.allIds.filter((id) => id === 'e100')).toHaveLength(1);
         expect(Object.keys(st.pending)).toHaveLength(0);
      });

      it('optimistic + failure rolls back and records error', async () => {
        const draft = customEntry({
            id: 'fail-id',
            createdAt: clock.nowIso(),
            updatedAt: clock.nowIso(),
         });
         service.createEntry.mockRejectedValueOnce(new Error('nope'));

         const promise = store.getState().create(draft);

         // optimistic
         expect(storeGetEntryId(store, 'fail-id')).toBeTruthy();
         expect(storeHasPending(store, 'fail-id')).toBe(true);

         // mutate unrelated state to ensure rollback is precise
         store.setState((s) => ({
            byId: { ...s.byId, a: customEntry({ id: 'a' }) },
            allIds: ['a', ...s.allIds],
         }));

         await expect(promise).rejects.toThrow();

         expect(store.getState().byId['a']).toBeDefined();
         

         // rollback
         expect(storeGetEntryId(store, 'fail-id')).toBeUndefined();
         expect(storeHasPending(store, 'fail-id')).toBe(false);
         expect(storeHasError(store, 'fail-id')).toBe(true);
      });

      it('parallel creates do not interfere', async () => {
         const d1 = customEntry({ id: 't1' });
         const d2 = customEntry({ id: 't2' });
         service.createEntry
            .mockResolvedValueOnce(customEntry({ id: 'e1' }))
            .mockResolvedValueOnce(customEntry({ id: 'e2' }));

         const p1 = store.getState().create(d1);
         const p2 = store.getState().create(d2);

         expect(storeHasPending(store, 't1')).toBe(true);
         expect(storeHasPending(store, 't2')).toBe(true);

         await Promise.all([p1, p2]);

         expect(store.getState().allIds).toEqual(
            expect.arrayContaining(['e1', 'e2'])
         );
         expect(Object.keys(store.getState().pending)).toHaveLength(0);
      });
   });

   describe('update()', () => {
      it('optimistic patch then commits canonical on success', async () => {
         const E1 = customEntry();
         service.listEntries.mockResolvedValueOnce([E1]);
         await store.getState().hydrate();

         const canonical = customEntry({
            belief: 'new',
            updatedAt: '2025-09-28T01:00:00.000Z',
         });
         service.updateEntry.mockResolvedValueOnce(canonical);

         const p = store.getState().update('e1', { belief: 'new' });

         // optimistic
         expect(store.getState().byId['e1'].belief).toBe('new');
         expect(store.getState().pending['e1']).toMatchObject({ op: 'update' });

         const committed = await p;

         expect(committed).toEqual(canonical);
         expect(store.getState().byId['e1']).toMatchObject(canonical);
         expect(store.getState().pending['e1']).toBeUndefined();
         expect(store.getState().errors['e1']).toBeUndefined();
      });

      it('rollback to pre-image on failure and records error', async () => {
         const E1 = customEntry({ belief: 'old' });
         service.listEntries.mockResolvedValueOnce([E1]);
         await store.getState().hydrate();

         service.updateEntry.mockRejectedValueOnce(new Error('update failed'));

         const p = store.getState().update('e1', { belief: 'new' });

         // optimistic
         expect(store.getState().byId['e1'].belief).toBe('new');
         expect(store.getState().pending['e1']).toBeTruthy();

         await expect(p).rejects.toThrow('update failed');

         // rollback
         expect(store.getState().byId['e1'].belief).toBe('old');
         expect(store.getState().pending['e1']).toBeUndefined();
         expect(store.getState().errors['e1']).toBeTruthy();
      });

      it('blocks a second update on same id while first is pending (simple guard)', async () => {
         const E1 = customEntry({ belief: 'A' });
         service.listEntries.mockResolvedValueOnce([E1]);
         await store.getState().hydrate();

         // First update never resolves
         service.updateEntry.mockImplementationOnce(
            () => new Promise<Entry>(() => {})
         );
         void store.getState().update('e1', { belief: 'B' });

         await expect(
            store.getState().update('e1', { belief: 'C' })
         ).rejects.toThrow(/pending|in[- ]flight|busy/i);

         expect(Object.keys(store.getState().pending)).toEqual(['e1']);
         expect(store.getState().byId['e1'].belief).toBe('B'); // optimistic from first
         expect(store.getState().pending['e1']).toBeTruthy();
      });
   });

   describe('remove()', () => {
      it('optimistic soft-delete then commits on success', async () => {
         const E1 = customEntry({ id: 'e1', isDeleted: false });
         service.listEntries.mockResolvedValueOnce([E1]);
         await store.getState().hydrate();

         service.removeEntry.mockResolvedValueOnce(undefined);

         const p = store.getState().remove('e1');

         // optimistic
         const s1 = store.getState();
         expect(s1.byId['e1'].isDeleted).toBe(true);
         expect(s1.pending['e1']).toMatchObject({ op: 'remove' });
         expect(s1.pending['e1'].submittedAt).toBe(clock.nowIso());

         await p;

         // committed
         const s2 = store.getState();
         expect(s2.pending['e1']).toBeUndefined();
         expect(s2.errors['e1']).toBeUndefined();
         expect(service.removeEntry).toHaveBeenCalledWith('e1');
         expect(service.removeEntry).toHaveBeenCalledTimes(1);
      });

      it('optimistic soft-delete then rolls back and records error on failure', async () => {
         const E1 = customEntry({ id: 'e1', isDeleted: false });
         service.listEntries.mockResolvedValueOnce([E1]);
         await store.getState().hydrate();

         service.removeEntry.mockRejectedValueOnce(new Error('remove failed'));

         const p = store.getState().remove('e1');

         // optimistic
         expect(store.getState().byId['e1'].isDeleted).toBe(true);
         expect(store.getState().pending['e1']).toBeTruthy();

         await expect(p).rejects.toThrow('remove failed');

         // rollback
         const s2 = store.getState();
         expect(s2.byId['e1'].isDeleted).toBe(false);
         expect(s2.pending['e1']).toBeUndefined();
         expect(typeof s2.errors['e1']).toBe('string');
         expect(s2.errors['e1']).toMatch(/remove failed/);
      });

      it('blocks remove if another op is pending for same id', async () => {
         const E1 = customEntry({ id: 'e1', belief: 'A' });
         service.listEntries.mockResolvedValueOnce([E1]);
         await store.getState().hydrate();

         // Start in-flight update
         service.updateEntry.mockImplementationOnce(
            () => new Promise<Entry>(() => {})
         );
         void store.getState().update('e1', { belief: 'B' });

         await expect(store.getState().remove('e1')).rejects.toThrow(
            /pending|in[- ]flight|busy/i
         );

         const s = store.getState();
         expect(s.byId['e1'].belief).toBe('B');
         expect(s.byId['e1'].isDeleted).toBe(false);
         expect(s.pending['e1']).toBeTruthy();
         expect(service.removeEntry).not.toHaveBeenCalled();
      });

      it('already-deleted: no-op and service not called', async () => {
         // Hydrate filters deleted; they won't be in the cache
         const E1 = customEntry({ id: 'e1', isDeleted: true });
         service.listEntries.mockResolvedValueOnce([E1]);
         await store.getState().hydrate();

         await expect(store.getState().remove('e1')).resolves.toBeUndefined();

         const s = store.getState();
         expect(s.byId['e1']).toBeUndefined();
         expect(s.pending['e1']).toBeUndefined();
         expect(s.errors['e1']).toBeUndefined();
         expect(service.removeEntry).not.toHaveBeenCalled();
      });
   });

   describe('clearErrors()', () => {
      it('removes per-entry errors', async () => {
         const E1 = customEntry({ id: 'e1' });

         service.listEntries.mockResolvedValueOnce([E1]);
         await store.getState().hydrate();

         // Simulate an error
         store.setState((s) => ({
            errors: { ...s.errors, e1: 'Update failed' },
         }));
         expect(store.getState().errors['e1']).toBe('Update failed');

         store.getState().clearErrors();

         expect(store.getState().errors['e1']).toBeUndefined();
         expect(store.getState().errors).toEqual({});
      });

      it('removes global error', () => {
         store.setState((s) => ({
            errors: { ...s.errors, global: 'Hydrate failed' },
         }));
         expect(store.getState().errors['global']).toBe('Hydrate failed');

         store.getState().clearErrors();

         expect(store.getState().errors['global']).toBeUndefined();
      });

      it('idempotent when errors is already empty', () => {
         expect(Object.keys(store.getState().errors)).toHaveLength(0);

         store.getState().clearErrors();

         expect(Object.keys(store.getState().errors)).toHaveLength(0);
      });

      it('merges errors: per-entry persists when global set', async () => {
         store.setState((s) => ({
            errors: { ...s.errors, e1: 'Update failed' },
         }));
         // simulate hydrate failure
         service.listEntries.mockRejectedValueOnce(new Error('boom'));
         await store.getState().hydrate();

         const e = store.getState().errors;
         expect(e.e1).toBe('Update failed');
         expect(e.global).toMatch(/boom/);
      });
   });
});
