import { Clock } from '@/lib/clock';
import { EntriesAdapter } from '@/models/entriesAdapter';
import { Entry, NewEntry } from '@/models/entry';
import * as Crypto from 'expo-crypto';

export function listEntries(adapter: EntriesAdapter): Promise<Entry[]> {
    return adapter.getAll()
}

export function createEntry(
   adapter: EntriesAdapter,
   data: NewEntry, 
   clock: Clock
): Promise<Entry> {
    const now = clock.nowIso();
    const entry: Entry = {
        ...data,
        analysis: null,
        counterBelief: null,
        id: Crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        dirtySince: null,
        isDeleted: false
    }
    return adapter.add(entry);
}
export function updateEntry(adapter: EntriesAdapter, id: string, patch: Partial<Entry>, clock: Clock): Promise<Entry> {
    const now = clock.nowIso();
    const updatedEntry: Partial<Entry> = {
        ...patch,
        updatedAt: now,
        dirtySince: patch.dirtySince ?? now
    }
    return adapter.update(id, updatedEntry);
}
export function removeEntry(adapter: EntriesAdapter, id: string): Promise<void> {
    return adapter.remove(id);
}
