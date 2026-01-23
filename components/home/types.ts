import { Entry } from '@/models/entry';

// --- Base Definitions ---

export type CategorySegment = {
   category: string;
   count: number;
   percentage: number;
   colorHex: string;
};

export type WeekSummary = {
   avgOptimism: number | null;
   entryCount: number;
   categorySegments: CategorySegment[];
};

export type PatternImpact = 'optimistic' | 'pessimistic' | 'mixed';

export type EntryThinkingPattern = {
   id: string;
   entryId: string;
   createdAt: string;
   phrase: string;
   impact: PatternImpact;
   insight: string | null;
};

export type ThinkingPatternChartPoint = {
   value: number;
   entryId: string;
};

export type ThinkingPatternTab = {
   highLabel: string;
   lowLabel: string;
   description: string;
   chartData: ThinkingPatternChartPoint[];
   patterns: EntryThinkingPattern[];
};

export type ThinkingPatternData = {
   Time: ThinkingPatternTab;
   Scope: ThinkingPatternTab;
   Blame: ThinkingPatternTab;
};

// Match the shape expected by StreakCard utils
export type DayBucket = {
   entries: Entry[];
   completed: Entry[];
   incomplete: Entry[];
   disputeCount: number;
};

export type DashboardData = {
   weeklyCount: number;
   weeklyScore: number | null;
   threePs: {
      permanence: { score: number };
      pervasiveness: { score: number };
      personalization: { score: number };
   } | null;
   threePsDecoder: ThinkingPatternData | null;
};

// --- VIEW MODELS ---

export type MentalFocusStat = {
   // Export this
   label: string;
   count: number;
   percentage: number;
   avgScore: number;
   style: { label: string; color: string; bg: string };
};

export type MentalFocusTagStat = {
   // Export this
   label: string;
   count: number;
};

export type MentalFocusViewModel = {
   categoryStats: MentalFocusStat[];
   tagStats: MentalFocusTagStat[];
   narrative: {
      topCatLabel: string;
      isCategoryTie: boolean;
      topTagLabel: string | null;
      isTagTie: boolean;
      styleColor: string;
      styleLabel: string;
   };
} | null;

export type ThinkingPatternViewModel = {
   threePs: {
      permanence: { score: number };
      pervasiveness: { score: number };
      personalization: { score: number };
   };
   threePsDecoder: ThinkingPatternData;
} | null;

export type MonthStat = {
   year: number;
   monthIndex: number; // 0-11
   count: number;
   completedCount: number;
};

export type StreakViewModel = {
   streakCount: number;
   days: { date: Date; label: string; filled: boolean }[];
   dayBuckets: Map<string, DayBucket>;
   activeCount: number;
   // NEW PROPERTIES
   monthlyStats?: MonthStat[];
   isAllTime?: boolean;
};
