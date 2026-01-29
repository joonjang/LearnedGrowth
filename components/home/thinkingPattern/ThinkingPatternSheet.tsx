import {
   ROUTE_ENTRY_DETAIL,
   THINKING_PATTERN_DIMENSIONS,
   WEEKDAY_LABELS,
} from '@/components/constants';
import type {
   ThinkingPatternData,
   ThinkingPatternTab,
} from '@/components/home/types';
import {
   bottomSheetBackgroundStyle,
   bottomSheetHandleIndicatorStyle,
} from '@/components/utils/bottomSheetStyles';
import { getShadow } from '@/lib/shadow';
import {
   BOTTOM_SHEET_BACKDROP_OPACITY,
   BOTTOM_SHEET_BG_DARK,
   BOTTOM_SHEET_BG_LIGHT,
   BOTTOM_SHEET_CONTENT_PADDING,
} from '@/lib/styles';
import {
   BottomSheetBackdrop,
   BottomSheetBackdropProps,
   BottomSheetModal,
   BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { router } from 'expo-router';
import {
   ChevronDown,
   ChevronUp,
   FileText,
   Minus,
   TrendingDown,
   TrendingUp,
} from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import type { RefObject } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
   LayoutAnimation,
   Text,
   TouchableOpacity,
   useWindowDimensions,
   View,
} from 'react-native';
import { Pressable } from 'react-native-gesture-handler';
import { LineChart } from 'react-native-gifted-charts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Derive tab order from the constant keys
const TAB_KEYS = Object.keys(
   THINKING_PATTERN_DIMENSIONS,
) as (keyof typeof THINKING_PATTERN_DIMENSIONS)[];

// Export this type so the parent can use it
export type PatternTab = (typeof TAB_KEYS)[number];

const CHART_TOTAL_HEIGHT = 200;

