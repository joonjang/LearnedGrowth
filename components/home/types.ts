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

export type ThreePScore = { score: number };

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

export type DashboardData = {
   weeklyCount: number;
   weeklyScore: number | null;
   threePs: {
      permanence: ThreePScore;
      pervasiveness: ThreePScore;
      personalization: ThreePScore;
   } | null;
   threePsDecoder: ThinkingPatternData | null;
};
