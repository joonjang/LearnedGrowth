import {
  BOTTOM_SHEET_BG_DARK,
  BOTTOM_SHEET_BG_LIGHT,
  bottomSheetBackgroundStyle,
  bottomSheetHandleIndicatorStyle,
} from '@/components/bottomSheetStyles';
import {
  BOTTOM_SHEET_BACKDROP_OPACITY,
  BOTTOM_SHEET_CONTENT_PADDING,
} from '@/components/constants';
import type {
  PatternDecoderData,
  PatternDecoderTab,
} from '@/components/home/types';
import { getShadow } from '@/lib/shadow';
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { router } from 'expo-router';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import type { RefObject } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { LayoutAnimation, Text, useWindowDimensions, View } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';
import { LineChart } from 'react-native-gifted-charts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TAB_ORDER = ['Time', 'Scope', 'Blame'] as const;
type PatternTab = keyof PatternDecoderData;

const EMPTY_TAB: PatternDecoderTab = {
   highLabel: '',
   lowLabel: '',
   description: '',
   chartData: [],
   patterns: [],
};

type Props = {
   sheetRef: RefObject<BottomSheetModal | null>;
   onDismiss?: () => void;
   data: PatternDecoderData | null;
};

export default function PatternDecoderSheet({
   sheetRef,
   onDismiss,
   data,
}: Props) {
   const insets = useSafeAreaInsets();
   const { width, height } = useWindowDimensions();
   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';
   const [activeTab, setActiveTab] = useState<PatternTab>('Time');
   const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
   const lineGradientStartColor = isDark ? '#059669' : '#34d399';
   const lineGradientEndColor = isDark ? '#be123c' : '#f43f5e';
   const tabData = data?.[activeTab] ?? EMPTY_TAB;
   const chartEdgePadding = 8;
   const activePattern = useMemo(
      () =>
         tabData.patterns.find((pattern) => pattern.id === expandedItemId) ??
         null,
      [expandedItemId, tabData.patterns],
   );
   const activeEntryId = activePattern?.entryId ?? null;
   const activeChartIndex = useMemo(() => {
      if (!activeEntryId) return -1;
      return tabData.chartData.findIndex(
         (point) => point.entryId === activeEntryId,
      );
   }, [activeEntryId, tabData.chartData]);
   const activePointColor = useMemo(() => {
      if (!activePattern) return isDark ? '#e2e8f0' : '#0f172a';
      if (activePattern.impact === 'optimistic') {
         return isDark ? '#34d399' : '#059669';
      }
      if (activePattern.impact === 'pessimistic') {
         return isDark ? '#f43f5e' : '#e11d48';
      }
      return isDark ? '#94a3b8' : '#64748b';
   }, [activePattern, isDark]);
   const chartDataWithHighlight = useMemo(
      () =>
         tabData.chartData.map((point, index) => ({
            ...point,
            hideDataPoint:
               activeChartIndex === -1 ? true : index !== activeChartIndex,
            dataPointColor:
               index === activeChartIndex ? activePointColor : undefined,
            dataPointRadius: index === activeChartIndex ? 5 : undefined,
            dataPointWidth: index === activeChartIndex ? 10 : undefined,
            dataPointHeight: index === activeChartIndex ? 10 : undefined,
         })),
      [activeChartIndex, activePointColor, tabData.chartData],
   );

   const tabShadow = useMemo(
      () => getShadow({ isDark, preset: 'sm', disableInDark: true }),
      [isDark],
   );
   const chartInset = 16 * 2;
   const chartWidth = useMemo(
      () =>
         Math.max(200, width - BOTTOM_SHEET_CONTENT_PADDING * 2 - chartInset),
      [chartInset, width],
   );
   const maxSheetHeight = useMemo(() => height * 0.9, [height]);
   const chartSpacing = useMemo(() => {
      const points = tabData.chartData.length;
      const usableWidth = Math.max(chartWidth - chartEdgePadding * 2, 0);
      return usableWidth / Math.max(points - 1, 1);
   }, [chartEdgePadding, chartWidth, tabData.chartData.length]);

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

   const handleDismiss = useCallback(() => {
      setExpandedItemId(null);
      onDismiss?.();
   }, [onDismiss]);

   const handleTabPress = useCallback((tab: PatternTab) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setActiveTab(tab);
      setExpandedItemId(null);
   }, []);

   const handleToggleItem = useCallback((id: string) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setExpandedItemId((current) => (current === id ? null : id));
   }, []);

   const handleViewEntry = useCallback(
      (entryId: string) => {
         sheetRef.current?.dismiss();
         router.push({ pathname: '/entries/[id]', params: { id: entryId } });
      },
      [sheetRef],
   );

   return (
      <BottomSheetModal
         ref={sheetRef}
         onDismiss={handleDismiss}
         index={0}
         enableDynamicSizing
         maxDynamicContentSize={maxSheetHeight}
         enablePanDownToClose
         enableOverDrag={false}
         handleIndicatorStyle={bottomSheetHandleIndicatorStyle(isDark)}
         backdropComponent={renderBackdrop}
         backgroundStyle={bottomSheetBackgroundStyle(
            isDark,
            isDark ? BOTTOM_SHEET_BG_DARK : BOTTOM_SHEET_BG_LIGHT,
         )}
      >
         <BottomSheetScrollView
            contentContainerStyle={{
               paddingHorizontal: BOTTOM_SHEET_CONTENT_PADDING,
               paddingTop: 12,
               paddingBottom: insets.bottom + 20,
            }}
            keyboardShouldPersistTaps="handled"
         >
            <View className="mb-4">
               <Text className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Thinking Patterns
               </Text>
               <Text className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  Trends
               </Text>
            </View>

            <View className="flex-row items-center rounded-full bg-slate-100 dark:bg-slate-800 p-1 mb-6">
               {TAB_ORDER.map((tab) => {
                  const isActive = activeTab === tab;
                  const tabClasses = isActive
                     ? 'bg-white dark:bg-slate-700'
                     : 'bg-transparent';
                  const textClasses = isActive
                     ? 'text-slate-900 dark:text-slate-100'
                     : 'text-slate-500 dark:text-slate-400';

                  return (
                     <Pressable
                        key={tab}
                        onPress={() => handleTabPress(tab)}
                        style={{ flex: 1 }}
                     >
                        <View
                           className={`py-2 rounded-full items-center ${tabClasses}`}
                           style={
                              isActive
                                 ? [tabShadow.ios, tabShadow.android]
                                 : undefined
                           }
                        >
                           <Text
                              className={`text-[11px] font-bold tracking-widest ${textClasses}`}
                           >
                              {String(tab).toUpperCase()}
                           </Text>
                        </View>
                     </Pressable>
                  );
               })}
            </View>

            <View className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4">
               <Text className="text-xs font-semibold text-emerald-600 dark:text-emerald-300">
                  {tabData.highLabel}
               </Text>
               <View className="mt-2">
                  {tabData.chartData.length > 0 ? (
                     <LineChart
                        data={chartDataWithHighlight}
                        width={chartWidth}
                        spacing={chartSpacing}
                        initialSpacing={chartEdgePadding}
                        endSpacing={chartEdgePadding}
                        height={140}
                        curved
                        isAnimated
                        areaChart
                        lineGradient
                        lineGradientDirection="vertical"
                        lineGradientStartColor={lineGradientStartColor}
                        lineGradientEndColor={lineGradientEndColor}
                        gradientDirection="vertical"
                        color="#6366f1"
                        startFillColor={lineGradientStartColor}
                        endFillColor={lineGradientEndColor}
                        startOpacity={0.2}
                        endOpacity={0}
                        hideRules
                        hideYAxisText
                        hideAxesAndRules
                        yAxisThickness={0}
                        xAxisThickness={0}
                     />
                  ) : (
                     <View className="h-[140px] items-center justify-center">
                        <Text className="text-xs text-slate-500 dark:text-slate-400">
                           No trend data yet.
                        </Text>
                     </View>
                  )}
               </View>
               <Text className="text-xs font-semibold text-rose-600 dark:text-rose-300 mt-2">
                  {tabData.lowLabel}
               </Text>
            </View>

            <View className="mt-6">
               <Text className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
                  Detected Phrases
               </Text>

               <View className="gap-3">
                  {tabData.patterns.length === 0 && (
                     <View className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-4">
                        <Text className="text-xs text-slate-500 dark:text-slate-400">
                           No detected phrases yet.
                        </Text>
                     </View>
                  )}
                  {tabData.patterns.map((pattern) => {
                     const isExpanded = expandedItemId === pattern.id;
                     const bubbleClasses =
                        pattern.impact === 'optimistic'
                           ? 'bg-emerald-100 dark:bg-emerald-900/40'
                           : pattern.impact === 'pessimistic'
                             ? 'bg-rose-100 dark:bg-rose-900/40'
                             : 'bg-slate-100 dark:bg-slate-700';
                     const bubbleTextClasses =
                        pattern.impact === 'optimistic'
                           ? 'text-emerald-700 dark:text-emerald-200'
                           : pattern.impact === 'pessimistic'
                             ? 'text-rose-700 dark:text-rose-200'
                             : 'text-slate-700 dark:text-slate-200';

                     return (
                        <View
                           key={pattern.id}
                           className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3"
                        >
                           <Pressable
                              onPress={() => handleToggleItem(pattern.id)}
                           >
                              <View className="flex-row items-center gap-3">
                                 <View className="w-12">
                                    <Text className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                                       {pattern.date}
                                    </Text>
                                    <Text className="text-[11px] text-slate-400 dark:text-slate-500">
                                       {pattern.fullDate}
                                    </Text>
                                 </View>

                                 <View className="flex-1">
                                    <View
                                       className={`px-3 py-1.5 rounded-full self-start ${bubbleClasses}`}
                                    >
                                       <Text
                                          className={`text-xs font-semibold ${bubbleTextClasses}`}
                                       >
                                          {pattern.phrase}
                                       </Text>
                                    </View>
                                 </View>

                                 {isExpanded ? (
                                    <ChevronUp
                                       size={18}
                                       color={isDark ? '#cbd5e1' : '#64748b'}
                                    />
                                 ) : (
                                    <ChevronDown
                                       size={18}
                                       color={isDark ? '#cbd5e1' : '#64748b'}
                                    />
                                 )}
                              </View>
                           </Pressable>

                           {isExpanded && (
                              <View className="mt-3 ml-12 gap-2">
                                 {!!pattern.insight && (
                                    <Text className="text-xs text-slate-600 dark:text-slate-300 leading-5">
                                       {pattern.insight}
                                    </Text>
                                 )}
                                 <Pressable
                                    onPress={() =>
                                       handleViewEntry(pattern.entryId)
                                    }
                                 >
                                    <Text className="text-xs font-semibold text-indigo-600 dark:text-indigo-300">
                                       View Entry
                                    </Text>
                                 </Pressable>
                              </View>
                           )}
                        </View>
                     );
                  })}
               </View>
            </View>
         </BottomSheetScrollView>
      </BottomSheetModal>
   );
}
