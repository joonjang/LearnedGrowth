import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Activity } from 'lucide-react-native';
import React, { useCallback, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import {
   CATEGORY_ICON_MAP,
   DEFAULT_CATEGORY_ICON,
   STYLE_TO_TONE_MAP,
} from '@/components/constants';
import { CARD_PRESS_STYLE } from '@/lib/utils';
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

   if (!analysis) return null;

   const { categoryStats, narrative } = analysis;
   const TopIcon =
      CATEGORY_ICON_MAP[narrative.topCatLabel] || DEFAULT_CATEGORY_ICON;
   const detectedTone = STYLE_TO_TONE_MAP[narrative.styleLabel] ?? 'Mixed';

   const getToneColor = (tone: string) => {
      if (tone === 'Optimistic') return isDark ? '#34d399' : '#059669';
      if (tone === 'Pessimistic') return isDark ? '#f87171' : '#dc2626';
      return isDark ? '#a78bfa' : '#7c3aed';
   };
   const toneColor = getToneColor(detectedTone);

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
               <View className="flex-row items-center gap-2 mb-5">
                  <Activity size={16} color={isDark ? '#cbd5e1' : '#64748b'} />
                  <Text className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                     Mental Focus
                  </Text>
               </View>

               {/* --- PART 1: STATS CONTAINER (Background Distinction) --- */}
               {/* Added bg-slate-50 and border to create a "Dashboard Widget" look */}
               <View className="flex-row items-center mb-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl py-4 border border-slate-100 dark:border-slate-700/50">
                  {/* Left Column */}
                  <View className="flex-1 items-center justify-center">
                     <Text className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mb-1.5">
                        Detected Tone
                     </Text>
                     <View className="flex-row items-center gap-2">
                        <View
                           className="w-2 h-2 rounded-full"
                           style={{ backgroundColor: toneColor }}
                        />
                        <Text className="text-sm font-bold text-slate-900 dark:text-white">
                           {detectedTone}
                        </Text>
                     </View>
                  </View>

                  {/* Vertical Divider (Matches container border) */}
                  <View className="w-[1px] h-8 bg-slate-200 dark:bg-slate-700" />

                  {/* Right Column */}
                  <View className="flex-1 items-center justify-center">
                     <Text className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mb-1.5">
                        Self-Talk Style
                     </Text>
                     <View className="flex-row items-center gap-2">
                        <View
                           className="w-2 h-2 rounded-full"
                           style={{ backgroundColor: narrative.styleColor }}
                        />
                        <Text className="text-sm font-bold text-slate-900 dark:text-white">
                           {narrative.styleLabel}
                        </Text>
                     </View>
                  </View>
               </View>

               {/* --- PART 2: PRIMARY TOPIC --- */}
               <View className="flex-row items-center gap-4 mb-5 px-1">
                  {/* Icon Box */}
                  <View className="h-14 w-14 items-center justify-center bg-slate-50 dark:bg-slate-700/40 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                     <TopIcon
                        size={26}
                        color={isDark ? '#e2e8f0' : '#334155'}
                        strokeWidth={2}
                     />
                  </View>

                  {/* Topic Text */}
                  <View>
                     <Text className="text-xl font-extrabold text-slate-900 dark:text-white leading-6">
                        {narrative.topCatLabel}
                     </Text>
                     <Text className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                        Most discussed topic
                     </Text>
                  </View>
               </View>

               {/* --- STATS FOOTER --- */}
               <View className="mb-2">
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

               <View className="flex-row flex-wrap gap-x-4 gap-y-2 px-1">
                  {categoryStats.slice(0, 4).map((stat: MentalFocusStat) => (
                     <View
                        key={stat.label}
                        className="flex-row items-center gap-1.5"
                     >
                        <View
                           className="w-1.5 h-1.5 rounded-full"
                           style={{ backgroundColor: stat.style.color }}
                        />
                        <Text className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                           {stat.label}{' '}
                           <Text className="font-bold text-slate-400 dark:text-slate-500">
                              {Math.round(stat.percentage)}%
                           </Text>
                        </Text>
                     </View>
                  ))}
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
