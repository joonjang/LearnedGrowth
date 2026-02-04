import EntryCard from '@/components/entries/entry/EntryCard';
import {
   bottomSheetBackgroundStyle,
   bottomSheetHandleIndicatorStyle,
} from '@/components/utils/bottomSheetStyles';
import {
   buildMentalFocusCategoryCounts,
   filterEntriesByMentalFocusCategory,
} from '@/lib/mentalFocus';
import { getCategoryLabel } from '@/lib/labels';
import { getShadow } from '@/lib/shadow';
import {
   BOTTOM_SHEET_BACKDROP_OPACITY,
   BOTTOM_SHEET_BG_DARK,
   BOTTOM_SHEET_BG_LIGHT,
} from '@/lib/styles';
import { Entry } from '@/models/entry';
import {
   BottomSheetBackdrop,
   BottomSheetBackdropProps,
   BottomSheetModal,
   BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
   FadeIn,
   FadeOut,
   LinearTransition,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MentalFocusViewModel } from '../types';

// ------------------------------
// Mood helpers
// ------------------------------
type MoodKind = 'positive' | 'negative' | 'balanced' | 'mixed' | 'unknown';

function isNum(v: any): v is number {
   return typeof v === 'number' && Number.isFinite(v);
}

function getMoodColor(kind: MoodKind, isDark: boolean) {
   if (kind === 'positive') return isDark ? '#34d399' : '#059669'; // green
   if (kind === 'negative') return isDark ? '#f87171' : '#dc2626'; // red
   if (kind === 'balanced') return isDark ? '#94a3b8' : '#64748b'; // slate
   if (kind === 'mixed') return isDark ? '#fbbf24' : '#d97706'; // amber
   return isDark ? '#64748b' : '#94a3b8';
}

function getMoodFromScores(
   sentimentScore: number | null | undefined,
   optimismScore: number | null | undefined,
   t: (key: string) => string,
): { label: string; shortLabel: string; kind: MoodKind } {
   if (!isNum(sentimentScore) && !isNum(optimismScore)) {
      return {
         label: t('home.mental_focus.not_analyzed'),
         shortLabel: t('home.mental_focus.not_analyzed'),
         kind: 'unknown',
      };
   }

   const s = isNum(sentimentScore) ? sentimentScore : null;
   const o = isNum(optimismScore) ? optimismScore : null;

   const values = [s, o].filter(isNum) as number[];
   const avg = values.reduce((a, b) => a + b, 0) / values.length;

   // Strong agreement cases
   if (s !== null && o !== null) {
      if (s >= 7 && o >= 7) {
         return {
            label: t('home.mental_focus.optimistic'),
            shortLabel: t('home.mental_focus.optimistic'),
            kind: 'positive',
         };
      }
      if (s <= 4 && o <= 4) {
         return {
            label: t('home.mental_focus.pessimistic'),
            shortLabel: t('home.mental_focus.pessimistic'),
            kind: 'negative',
         };
      }

      // Balanced band
      if (s >= 4.5 && s <= 6.5 && o >= 4.5 && o <= 6.5) {
         return {
            label: t('home.mental_focus.balanced'),
            shortLabel: t('home.mental_focus.balanced'),
            kind: 'balanced',
         };
      }

      // Disagreement / volatility
      const diff = Math.abs(s - o);
      if (diff >= 3 || (s >= 7 && o <= 4) || (o >= 7 && s <= 4)) {
         return {
            label: t('home.mental_focus.up_down'),
            shortLabel: t('home.mental_focus.up_down'),
            kind: 'mixed',
         };
      }
   }

   // Single-score / fallback
   if (avg >= 6.5)
      return {
         label: t('home.mental_focus.optimistic'),
         shortLabel: t('home.mental_focus.optimistic'),
         kind: 'positive',
      };
   if (avg <= 3.5)
      return {
         label: t('home.mental_focus.pessimistic'),
         shortLabel: t('home.mental_focus.pessimistic'),
         kind: 'negative',
      };
   if (avg >= 4.5 && avg <= 6.5)
      return {
         label: t('home.mental_focus.balanced'),
         shortLabel: t('home.mental_focus.balanced'),
         kind: 'balanced',
      };

   return {
      label: t('home.mental_focus.up_down'),
      shortLabel: t('home.mental_focus.up_down'),
      kind: 'mixed',
   };
}

