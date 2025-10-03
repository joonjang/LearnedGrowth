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
     
      try {

      } catch (err: any) {
          console.log(err)
      }
    },

    async refresh() {
      try {

      } catch (err: any) {
          console.log(err)
      }
    },

    async create(draft: Entry) {
      try {
        
      } catch (err: any) {
          console.log(err)
      }
      return {} as any;
    },

    async update(id: string, patch: Partial<Entry>) {
      try {
        
      } catch (err: any) {
          console.log(err)
      }
      return {} as any;
    },

    async remove(id: string) {
      try {
        
      } catch (err: any) {
          console.log(err)
      }
    },

    clearErrors() {
      try {
        
      } catch (err: any) {
          console.log(err)
      }
    }
  }));
}

// export const useEntriesStore = createEntriesStore({adapter, clock});
