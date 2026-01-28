import type { Entry } from '@/models/entry';

export function normalizeMentalFocusCategory(
   rawCategory: string | null | undefined,
) {
   return !rawCategory || rawCategory === 'Other' ? 'Other' : rawCategory;
}

export function getAiAnalyzedEntryCount(entries: Entry[]) {
   return entries.reduce(
      (total, entry) => (entry.aiResponse ? total + 1 : total),
      0,
   );
}

export function buildMentalFocusCategoryCounts(entries: Entry[]) {
   const counts = new Map<string, number>();
   let total = 0;

   entries.forEach((entry) => {
      if (!entry.aiResponse) return;
      const category = normalizeMentalFocusCategory(
         entry.aiResponse.meta?.category,
      );
      counts.set(category, (counts.get(category) || 0) + 1);
      total += 1;
   });

   return { counts, total };
}

export function filterEntriesByMentalFocusCategory(
   entries: Entry[],
   category: string,
) {
   return entries.filter((entry) => {
      const meta = entry.aiResponse?.meta;
      if (!meta) return false;
      return normalizeMentalFocusCategory(meta.category) === category;
   });
}
