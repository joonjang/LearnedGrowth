import { getWeekStart, isOptimistic, toDateKey } from '@/lib/utils';
import { Entry } from '@/models/entry';
import React, { useMemo } from 'react';
import { View } from 'react-native';
import Animated, {
   FadeInDown,
   FadeOutUp,
   LinearTransition,
} from 'react-native-reanimated';
import {
   CATEGORY_COLOR_MAP,
   DEFAULT_CATEGORY_COLOR,
   WEEKDAY_LABELS,
} from '../constants';
import MentalFocusCard from './mentalFocus/MentalFocusCard';
import StreakCard from './streak/StreakCard';
import ThinkingPatternCard from './thinkingPattern/ThinkingPatternCard';
import {
   DayBucket,
   MentalFocusViewModel,
   MonthStat,
   StreakViewModel,
   ThinkingPatternData,
   ThinkingPatternViewModel,
} from './types';

// --- CONFIG ---
const PATTERN_TAB_CONFIG = {
   Time: {
      dimension: 'permanence',
      highLabel: 'Temporary',
      lowLabel: 'Permanent',
   },
   Scope: {
      dimension: 'pervasiveness',
      highLabel: 'Specific',
      lowLabel: 'Pervasive',
   },
   Blame: {
      dimension: 'personalization',
      highLabel: 'External',
      lowLabel: 'Internal',
   },
} as const;

const MAX_TREND_POINTS = 7;

const STYLE_CONFIG = {
   positive: { label: 'Positive', color: '#10b981', bg: '#ecfdf5' },
   constructive: { label: 'Constructive', color: '#3b82f6', bg: '#eff6ff' },
   balanced: { label: 'Balanced', color: '#64748b', bg: '#f8fafc' },
   mixed: { label: 'Mixed', color: '#f59e0b', bg: '#fffbeb' },
   critical: { label: 'Critical', color: '#ef4444', bg: '#fef2f2' },
};

// --- HELPERS ---
function getStyleFromScore(score: number) {
   if (score >= 8) return STYLE_CONFIG.positive;
   if (score >= 6) return STYLE_CONFIG.constructive;
   if (score >= 4) return STYLE_CONFIG.balanced;
   if (score >= 2.5) return STYLE_CONFIG.mixed;
   return STYLE_CONFIG.critical;
}

function getNumericScore(val: any): number | null {
   if (typeof val === 'number') return val;
   if (typeof val === 'string') {
      const n = parseFloat(val);
      if (!isNaN(n)) return n;
   }
   return null;
}

function getTrendValue(score: string | null | undefined): number {
   if (!score) return 50;
   const lower = score.toLowerCase();
   if (lower.includes('mixed') || lower.includes('balanced')) return 50;
   return isOptimistic(score) ? 80 : 20;
}

function getPatternImpact(
   score: string | null | undefined,
): 'optimistic' | 'pessimistic' | 'mixed' {
   if (!score) return 'mixed';
   const lower = score.toLowerCase();
   if (lower.includes('mixed') || lower.includes('balanced')) return 'mixed';
   return isOptimistic(score) ? 'optimistic' : 'pessimistic';
}

type Props = {
   entries: Entry[];
   anchorDate: Date;
   shadowSm: any;
   isDark: boolean;
   showEncouragement: boolean;
   onDeleteEntry: (entry: Entry) => void;
   isLoading?: boolean;
   isAllTime?: boolean;
};

