import { StyleSheet } from 'react-native';

export const BTN_HEIGHT = 'h-14 justify-center';

export const PRIMARY_CTA_CLASS =
   'bg-indigo-500 active:bg-indigo-600 dark:bg-indigo-800 dark:active:bg-indigo-900';
export const PRIMARY_CTA_TEXT_CLASS = 'text-white';
export const PRIMARY_CTA_ICON_COLOR = '#ffffff';
export const DISPUTE_CTA_CLASS =
   'bg-green-600 active:bg-green-700 dark:bg-green-700/50 dark:active:bg-green-800/50';
export const ANALYSIS_CTA_CLASS =
   'bg-blue-500 active:bg-blue-600 dark:bg-blue-800 dark:active:bg-blue-900';

   export const FAB_CTA_CLASS =
   'bg-indigo-500 active:bg-indigo-600 dark:bg-indigo-600 dark:active:bg-indigo-900';

export const ICON_COLOR_DARK = '#cbd5e1';
export const ICON_COLOR_LIGHT = '#475569';

export const SEMANTIC_COLORS = {
   belief: {
      bg: '#fff7ed',
      border: '#fed7aa',
      text: '#9a3412',
      bgDark: 'rgba(234, 88, 12, 0.15)',
      borderDark: 'rgba(234, 88, 12, 0.30)',
      textDark: '#ffedd5',
   },
   dispute: {
      bg: '#ecfdf5',
      border: '#a7f3d0',
      text: '#065f46',
      bgDark: 'rgba(16, 185, 129, 0.20)',
      borderDark: 'rgba(5, 150, 105, 0.30)',
      textDark: '#047857',
      cta: '#059669',
      ctaDark: '#34d399',
   },
   energy: {
      bg: '#f0f9ff',
      border: '#bae6fd',
      text: '#0369a1',
      bgDark: 'rgba(14, 165, 233, 0.20)',
      borderDark: 'rgba(2, 132, 199, 0.30)',
      textDark: '#e0f2fe',
   },
} as const;

export const BELIEF_BG_CLASS =
   'bg-[#fff7ed] dark:bg-[rgba(234,88,12,0.15)]';
export const BELIEF_BORDER_CLASS =
   'border-[#fed7aa] dark:border-[rgba(234,88,12,0.30)]';
export const BELIEF_TEXT_CLASS = 'text-[#9a3412] dark:text-[#ffedd5]';
export const BELIEF_TONE_CLASS = `${BELIEF_BG_CLASS} ${BELIEF_BORDER_CLASS} ${BELIEF_TEXT_CLASS}`;

export const DISPUTE_BG_CLASS =
   'bg-[#ecfdf5] dark:bg-[rgba(16,185,129,0.20)]';
export const DISPUTE_BORDER_CLASS =
   'border-[#a7f3d0] dark:border-[rgba(5,150,105,0.30)]';
export const DISPUTE_TEXT_CLASS = 'text-[#065f46] dark:text-[#d1fae5]';
export const DISPUTE_TONE_CLASS = `${DISPUTE_BG_CLASS} ${DISPUTE_BORDER_CLASS} ${DISPUTE_TEXT_CLASS}`;

export const ENERGY_BG_CLASS =
   'bg-[#f0f9ff] dark:bg-[rgba(14,165,233,0.20)]';
export const ENERGY_BORDER_CLASS =
   'border-[#bae6fd] dark:border-[rgba(2,132,199,0.30)]';
export const ENERGY_TEXT_CLASS = 'text-[#0369a1] dark:text-[#e0f2fe]';
export const ENERGY_TONE_CLASS = `${ENERGY_BG_CLASS} ${ENERGY_BORDER_CLASS} ${ENERGY_TEXT_CLASS}`;

export const BOTTOM_SHEET_RADIUS = 24;
export const BOTTOM_SHEET_BACKDROP_OPACITY = 0.75;
export const BOTTOM_SHEET_CONTENT_PADDING = 24;
export const BOTTOM_SHEET_MAX_SNAP = '75%';

