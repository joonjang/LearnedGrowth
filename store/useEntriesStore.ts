import { Clock } from '@/lib/clock';
import { EntriesService } from '@/models/entriesService';
import { Entry } from '@/models/entry';
import { EntriesState } from '@/models/entryState';
import { create } from 'zustand';


export function createEntriesStore(service: EntriesService, clock: Clock ) {
   return create<EntriesState>()((set, get) => ({
    // --- state ---
    byId: {},
    allIds: [],
    pending: {},
    errors: {},
    isHydrating: false,
    lastHydratedAt: null,

    // --- actions (stubs) ---
    async hydrate() {
      set({ isHydrating: true });
      try {
        const entries = await service.listEntries();
        const byId: Record<string, Entry> = {};
        const allIds: string[] = [];
        for (const e of entries) {
          byId[e.id] = e;
          allIds.push(e.id);
        }
        set({
          byId,
          allIds,
          lastHydratedAt: clock.nowIso(),
          isHydrating: false,
        });
      } catch (err: any) {
        set({ errors: { global: err.message ?? String(err) }, isHydrating: false });
      }
    },

    async refresh() {
      // often just an alias to hydrate
      return get().hydrate();
    },

    async create(draft: Entry) {
      const created = await service.createEntry(draft);
      set((s) => ({
        byId: { ...s.byId, [created.id]: created },
        allIds: [created.id, ...s.allIds],
      }));
      return created;
    },

    async update(id: string, patch: Partial<Entry>) {
      const updated = await service.updateEntry(id, patch);
      set((s) => ({
        byId: { ...s.byId, [id]: updated },
      }));
      return updated;
    },

    async remove(id: string) {
      await service.removeEntry(id);
      set((s) => {
        const next = { ...s.byId };
        delete next[id];
        return {
          byId: next,
          allIds: s.allIds.filter((x) => x !== id),
        };
      });
    },

    clearErrors() {
      set({ errors: {} });
    }
  }));
}

// export const useEntriesStore = createEntriesStore({adapter, clock});
