import { create, StoreApi, UseBoundStore } from 'zustand';
import { Clock } from '@/lib/clock';
import { EntriesService } from '@/models/entriesService';
import { Entry } from '@/models/entry';
import { EntriesState, PendingOp, PendKind } from '@/models/entryState';

export type EntriesStore = UseBoundStore<StoreApi<EntriesState>>;

// ---------- pure helpers (no state) ----------
function normalizeEntries(list: Entry[]) {
   const byId: Record<string, Entry> = {};
   const allIds: string[] = [];
   for (const e of list) {
      byId[e.id] = e;
      allIds.push(e.id);
   }
   return { byId, allIds };
}
const filterNotDeleted = (list: Entry[]) =>
   list.filter((e) => e.isDeleted !== true);
function sortByUpdatedDesc(list: Entry[]) {
   return [...list].sort((a, b) => {
      const diff =
         new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      if (diff !== 0) return diff;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
   });
}
function sortByCreatedDesc(list: Entry[]) {
   return [...list].sort((a, b) => {
      const diff =
         new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (diff !== 0) return diff;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
   });
}


// ---------- store ----------
export function createEntriesStore(
   service: EntriesService,
   clock: Clock
): EntriesStore {
   return create<EntriesState>()((set, get) => {
      // --- helpers that USE set/get ---
      function putError(id: string | 'global', e: any) {
         const msg = String(e?.message ?? e);
         set((s) => ({ errors: { ...s.errors, [id]: msg } }));
      }
      function dropError(id: string | 'global') {
         set((s) => {
            if (!(id in s.errors)) return {};
            const next = { ...s.errors };
            delete next[id];
            return { errors: next };
         });
      }
      function setPending(id: string, op: PendKind, payload?: Partial<Entry>) {
         set((s) => ({
            pending: {
               ...s.pending,
               [id]: {
                  op,
                  submittedAt: clock.nowIso(),
                  payload,
               } as PendingOp,
            },
         }));
      }
      function clearPending(id: string) {
         set((s) => {
            if (!s.pending[id]) return {};
            const p = { ...s.pending };
            delete p[id];
            return { pending: p };
         });
      }

      function removeId(
         id: string,
         opts: { clearPending?: boolean; clearError?: boolean } = {}
      ) {
         set((s) => {
            if (!(id in s.byId)) return {};
            const { [id]: _omit, ...byId } = s.byId;
            const allIds = s.allIds.filter((x) => x !== id);
            const next: Partial<EntriesState> = { byId, allIds };
            if (opts.clearPending && s.pending[id]) {
               const p = { ...s.pending };
               delete p[id];
               next.pending = p;
            }
            if (opts.clearError && s.errors[id]) {
               const e = { ...s.errors };
               delete e[id];
               next.errors = e;
            }
            return next;
         });
      }

      function bumpFetchSeq() {
         set((s) => ({ hydrateRequestId: s.hydrateRequestId + 1 }));
         return get().hydrateRequestId; // the new one
      }
      function isStale(reqId: number) {
         return get().hydrateRequestId !== reqId;
      }
      function setByUpdated(insert: Entry) {
         set((s) => {
            const nextById = { ...s.byId, [insert.id]: insert };
            const { byId, allIds } = normalizeEntries(
               sortByUpdatedDesc(
                  filterNotDeleted(Object.values(nextById)))
            );
            return { byId, allIds };
         });
      }
      function setByCreated(insert: Entry) {
         set((s) => {
            const nextById = { ...s.byId, [insert.id]: insert };
            const { byId, allIds } = normalizeEntries(
               sortByCreatedDesc(
                  filterNotDeleted(Object.values(nextById)))
            );
            return { byId, allIds };
         });
      }

      // --- store state + actions ---
      return {
         // state
         byId: {},
         allIds: [],
         pending: {},
         errors: {},
         isHydrating: false,
         lastHydratedAt: null,
         hydrateRequestId: 0,

         // actions
         async hydrate() {
            const reqId = bumpFetchSeq();
            set({ isHydrating: true });

            try {
               const rows = await service.listEntries();
               if (isStale(reqId)) return;

               const filtered = filterNotDeleted(rows);
               const ordered = sortByCreatedDesc(filtered);
               const { byId, allIds } = normalizeEntries(ordered);

               set({
                  byId,
                  allIds,
                  lastHydratedAt: clock.nowIso(),
                  isHydrating: false,
               });
               dropError('global');
            } catch (e: any) {
               if (isStale(reqId)) return;
               set({ isHydrating: false });
               putError('global', e);
            }
         },

         async refresh() {
            const reqId = bumpFetchSeq();
            try {
               const persisted = await service.listEntries();
               if (isStale(reqId)) return;

               const incoming = filterNotDeleted(persisted);
               const nextById = { ...get().byId };

               for (const e of incoming) {
                  if (get().pending[e.id]) continue; // skip in-flight locals
                  const local = nextById[e.id];
                  if (!local || e.updatedAt > local.updatedAt)
                     nextById[e.id] = e;
               }

               const ordered = sortByCreatedDesc(
                  filterNotDeleted(Object.values(nextById))
               );
               const { byId, allIds } = normalizeEntries(ordered);
               if (isStale(reqId)) return;
               set({ byId, allIds });
               dropError('global');
            } catch (e: any) {
               if (isStale(reqId)) return;
               putError('global', e);
            }
         },

         async create(draft: Entry) {
            // optimistic insert
            setByCreated(draft);
            setPending(draft.id, 'create', draft);

            try {
               const saved = await service.createEntry(draft);
               // success: drop temp id, clear pending/error, then insert saved
               removeId(draft.id, { clearPending: true, clearError: true });
               setByCreated(saved);
               return saved;
            } catch (e: any) {
               // failure: rollback temp id, clear pending, record error
               removeId(draft.id, { clearPending: true });
               putError(draft.id, e);
               throw e;
            }
         },

         async update(id: string, patch: Partial<Entry>) {
            if (get().pending[id])
               throw new Error(`update already in flight for ${id}`);

            const old = get().byId[id];
            setPending(id, 'update', patch);

            // optimistic patch (sync)
            setByCreated({ ...old, ...patch });

            try {
               const saved = await service.updateEntry(id, {
                  ...old,
                  ...patch,
               });
                  
               setByCreated(saved);
               dropError(id);
               clearPending(id);
               return saved;
            } catch (e: any) {
               // rollback & error
               set((s) => ({ byId: { ...s.byId, [id]: old } }));
               putError(id, e);
               clearPending(id);
               throw e;
            }
         },

         async remove(id: string) {
            const old = get().byId[id];
            if (!old) return;
            if (get().pending[id])
               throw new Error(`remove already in flight for ${id}`);
            try {
               set((s) => ({
                  byId: { ...s.byId, [id]: { ...old, isDeleted: true } },
                  allIds: s.allIds.filter((x) => x !== id),
               }));
               setPending(id, 'remove', { isDeleted: true });
               await service.removeEntry(id);
               // if something else (like restore) changed the pending op, bail
               if (get().pending[id]?.op !== 'remove') return;

               const current = get().byId[id];
               if (current && current.isDeleted) {
                  set((s) => {
                     const { [id]: _, ...byId } = s.byId;
                     return { byId, allIds: s.allIds.filter((x) => x !== id) };
                  });
               }

               clearPending(id);
               dropError(id);
            } catch (e: any) {
               if (get().pending[id]?.op !== 'remove') {
                  putError(id, e);
                  throw e;
               }
               set((s) => {
                  const next = { ...s.byId, [id]: old };
                  const { byId, allIds } = normalizeEntries(
                     sortByCreatedDesc(filterNotDeleted(Object.values(next)))
                  );
                  return { byId, allIds };
               });
               clearPending(id);
               putError(id, e);
               throw e;
            }
         },

         async restore(entry: Entry) {
            const previous = get().byId[entry.id];
            const revived: Entry = {
               ...entry,
               isDeleted: false,
            };

            set((s) => {
               const next = { ...s.byId, [entry.id]: revived };
               const { byId, allIds } = normalizeEntries(
                  sortByCreatedDesc(
                     filterNotDeleted(Object.values(next))
                  )
               );
               return { byId, allIds };
            });

            setPending(entry.id, 'update', { isDeleted: false });

            try {
               const saved = await service.updateEntry(entry.id, {
                  isDeleted: false,
               });

               setByCreated(saved);
               dropError(entry.id);
               clearPending(entry.id);
               return saved;
            } catch (e: any) {
               set((s) => {
                  if (previous) {
                     const next = { ...s.byId, [entry.id]: previous };
                     const { byId, allIds } = normalizeEntries(
                        sortByCreatedDesc(
                           filterNotDeleted(Object.values(next))
                        )
                     );
                     return { byId, allIds };
                  }
                  const { [entry.id]: _, ...byId } = s.byId;
                  return { byId, allIds: s.allIds.filter((x) => x !== entry.id) };
               });
               clearPending(entry.id);
               putError(entry.id, e);
               throw e;
            }
         },

         clearErrors() {
            set({ errors: {} });
         },
      };
   });
}


export const placeholderEntriesStore = create<EntriesState>(() => ({
  byId: {},
  allIds: [],
  pending: {},
  errors: {},
  isHydrating: false,
  lastHydratedAt: null,
  hydrateRequestId: 0,

  // no-ops (safe defaults)
  async hydrate() {},
  async refresh() {},
  async create() { throw new Error("Entries store not ready"); },
  async update() { throw new Error("Entries store not ready"); },
  async remove() { throw new Error("Entries store not ready"); },
  async restore() { throw new Error("Entries store not ready"); },
  clearErrors() {}
})); 
