import { Clock } from '@/lib/clock';
import { EntriesAdapter } from '@/models/entriesAdapter';
import { Entry, NewEntry } from '@/models/entry';
import * as Crypto from 'expo-crypto';
import { SupabaseEntriesClient } from './supabaseEntries';

export function listEntries(adapter: EntriesAdapter): Promise<Entry[]> {
    return adapter.getAll()
}

export function createEntry(
   adapter: EntriesAdapter,
   data: NewEntry, 
   clock: Clock,
   cloud?: SupabaseEntriesClient | null
): Promise<Entry> {
    const now = clock.nowIso();
    const entry: Entry = {
        ...data,
        aiResponse: null,
        aiRetryCount: 0,
        id: Crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        dirtySince: null,
        isDeleted: false
    }
    return adapter.add(entry).then((created)=>{
      cloud?.upsert(created).catch((err)=>console.warn("cloud upsert (create) failed", err));
      return created;
    });
}
export function updateEntry(
  adapter: EntriesAdapter,
  id: string,
  patch: Partial<Entry>,
  clock: Clock,
  cloud?: SupabaseEntriesClient | null
): Promise<Entry> {
    const now = clock.nowIso();
    const updatedEntry: Partial<Entry> = {
        ...patch,
        updatedAt: now,
        dirtySince: patch.dirtySince ?? now
    }
    return adapter.update(id, updatedEntry).then((updated)=>{
      cloud?.upsert(updated).catch((err)=>console.warn("cloud upsert (update) failed", err));
      return updated;
    });
}
export function removeEntry(
  adapter: EntriesAdapter,
  id: string,
  _clock: Clock,
  cloud?: SupabaseEntriesClient | null
): Promise<void> {
    return adapter.remove(id).then(()=>{
      cloud?.remove(id).catch((err)=>console.warn("cloud delete failed", err));
    });
}
