import { THINKING_PATTERN_DIMENSIONS } from '@/components/constants';
import { CARD_PRESS_STYLE } from '@/lib/styles';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Layers } from 'lucide-react-native';
import React, { useCallback, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import HelperFooter from '../HelperFooter';
import { ThinkingPatternViewModel } from '../types';
import GradientSpectrumBar from './GradientSpectrumBar';
import ThinkingPatternSheet from './ThinkingPatternSheet';

type Props = {
   data: ThinkingPatternViewModel;
   shadowStyle: any;
   isDark: boolean;
};

export default function ThinkingPatternCard({
   data,
   shadowStyle,
   isDark,
}: Props) {
   const [isPressed, setIsPressed] = useState(false);
   const sheetRef = useRef<BottomSheetModal>(null);

   const handlePresentSheet = useCallback(() => {
      sheetRef.current?.present();
   }, []);

   const handlePressIn = useCallback(() => {
      setIsPressed(true);
   }, []);

   const handlePressOut = useCallback(() => {
      setIsPressed(false);
   }, []);

   if (!data) return null;

   // Helper to extract keys properly for iteration
   const dimensionKeys = Object.keys(
      THINKING_PATTERN_DIMENSIONS,
   ) as (keyof typeof THINKING_PATTERN_DIMENSIONS)[];

   return (
      <>
         <Pressable
            onPress={handlePresentSheet}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
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
               <View className="flex-row items-center gap-2 mb-5">
                  <Layers size={16} color={isDark ? '#cbd5e1' : '#64748b'} />
                  <Text className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                     Thinking Patterns
                  </Text>
               </View>

               {/* Metric Blocks (Abstracted Loop) */}
               <View className="gap-4 mb-2">
                  {dimensionKeys.map((key) => {
                     const config = THINKING_PATTERN_DIMENSIONS[key];
                     const score = data.threePs[config.dimension].score;

                     return (
                        <View
                           key={key}
                           className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-700/50"
                        >
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
                     );
                  })}
               </View>

               <HelperFooter isDark={isDark} />
            </View>
         </Pressable>

         <ThinkingPatternSheet sheetRef={sheetRef} data={data.threePsDecoder} />
      </>
   );
}