function getCategoryMood(
   entriesInCategory: Entry[],
   isDark: boolean,
   t: (key: string) => string,
) {
   const scored = entriesInCategory
      .map((e) => {
         const s = e.aiResponse?.meta?.sentimentScore;
         const o = e.aiResponse?.meta?.optimismScore;
         return getMoodFromScores(s as any, o as any, t);
      })
      .filter((m) => m.kind !== 'unknown');

   if (scored.length === 0) {
      const unknown = getMoodFromScores(null, null, t);
      return { ...unknown, color: getMoodColor(unknown.kind, isDark) };
   }

   const kinds = new Set(scored.map((m) => m.kind));
   let final: { label: string; shortLabel: string; kind: MoodKind };

   if (kinds.has('mixed') || (kinds.has('positive') && kinds.has('negative'))) {
      final = {
         label: t('home.mental_focus.up_down'),
         shortLabel: t('home.mental_focus.up_down'),
         kind: 'mixed',
      };
   } else if (kinds.has('positive')) {
      final = {
         label: t('home.mental_focus.optimistic'),
         shortLabel: t('home.mental_focus.optimistic'),
         kind: 'positive',
      };
   } else if (kinds.has('negative')) {
      final = {
         label: t('home.mental_focus.pessimistic'),
         shortLabel: t('home.mental_focus.pessimistic'),
         kind: 'negative',
      };
   } else {
      final = {
         label: t('home.mental_focus.balanced'),
         shortLabel: t('home.mental_focus.balanced'),
         kind: 'balanced',
      };
   }

   return { ...final, color: getMoodColor(final.kind, isDark) };
}

// ------------------------------
// Entry badge (per entry)
// ------------------------------
const EntryScoreBadge = ({
   entry,
   isDark,
}: {
   entry: Entry;
   isDark: boolean;
}) => {
   const { t } = useTranslation();
   const sentiment = entry.aiResponse?.meta?.sentimentScore;
   const optimism = entry.aiResponse?.meta?.optimismScore;

   const mood = getMoodFromScores(sentiment as any, optimism as any, t);
   if (mood.kind === 'unknown') return null;

   const dotColor = getMoodColor(mood.kind, isDark);

   return (
      <View className="mb-1.5 px-1">
         <View className="flex-row items-center gap-2">
            <View
               className="w-1.5 h-1.5 rounded-full"
               style={{ backgroundColor: dotColor }}
            />
            <Text
               className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider"
               numberOfLines={1}
            >
               {t('home.mental_focus.observed_mood')}:{' '}
               <Text style={{ color: dotColor }}>{mood.label}</Text>
            </Text>
         </View>
      </View>
   );
};

