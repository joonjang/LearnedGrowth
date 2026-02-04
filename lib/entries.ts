import type { Entry } from '@/models/entry';

export type EntryCountFilterKey = 'last-5' | 'last-10' | 'last-25' | 'all';

export type EntryCountFilterOption = {
   key: EntryCountFilterKey;
   label: string;
   count?: number;
};

const COUNT_OPTIONS: {
   key: EntryCountFilterKey;
   count: number;
   labelKey: 'last5' | 'last10' | 'last25';
}[] = [
   { key: 'last-5', labelKey: 'last5', count: 5 },
   { key: 'last-10', labelKey: 'last10', count: 10 },
   { key: 'last-25', labelKey: 'last25', count: 25 },
];

export type EntryCountFilterLabels = {
   all: string;
   last5: string;
   last10: string;
   last25: string;
};

export function buildEntryCountFilterOptions(
   totalCount: number,
   labels: EntryCountFilterLabels,
): EntryCountFilterOption[] {
   const options: EntryCountFilterOption[] = [
      { key: 'all', label: labels.all },
   ];
   COUNT_OPTIONS.forEach((option) => {
      if ((option.count ?? 0) <= totalCount) {
         options.push({
            key: option.key,
            label: labels[option.labelKey],
            count: option.count,
         });
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
