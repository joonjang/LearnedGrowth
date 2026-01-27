import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Activity, MessageSquareText, Sparkles } from 'lucide-react-native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import {
   CATEGORY_ICON_MAP,
   DEFAULT_CATEGORY_ICON,
   STYLE_TO_TONE_MAP,
} from '@/components/constants';
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

// --- VISUAL: THE SIGNAL SEQUENCE (Phantom Slots) ---
const SignalSequence = ({
   label,
   value,
   history, // Array of objects: { score: number | null }
   color,
   icon: Icon,
   isDark,
}: {
   label: string;
   value: string;
   history: { score: number | null }[];
   color: string;
   icon: any;
   isDark: boolean;
}) => {
   // Helper: Map score 0-10 to height % (min 15% for visibility)
   const getHeight = (score: number) =>
      15 + (Math.min(Math.max(score, 0), 10) / 10) * 85;

   return (
      <View className="mb-6 last:mb-0">
         {/* 1. Header Info */}
         <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-2">
               <Icon size={14} color={color} />
               <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {label}
               </Text>
            </View>
            <Text className="text-sm font-bold text-slate-900 dark:text-slate-100">
               {value}
            </Text>
         </View>

         {/* 2. The Signal Bars */}
         <View className="flex-row items-end justify-between h-12 mb-2">
            {history.map((item, index) => {
               const hasData = item.score !== null;
               const height = hasData ? getHeight(item.score!) : 100; // Full height for phantom placeholder

               return (
                  <View key={index} className="w-[18%] h-full justify-end">
                     {hasData ? (
                        // CASE A: DATA EXISTS (Solid Bar)
                        <View
                           className="w-full rounded-sm"
                           style={{
                              height: `${height}%`,
                              backgroundColor: color,
                              opacity: 0.5 + index * 0.1, // Fade older entries slightly
                           }}
                        />
                     ) : (
                        // CASE B: PHANTOM ENTRY (Dashed Slot)
                        <View
                           className="w-full h-full rounded-sm border-2 border-dashed"
                           style={{
                              borderColor: isDark ? '#334155' : '#e2e8f0',
                              backgroundColor: 'transparent',
                           }}
                        />
                     )}
                  </View>
               );
            })}
         </View>
      </View>
   );
};

export default function MentalFocusCard({
   analysis,
   entries,
   shadowStyle,
   isDark,
   onDeleteEntry,
}: Props) {
   const sheetRef = useRef<BottomSheetModal>(null);
   const [isPressed, setIsPressed] = useState(false);

   // --- 1. Extract History with Null Handling ---
   const history = useMemo(() => {
      // Default empty structure
      if (!entries || entries.length === 0)
         return {
            optimism: Array(5).fill({ score: null }),
            sentiment: Array(5).fill({ score: null }),
         };

      // 1. Take the last 5 entries (or fewer if not enough exist)
      const recentEntries = entries.slice(0, 5).reverse();

      // 2. Map to score objects, preserving NULLs for missing AI data
      const optHistory = recentEntries.map((e) => ({
         score:
            typeof e.aiResponse?.meta?.optimismScore === 'number'
               ? e.aiResponse.meta.optimismScore
               : null,
      }));

      const sentHistory = recentEntries.map((e) => ({
         score:
            typeof e.aiResponse?.meta?.sentimentScore === 'number'
               ? e.aiResponse.meta.sentimentScore
               : null,
      }));

      // 3. Pad with "Phantom" entries at the start if total < 5
      while (optHistory.length < 5) optHistory.unshift({ score: null });
      while (sentHistory.length < 5) sentHistory.unshift({ score: null });

      return {
         optimism: optHistory,
         sentiment: sentHistory,
      };
   }, [entries]);

   const sortedStats = useMemo(() => {
      if (!analysis?.categoryStats) return [];
      return [...analysis.categoryStats].sort(
         (a, b) => b.percentage - a.percentage,
      );
   }, [analysis?.categoryStats]);

   const handlePresentModal = useCallback(
      () => sheetRef.current?.present(),
      [],
   );

   if (!analysis) return null;

   const { categoryStats, narrative } = analysis;
   const TopIcon =
      CATEGORY_ICON_MAP[narrative.topCatLabel] || DEFAULT_CATEGORY_ICON;
   const rawTone = STYLE_TO_TONE_MAP[narrative.styleLabel] ?? 'Mixed';
   const attitudeLabel = rawTone === 'Mixed' ? 'Varied' : rawTone;

   const getToneColor = (tone: string) => {
      if (tone === 'Optimistic') return isDark ? '#34d399' : '#059669';
      if (tone === 'Pessimistic') return isDark ? '#f87171' : '#dc2626';
      return isDark ? '#a78bfa' : '#7c3aed';
   };

   const attitudeColor = getToneColor(attitudeLabel);

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
               <View className="flex-row items-center gap-2 mb-4">
                  <Activity size={16} color={isDark ? '#cbd5e1' : '#64748b'} />
                  <Text className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                     Mental Focus
                  </Text>
               </View>

               {/* --- HERO TOPIC --- */}
               <View className="flex-row items-center gap-4 mb-6">
                  <View className="h-14 w-14 items-center justify-center bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/50 shadow-sm">
                     <TopIcon
                        size={26}
                        color={isDark ? '#818cf8' : '#4f46e5'}
                        strokeWidth={2}
                     />
                  </View>
                  <View className="flex-1">
                     <Text className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                        Most Discussed Topic
                     </Text>
                     <Text className="text-xl font-extrabold text-slate-900 dark:text-white leading-7">
                        {narrative.topCatLabel}
                     </Text>
                  </View>
               </View>

               {/* --- SIGNAL SEQUENCES --- */}
               {/* Visualizes history with Phantom slots */}
               <View className="bg-slate-50 dark:bg-slate-900/40 rounded-xl p-5 border border-slate-100 dark:border-slate-700/50 mb-5">
                  {/* 1. Attitude Signal */}
                  <SignalSequence
                     label="Attitude Signal"
                     value={attitudeLabel}
                     history={history.optimism}
                     color={attitudeColor}
                     icon={Sparkles}
                     isDark={isDark}
                  />

                  {/* Divider */}
                  <View className="h-[1px] bg-slate-200 dark:bg-slate-700/50 w-full mb-5 mt-2 opacity-50" />

                  {/* 2. Style Signal */}
                  <SignalSequence
                     label="Style Signal"
                     value={narrative.styleLabel}
                     history={history.sentiment}
                     color={narrative.styleColor}
                     icon={MessageSquareText}
                     isDark={isDark}
                  />
               </View>

               {/* --- DISTRIBUTION BAR --- */}
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

               {/* --- LEGEND --- */}
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
                              <Text className="text-xs font-bold text-slate-900 dark:text-white">
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
