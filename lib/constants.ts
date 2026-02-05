import { UNCATEGORIZED_LABEL } from '@/lib/styles';
import {
   Activity,
   Asterisk,
   BookOpen,
   Briefcase,
   CircleDollarSign,
   Heart,
   HelpCircle,
   LucideIcon,
   User,
   Zap
} from 'lucide-react-native';

export const TIMEOUT_MS = 90000;

export const TYPING_SPEED = 35

export const FREE_MONTHLY_CREDITS = 5;
export const AI_ANALYSIS_CREDIT_COST = 1;
export const MAX_AI_RETRIES = 4;

export const ROUTE_LOGIN = '/(modal)/login' as const;
export const ROUTE_HOME = '/' as const;
export const ROUTE_ENTRY_DETAIL = '/entryDetail/[id]' as const;
export const ROUTE_ENTRIES = '/entries' as const;

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

export const DISPUTE_STEP_PLACEHOLDERS = {
   evidence: 'dispute.placeholders.evidence',
   alternatives: 'dispute.placeholders.alternatives',
   usefulness: 'dispute.placeholders.usefulness',
   energy: 'dispute.placeholders.energy',
} as const;

export const ENTRY_CHAR_WARN_MIN_REMAINING = 20;
export const ENTRY_CHAR_WARN_RATIO = 0.1;

export const ABCDE_FIELD = [
   {
      key: 'adversity',
      labelKey: 'abcde.labels.adversity',
      hintKey: 'abcde.hints.adversity',
      placeholderKey: 'newEntry.placeholders.adversity',
   },
   {
      key: 'belief',
      labelKey: 'abcde.labels.belief',
      hintKey: 'abcde.hints.belief',
      placeholderKey: 'newEntry.placeholders.belief',
   },
   {
      key: 'consequence',
      labelKey: 'abcde.labels.consequence',
      hintKey: 'abcde.hints.consequence',
      placeholderKey: 'newEntry.placeholders.consequence',
   },
   {
      key: 'dispute',
      labelKey: 'abcde.labels.dispute',
      hintKey: 'abcde.hints.dispute',
      placeholderKey: 'dispute.placeholders.evidence',
   },
   {
      key: 'energy',
      labelKey: 'abcde.labels.energy',
      hintKey: 'abcde.hints.energy',
      placeholderKey: 'dispute.placeholders.energy',
   },
] as const;

export const THINKING_PATTERN_DIMENSIONS = {
   Time: {
      dimension: 'permanence',
   },
   Scope: {
      dimension: 'pervasiveness',
   },
   Blame: {
      dimension: 'personalization',
   },
} as const;

// 2. NEW: Icon Map (Source of Truth)
export const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
   Work: Briefcase,
   Education: BookOpen,
   Relationships: Heart,
   Health: Activity,
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
