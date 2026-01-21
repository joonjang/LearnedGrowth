import { PInsightCard } from '@/components/appInfo/PDefinitions';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { BookOpen, ChevronDown, ChevronUp, Layers } from 'lucide-react-native';
import React, { useCallback, useRef, useState } from 'react';
import {
    LayoutAnimation,
    Pressable,
    Text,
    View
} from 'react-native';
import { DashboardData } from '../types';
import { CARD_PRESS_STYLE } from '../utils';
import GradientSpectrumBar from './GradientSpectrumBar';
import ThinkingPatternSheet from './ThinkingPatternSheet';

type Props = {
   data: DashboardData;
   shadowStyle: any;
   isDark: boolean;
};

export default function ThinkingPatternCard({
   data,
   shadowStyle,
   isDark,
}: Props) {
   const [showHelp, setShowHelp] = useState(false);
   const [isPressed, setIsPressed] = useState(false);
   const sheetRef = useRef<BottomSheetModal>(null);

   const handleToggleHelp = useCallback(() => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setShowHelp((prev) => !prev);
   }, []);

   const handlePresentSheet = useCallback(() => {
      sheetRef.current?.present();
   }, []);

   const handlePressIn = useCallback(() => {
      setIsPressed(true);
   }, []);

   const handlePressOut = useCallback(() => {
      setIsPressed(false);
   }, []);

   // Guard clause: if data isn't ready, don't render
   if (!data.threePs || !data.threePsDecoder) return null;

   return (
      <>
         <Pressable
            onPress={handlePresentSheet}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
         >
            <View
               className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700"
               style={[
                  shadowStyle.ios,
                  shadowStyle.android,
                  isPressed && CARD_PRESS_STYLE.cardPressed,
               ]}
            >
               {/* Header */}
               <View className="flex-row items-center justify-between mb-4">
                  <View className="flex-row items-center gap-2">
                     <Layers size={16} color={isDark ? '#cbd5e1' : '#64748b'} />
                     <Text className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                        Thinking Patterns
                     </Text>
                  </View>

                  {/* Guide Toggle Button */}
                  <Pressable onPress={handleToggleHelp} hitSlop={10}>
                     <View
                        className={`flex-row items-center gap-1.5 px-2.5 py-1.5 rounded-full border ${
                           showHelp
                              ? 'bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600'
                              : 'border-transparent'
                        }`}
                     >
                        <BookOpen
                           size={12}
                           color={isDark ? '#94a3b8' : '#64748b'}
                        />
                        <Text className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                           Guide
                        </Text>
                        {showHelp ? (
                           <ChevronUp
                              size={12}
                              color={isDark ? '#94a3b8' : '#64748b'}
                           />
                        ) : (
                           <ChevronDown
                              size={12}
                              color={isDark ? '#94a3b8' : '#64748b'}
                           />
                        )}
                     </View>
                  </Pressable>
               </View>

               {/* Expanded Educational Content */}
               {showHelp && (
                  <View className="mb-4">
                     <PInsightCard context="week" />
                  </View>
               )}

               {/* Gradient Visuals */}
               <View className="gap-6">
                  <GradientSpectrumBar
                     label="Time"
                     subLabel="(Permanence)"
                     leftLabel="Temporary"
                     rightLabel="Permanent"
                     optimisticPercentage={data.threePs.permanence.score}
                     isDark={isDark}
                  />
                  <GradientSpectrumBar
                     label="Scope"
                     subLabel="(Pervasiveness)"
                     leftLabel="Specific"
                     rightLabel="Pervasive"
                     optimisticPercentage={data.threePs.pervasiveness.score}
                     isDark={isDark}
                  />
                  <GradientSpectrumBar
                     label="Blame"
                     subLabel="(Personalization)"
                     leftLabel="External"
                     rightLabel="Internal"
                     optimisticPercentage={data.threePs.personalization.score}
                     isDark={isDark}
                  />
               </View>
            </View>
         </Pressable>

         {/* Bottom Sheet */}
         <ThinkingPatternSheet sheetRef={sheetRef} data={data.threePsDecoder} />
      </>
   );
}
