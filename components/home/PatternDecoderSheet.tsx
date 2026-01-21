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
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Minus,
  TrendingDown,
  TrendingUp,
} from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import type { RefObject } from 'react';
import { useCallback, useMemo, useState } from 'react';
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

const TAB_ORDER = ['Time', 'Scope', 'Blame'] as const;
type PatternTab = keyof PatternDecoderData;

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatShortDate(date: Date) {
   return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTime(date: Date) {
   const hours = date.getHours();
   const minutes = `${date.getMinutes()}`.padStart(2, '0');
   const period = hours >= 12 ? 'PM' : 'AM';
   const hour12 = hours % 12 || 12;
   return `${hour12}:${minutes} ${period}`;
}

function getPatternDateParts(value: string | null | undefined) {
   if (!value) return null;
   const parsed = new Date(value);
   if (Number.isNaN(parsed.getTime())) return null;
   return {
      weekday: WEEKDAY_LABELS[parsed.getDay()] ?? '',
      fullDate: formatShortDate(parsed),
      time: formatTime(parsed),
   };
}

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

   // --- Chart Logic ---
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

      switch (activePattern.impact) {
         case 'optimistic':
            return isDark ? '#34d399' : '#059669';
         case 'pessimistic':
            return isDark ? '#f43f5e' : '#e11d48';
         case 'mixed':
            return isDark ? '#94a3b8' : '#64748b';
         default:
            return isDark ? '#94a3b8' : '#64748b';
      }
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

            {/* --- TABS --- */}
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

            {/* --- CHART --- */}
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

            {/* --- LIST --- */}
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
                     const dateParts = getPatternDateParts(pattern.createdAt);

                     // 1. Determine Type
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
                           'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/30';
                        bubbleTextClasses =
                           'text-emerald-700 dark:text-emerald-300';
                     } else if (pattern.impact === 'pessimistic') {
                        ImpactIcon = TrendingDown;
                        iconColor = isDark ? '#f43f5e' : '#be123c';
                        bubbleClasses =
                           'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800/30';
                        bubbleTextClasses = 'text-rose-700 dark:text-rose-300';
                     } else if (pattern.impact === 'mixed') {
                        ImpactIcon = Minus;
                        iconColor = isDark ? '#94a3b8' : '#64748b';
                        bubbleClasses =
                           'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700';
                        bubbleTextClasses =
                           'text-slate-700 dark:text-slate-300';
                     }

                     return (
                        <View
                           key={pattern.id}
                           className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden"
                        >
                           <Pressable
                              onPress={() => handleToggleItem(pattern.id)}
                           >
                              <View className="flex-row items-center p-3.5">
                                 {/* Left: Date + Time + Icon Stack */}
                                 <View className="w-14 mr-2 items-center gap-1">
                                    <ImpactIcon size={14} color={iconColor} />
                                    <View className="items-center">
                                       <Text className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase leading-3">
                                          {dateParts?.weekday ?? ''}
                                       </Text>
                                       <Text className="text-[9px] text-slate-400 dark:text-slate-500 leading-3">
                                          {dateParts?.fullDate ?? ''}
                                       </Text>
                                       {!!dateParts?.time && (
                                          <Text className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">
                                             {dateParts.time}
                                          </Text>
                                       )}
                                    </View>
                                 </View>

                                 {/* Center: Phrase */}
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

                                 {/* Right: Chevron */}
                                 {isExpanded ? (
                                    <ChevronDown
                                       size={18}
                                       color={isDark ? '#cbd5e1' : '#64748b'}
                                    />
                                 ) : (
                                    <ChevronRight
                                       size={18}
                                       color={isDark ? '#cbd5e1' : '#64748b'}
                                    />
                                 )}
                              </View>
                           </Pressable>

                           {/* Expanded Insight Area */}
                           {isExpanded && (
                              <View className="bg-slate-50 dark:bg-slate-800/50 px-4 py-4 border-t border-slate-100 dark:border-slate-800 flex-row">
                                 {/* Left Sidebar: Button Only */}
                                 <View className="flex-col items-center mr-3">
                                    <TouchableOpacity
                                       onPress={() =>
                                          handleViewEntry(pattern.entryId)
                                       }
                                       activeOpacity={0.7}
                                       className="bg-blue-100 dark:bg-blue-900 flex-row items-center px-2 py-1.5 rounded-md"
                                    >
                                       <Text className="text-[10px] font-bold text-blue-700 dark:text-blue-200 mr-1">
                                          View
                                       </Text>
                                       <FileText
                                          size={10}
                                          color={isDark ? '#c7d2fe' : '#4338ca'}
                                       />
                                    </TouchableOpacity>
                                 </View>

                                 {/* Main Text Content */}
                                 <View className="flex-1 pt-0.5">
                                    <Text className="text-sm text-slate-600 dark:text-slate-300 leading-5">
                                       {pattern.insight ||
                                          'Reframing this pattern can help shift your perspective.'}
                                    </Text>
                                 </View>
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
