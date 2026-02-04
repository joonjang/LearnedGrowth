import { THINKING_PATTERN_DIMENSIONS } from '@/lib/constants';
import { getAiAnalyzedEntryCount } from '@/lib/mentalFocus';
import { CARD_PRESS_STYLE } from '@/lib/styles';
import { Entry } from '@/models/entry';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Layers } from 'lucide-react-native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
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
   const { t } = useTranslation();

   // We bring back the pressed state for the card animation
   const [isPressed, setIsPressed] = useState(false);

   const analyzedCount = useMemo(
      () => getAiAnalyzedEntryCount(entries ?? []),
      [entries],
   );
   const tabLabels = useMemo(
      () => ({
         Time: t('home.patterns.tab_time'),
         Scope: t('home.patterns.tab_scope'),
         Blame: t('home.patterns.tab_blame'),
      }),
      [t],
   );
   const dimensionConfig = useMemo(
      () => ({
         Time: {
            ...THINKING_PATTERN_DIMENSIONS.Time,
            label: tabLabels.Time,
            description: t('home.patterns.desc_time'),
            highLabel: t('home.patterns.high.temporary'),
            lowLabel: t('home.patterns.low.permanent'),
         },
         Scope: {
            ...THINKING_PATTERN_DIMENSIONS.Scope,
            label: tabLabels.Scope,
            description: t('home.patterns.desc_scope'),
            highLabel: t('home.patterns.high.specific'),
            lowLabel: t('home.patterns.low.everything'),
         },
         Blame: {
            ...THINKING_PATTERN_DIMENSIONS.Blame,
            label: tabLabels.Blame,
            description: t('home.patterns.desc_blame'),
            highLabel: t('home.patterns.high.situation'),
            lowLabel: t('home.patterns.low.my_fault'),
         },
      }),
      [t, tabLabels],
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
                        {t('home.thinking_patterns')}
                     </Text>
                  </View>
                  <Text
                     className="text-[9px] font-medium text-slate-400 dark:text-slate-500 text-right leading-4 max-w-[160px]"
                     style={{ fontVariant: ['tabular-nums'] }}
                  >
                     {t('home.patterns.based_on', { count: analyzedCount })}
                  </Text>
               </View>

               {/* Metric Blocks */}
               <View className="gap-4 mb-2">
                  {dimensionKeys.map((key) => {
                     const config = dimensionConfig[key];
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
                                    {config.label}
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

               {/* HINT TEXT */}
              <View className="mt-2 mb-1">
                  <Text className="text-[10px] text-center font-medium text-slate-400 dark:text-slate-500">
                     {t('home.patterns.tap_to_view')}
                  </Text>
               </View>
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
