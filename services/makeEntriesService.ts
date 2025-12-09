import { Clock } from '@/lib/clock';
import { EntriesAdapter } from '@/models/entriesAdapter';
import { EntriesService } from '@/models/entriesService';
import { Entry, NewEntry } from '@/models/entry';
import * as svc from './entriesService';
import { SupabaseEntriesClient } from './supabaseEntries';

export function makeEntriesService(
   adapter: EntriesAdapter,
   clock: Clock,
   cloud?: SupabaseEntriesClient | null
): EntriesService {
   return {
      listEntries: () => svc.listEntries(adapter),
      createEntry: (data: NewEntry) => svc.createEntry(adapter, data, clock, cloud),
      updateEntry: (id: string, patch: Partial<Entry>) =>
         svc.updateEntry(adapter, id, patch, clock, cloud),
      removeEntry: (id: string) => svc.removeEntry(adapter, id, clock, cloud),
   };
}
