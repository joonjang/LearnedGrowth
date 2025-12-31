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

export type DashboardData = {
  weeklyCount: number;
  last7DaysScore: number | null;
  threePs: {
    permanence: ThreePScore;
    pervasiveness: ThreePScore;
    personalization: ThreePScore;
  } | null;
};
