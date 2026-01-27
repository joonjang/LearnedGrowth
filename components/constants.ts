import { UNCATEGORIZED_LABEL } from '@/lib/styles';
import {
   Asterisk,
   BookOpen,
   Briefcase,
   CircleDollarSign,
   Dumbbell,
   Heart,
   HelpCircle,
   LucideIcon,
   User,
   Zap,
} from 'lucide-react-native';

export const FREE_MONTHLY_CREDITS = 5;
export const AI_ANALYSIS_CREDIT_COST = 1;
export const MAX_AI_RETRIES = 4;

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

export const THINKING_PATTERN_DIMENSIONS = {
   Time: {
      dimension: 'permanence',
      highLabel: 'Temporary',
      lowLabel: 'Permanent',
      description: 'Have you viewed setbacks as permanent?',
   },
   Scope: {
      dimension: 'pervasiveness',
      highLabel: 'Specific',
      lowLabel: 'Everything',
      description: 'Have you let one thing affect everything?',
   },
   Blame: {
      dimension: 'personalization',
      highLabel: 'Situation',
      lowLabel: 'My Fault',
      description: 'Have you blamed yourself entirely?',
   },
} as const;

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

// 2. NEW: Icon Map (Source of Truth)
export const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
   Work: Briefcase,
   Education: BookOpen,
   Relationships: Heart,
   Health: Dumbbell,
   Finance: CircleDollarSign,
   'Self-Image': User,
   'Daily Hassles': Zap,
   Other: Asterisk,
   [UNCATEGORIZED_LABEL]: HelpCircle,
};

export const STYLE_TO_TONE_MAP: Record<string, string> = {
   Positive: 'Optimistic',
   Constructive: 'Optimistic',
   Balanced: 'Mixed',
   Mixed: 'Mixed',
   Critical: 'Pessimistic',
};

export const DEFAULT_CATEGORY_ICON = HelpCircle;

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
