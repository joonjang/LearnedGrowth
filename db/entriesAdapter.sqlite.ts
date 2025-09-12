import { Clock } from "@/lib/clock";
import { Entry } from "@/models/entry";
import { EntriesAdapter } from "./entriesAdapter";

export class SQLEntriesAdapter implements EntriesAdapter {
  private entries: Entry[] = [];
  private clock: Clock;

  // keep db param to match real constructor signature
  constructor(_db: unknown, clock: Clock) {
    this.clock = clock;
  }

  async getAll(): Promise<Entry[]> {
    // return copies to avoid accidental external mutation
    return this.entries.map(e => ({ ...e }));
  }

  async getById(id: string): Promise<Entry | null> {
    const found = this.entries.find(e => e.id === id);
    return found ? { ...found } : null;
  }

  async add(entry: Entry): Promise<Entry> {
    // assume caller set createdAt/updatedAt; leave as-is in stub
    this.entries.push({ ...entry });
    return { ...entry };
  }

  async update(id: string, patch: Partial<Entry>): Promise<Entry> {
    const i = this.entries.findIndex(e => e.id === id);
    if (i === -1) throw new Error(`Entry ${id} not found`);

    const now = this.clock.nowIso();
    const current = this.entries[i];

    const merged: Entry = {
      ...current,
      ...patch,
      // mark as dirty if it wasn't already
      dirtySince: current.dirtySince ?? now,
      updatedAt: now,
    };

    this.entries[i] = merged;
    return { ...merged };
  }

  async remove(id: string): Promise<void> {
    const i = this.entries.findIndex(e => e.id === id);
    if (i === -1) return;

    const now = this.clock.nowIso();
    const current = this.entries[i];

    this.entries[i] = {
      ...current,
      isDeleted: true,
      dirtySince: current.dirtySince ?? now,
      updatedAt: now,
    };
  }

  async clear(): Promise<void> {
    this.entries = [];
  }

  // test helper
  resetStubEntries() {
    this.entries = [];
  }
}