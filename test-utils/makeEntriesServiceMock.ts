import { EntriesService } from "@/models/entriesService";
import { EntriesState } from "@/models/entryState";
import { StoreApi, UseBoundStore } from "zustand";

export function makeEntriesServiceMock() {
  return {
    listEntries: jest.fn<ReturnType<EntriesService['listEntries']>, Parameters<EntriesService['listEntries']>>(),
    createEntry: jest.fn<ReturnType<EntriesService['createEntry']>, Parameters<EntriesService['createEntry']>>(),
    updateEntry: jest.fn<ReturnType<EntriesService['updateEntry']>, Parameters<EntriesService['updateEntry']>>(),
    removeEntry: jest.fn<ReturnType<EntriesService['removeEntry']>, Parameters<EntriesService['removeEntry']>>(),
  };
}

// Small accessors to keep tests readable
export const storeGetEntryId = (s: UseBoundStore<StoreApi<EntriesState>>, id: string) => s.getState().byId[id];
export const storeHasPending = (s: UseBoundStore<StoreApi<EntriesState>>, id: string) => Boolean(s.getState().pending[id]);
export const storeHasError = (s: UseBoundStore<StoreApi<EntriesState>>, id: string | 'global' = 'global') => Boolean(s.getState().errors[id]);
