import { Entry } from "@/models/entry";

export interface EntriesAdapter {
   getAll(): Promise<Entry[]>;
   getById(id: string): Promise<Entry | null>;
   add(entry: Entry): Promise<Entry>;
   update(id: string, patch: Partial<Entry>): Promise<Entry>;
   remove(id: string): Promise<void>;
   clear(): Promise<void>;
}
