import { entriesAdapter, resetStubEntries } from "@/db/entriesAdapter.sqlite";

export function createMockDb() {
  resetStubEntries();
  return entriesAdapter;
}
