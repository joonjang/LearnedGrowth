import { THINKING_PATTERN_DIMENSIONS } from '@/lib/constants';
import { getAiAnalyzedEntryCount } from '@/lib/mentalFocus';
import { CARD_PRESS_STYLE } from '@/lib/styles';
import { Entry } from '@/models/entry';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Layers } from 'lucide-react-native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import HelperFooter from '../HelperFooter';
import { ThinkingPatternViewModel } from '../types';
import GradientSpectrumBar from './GradientSpectrumBar';
import ThinkingPatternSheet, { PatternTab } from './ThinkingPatternSheet';

type Props = {
   data: ThinkingPatternViewModel;
   entries: Entry[];
   shadowStyle: any;
   isDark: boolean;
};

export default function ThinkingPatternCard({
   data,
   entries,
   shadowStyle,
   isDark,
}: Props) {
   const sheetRef = useRef<BottomSheetModal>(null);
   const [selectedTab, setSelectedTab] = useState<PatternTab>('Time');

   // We bring back the pressed state for the card animation
   const [isPressed, setIsPressed] = useState(false);

   const analyzedCount = useMemo(
      () => getAiAnalyzedEntryCount(entries ?? []),
      [entries],
   );

   const handleOpenSheet = useCallback((tab: PatternTab = 'Time') => {
      setSelectedTab(tab);
      sheetRef.current?.present();
   }, []);

   // Shared animation handlers
   const handlePressIn = useCallback(() => setIsPressed(true), []);
   const handlePressOut = useCallback(() => setIsPressed(false), []);

   if (!data) return null;

   const dimensionKeys = Object.keys(
      THINKING_PATTERN_DIMENSIONS,
   ) as (keyof typeof THINKING_PATTERN_DIMENSIONS)[];

   return (
      <>
         {/* OUTER PRESSABLE:
            Captures taps on whitespace/header -> Opens Default ('Time')
         */}
         <Pressable
            onPress={() => handleOpenSheet('Time')}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={({ pressed }) => [
               // We apply the animation style to the container manually based on isPressed state
            ]}
         >
            <View
               className="p-5 pb-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700"
               style={[
                  shadowStyle.ios,
                  shadowStyle.android,
                  isPressed && CARD_PRESS_STYLE.cardPressed,
               ]}
            >
               {/* Header */}
               <View className="flex-row items-start justify-between mb-5">
                  <View className="flex-row items-center gap-2">
                     <Layers size={16} color={isDark ? '#cbd5e1' : '#64748b'} />
                     <Text className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                        Thinking Patterns
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

               {/* Metric Blocks */}
               <View className="gap-4 mb-2">
                  {dimensionKeys.map((key) => {
                     const config = THINKING_PATTERN_DIMENSIONS[key];
                     const score = data.threePs[config.dimension].score;

                     return (
                        /* INNER PRESSABLE:
                           Captures taps on specific rows -> Opens Specific Tab.
                           Using e.stopPropagation() prevents the outer "Time" open from firing.
                           We reuse handlePressIn/Out so the WHOLE card still animates.
                        */
                        <Pressable
                           key={key}
                           onPress={(e) => {
                              e.stopPropagation();
                              handleOpenSheet(key);
                           }}
                           onPressIn={handlePressIn}
                           onPressOut={handlePressOut}
                        >
                           <View className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-700/50">
                              <View className="flex-row justify-between mb-1.5">
                                 <Text className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                                    {key}
                                 </Text>
                              </View>
                              <Text className="text-xs text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
                                 {config.description}
                              </Text>
                              <GradientSpectrumBar
                                 leftLabel={config.highLabel}
                                 rightLabel={config.lowLabel}
                                 optimisticPercentage={score}
                                 isDark={isDark}
                              />
                           </View>
                        </Pressable>
                     );
                  })}
               </View>

               <HelperFooter isDark={isDark} />
            </View>
         </Pressable>

         <ThinkingPatternSheet
            sheetRef={sheetRef}
            data={data.threePsDecoder}
            initialTab={selectedTab}
         />
      </>
   );
}