// ------------------------------
// Topic card (mood in CENTER so % stays right)
// ------------------------------
const TopicCard = ({
   isActive,
   color,
   label,
   percentage,
   count,
   moodLabel,
   moodColor,
   onPress,
   isDark,
}: {
   isActive: boolean;
   color: string;
   label: string;
   percentage: number;
   count: number;
   moodLabel: string;
   moodColor: string;
   onPress: () => void;
   isDark: boolean;
}) => {
   const { t } = useTranslation();
   const buttonShadow = useMemo(
      () => getShadow({ isDark, preset: 'button', disableInDark: true }),
      [isDark],
   );

   return (
      <Pressable
         onPress={onPress}
         className={`mb-3 p-4 rounded-2xl border ${
            isActive
               ? 'bg-slate-50 dark:bg-slate-800 border-indigo-500/50 dark:border-indigo-400/50'
               : 'bg-white dark:bg-slate-900/50 border-slate-100 dark:border-slate-700'
         }`}
         style={!isActive ? [buttonShadow.ios, buttonShadow.android] : null}
      >
         {/* Header row: left content, centered mood, right % */}
         <View className="flex-row items-start mb-3">
            {/* LEFT */}
            <View className="flex-row items-center gap-2.5 flex-1 min-w-0">
               <View
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: color }}
               />
               <View className="flex-1 min-w-0">
                  <Text
                     numberOfLines={1}
                     className={`text-sm font-black ${
                        isDark ? 'text-white' : 'text-slate-900'
                     } tracking-tight`}
                  >
                     {label}
                  </Text>
                  <Text className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                     {t('home.entries_count', { count })}
                  </Text>
               </View>
            </View>

            {/* CENTER mood */}
            <View className="w-[34%] items-center justify-center px-2">
               <View className="flex-row items-center gap-2">
                  <View
                     className="w-1.5 h-1.5 rounded-full"
                     style={{ backgroundColor: moodColor }}
                  />
                  <Text
                     className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider"
                     numberOfLines={1}
                  >
                     {moodLabel}
                  </Text>
               </View>
            </View>

            {/* RIGHT % */}
            <Text
               className={`text-xs font-black ${
                  isActive
                     ? 'text-indigo-600 dark:text-indigo-400'
                     : 'text-slate-400'
               }`}
               style={{ fontVariant: ['tabular-nums'] }}
            >
               {percentage}%
            </Text>
         </View>

         {/* Progress bar */}
         <View className="h-1.5 w-full bg-slate-100 dark:bg-slate-800/50 rounded-full overflow-hidden">
            <View
               className="h-full rounded-full"
               style={{
                  width: `${percentage}%`,
                  backgroundColor: color,
                  opacity: isActive ? 1 : 0.4,
               }}
            />
         </View>
      </Pressable>
   );
};

type MentalFocusSheetProps = {
   sheetRef: React.RefObject<BottomSheetModal | null>;
   analysis: MentalFocusViewModel;
   entries: Entry[];
   isDark: boolean;
   onDeleteEntry: (entry: Entry) => void;
};

