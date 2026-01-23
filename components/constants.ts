export const BTN_HEIGHT = 'h-14 justify-center';
export const PRIMARY_CTA_CLASS =
   'bg-indigo-500 active:bg-indigo-600 dark:bg-indigo-800 dark:active:bg-indigo-900';
export const PRIMARY_CTA_TEXT_CLASS = 'text-white';
export const PRIMARY_CTA_ICON_COLOR = '#ffffff';
export const DISPUTE_CTA_CLASS =
   'bg-emerald-500 active:bg-emerald-600 dark:bg-emerald-800 dark:active:bg-emerald-900';
export const ANALYSIS_CTA_CLASS =
   'bg-blue-500 active:bg-blue-600 dark:bg-blue-800 dark:active:bg-blue-900';

export const FREE_MONTHLY_CREDITS = 5;
export const AI_ANALYSIS_CREDIT_COST = 1;
export const MAX_AI_RETRIES = 4;

export const BOTTOM_SHEET_RADIUS = 24;
export const BOTTOM_SHEET_BACKDROP_OPACITY = 0.75;
export const BOTTOM_SHEET_CONTENT_PADDING = 24;
export const BOTTOM_SHEET_MAX_SNAP = '75%';

export const ROUTE_LOGIN = '/(modal)/login' as const;
export const ROUTE_ENTRIES = '/' as const;
export const ROUTE_ENTRY_DETAIL = '/entryDetail/[id]' as const;

export const ENTRY_CHAR_LIMITS = {
   adversity: 300,
   belief: 300,
   consequence: 300,
   dispute: 1000,
   energy: 300,
} as const;

export const DISPUTE_STEP_CHAR_LIMITS = {
   evidence: 300,
   alternatives: 300,
   usefulness: 300,
   energy: ENTRY_CHAR_LIMITS.energy,
} as const;

export const ENTRY_CHAR_WARN_MIN_REMAINING = 20;
export const ENTRY_CHAR_WARN_RATIO = 0.1;
export const INPUT_BOX_TOP_INSET = 8;
export const INPUT_BOX_BOTTOM_INSET = 6;
export const INPUT_BOX_HORIZONTAL_INSET = 16;

export const ABCDE_FIELD = [
   {
      key: 'adversity',
      label: 'Adversity',
      hint: 'What happened?',
      placeholder: 'Describe the situation briefly',
   },
   {
      key: 'belief',
      label: 'Belief',
      hint: 'What were you telling yourself?',
      placeholder: 'Capture the core thought',
   },
   {
      key: 'consequence',
      label: 'Consequence',
      hint: 'How did you feel and act?',
      placeholder: 'Feelings, reactions, and behaviors',
   },
   {
      key: 'dispute',
      label: 'Dispute',
      hint: 'Your response to the belief.',
      placeholder: 'Collect the key sentences you used to dispute',
   },
   {
      key: 'energy',
      label: 'Energy',
      hint: 'The emotional shift.',
      placeholder: 'Note any shift in mood or energy',
   },
] as const;

export const MONTHS = [
   'January',
   'February',
   'March',
   'April',
   'May',
   'June',
   'July',
   'August',
   'September',
   'October',
   'November',
   'December',
];

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// colors

export const ALERT_COLOR_DARK = '#fb923c';
export const ALERT_COLOR_LIGHT = '#c2410c';

export const HOME_ICON_DARK = '#cbd5e1';
export const HOME_ICON_LIGHT = '#64748b';

export const CHEVRON_ICON_DARK = '#94a3b8';
export const CHEVRON_ICON_LIGHT = '#cbd5e1';

export const UNCATEGORIZED_LABEL = 'Not categorized';
export const CATEGORY_COLOR_MAP: Record<string, string> = {
   Work: '#3b82f6',
   Education: '#8b5cf6',
   Relationships: '#e11d48',
   Health: '#10b981',
   Finance: '#eab308',
   'Self-Image': '#06b6d4',
   'Daily Hassles': '#64748b',
   Other: '#9ca3af',
   [UNCATEGORIZED_LABEL]: '#e2e8f0',
};
export const DEFAULT_CATEGORY_COLOR = '#cbd5e1';