function formatShortDate(date: Date) {
   return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getPatternDateParts(value: string | null | undefined) {
   if (!value) return null;
   const parsed = new Date(value);
   if (Number.isNaN(parsed.getTime())) return null;
   return {
      weekday: WEEKDAY_LABELS[parsed.getDay()] ?? '',
      fullDate: formatShortDate(parsed),
   };
}

const EMPTY_TAB: ThinkingPatternTab = {
   highLabel: '',
   lowLabel: '',
   description: '',
   chartData: [],
   patterns: [],
};

type Props = {
   sheetRef: RefObject<BottomSheetModal | null>;
   onDismiss?: () => void;
   data: ThinkingPatternData | null;
   initialTab?: PatternTab; // <--- NEW PROP
};

export default function ThinkingPatternSheet({
   sheetRef,
   onDismiss,
   data,
   initialTab = 'Time',
}: Props) {
   const insets = useSafeAreaInsets();
   const { width, height } = useWindowDimensions();
   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';

   const [activeTab, setActiveTab] = useState<PatternTab>(initialTab);
   const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

   // <--- NEW: Sync internal state when the parent changes the desired tab
   useEffect(() => {
      if (initialTab) {
         setActiveTab(initialTab);
      }
   }, [initialTab]);

   const tabData = data?.[activeTab] ?? EMPTY_TAB;
   const tabConfig = THINKING_PATTERN_DIMENSIONS[activeTab];

   const lineGradientStartColor = isDark ? '#059669' : '#34d399';
   const lineGradientEndColor = isDark ? '#5b21b6' : '#ddd6fe';

   const chartEdgePadding = 8;
   const chartContainerPadding = 16;
   const chartInset = chartContainerPadding * 2;

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

   const tabShadow = useMemo(
      () => getShadow({ isDark, preset: 'sm', disableInDark: true }),
      [isDark],
   );

   const cardShadow = useMemo(
      () => getShadow({ isDark, preset: 'sm', disableInDark: true }),
      [isDark],
   );

   const sortedPatterns = useMemo(() => {
      return [...(tabData.patterns ?? [])].sort(
         (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
   }, [tabData.patterns]);

   const activePattern = useMemo(
      () =>
         sortedPatterns.find((pattern) => pattern.id === expandedItemId) ??
         null,
      [expandedItemId, sortedPatterns],
   );

   const activeEntryId = activePattern?.entryId ?? null;

   const activeChartIndex = useMemo(() => {
      if (!activeEntryId) return -1;
      return tabData.chartData.findIndex(
         (pt: any) => pt.entryId === activeEntryId,
      );
   }, [activeEntryId, tabData.chartData]);

   const selectedDotColor = useMemo(() => {
      if (!activePattern) return isDark ? '#e2e8f0' : '#0f172a';
      switch (activePattern.impact) {
         case 'optimistic':
            return isDark ? '#34d399' : '#059669';
         case 'pessimistic':
            return isDark ? '#f43f5e' : '#be123c';
         case 'mixed':
            return isDark ? '#94a3b8' : '#64748b';
         default:
            return isDark ? '#94a3b8' : '#64748b';
      }
   }, [activePattern, isDark]);

   const chartDataStatic = useMemo(() => {
      const hasSelection = activeChartIndex >= 0;

      return tabData.chartData.map((point: any, index: number) => {
         const isSelected = hasSelection && index === activeChartIndex;

         return {
            ...point,
            hideDataPoint: !isSelected,
            dataPointColor: selectedDotColor,
            dataPointRadius: isSelected ? 6 : 0,
            dataPointWidth: isSelected ? 12 : 0,
            dataPointHeight: isSelected ? 12 : 0,
         };
      });
   }, [tabData.chartData, activeChartIndex, selectedDotColor]);

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
         router.push({ pathname: ROUTE_ENTRY_DETAIL, params: { id: entryId } });
      },
      [sheetRef],
   );

   return (
      <BottomSheetModal
         ref={sheetRef}
         stackBehavior="replace"
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
            {/* Header Section */}
            <View className="mb-5">
               <Text className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">
                  Thinking Patterns
               </Text>
               <Text className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  Phrase Impact
               </Text>
            </View>

            {/* --- TABS --- */}
            <View className="flex-row items-center rounded-full bg-slate-100 dark:bg-slate-800 p-1 mb-4">
               {TAB_KEYS.map((tab) => {
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

            {/* --- CHART CONTAINER --- */}
            <View
               className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4 pt-5"
               style={{ overflow: 'hidden' }}
            >
               {/* Helper Question */}
               <View className="items-center mb-6 px-4">
                  <Text className="text-xs font-medium text-slate-500 dark:text-slate-400 text-center leading-relaxed">
                     {tabConfig.description}
                  </Text>
               </View>

               {/* Chart Area */}
               <View className="relative">
                  <Text className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400 absolute -top-1 left-2 z-10 tracking-wider">
                     {tabConfig.highLabel}
                  </Text>

                  <View className="mt-4">
                     {tabData.chartData.length > 0 ? (
                        <View style={{ height: CHART_TOTAL_HEIGHT }}>
                           <View pointerEvents="none">
                              <LineChart
                                 data={chartDataStatic}
                                 width={chartWidth}
                                 spacing={chartSpacing}
                                 initialSpacing={chartEdgePadding}
                                 endSpacing={chartEdgePadding}
                                 height={CHART_TOTAL_HEIGHT}
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
                           </View>
                           <View
                              pointerEvents="none"
                              style={{
                                 position: 'absolute',
                                 left: 8,
                                 bottom: 0,
                              }}
                           >
                              <Text className="text-[10px] font-bold uppercase text-rose-600 dark:text-rose-400 tracking-wider">
                                 {tabConfig.lowLabel}
                              </Text>
                           </View>
                        </View>
                     ) : (
                        <View
                           className="items-center justify-center"
                           style={{ height: CHART_TOTAL_HEIGHT }}
                        >
                           <Text className="text-xs text-slate-500 dark:text-slate-400">
                              No trend data yet.
                           </Text>
                        </View>
                     )}
                  </View>
               </View>
            </View>

            {/* --- LIST --- */}
            <View className="mt-6">
               <Text className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
                  Detected Phrases
               </Text>

               <View className="gap-3">
                  {sortedPatterns.length === 0 && (
                     <View className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-4">
                        <Text className="text-xs text-slate-500 dark:text-slate-400">
                           No detected phrases yet.
                        </Text>
                     </View>
                  )}

                  {sortedPatterns.map((pattern) => {
                     const isExpanded = expandedItemId === pattern.id;
                     const dateParts = getPatternDateParts(pattern.createdAt);
                     // ... (Rest of your list rendering logic remains unchanged)
                     let ImpactIcon = Minus;
                     let iconColor = isDark ? '#94a3b8' : '#64748b';
                     let bubbleClasses =
                        'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700';
                     let bubbleTextClasses =
                        'text-slate-700 dark:text-slate-300';

                     if (pattern.impact === 'optimistic') {
                        ImpactIcon = TrendingUp;
                        iconColor = isDark ? '#34d399' : '#059669';
                        bubbleClasses =
                           'bg-emerald-50 dark:bg-emerald-500/20 border-emerald-100 dark:border-emerald-800/30';
                        bubbleTextClasses =
                           'text-emerald-700 dark:text-emerald-300';
                     } else if (pattern.impact === 'pessimistic') {
                        ImpactIcon = TrendingDown;
                        iconColor = isDark ? '#f43f5e' : '#be123c';
                        bubbleClasses =
                           'bg-rose-50 dark:bg-rose-500/20 border-rose-100 dark:border-rose-800/30';
                        bubbleTextClasses = 'text-rose-700 dark:text-rose-300';
                     }

                     return (
                        <View
                           key={pattern.id}
                           style={
                              !isExpanded
                                 ? [cardShadow.ios, cardShadow.android]
                                 : null
                           }
                           className="mb-1"
                        >
                           <View className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
                              <Pressable
                                 onPress={() => handleToggleItem(pattern.id)}
                              >
                                 <View className="flex-row items-center p-3.5">
                                    <View className="w-14 mr-2 items-center gap-1">
                                       <ImpactIcon
                                          size={14}
                                          color={iconColor}
                                       />
                                       <View className="items-center">
                                          <Text className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase leading-3">
                                             {dateParts?.weekday ?? ''}
                                          </Text>
                                          <Text className="text-[9px] text-slate-400 dark:text-slate-500 leading-3">
                                             {dateParts?.fullDate ?? ''}
                                          </Text>
                                       </View>
                                    </View>

                                    <View className="flex-1 mr-3">
                                       <View
                                          className={`self-start px-3 py-1.5 rounded-xl border ${bubbleClasses}`}
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
                                 <View className="bg-slate-50 dark:bg-slate-800/50 px-4 py-4 border-t border-slate-100 dark:border-slate-800 flex-row">
                                    <View className="flex-col items-center mr-3">
                                       <TouchableOpacity
                                          onPress={() =>
                                             handleViewEntry(pattern.entryId)
                                          }
                                          activeOpacity={0.7}
                                          className="bg-white dark:bg-blue-900 border border-slate-200 dark:border-blue-800 flex-row items-center px-2 py-1.5 rounded-md"
                                       >
                                          <Text className="text-[10px] font-bold text-blue-700 dark:text-blue-200 mr-1">
                                             View
                                          </Text>
                                          <FileText
                                             size={10}
                                             color={
                                                isDark ? '#c7d2fe' : '#4338ca'
                                             }
                                          />
                                       </TouchableOpacity>
                                    </View>

                                    <View className="flex-1 pt-0.5">
                                       <Text className="text-sm text-slate-600 dark:text-slate-300 leading-5">
                                          {pattern.insight ||
                                             'Reframing this pattern can help shift your perspective.'}
                                       </Text>
                                    </View>
                                 </View>
                              )}
                           </View>
                        </View>
                     );
                  })}
               </View>
            </View>
         </BottomSheetScrollView>
      </BottomSheetModal>
   );
}
