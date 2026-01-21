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

export type PatternDecoderPattern = {
  id: string;
  entryId: string;
  date: string;
  fullDate: string;
  phrase: string;
  impact: PatternImpact;
  insight: string | null;
};

export type PatternDecoderChartPoint = {
  value: number;
  entryId: string;
};

export type PatternDecoderTab = {
  highLabel: string;
  lowLabel: string;
  description: string;
  chartData: PatternDecoderChartPoint[];
  patterns: PatternDecoderPattern[];
};

export type PatternDecoderData = {
  Time: PatternDecoderTab;
  Scope: PatternDecoderTab;
  Blame: PatternDecoderTab;
};

export type DashboardData = {
  weeklyCount: number;
  weeklyScore: number | null;
  threePs: {
    permanence: ThreePScore;
    pervasiveness: ThreePScore;
    personalization: ThreePScore;
  } | null;
  threePsDecoder: PatternDecoderData | null;
};
