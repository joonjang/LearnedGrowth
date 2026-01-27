import {
   bottomSheetBackgroundStyle,
   bottomSheetHandleIndicatorStyle,
} from '@/components/bottomSheetStyles';
import { ROUTE_ENTRY_DETAIL } from '@/components/constants';
import type {
   ThinkingPatternData,
   ThinkingPatternTab,
} from '@/components/home/types';
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
type PatternTab = keyof ThinkingPatternData;

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const POINTER_LABEL_WIDTH = 220;
const CHART_TOTAL_HEIGHT = 220;
const CHART_PADDING_BOTTOM = 20;
const SLIDER_HEIGHT = 60;

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
};

type SelectionSource = 'chart' | 'list' | null;

export default function ThinkingPatternSheet({
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
   const [pointerState, setPointerState] = useState({ index: -1, x: 0 });
   const [selectionSource, setSelectionSource] =
      useState<SelectionSource>(null);

   const lineGradientStartColor = isDark ? '#059669' : '#34d399';
   const lineGradientEndColor = isDark ? '#be123c' : '#f43f5e';

   const tabData = data?.[activeTab] ?? EMPTY_TAB;
   const chartEdgePadding = 8;
   const chartContainerPadding = 16;

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

   const basePointColor = isDark ? '#94a3b8' : '#64748b';

   const patternByEntryId = useMemo(() => {
      const map = new Map<string, (typeof tabData.patterns)[number]>();
      tabData.patterns.forEach((pattern) => {
         if (!map.has(pattern.entryId)) {
            map.set(pattern.entryId, pattern);
         }
      });
      return map;
   }, [tabData]);

   const getImpactBubbleStyles = useCallback(
      (impact: string | null | undefined) => {
         if (impact === 'optimistic') {
            return {
               bubbleClasses:
                  'bg-emerald-50 dark:bg-emerald-500/20 border-emerald-100 dark:border-emerald-800/30',
               textClasses: 'text-emerald-700 dark:text-emerald-300',
            };
         }
         if (impact === 'pessimistic') {
            return {
               bubbleClasses:
                  'bg-rose-50 dark:bg-rose-500/20 border-rose-100 dark:border-rose-800/30',
               textClasses: 'text-rose-700 dark:text-rose-300',
            };
         }
         return {
            bubbleClasses:
               'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700',
            textClasses: 'text-slate-700 dark:text-slate-300',
         };
      },
      [],
   );

   const chartDataWithHighlight = useMemo(
      () =>
         tabData.chartData.map((point, index) => ({
            ...point,
            hideDataPoint: false,
            dataPointColor:
               index === activeChartIndex ? activePointColor : basePointColor,
            dataPointRadius: index === activeChartIndex ? 5 : 3,
            dataPointWidth: index === activeChartIndex ? 10 : 6,
            dataPointHeight: index === activeChartIndex ? 10 : 6,
         })),
      [activeChartIndex, activePointColor, basePointColor, tabData.chartData],
   );

   const tabShadow = useMemo(
      () => getShadow({ isDark, preset: 'sm', disableInDark: true }),
      [isDark],
   );

   const cardShadow = useMemo(
      () => getShadow({ isDark, preset: 'sm', disableInDark: true }),
      [isDark],
   );

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

   // --- BUBBLE LOGIC ---
   // Only show bubble for chart interaction, not list expansion.
   const displayedPattern = useMemo(() => {
      // If user is touching the chart, show that.
      if (pointerState.index >= 0) {
         const entryId = tabData.chartData[pointerState.index]?.entryId;
         return patternByEntryId.get(entryId) ?? null;
      }

      // If the selection came from the chart (e.g., you decide to persist it),
      // you could optionally show the activePattern here.
      // But since you want "if expand from detected phrase, don't show bubble",
      // we intentionally DO NOT fallback to activePattern.
      return null;
   }, [pointerState.index, patternByEntryId, tabData.chartData]);

   const bubbleX = useMemo(() => {
      if (pointerState.index >= 0) return pointerState.x;
      if (activeChartIndex >= 0) {
         return chartEdgePadding + activeChartIndex * chartSpacing;
      }
      return 0;
   }, [pointerState.index, pointerState.x, activeChartIndex, chartSpacing]);

   const pointerBubbleLeft = useMemo(() => {
      if (!displayedPattern) return 0;
      const raw = bubbleX - POINTER_LABEL_WIDTH / 2 + 5;
      const minLeft = -8;
      const maxLeft = chartWidth - POINTER_LABEL_WIDTH + 8;
      return Math.min(Math.max(raw, minLeft), maxLeft);
   }, [bubbleX, chartWidth, displayedPattern]);

   const pointerDateParts = useMemo(
      () =>
         displayedPattern
            ? getPatternDateParts(displayedPattern.createdAt)
            : null,
      [displayedPattern],
   );

   const pointerBubble = useMemo(() => {
      if (!displayedPattern) return null;
      const phrase =
         displayedPattern.phrase ?? 'No phrase detected for this entry.';
      const { bubbleClasses, textClasses } = getImpactBubbleStyles(
         displayedPattern.impact,
      );
      return { phrase, bubbleClasses, textClasses };
   }, [getImpactBubbleStyles, displayedPattern]);

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
      setPointerState({ index: -1, x: 0 });
      setSelectionSource(null);
      onDismiss?.();
   }, [onDismiss]);

   const handleTabPress = useCallback((tab: PatternTab) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setActiveTab(tab);
      setExpandedItemId(null);
      setPointerState({ index: -1, x: 0 });
      setSelectionSource(null);
   }, []);

   const handleToggleItem = useCallback((id: string) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

      // Expanding from the list => do NOT show chart bubble
      setSelectionSource('list');
      setPointerState({ index: -1, x: 0 });

      setExpandedItemId((current) => (current === id ? null : id));
   }, []);

   const handleViewEntry = useCallback(
      (entryId: string) => {
         sheetRef.current?.dismiss();
         router.push({ pathname: ROUTE_ENTRY_DETAIL, params: { id: entryId } });
      },
      [sheetRef],
   );

   const pointerConfig = useMemo(
      () => ({
         activatePointersInstantlyOnTouch: true,
         pointerRadius: 4,
         pointerColor: isDark ? '#e2e8f0' : '#0f172a',
         resetPointerIndexOnRelease: true,
         shiftPointerLabelX: 0,
         shiftPointerLabelY: 0,
         autoAdjustPointerLabelPosition: false,
         pointerStripWidth: 0,
         pointerStripUptoDataPoint: false,
      }),
      [isDark],
   );

   const handlePointerProps = useCallback(
      (props: { pointerIndex?: number; pointerX?: number }) => {
         const nextIndex = props.pointerIndex ?? -1;

         setPointerState({
            index: nextIndex,
            x: props.pointerX ?? 0,
         });

         // Touching chart => bubble allowed
         setSelectionSource(nextIndex >= 0 ? 'chart' : null);
      },
      [],
   );

   const showSpeechBubble =
      selectionSource === 'chart' && Boolean(pointerBubble);

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
            <View className="mb-4">
               <Text className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Thinking Patterns
               </Text>
               <Text className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  Phrase Impact
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

            {/* --- CHART CONTAINER --- */}
            <View
               className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4"
               style={{ overflow: 'visible' }}
            >
               {/* HIGH LABEL */}
               <Text className="text-xs font-semibold text-emerald-600 dark:text-emerald-300 absolute top-4 left-4 z-10">
                  {tabData.highLabel}
               </Text>

               <View className="mt-2">
                  {tabData.chartData.length > 0 ? (
                     <View
                        style={{
                           height: CHART_TOTAL_HEIGHT,
                           overflow: 'visible',
                        }}
                     >
                        <LineChart
                           data={chartDataWithHighlight}
                           width={chartWidth}
                           spacing={chartSpacing}
                           initialSpacing={chartEdgePadding}
                           endSpacing={chartEdgePadding}
                           height={CHART_TOTAL_HEIGHT}
                           curved
                           isAnimated
                           areaChart
                           pointerConfig={pointerConfig}
                           getPointerProps={handlePointerProps}
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

                        {/* POINTER BUBBLE (Overlays Graph) */}
                        {showSpeechBubble && pointerBubble && (
                           <View
                              pointerEvents="none"
                              style={{
                                 position: 'absolute',
                                 left: pointerBubbleLeft,
                                 top: 0,
                                 marginTop: 4,
                                 zIndex: 30,
                              }}
                           >
                              <View
                                 className={`rounded-xl border px-3 py-2 shadow-sm ${pointerBubble.bubbleClasses}`}
                                 style={{ maxWidth: POINTER_LABEL_WIDTH }}
                              >
                                 {pointerDateParts && (
                                    <Text
                                       className={`text-[10px] font-bold uppercase tracking-widest ${pointerBubble.textClasses}`}
                                    >
                                       {pointerDateParts.weekday} ·{' '}
                                       {pointerDateParts.fullDate}
                                    </Text>
                                 )}
                                 <Text
                                    className={`text-xs font-semibold ${pointerBubble.textClasses}`}
                                    numberOfLines={2}
                                 >
                                    {pointerBubble.phrase}
                                 </Text>
                              </View>
                           </View>
                        )}

                        {/* LOW LABEL */}
                        <View
                           pointerEvents="none"
                           style={{ position: 'absolute', left: 0, bottom: 0 }}
                        >
                           <Text className="text-xs font-semibold text-rose-600 dark:text-rose-300">
                              {tabData.lowLabel}
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

            {/* --- LIST --- */}
            <View className="mt-4">
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
