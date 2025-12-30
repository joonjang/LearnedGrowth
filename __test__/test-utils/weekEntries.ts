import { LearnedGrowthResponse } from '@/models/aiService';
import { Entry } from '@/models/entry';

// Utility to keep dates relative to "now" so week labels remain accurate.
const isoDaysAgo = (daysAgo: number, hour = 10, minute = 0) => {
   const d = new Date();
   d.setHours(0, 0, 0, 0);
   d.setDate(d.getDate() - daysAgo);
   d.setHours(hour, minute, 0, 0);
   return d.toISOString();
};

const makeEntry = (
   id: string,
   daysAgo: number,
   overrides: Partial<Entry> = {}
): Entry => {
   const created = overrides.createdAt ?? isoDaysAgo(daysAgo);
   return {
      id,
      adversity: overrides.adversity ?? 'Sample adversity',
      belief: overrides.belief ?? 'Sample belief',
      consequence: overrides.consequence,
      dispute: overrides.dispute,
      energy: overrides.energy,
      aiResponse: overrides.aiResponse ?? null,
      aiRetryCount: overrides.aiRetryCount ?? 0,
      createdAt: created,
      updatedAt: overrides.updatedAt ?? created,
      accountId: overrides.accountId ?? null,
      dirtySince: overrides.dirtySince ?? null,
      isDeleted: overrides.isDeleted ?? false,
   };
};

const sampleAiResponse: LearnedGrowthResponse = {
   createdAt: new Date().toISOString(),
   safety: { isCrisis: false, crisisMessage: null },
   meta: {
      category: 'Work',
      tags: ['patterns', 'mock'],
      sentimentScore: 5,
      optimismScore: 7,
   },
   analysis: {
      dimensions: {
         permanence: {
            score: 'optimistic',
            detectedPhrase: 'temporary setback',
            insight: 'You framed it as a one-off issue.',
         },
         pervasiveness: {
            score: 'mixed',
            detectedPhrase: 'affecting work',
            insight: 'You limited the impact to one area.',
         },
         personalization: {
            score: 'optimistic',
            detectedPhrase: 'external factors',
            insight: 'Blame placed on circumstance, not self.',
         },
      },
      emotionalLogic: 'Feeling tense because the delay seemed like personal failure.',
   },
   suggestions: {
      evidenceQuestion: 'What shows you still handle most tasks well?',
      alternativesQuestion: 'Could there be benign reasons for the delay?',
      usefulnessQuestion: 'Is holding this belief helping you act now?',
      counterBelief: 'A late reply does not define my reliability.',
   },
};

export const weekEntries: Entry[] = [
   makeEntry('this-mon', 1, {
      adversity: 'Missed a morning workout.',
      belief: 'I am losing discipline.',
      consequence: 'Felt sluggish during meetings.',
      dispute: 'One missed session does not erase progress.',
      energy: 'Planned a lighter workout tomorrow.',
      aiResponse: sampleAiResponse,
   }),
   makeEntry('this-thu', 3, {
      adversity: 'Delayed a work email.',
      belief: 'My manager will be disappointed.',
      consequence: 'Avoided checking inbox.',
      energy: 'Cleared inbox after sending a concise update.',
   }),
   makeEntry('last-tue', 8, {
      adversity: 'Friend did not reply quickly.',
      belief: 'They might be annoyed with me.',
      consequence: 'Felt anxious all evening.',
      dispute: 'They could be busy; one delay is not rejection.',
      aiResponse: sampleAiResponse,
   }),
   makeEntry('last-sat', 12, {
      adversity: 'Skipped cleaning the kitchen.',
      belief: 'I am falling behind on chores.',
      consequence: 'Felt guilty and avoided it.',
   }),
   makeEntry('two-weeks', 15, {
      adversity: 'Ran late to a meetup.',
      belief: 'People think I am unreliable.',
      consequence: 'Stayed quiet during dinner.',
      energy: 'Set reminders to leave earlier next time.',
   }),
   makeEntry('month-boundary', 28, {
      adversity: 'Forgot a bill reminder.',
      belief: 'I always mess up finances.',
      consequence: 'Procrastinated paying.',
      dispute: 'One late reminder does not define my habits.',
   }),
   makeEntry('last-year', 370, {
      adversity: 'Missed a family call.',
      belief: 'I am not prioritizing them.',
      consequence: 'Felt distant for days.',
      aiResponse: sampleAiResponse,
   }),
];
