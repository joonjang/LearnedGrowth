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

export const ROUTE_LOGIN = '/(modal)/login' as const;
export const ROUTE_ENTRIES = '/' as const;

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
      hint: 'How you feel after thinking through it all.',
      placeholder: 'Note any shift in mood or energy',
   },
] as const;
