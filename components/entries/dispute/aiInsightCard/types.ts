import type { LearnedGrowthResponse } from '@/models/aiService';

export type InsightDimensions = LearnedGrowthResponse['analysis']['dimensions'];
export type InsightSafety = LearnedGrowthResponse['safety'];
