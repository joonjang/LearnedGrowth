import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { MessageCircleMore } from 'lucide-react-native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import {
   CATEGORY_ICON_MAP,
   DEFAULT_CATEGORY_ICON,
   STYLE_TO_TONE_MAP,
} from '@/components/constants';
import { getAiAnalyzedEntryCount } from '@/lib/mentalFocus';
import { CARD_PRESS_STYLE } from '@/lib/styles';
import { Entry } from '@/models/entry';
import HelperFooter from '../HelperFooter';
import { MentalFocusStat, MentalFocusViewModel } from '../types';
import { MentalFocusSheet } from './MentalFocusSheet';

type Props = {
   analysis: MentalFocusViewModel;
   entries: Entry[];
   shadowStyle: any;
   isDark: boolean;
   onDeleteEntry: (entry: Entry) => void;
};

function getObservedMoodLabel(styleLabel: string | null | undefined) {
   const lower = (styleLabel ?? '').toLowerCase();

   if (lower.includes('balanced')) return 'Balanced';

   if (lower.includes('mixed') || lower.includes('varied')) {
      return 'Up & down (positive + negative)';
   }

   const tone = STYLE_TO_TONE_MAP[styleLabel ?? ''] ?? 'Mixed';
   if (tone === 'Optimistic') return 'Optimistic';
   if (tone === 'Pessimistic') return 'Pessimistic';

   return 'Up & down (positive + negative)';
}

export default function MentalFocusCard({
   analysis,
   entries,
   shadowStyle,
   isDark,
   onDeleteEntry,
}: Props) {
   const sheetRef = useRef<BottomSheetModal>(null);
   const [isPressed, setIsPressed] = useState(false);

   const handlePresentModal = useCallback(
      () => sheetRef.current?.present(),
      [],
   );

   // --- Derived data (hooks before early return) ---
   const categoryStats = useMemo(
      () => analysis?.categoryStats ?? [],
      [analysis?.categoryStats],
   );
   const narrative = analysis?.narrative;

   const analyzedCount = useMemo(
      () => getAiAnalyzedEntryCount(entries ?? []),
      [entries],
   );

   const observedMood = useMemo(
      () => getObservedMoodLabel(narrative?.styleLabel),
      [narrative?.styleLabel],
   );

   const topTheme = narrative?.topCatLabel ?? '—';
   const recurringIdea = narrative?.topTagLabel?.trim() || 'No repeat yet';

   const TopIcon = CATEGORY_ICON_MAP[topTheme] || DEFAULT_CATEGORY_ICON;

   const sortedStats = useMemo(() => {
      if (!categoryStats?.length) return [];
      return [...categoryStats].sort((a, b) => b.percentage - a.percentage);
   }, [categoryStats]);

   if (!analysis) return null;

   return (
      <>
         <Pressable
            onPress={handlePresentModal}
            onPressIn={() => setIsPressed(true)}
            onPressOut={() => setIsPressed(false)}
         >
            <View
               className="p-5 pb-1 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700"
               style={[
                  shadowStyle.ios,
                  shadowStyle.android,
                  isPressed && CARD_PRESS_STYLE.cardPressed,
               ]}
            >
               {/* --- HEADER --- */}
               <View className="flex-row items-start justify-between mb-4">
                  <View className="flex-row items-center gap-2">
                     <MessageCircleMore
                        size={16}
                        color={isDark ? '#cbd5e1' : '#64748b'}
                     />
                     <Text className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                        Mental Focus
                     </Text>
                  </View>

                  <Text
                     className="text-[9px] font-medium text-slate-400 dark:text-slate-500 text-right leading-4 max-w-[160px]"
                     style={{ fontVariant: ['tabular-nums'] }}
                  >
                     Based on {analyzedCount} analyzed{' '}
                     {analyzedCount === 1 ? 'entry' : 'entries'}
                  </Text>
               </View>

               {/* --- HERO TOP THEME (full width, can wrap) --- */}
               <View className="flex-row items-center gap-4 mb-4">
                  <View className="h-14 w-14 items-center justify-center bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/50 shadow-sm">
                     <TopIcon
                        size={26}
                        color={isDark ? '#818cf8' : '#4f46e5'}
                        strokeWidth={2}
                     />
                  </View>

                  <View className="flex-1 min-w-0">
                     <Text className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                        Top theme
                     </Text>
                     <Text
                        className="text-xl font-extrabold text-slate-900 dark:text-white leading-7"
                        numberOfLines={2}
                     >
                        {topTheme}
                     </Text>
                  </View>
               </View>

               {/* --- QUICK OVERVIEW (two stacked rows) --- */}
               <View className="bg-slate-50 dark:bg-slate-900/40 rounded-xl px-4 py-4 border border-slate-100 dark:border-slate-700/50 mb-5">
                  {/* Row 1: Observed mood */}
                  <View className="flex-row items-start justify-between gap-3">
                     <Text className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        Observed mood
                     </Text>
                     <Text
                        className="flex-1 text-sm font-extrabold text-slate-900 dark:text-slate-100 text-right"
                        numberOfLines={2}
                     >
                        {observedMood}
                     </Text>
                  </View>

                  <View className="h-[1px] bg-slate-200 dark:bg-slate-700/50 w-full my-3 opacity-50" />

                  {/* Row 2: Recurring idea (shorter label) */}
                  <View className="flex-row items-start justify-between gap-3">
                     <Text className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        Recurring idea
                     </Text>
                     <Text
                        className="flex-1 text-sm font-extrabold text-slate-900 dark:text-slate-100 text-right"
                        numberOfLines={2}
                     >
                        {recurringIdea}
                     </Text>
                  </View>
               </View>

               {/* --- DISTRIBUTION BAR (same as before) --- */}
               <View className="mb-4">
                  <View className="flex-row h-1.5 rounded-full overflow-hidden w-full bg-slate-100 dark:bg-slate-700">
                     {categoryStats.map(
                        (stat: MentalFocusStat, idx: number) => (
                           <View
                              key={stat.label}
                              style={{
                                 flex: stat.percentage,
                                 backgroundColor: stat.style.color,
                                 marginRight:
                                    idx === categoryStats.length - 1 ? 0 : 1,
                              }}
                           />
                        ),
                     )}
                  </View>
               </View>

               {/* --- LEGEND (same format as before) --- */}
               <View className="mb-2 px-1">
                  <Text
                     numberOfLines={1}
                     ellipsizeMode="tail"
                     className="flex-row items-center"
                  >
                     {sortedStats.map((stat, idx) => (
                        <React.Fragment key={stat.label}>
                           <Text
                              style={{ color: stat.style.color }}
                              className="text-[10px]"
                           >
                              ■{' '}
                           </Text>
                           <Text className="text-[10px] font-bold tracking-tight text-slate-500 dark:text-slate-400">
                              {stat.label}{' '}
                              <Text
                                 className="text-xs font-bold text-slate-900 dark:text-white"
                                 style={{ fontVariant: ['tabular-nums'] }}
                              >
                                 {Math.round(stat.percentage)}%
                              </Text>
                           </Text>
                           {idx < sortedStats.length - 1 && (
                              <Text className="text-slate-300 dark:text-slate-600">
                                 {'   '}
                              </Text>
                           )}
                        </React.Fragment>
                     ))}
                  </Text>
               </View>

               <HelperFooter isDark={isDark} />
            </View>
         </Pressable>

         <MentalFocusSheet
            sheetRef={sheetRef}
            analysis={analysis}
            entries={entries}
            isDark={isDark}
            onDeleteEntry={onDeleteEntry}
         />
      </>
   );
}
