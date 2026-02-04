import type { TFunction } from 'i18next';

const CATEGORY_KEY_MAP: Record<string, string> = {
   Work: 'categories.work',
   Education: 'categories.education',
   Relationships: 'categories.relationships',
   Health: 'categories.health',
   Finance: 'categories.finance',
   'Self-Image': 'categories.self_image',
   'Daily Hassles': 'categories.daily_hassles',
   Other: 'categories.other',
   Uncategorized: 'categories.uncategorized',
};

export function getCategoryLabel(category: string, t: TFunction) {
   const key = CATEGORY_KEY_MAP[category];
   return key ? t(key) : category;
}
