import {
   bottomSheetBackgroundStyle,
   bottomSheetHandleIndicatorStyle,
} from '@/components/bottomSheetStyles';
import { STYLE_TO_TONE_MAP } from '@/components/constants';
import EntryCard from '@/components/entries/entry/EntryCard';
import {
   buildMentalFocusCategoryCounts,
   filterEntriesByMentalFocusCategory,
} from '@/lib/mentalFocus';
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
import { MessageSquareText, Sparkles } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
   FadeIn,
   FadeOut,
   LinearTransition,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MentalFocusViewModel } from '../types';

// --- NEW COMPONENT: ENTRY SCORE BADGE ---
const EntryScoreBadge = ({
   entry,
   isDark,
}: {
   entry: Entry;
   isDark: boolean;
}) => {
   // Safety check if scores exist
   const sentiment = entry.aiResponse?.meta?.sentimentScore ?? 0; // 1-10
   const optimism = entry.aiResponse?.meta?.optimismScore ?? 0; // 1-10

   // Simple color logic
   const getScoreColor = (score: number) => {
      if (score >= 7) return isDark ? '#34d399' : '#059669'; // Green
      if (score <= 4) return isDark ? '#f87171' : '#dc2626'; // Red
      return isDark ? '#fbbf24' : '#d97706'; // Amber/Mixed
   };

   return (
      <View className="flex-row items-center justify-between mb-1.5 px-1">
         <View className="flex-row gap-3">
            {/* Sentiment Score */}
            <View className="flex-row items-center gap-1.5">
               <View
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: getScoreColor(sentiment) }}
               />
               <Text className="text-[10px] font-bold text-slate-400 uppercase">
                  Sentiment:{' '}
                  <Text style={{ color: getScoreColor(sentiment) }}>
                     {sentiment}/10
                  </Text>
               </Text>
            </View>

            {/* Optimism Score */}
            <View className="flex-row items-center gap-1.5">
               <View
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: getScoreColor(optimism) }}
               />
               <Text className="text-[10px] font-bold text-slate-400 uppercase">
                  Optimism:{' '}
                  <Text style={{ color: getScoreColor(optimism) }}>
                     {optimism}/10
                  </Text>
               </Text>
            </View>
         </View>
      </View>
   );
};

// ... TopicCard ...
const TopicCard = ({
   isActive,
   color,
   label,
   percentage,
   count,
   onPress,
   isDark,
}: {
   isActive: boolean;
   color: string;
   label: string;
   percentage: number;
   count: number;
   onPress: () => void;
   isDark: boolean;
}) => {
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
         <View className="flex-row justify-between items-center mb-3">
            <View className="flex-row items-center gap-2.5">
               <View
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: color }}
               />
               <View>
                  <Text
                     className={`text-sm font-black ${isDark ? 'text-white' : 'text-slate-900'} tracking-tight`}
                  >
                     {label}
                  </Text>
                  <Text className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                     {count} {count === 1 ? 'Entry' : 'Entries'}
                  </Text>
               </View>
            </View>
            <Text
               className={`text-xs font-black ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}
            >
               {percentage}%
            </Text>
         </View>

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

   const maxSheetHeight = useMemo(() => windowHeight * 0.9, [windowHeight]);

   // --- SAFE HOOKS ---
   const dynamicTopicStats = useMemo(() => {
      // Guard inside hook
      if (!analysis?.categoryStats) return [];

      const { counts, total } = buildMentalFocusCategoryCounts(entries);

      return analysis.categoryStats
         .map((stat) => {
            const count = counts.get(stat.label) || 0;
            return {
               ...stat,
               dynamicCount: count,
               dynamicPercentage: total > 0 ? (count / total) * 100 : 0,
            };
         })
         .filter((stat) => stat.dynamicCount > 0)
         .sort((a, b) => b.dynamicPercentage - a.dynamicPercentage);
   }, [entries, analysis?.categoryStats]);

   const filteredEntries = useMemo(() => {
      if (!entries?.length || !activeTopic) return [];
      return filterEntriesByMentalFocusCategory(entries, activeTopic).sort(
         (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
   }, [activeTopic, entries]);

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

   // --- GUARD CLAUSE ---
   if (!analysis) return null;

   // --- SAFE CALCULATIONS ---
   const rawTone = STYLE_TO_TONE_MAP[analysis.narrative.styleLabel] ?? 'Mixed';
   const attitudeLabel = rawTone === 'Mixed' ? 'Varied' : rawTone;

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
            <View className="px-5 mb-6">
               <Text className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">
                  Mental Focus
               </Text>
               <Text className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                  Observed Topics
               </Text>

               {/* HEADER STATS (Matching Card) */}
               <View className="flex-row gap-3">
                  <View className="flex-row items-center bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700">
                     <Sparkles
                        size={10}
                        color={isDark ? '#94a3b8' : '#64748b'}
                     />
                     <Text className="text-[10px] font-bold text-slate-500 dark:text-slate-400 ml-1.5 uppercase">
                        Attitude:{' '}
                        <Text className="text-slate-700 dark:text-slate-300">
                           {attitudeLabel}
                        </Text>
                     </Text>
                  </View>
                  <View className="flex-row items-center bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700">
                     <MessageSquareText
                        size={10}
                        color={isDark ? '#94a3b8' : '#64748b'}
                     />
                     <Text className="text-[10px] font-bold text-slate-500 dark:text-slate-400 ml-1.5 uppercase">
                        Style:{' '}
                        <Text className="text-slate-700 dark:text-slate-300">
                           {analysis.narrative.styleLabel}
                        </Text>
                     </Text>
                  </View>
               </View>

               {!activeTopic && (
                  <Animated.Text
                     entering={FadeIn.duration(200)}
                     exiting={FadeOut.duration(200)}
                     className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest mt-4"
                  >
                     Tap a category to explore related entries
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
                     label={stat.label}
                     percentage={Math.round(stat.dynamicPercentage)}
                     count={stat.dynamicCount}
                     onPress={() =>
                        setActiveTopic(
                           activeTopic === stat.label ? null : stat.label,
                        )
                     }
                     isDark={isDark}
                  />
               ))}
            </View>

            {/* --- FILTERED ENTRIES WITH SCORES --- */}
            {activeTopic && (
               <Animated.View
                  entering={FadeIn.duration(300)}
                  exiting={FadeOut.duration(200)}
                  className="px-5 mt-6 border-t border-slate-100 dark:border-slate-800 pt-6"
               >
                  <View className="mb-5">
                     <Text className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[2px]">
                        {filteredEntries.length === 1 ? ' Entry' : 'Entries'} on{' '}
                        {activeTopic}
                     </Text>
                  </View>
                  <View className="gap-5">
                     {filteredEntries.map((entry) => (
                        <Animated.View
                           key={entry.id}
                           entering={FadeIn.duration(200)}
                           layout={LinearTransition.duration(200)}
                        >
                           {/* SCORE BADGE ABOVE ENTRY */}
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