export const BOTTOM_SHEET_BG_DARK = '#0f172a';
export const BOTTOM_SHEET_BG_LIGHT = '#ffffff';
export const BOTTOM_SHEET_HANDLE_DARK = '#475569';
export const BOTTOM_SHEET_HANDLE_LIGHT = '#cbd5e1';
export const BOTTOM_SHEET_TOP_BORDER_DARK = 'rgba(71, 85, 105, 0.7)';

export const CARD_PRESS_STYLE = StyleSheet.create({
   cardPressed: {
      transform: [{ scale: 0.985 }],
   },
});

export const INPUT_BOX_TOP_INSET = 8;
export const INPUT_BOX_BOTTOM_INSET = 6;
export const INPUT_BOX_HORIZONTAL_INSET = 16;

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

export const TONE_COLOR_MAP: Record<string, string> = {
   Optimistic: '#10b981', // Emerald 500 (Matches Health)
   Pessimistic: '#ef4444', // Red 500 (Standard Alert)
   Mixed: '#8b5cf6', // Violet 500 (Matches Education)
   Neutral: '#64748b', // Slate 500 (Matches Daily Hassles)
};

export const DEFAULT_CATEGORY_COLOR = '#cbd5e1';

// --- AI Analysis Labels & Amber Styles ---
export const AI_ANALYSIS_LABEL = 'AI Analysis';
export const ANALYZE_WITH_AI_LABEL = 'Analyze with AI';
export const SAVE_TO_ANALYZE_LABEL = 'Save to Analyze';

export const AI_ANALYSIS_AMBER_ICON_DARK = '#fbbf24';
export const AI_ANALYSIS_AMBER_ICON_LIGHT = '#b45309';
export const AI_ANALYSIS_AMBER_ICON_LIGHT_ALT = '#d97706';

export const AI_ANALYSIS_AMBER_BADGE_TEXT_CLASS =
   'text-amber-600 dark:text-amber-400';
export const AI_ANALYSIS_AMBER_BANNER_CONTAINER_CLASS =
   'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/50';
export const AI_ANALYSIS_AMBER_BANNER_ICON_WRAPPER_CLASS =
   'bg-white dark:bg-amber-500/20 border-amber-100 dark:border-amber-400/30';
export const AI_ANALYSIS_AMBER_BANNER_TITLE_CLASS =
   'text-amber-900 dark:text-amber-100';
export const AI_ANALYSIS_AMBER_BANNER_DESC_CLASS =
   'text-amber-700 dark:text-amber-300';
export const AI_ANALYSIS_AMBER_PROGRESS_TEXT_CLASS =
   'text-amber-600 dark:text-amber-400';
export const AI_ANALYSIS_AMBER_PROGRESS_BAR_CLASS = 'bg-amber-500';

export const AI_ANALYSIS_AMBER_CTA_CONTAINER_CLASS =
   'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10';
export const AI_ANALYSIS_AMBER_CTA_TEXT_CLASS =
   'text-amber-700 dark:text-amber-400/80 uppercase tracking-widest';
export const AI_ANALYSIS_AMBER_BUTTON_CLASS =
   'bg-amber-200 active:bg-amber-300 dark:bg-amber-800/40 dark:active:bg-amber-800/60 border border-amber-300 dark:border-amber-700/60';
export const AI_ANALYSIS_AMBER_BUTTON_TEXT_CLASS =
   'text-amber-900 dark:text-amber-100';
export const AI_ANALYSIS_AMBER_PIVOT_BG_CLASS =
   'bg-amber-50 dark:bg-amber-900/10';
export const AI_ANALYSIS_AMBER_PIVOT_BORDER_CLASS =
   'border-amber-300/60 dark:border-amber-700/50';
export const AI_ANALYSIS_AMBER_PIVOT_TEXT_CLASS =
   'text-amber-700 dark:text-amber-400 uppercase tracking-widest';
export const AI_ANALYSIS_AMBER_NOTE_TEXT_CLASS =
   'text-amber-700 dark:text-amber-500';
export const AI_ANALYSIS_AMBER_BANNER_CLASS =
   'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800';