const HomeDashboard = React.memo(
   ({
      entries,
      anchorDate,
      shadowSm,
      isDark,
      showEncouragement,
      onDeleteEntry,
      isLoading = false,
      isAllTime = false,
   }: Props) => {
      // --- THE SINGLE PASS AGGREGATOR ---
      const { streakView, focusView, patternView } = useMemo(() => {
         // 1. Init Containers
         const dayBuckets = new Map<string, DayBucket>();
         const filledDaysSet = new Set<string>();

         const monthMap = new Map<string, MonthStat>();

         const catMap = new Map<
            string,
            { count: number; totalScore: number; validScores: number }
         >();
         const tagMap = new Map<string, number>();

         const threePsStats = {
            perm: { g: 0, t: 0 },
            perv: { g: 0, t: 0 },
            pers: { g: 0, t: 0 },
         };
         // Only store entries here if they actually have dimensions data
         const entriesWithMeta: { entry: Entry; created: Date }[] = [];
         let totalAnalyzedCount = 0;

         // 2. The Loop
         for (const entry of entries) {
            const created = new Date(entry.createdAt);
            if (isNaN(created.getTime())) continue;

            const dateKey = toDateKey(created);
            const meta = entry.aiResponse?.meta;
            const analysis = entry.aiResponse?.analysis;

            // --- STREAK AGGREGATION (Always Runs) ---
            if (!dayBuckets.has(dateKey)) {
               dayBuckets.set(dateKey, {
                  entries: [],
                  completed: [],
                  incomplete: [],
                  disputeCount: 0,
               });
            }
            const bucket = dayBuckets.get(dateKey)!;
            bucket.entries.push(entry);

            const isReframed = (entry.dispute || '').trim().length > 0;

            if (isReframed) {
               bucket.completed.push(entry);
               bucket.disputeCount += 1;
               filledDaysSet.add(dateKey);
            } else {
               bucket.incomplete.push(entry);
            }

            if (isAllTime) {
               const year = created.getFullYear();
               const monthIndex = created.getMonth();
               const monthKey = `${year}-${monthIndex}`;

               if (!monthMap.has(monthKey)) {
                  monthMap.set(monthKey, {
                     year,
                     monthIndex,
                     count: 0,
                     completedCount: 0,
                  });
               }
               const mStat = monthMap.get(monthKey)!;
               mStat.count++;
               if (isReframed) mStat.completedCount++;
            }

            // --- AI DEPENDENT AGGREGATION (Guarded) ---
            if (entry.aiResponse) {
               // 1. Mental Focus (Requires Meta)
               if (meta) {
                  totalAnalyzedCount++;
                  const rawCat = meta.category;
                  const cat = !rawCat || rawCat === 'Other' ? 'Other' : rawCat;
                  const optScore = getNumericScore(meta.optimismScore);

                  const catData = catMap.get(cat) || {
                     count: 0,
                     totalScore: 0,
                     validScores: 0,
                  };
                  catData.count++;
                  if (optScore !== null) {
                     catData.totalScore += optScore;
                     catData.validScores++;
                  }
                  catMap.set(cat, catData);

                  (meta.tags || []).forEach((t) => {
                     const norm = t.toLowerCase().trim();
                     if (norm) tagMap.set(norm, (tagMap.get(norm) || 0) + 1);
                  });
               }

               // 2. Thinking Patterns (Requires Analysis Dimensions)
               const dims = analysis?.dimensions;
               if (dims) {
                  if (dims.permanence) {
                     threePsStats.perm.t++;
                     if (isOptimistic(dims.permanence.score))
                        threePsStats.perm.g++;
                  }
                  if (dims.pervasiveness) {
                     threePsStats.perv.t++;
                     if (isOptimistic(dims.pervasiveness.score))
                        threePsStats.perv.g++;
                  }
                  if (dims.personalization) {
                     threePsStats.pers.t++;
                     if (isOptimistic(dims.personalization.score))
                        threePsStats.pers.g++;
                  }

                  // Only push to array if dimensions actually exist
                  entriesWithMeta.push({ entry, created });
               }
            }
         }

         // 3. Post-Process: Streak
         const today = new Date(anchorDate);
         today.setHours(0, 0, 0, 0);
         const weekStart = getWeekStart(today);

         const days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(weekStart);
            d.setDate(weekStart.getDate() + i);
            return {
               date: d,
               label: WEEKDAY_LABELS[i],
               filled: filledDaysSet.has(toDateKey(d)),
            };
         });

         const anchorKey = toDateKey(today);
         const anchorIndex = days.findIndex(
            (d) => toDateKey(d.date) === anchorKey,
         );
         const startIndex = anchorIndex >= 0 ? anchorIndex : 6;
         let streakCount = 0;
         for (let i = startIndex; i >= 0; i--) {
            if (days[i].filled) streakCount++;
            else break;
         }

         const monthlyStats = isAllTime
            ? Array.from(monthMap.values()).sort((a, b) => {
                 if (a.year !== b.year) return b.year - a.year; // Descending Year
                 return b.monthIndex - a.monthIndex; // Descending Month
              })
            : undefined;

         const streakView: StreakViewModel = {
            streakCount,
            days,
            dayBuckets,
            activeCount: filledDaysSet.size,
            monthlyStats,
            isAllTime,
         };

         // 4. Post-Process: Mental Focus
         // Because we now guard the loop, catMap will be empty if no AI entries exist.
         // This ensures focusView remains null in that case.
         let focusView: MentalFocusViewModel | null = null;
         if (catMap.size > 0) {
            const categoryStats = Array.from(catMap.entries())
               .map(([label, val]) => {
                  const avg =
                     val.validScores > 0 ? val.totalScore / val.validScores : 5;
                  // 1. Get the base style (label + original color)
                  const baseStyle = getStyleFromScore(avg);
                  // 2. Override the color with your constant map
                  const categoryColor =
                     CATEGORY_COLOR_MAP[label] || DEFAULT_CATEGORY_COLOR;
                  return {
                     label,
                     count: val.count,
                     percentage: (val.count / totalAnalyzedCount) * 100,
                     avgScore: avg,
                     style: { ...baseStyle, color: categoryColor },
                  };
               })
               .sort((a, b) => b.count - a.count);

            const tagStats = Array.from(tagMap.entries())
               .filter(([, c]) => c > 1)
               .map(([label, count]) => ({ label, count }))
               .sort((a, b) => b.count - a.count);

            const topCat = categoryStats[0];
            focusView = {
               categoryStats,
               tagStats,
               narrative: {
                  topCatLabel: topCat.label,
                  isCategoryTie:
                     categoryStats.length > 1 &&
                     categoryStats[0].count === categoryStats[1].count,
                  topTagLabel: tagStats.length > 0 ? tagStats[0].label : null,
                  isTagTie:
                     tagStats.length > 1 &&
                     tagStats[0].count === tagStats[1].count,
                  styleColor: topCat.style.color,
                  styleLabel: topCat.style.label,
               },
            };
         }

         // 5. Post-Process: Thinking Patterns
         // Because we guarded entriesWithMeta.push, this array will be empty if no AI entries exist.
         let patternView: ThinkingPatternViewModel | null = null;
         if (entriesWithMeta.length > 0) {
            const getScore = (s: { g: number; t: number }) =>
               s.t > 0 ? (s.g / s.t) * 100 : 50;
            const sortedAsc = [...entriesWithMeta].sort(
               (a, b) => a.created.getTime() - b.created.getTime(),
            );
            const sortedDesc = [...entriesWithMeta].sort(
               (a, b) => b.created.getTime() - a.created.getTime(),
            );

            // Safe Accessors
            const getDimScore = (
               e: Entry,
               k: 'permanence' | 'pervasiveness' | 'personalization',
            ) => e.aiResponse?.analysis?.dimensions?.[k]?.score;
            const getDimPhrase = (
               e: Entry,
               k: 'permanence' | 'pervasiveness' | 'personalization',
            ) => e.aiResponse?.analysis?.dimensions?.[k]?.detectedPhrase;
            const getDimInsight = (
               e: Entry,
               k: 'permanence' | 'pervasiveness' | 'personalization',
            ) => e.aiResponse?.analysis?.dimensions?.[k]?.insight;

            const buildTabData = (
               configKey: keyof typeof PATTERN_TAB_CONFIG,
            ) => {
               const config = PATTERN_TAB_CONFIG[configKey];
               const dimKey = config.dimension as
                  | 'permanence'
                  | 'pervasiveness'
                  | 'personalization';

               const chartData = sortedAsc
                  .map((item) => {
                     const score = getDimScore(item.entry, dimKey);
                     if (!score) return null;
                     return {
                        value: getTrendValue(score),
                        entryId: item.entry.id,
                     };
                  })
                  .filter(Boolean)
                  .slice(-MAX_TREND_POINTS) as {
                  value: number;
                  entryId: string;
               }[];

               const patterns = sortedDesc
                  .map((item) => {
                     const score = getDimScore(item.entry, dimKey);
                     const phrase = getDimPhrase(item.entry, dimKey)?.trim();
                     const insight = getDimInsight(item.entry, dimKey);
                     if (!phrase) return null;
                     return {
                        id: `${item.entry.id}-${dimKey}`,
                        entryId: item.entry.id,
                        createdAt: item.entry.createdAt,
                        phrase,
                        impact: getPatternImpact(score),
                        insight: insight ?? null,
                     };
                  })
                  .filter(Boolean) as any[];

               return {
                  highLabel: config.highLabel,
                  lowLabel: config.lowLabel,
                  description: '',
                  chartData,
                  patterns,
               };
            };

            patternView = {
               threePs: {
                  permanence: { score: getScore(threePsStats.perm) },
                  pervasiveness: { score: getScore(threePsStats.perv) },
                  personalization: { score: getScore(threePsStats.pers) },
               },
               threePsDecoder: {
                  Time: buildTabData('Time'),
                  Scope: buildTabData('Scope'),
                  Blame: buildTabData('Blame'),
               } as ThinkingPatternData,
            };
         }

         return { streakView, focusView, patternView };
      }, [anchorDate, isAllTime, entries]);

      // --- RENDER WITH ANIMATIONS ---
      const dateKey = anchorDate.toISOString();

      return (
         <View className="gap-4">
            {/* STREAK CARD - Always Render */}
            <Animated.View
               entering={FadeInDown.duration(600).springify()}
               layout={LinearTransition.springify()}
            >
               <StreakCard
                  key={`streak-${dateKey}`}
                  data={streakView}
                  shadowSm={shadowSm}
                  anchorDate={anchorDate}
                  showEncouragement={showEncouragement}
                  onDeleteEntry={onDeleteEntry}
                  isLoading={isLoading}
               />
            </Animated.View>

            {/* MENTAL FOCUS - Only if focusView has valid AI data */}
            {focusView && (
               <Animated.View
                  entering={FadeInDown.duration(600).delay(100).springify()}
                  exiting={FadeOutUp.duration(400)}
                  layout={LinearTransition.springify()}
               >
                  <MentalFocusCard
                     key={`focus-${dateKey}`}
                     analysis={focusView}
                     entries={entries}
                     shadowStyle={shadowSm}
                     isDark={isDark}
                     onDeleteEntry={onDeleteEntry}
                  />
               </Animated.View>
            )}

            {/* THINKING PATTERNS - Only if patternView has valid AI data */}
            {patternView && (
               <Animated.View
                  entering={FadeInDown.duration(600).delay(200).springify()}
                  exiting={FadeOutUp.duration(400)}
                  layout={LinearTransition.springify()}
               >
                  <ThinkingPatternCard
                     key={`pattern-${dateKey}`}
                     data={patternView}
                     shadowStyle={shadowSm}
                     isDark={isDark}
                  />
               </Animated.View>
            )}
         </View>
      );
   },
);

export default HomeDashboard;
HomeDashboard.displayName = 'HomeDashboard';
