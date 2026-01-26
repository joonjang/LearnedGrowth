import type { Entry } from '@/models/entry';

export type EntryCountFilterKey = 'last-5' | 'last-10' | 'last-25' | 'all';

export type EntryCountFilterOption = {
   key: EntryCountFilterKey;
   label: string;
   count?: number;
};

const COUNT_OPTIONS: EntryCountFilterOption[] = [
   { key: 'last-5', label: 'Last 5 Entries', count: 5 },
   { key: 'last-10', label: 'Last 10 Entries', count: 10 },
   { key: 'last-25', label: 'Last 25 Entries', count: 25 },
];

const ALL_OPTION: EntryCountFilterOption = {
   key: 'all',
   label: 'All Entries',
};

export function buildEntryCountFilterOptions(
   totalCount: number,
): EntryCountFilterOption[] {
   const options: EntryCountFilterOption[] = [ALL_OPTION];
   COUNT_OPTIONS.forEach((option) => {
      if ((option.count ?? 0) <= totalCount) {
         options.push(option);
      }
   });
   return options;
}

export function getDefaultEntryCountFilterKey(
   totalCount: number,
): EntryCountFilterKey {
   return totalCount >= 5 ? 'last-5' : 'all';
}

export function getEntryCountForFilter(
   key: EntryCountFilterKey,
): number | null {
   if (key === 'last-5') return 5;
   if (key === 'last-10') return 10;
   if (key === 'last-25') return 25;
   return null;
}

export function sortEntriesByCreatedAtDesc(entries: Entry[]): Entry[] {
   return [...entries].sort(
      (a, b) =>
         new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
   );
}