export function MentalFocusSheet({
   sheetRef,
   analysis,
   entries,
   isDark,
   onDeleteEntry,
}: MentalFocusSheetProps) {
   const insets = useSafeAreaInsets();
   const { height: windowHeight } = useWindowDimensions();
   const [activeTopic, setActiveTopic] = useState<string | null>(null);
   const [openMenuEntryId, setOpenMenuEntryId] = useState<string | null>(null);
   const { t } = useTranslation();

   const maxSheetHeight = useMemo(() => windowHeight * 0.9, [windowHeight]);

   const dynamicTopicStats = useMemo(() => {
      if (!analysis?.categoryStats) return [];

      const { counts, total } = buildMentalFocusCategoryCounts(entries);

      return analysis.categoryStats
         .map((stat) => {
            const count = counts.get(stat.label) || 0;

            const entriesInCat = filterEntriesByMentalFocusCategory(
               entries,
               stat.label,
            );
            const catMood = getCategoryMood(entriesInCat, isDark, t);
            const displayLabel = getCategoryLabel(stat.label, t);

            return {
               ...stat,
               displayLabel,
               dynamicCount: count,
               dynamicPercentage: total > 0 ? (count / total) * 100 : 0,
               moodLabel: catMood.shortLabel,
               moodColor: catMood.color,
            };
         })
         .filter((stat) => stat.dynamicCount > 0)
         .sort((a, b) => b.dynamicPercentage - a.dynamicPercentage);
   }, [entries, analysis?.categoryStats, isDark, t]);

   const filteredEntries = useMemo(() => {
      if (!entries?.length || !activeTopic) return [];
      return filterEntriesByMentalFocusCategory(entries, activeTopic).sort(
         (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
   }, [activeTopic, entries]);
   const activeTopicLabel = activeTopic
      ? getCategoryLabel(activeTopic, t)
      : '';

   const handleSheetDismiss = useCallback(() => {
      setActiveTopic(null);
      setOpenMenuEntryId(null);
   }, []);

   const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
         <BottomSheetBackdrop
            {...props}
            appearsOnIndex={0}
            disappearsOnIndex={-1}
            opacity={BOTTOM_SHEET_BACKDROP_OPACITY}
            pressBehavior="close"
         />
      ),
      [],
   );

   if (!analysis) return null;

   return (
      <BottomSheetModal
         ref={sheetRef}
         stackBehavior="replace"
         index={0}
         enableDynamicSizing={true}
         maxDynamicContentSize={maxSheetHeight}
         enablePanDownToClose
         onDismiss={handleSheetDismiss}
         backdropComponent={renderBackdrop}
         handleIndicatorStyle={bottomSheetHandleIndicatorStyle(isDark)}
         backgroundStyle={bottomSheetBackgroundStyle(
            isDark,
            isDark ? BOTTOM_SHEET_BG_DARK : BOTTOM_SHEET_BG_LIGHT,
         )}
      >
         <BottomSheetScrollView
            contentContainerStyle={{
               paddingTop: 12,
               paddingBottom: insets.bottom + 20,
            }}
            keyboardShouldPersistTaps="handled"
         >
            {/* --- SHEET HEADER --- */}
            <View className="px-5 mb-1">
               <Text className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">
                  {t('home.mental_focus.title')}
               </Text>
               <Text className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                  {t('home.mental_focus.observed_topics')}
               </Text>

               {!activeTopic && (
                  <Animated.Text
                     entering={FadeIn.duration(200)}
                     exiting={FadeOut.duration(200)}
                     className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest "
                  >
                     {t('home.mental_focus.tap_to_explore')}
                  </Animated.Text>
               )}
            </View>

            {/* --- TOPIC LIST --- */}
            <View className="px-5 mb-4">
               {dynamicTopicStats.map((stat) => (
                  <TopicCard
                     key={stat.label}
                     isActive={activeTopic === stat.label}
                     color={stat.style.color}
                     label={stat.displayLabel}
                     percentage={Math.round(stat.dynamicPercentage)}
                     count={stat.dynamicCount}
                     moodLabel={stat.moodLabel}
                     moodColor={stat.moodColor}
                     onPress={() =>
                        setActiveTopic(
                           activeTopic === stat.label ? null : stat.label,
                        )
                     }
                     isDark={isDark}
                  />
               ))}
            </View>

            {/* --- FILTERED ENTRIES WITH MOOD BADGE --- */}
            {activeTopic && (
               <Animated.View
                  entering={FadeIn.duration(300)}
                  exiting={FadeOut.duration(200)}
                  className="px-5 mt-6 border-t border-slate-100 dark:border-slate-800 pt-6"
               >
                  <View className="mb-5">
                     <Text className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[2px]">
                        {t('home.mental_focus.entries_on', {
                           count: filteredEntries.length,
                           topic: activeTopicLabel,
                        })}
                     </Text>
                  </View>

                  <View className="gap-5">
                     {filteredEntries.map((entry) => (
                        <Animated.View
                           key={entry.id}
                           entering={FadeIn.duration(200)}
                           layout={LinearTransition.duration(200)}
                        >
                           <EntryScoreBadge entry={entry} isDark={isDark} />

                           <EntryCard
                              entry={entry}
                              isMenuOpen={openMenuEntryId === entry.id}
                              onToggleMenu={() =>
                                 setOpenMenuEntryId(
                                    openMenuEntryId === entry.id
                                       ? null
                                       : entry.id,
                                 )
                              }
                              onCloseMenu={() => setOpenMenuEntryId(null)}
                              onDelete={(e) => {
                                 setOpenMenuEntryId(null);
                                 onDeleteEntry(e);
                              }}
                              onNavigate={() => {
                                 setOpenMenuEntryId(null);
                                 sheetRef.current?.dismiss();
                              }}
                              onAnalyze={() => {
                                 setOpenMenuEntryId(null);
                                 sheetRef.current?.dismiss();
                              }}
                              initialViewMode="original"
                           />
                        </Animated.View>
                     ))}
                  </View>
               </Animated.View>
            )}
         </BottomSheetScrollView>
      </BottomSheetModal>
   );
}
