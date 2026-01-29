import { getWeekStart } from '@/lib/date';
import { isOptimistic, toDateKey } from '@/lib/utils';
import { Entry } from '@/models/entry';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { router } from 'expo-router';
import { Layers } from 'lucide-react-native';
import React, { useCallback, useMemo, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
   FadeInDown,
   FadeOutUp,
   LinearTransition,
} from 'react-native-reanimated';
import { ROUTE_ENTRIES, WEEKDAY_LABELS } from '../constants';
import NoAiEntrySheet from './NoAiEntrySheet';
import RecentEntriesCarousel from './RecentEntriesCarousel';
import NeedsAttentionSheet from './statHero/NeedsAttentionSheet';
import StatHero, { getResolutionStatus } from './statHero/StatHero';
import ThinkingPatternCard from './thinkingPattern/ThinkingPatternCard';
import {
   DayBucket,
   MonthStat,
   StreakViewModel,
   ThinkingPatternData,
   ThinkingPatternViewModel,
} from './types';

// --- CONFIG & HELPERS ---

function getScoreWeight(score: string | null | undefined): number {
   if (!score) return 0.5; // Default to middle
   const lower = score.toLowerCase();
   if (lower.includes('mixed') || lower.includes('balanced')) return 0.5;
   return isOptimistic(score) ? 1.0 : 0.0;
}

const PATTERN_TAB_CONFIG = {
   Time: {
      dimension: 'permanence',
      highLabel: 'Temporary',
      lowLabel: 'Permanent',
   },
   Scope: {
      dimension: 'pervasiveness',
      highLabel: 'Specific',
      lowLabel: 'Everything',
   },
   Blame: {
      dimension: 'personalization',
      highLabel: 'My Fault',
      lowLabel: 'Situation',
   },
} as const;

const MAX_TREND_POINTS = 7;

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

type AiDataEmptyCardProps = {
   title: string;
   Icon: React.ComponentType<{ size?: number; color?: string }>;
   shadowStyle: any;
   isDark: boolean;
};

