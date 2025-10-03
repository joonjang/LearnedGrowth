import { Entry } from "./entry";

export type EntriesService = {
  listEntries: () => Promise<Entry[]>;
  createEntry: (entry: Entry) => Promise<Entry>;
  updateEntry: (id: string, patch: Partial<Entry>) => Promise<Entry>;
  removeEntry: (id: string) => Promise<void>;
};