function AiDataEmptyCard({
   title,
   Icon,
   shadowStyle,
   isDark,
}: AiDataEmptyCardProps) {
   const t = title.toLowerCase();
   const subtitle = t.includes('thinking')
      ? 'Displays the patterns in how you explain setbacks from analyzed entries.'
      : 'Unlocks insights from analyzed entries.';
   const thinkingQuestions = [
      'Do your entries frame setbacks as lasting, or passing?',
      'Do your entries suggest it affects everything, or one area?',
      'Do your entries place the cause on you, or the situation?',
   ];
   return (
      <View
         className="p-5 pb-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700"
         style={[shadowStyle.ios, shadowStyle.android]}
      >
         <View className="flex-row items-center gap-2 mb-3">
            <Icon size={16} color={isDark ? '#cbd5e1' : '#64748b'} />
            <Text className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
               {title}
            </Text>
         </View>
         <View className="bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700/50 px-4 py-4">
            <Text className="text-sm font-semibold text-slate-700 dark:text-slate-200">
               Requries entries with AI analysis
            </Text>
            <Text className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-5">
               {subtitle}
            </Text>
            {t.includes('thinking') && (
               <View className="mt-3 gap-2">
                  {thinkingQuestions.map((q) => (
                     <View key={q} className="flex-row items-start">
                        <Text className="text-xs text-slate-400 dark:text-slate-500 mr-2">
                           •
                        </Text>
                        <Text className="flex-1 text-xs text-slate-500 dark:text-slate-400 leading-5">
                           {q}
                        </Text>
                     </View>
                  ))}
               </View>
            )}
         </View>
      </View>
   );
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
      // 1. --- CALCULATE INSIGHT COVERAGE ---
      const { insightCoverage, entriesWithoutInsight } = useMemo(() => {
         const total = entries.length;
         if (total === 0)
            return { insightCoverage: null, entriesWithoutInsight: [] };

         const missingEntries = entries.filter((e) => !e.aiResponse);
         const validAiCount = total - missingEntries.length;

         if (validAiCount < total) {
            return {
               insightCoverage: { valid: validAiCount, total },
               entriesWithoutInsight: missingEntries,
            };
         }
         return { insightCoverage: null, entriesWithoutInsight: [] };
      }, [entries]);
      const showAiEmptyCards =
         entries.length > 0 && insightCoverage?.valid === 0;

      const resolutionStats = useMemo(
         () => getResolutionStatus(entries, isDark),
         [entries, isDark],
      );
      const needsAttentionEntries = useMemo(
         () =>
            entries.filter(
               (entry) => (entry.dispute ?? '').trim().length === 0,
            ),
         [entries],
      );
      const needsAttentionSheetRef = useRef<BottomSheetModal | null>(null);
      const insightCoverageSheetRef = useRef<BottomSheetModal | null>(null);

      const handleOpenNeedsAttention = useCallback(
         () => needsAttentionSheetRef.current?.present(),
         [],
      );
      const handleOpenInsightCoverage = useCallback(
         () => insightCoverageSheetRef.current?.present(),
         [],
      );

      const handleViewAllEntries = useCallback(() => {
         // Adjust this route to match your journal tab or list screen
         router.push(ROUTE_ENTRIES);
      }, []);

      const { patternView } = useMemo(() => {
         const dayBuckets = new Map<string, DayBucket>();
         const filledDaysSet = new Set<string>();
         const monthMap = new Map<string, MonthStat>();

         const threePsStats = {
            perm: { val: 0, count: 0 },
            perv: { val: 0, count: 0 },
            pers: { val: 0, count: 0 },
         };

         const entriesWithMeta: { entry: Entry; created: Date }[] = [];

         for (const entry of entries) {
            const created = new Date(entry.createdAt);
            if (isNaN(created.getTime())) continue;
            const dateKey = toDateKey(created);
            const analysis = entry.aiResponse?.analysis;

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

            if (entry.aiResponse) {
               const dims = analysis?.dimensions;
               if (dims) {
                  if (dims.permanence) {
                     threePsStats.perm.count++;
                     threePsStats.perm.val += getScoreWeight(
                        dims.permanence.score,
                     );
                  }
                  if (dims.pervasiveness) {
                     threePsStats.perv.count++;
                     threePsStats.perv.val += getScoreWeight(
                        dims.pervasiveness.score,
                     );
                  }
                  if (dims.personalization) {
                     threePsStats.pers.count++;
                     threePsStats.pers.val += getScoreWeight(
                        dims.personalization.score,
                     );
                  }
                  entriesWithMeta.push({ entry, created });
               }
            }
         }

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
                 if (a.year !== b.year) return b.year - a.year;
                 return b.monthIndex - a.monthIndex;
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

         let patternView: ThinkingPatternViewModel | null = null;
         if (entriesWithMeta.length > 0) {
            const getScore = (s: { val: number; count: number }) =>
               s.count > 0 ? (s.val / s.count) * 100 : 50;

            const sortedAsc = [...entriesWithMeta].sort(
               (a, b) => a.created.getTime() - b.created.getTime(),
            );
            const sortedDesc = [...entriesWithMeta].sort(
               (a, b) => b.created.getTime() - a.created.getTime(),
            );
            type DimensionKey = keyof NonNullable<
               NonNullable<Entry['aiResponse']>['analysis']
            >['dimensions'];
            const getDimScore = (e: Entry, k: DimensionKey) =>
               e.aiResponse?.analysis?.dimensions?.[k]?.score;
            const getDimPhrase = (e: Entry, k: DimensionKey) =>
               e.aiResponse?.analysis?.dimensions?.[k]?.detectedPhrase;
            const getDimInsight = (e: Entry, k: DimensionKey) =>
               e.aiResponse?.analysis?.dimensions?.[k]?.insight;
            const buildTabData = (
               configKey: keyof typeof PATTERN_TAB_CONFIG,
            ) => {
               const config = PATTERN_TAB_CONFIG[configKey];
               const dimKey = config.dimension;
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
                     const rawPhrase = getDimPhrase(item.entry, dimKey);
                     const phrase = rawPhrase?.trim() ?? '';
                     const insight = getDimInsight(item.entry, dimKey);
                     if (!phrase && !score) return null;
                     return {
                        id: `${item.entry.id}-${dimKey}`,
                        entryId: item.entry.id,
                        createdAt: item.entry.createdAt,
                        phrase: phrase || 'No phrase detected for this entry.',
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
         return { streakView, patternView };
      }, [anchorDate, isAllTime, entries]);

      // --- RENDER ---
      const dateKey = anchorDate.toISOString();

      return (
         <View className="gap-4">
            <StatHero
               resolutionStats={resolutionStats}
               needsAttentionCount={needsAttentionEntries.length}
               onOpenNeedsAttention={handleOpenNeedsAttention}
               isDark={isDark}
            />

            {/* INSIGHT COVERAGE FOOTER */}
            {insightCoverage && (
               <Animated.View
                  entering={FadeInDown.duration(400)}
                  className="mx-4 pt-2 "
               >
                  <Pressable
                     onPress={handleOpenInsightCoverage}
                     accessibilityRole="button"
                     accessibilityLabel={`AI coverage: ${insightCoverage.valid} of ${insightCoverage.total} entries. Analyze remaining.`}
                     className="active:opacity-70"
                     hitSlop={8}
                  >
                     <Text className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        AI coverage:{' '}
                        <Text
                           className="font-black text-slate-700 dark:text-slate-200"
                           style={{ fontVariant: ['tabular-nums'] }}
                        >
                           {insightCoverage.valid}/{insightCoverage.total}
                        </Text>{' '}
                        entries{' '}
                        <Text className="text-slate-400 dark:text-slate-600">
                           •
                        </Text>{' '}
                        <Text className="font-semibold text-indigo-600 dark:text-indigo-400">
                           Analyze remaining →
                        </Text>
                     </Text>
                  </Pressable>
               </Animated.View>
            )}

            {/* THINKING PATTERNS */}
            {showAiEmptyCards ? (
               <Animated.View
                  entering={FadeInDown.duration(600).delay(200).springify()}
                  exiting={FadeOutUp.duration(400)}
                  layout={LinearTransition.springify()}
               >
                  <AiDataEmptyCard
                     title="Thinking Patterns"
                     Icon={Layers}
                     shadowStyle={shadowSm}
                     isDark={isDark}
                  />
               </Animated.View>
            ) : (
               patternView && (
                  <Animated.View
                     entering={FadeInDown.duration(600).delay(200).springify()}
                     exiting={FadeOutUp.duration(400)}
                     layout={LinearTransition.springify()}
                  >
                     <ThinkingPatternCard
                        key={`pattern-${dateKey}`}
                        data={patternView}
                        entries={entries}
                        shadowStyle={shadowSm}
                        isDark={isDark}
                     />
                  </Animated.View>
               )
            )}

            {entries.length > 0 && (
               <Animated.View
                  entering={FadeInDown.duration(600).delay(100).springify()}
                  exiting={FadeOutUp.duration(400)}
                  layout={LinearTransition.springify()}
               >
                  <RecentEntriesCarousel
                     entries={entries}
                     onDelete={onDeleteEntry}
                     isDark={isDark}
                     onViewAll={handleViewAllEntries}
                  />
               </Animated.View>
            )}

            <NeedsAttentionSheet
               sheetRef={needsAttentionSheetRef}
               entries={needsAttentionEntries}
               totalCount={entries.length}
               isDark={isDark}
               onDeleteEntry={onDeleteEntry}
            />

            <NoAiEntrySheet
               sheetRef={insightCoverageSheetRef}
               entries={entriesWithoutInsight}
               totalCount={entries.length}
               isDark={isDark}
               onDeleteEntry={onDeleteEntry}
            />
         </View>
      );
   },
);

export default HomeDashboard;
HomeDashboard.displayName = 'HomeDashboard';
