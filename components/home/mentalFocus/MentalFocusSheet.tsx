import {
   BOTTOM_SHEET_BG_DARK,
   BOTTOM_SHEET_BG_LIGHT,
   bottomSheetBackgroundStyle,
   bottomSheetHandleIndicatorStyle,
} from '@/components/bottomSheetStyles';
import {
   BOTTOM_SHEET_BACKDROP_OPACITY
} from '@/components/constants';
import EntryCard from '@/components/entries/entry/EntryCard';
import { Entry } from '@/models/entry';
import {
   BottomSheetBackdrop,
   BottomSheetBackdropProps,
   BottomSheetModal,
   BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import React, {
   useCallback,
   useEffect,
   useMemo,
   useRef,
   useState,
} from 'react';
import {
   NativeScrollEvent,
   NativeSyntheticEvent,
   Text,
   TouchableOpacity,
   useWindowDimensions,
   View,
} from 'react-native';
// FIX: Using Gesture Handler ScrollView for Android compatibility
import { ScrollView } from 'react-native-gesture-handler';
// 1. IMPORT LinearTransition
import Animated, {
   FadeIn,
   FadeOut,
   LinearTransition,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MentalFocusViewModel } from '../types';

type MoodFilter = 'optimistic' | 'pessimistic' | 'mixed';
type StyleFilter =
   | 'Positive'
   | 'Constructive'
   | 'Balanced'
   | 'Mixed'
   | 'Critical';

type MentalFocusSheetProps = {
   sheetRef: React.RefObject<BottomSheetModal | null>;
   analysis: MentalFocusViewModel;
   entries: Entry[];
   isDark: boolean;
   onDeleteEntry: (entry: Entry) => void;
};

// --- Helpers ---

const STYLE_MAP: Record<string, { label: StyleFilter; color: string }> = {
   Positive: { label: 'Positive', color: '#10b981' },
   Constructive: { label: 'Constructive', color: '#3b82f6' },
   Balanced: { label: 'Balanced', color: '#64748b' },
   Mixed: { label: 'Mixed', color: '#f59e0b' },
   Critical: { label: 'Critical', color: '#ef4444' },
};

function getEntryStyle(
   entry: Entry,
): { label: StyleFilter; color: string } | null {
   const val = entry.aiResponse?.meta?.optimismScore;
   const score =
      typeof val === 'number' ? val : parseFloat(val as unknown as string);
   if (isNaN(score)) return null;
   if (score >= 8) return STYLE_MAP.Positive;
   if (score >= 6) return STYLE_MAP.Constructive;
   if (score >= 4) return STYLE_MAP.Balanced;
   if (score >= 2.5) return STYLE_MAP.Mixed;
   return STYLE_MAP.Critical;
}

const normalize = (s: unknown) =>
   String(s ?? '')
      .trim()
      .toLowerCase();

function getEntryMood(entry: Entry): MoodFilter | null {
   const meta: any = entry.aiResponse?.meta ?? {};
   const tags: string[] = meta?.tags ?? [];

   const candidates = [meta.tone, meta.mood, meta.sentiment, meta.styleLabel]
      .map(normalize)
      .filter(Boolean);
   const haystack = `${candidates.join(' ')} ${tags.map(normalize).join(' ')}`;

   if (haystack.includes('mixed')) return 'mixed';
   if (
      haystack.includes('optimistic') ||
      haystack.includes('positive') ||
      haystack.includes('hopeful')
   )
      return 'optimistic';
   if (
      haystack.includes('pessimistic') ||
      haystack.includes('negative') ||
      haystack.includes('critical')
   )
      return 'pessimistic';
   if (haystack.includes('balanced') || haystack.includes('neutral'))
      return 'mixed';

   const val = meta?.optimismScore;
   const score =
      typeof val === 'number' ? val : parseFloat(val as unknown as string);

   if (!isNaN(score)) {
      if (score >= 6) return 'optimistic';
      if (score <= 4) return 'pessimistic';
      return 'mixed';
   }

   return null;
}

// --- Reusable Components ---

const ScrollableSectionHeader = ({
   title,
   isDark,
}: {
   title: string;
   isDark: boolean;
}) => (
   <View className="px-5 flex-row items-center justify-between mb-3">
      <Text className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
         {title}
      </Text>
   </View>
);

const ScrollableFilterRow = ({
   children,
   isDark,
}: {
   children: React.ReactNode;
   isDark: boolean;
}) => {
   const scrollRef = useRef<ScrollView>(null);
   const [canScrollLeft, setCanScrollLeft] = useState(false);
   const [canScrollRight, setCanScrollRight] = useState(false);
   const [contentWidth, setContentWidth] = useState(0);
   const [layoutWidth, setLayoutWidth] = useState(0);
   const [scrollX, setScrollX] = useState(0);

   useEffect(() => {
      if (layoutWidth > 0 && contentWidth > 0) {
         setCanScrollLeft(scrollX > 10);
         setCanScrollRight(scrollX < contentWidth - layoutWidth - 10);
      }
   }, [scrollX, contentWidth, layoutWidth]);

   const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      setScrollX(event.nativeEvent.contentOffset.x);
   };

   const scrollLeft = () => {
      const targetX = Math.max(0, scrollX - layoutWidth * 0.8);
      scrollRef.current?.scrollTo({ x: targetX, animated: true });
   };

   const scrollRight = () => {
      const targetX = Math.min(
         contentWidth - layoutWidth,
         scrollX + layoutWidth * 0.8,
      );
      scrollRef.current?.scrollTo({ x: targetX, animated: true });
   };

   // --- CHEVRON STYLING ---
   const arrowBg = isDark ? 'bg-slate-600' : 'bg-slate-200';
   const arrowBorder = isDark ? 'border-slate-500' : 'border-slate-300';
   const arrowIconColor = isDark ? '#cbd5e1' : '#334155';

   return (
      <View className="relative">
         <ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={handleScroll}
            onLayout={(e) => setLayoutWidth(e.nativeEvent.layout.width)}
            onContentSizeChange={(w) => setContentWidth(w)}
            contentContainerStyle={{ paddingHorizontal: 20 }}
            overScrollMode="never"
         >
            {children}
         </ScrollView>

         {/* Left Chevron */}
         {canScrollLeft && (
            <Animated.View
               entering={FadeIn.duration(200)}
               exiting={FadeOut.duration(200)}
               className="absolute left-1 top-0 bottom-0 justify-center z-10"
            >
               <TouchableOpacity
                  onPress={scrollLeft}
                  activeOpacity={0.8}
                  className={`w-7 h-7 rounded-full items-center justify-center shadow-md border ${arrowBg} ${arrowBorder}`}
                  style={{
                     shadowColor: '#000',
                     shadowOffset: { width: 0, height: 2 },
                     shadowOpacity: 0.15,
                     shadowRadius: 3,
                     elevation: 4,
                  }}
               >
                  <ChevronLeft
                     size={16}
                     color={arrowIconColor}
                     strokeWidth={2.5}
                  />
               </TouchableOpacity>
            </Animated.View>
         )}

         {/* Right Chevron */}
         {canScrollRight && (
            <Animated.View
               entering={FadeIn.duration(200)}
               exiting={FadeOut.duration(200)}
               className="absolute right-1 top-0 bottom-0 justify-center z-10"
            >
               <TouchableOpacity
                  onPress={scrollRight}
                  activeOpacity={0.8}
                  className={`w-7 h-7 rounded-full items-center justify-center shadow-md border ${arrowBg} ${arrowBorder}`}
                  style={{
                     shadowColor: '#000',
                     shadowOffset: { width: 0, height: 2 },
                     shadowOpacity: 0.15,
                     shadowRadius: 3,
                     elevation: 4,
                  }}
               >
                  <ChevronRight
                     size={16}
                     color={arrowIconColor}
                     strokeWidth={2.5}
                  />
               </TouchableOpacity>
            </Animated.View>
         )}
      </View>
   );
};

const FilterChip = ({
   isActive,
   color,
   label,
   count,
   onPress,
   isDark,
}: {
   isActive: boolean;
   color: string;
   label: string;
   count: number;
   onPress: () => void;
   isDark: boolean;
}) => {
   const isZero = count === 0;

   // Opacity styling
   const activeStyle = {
      backgroundColor: isDark ? `${color}45` : `${color}15`,
      borderColor: isDark ? `${color}90` : `${color}50`,
      borderWidth: isDark ? 1.5 : 1,
   };

   return (
      <TouchableOpacity
         onPress={onPress}
         className={`flex-row items-center gap-1.5 px-3 py-2 rounded-full border mr-2 ${
            !isActive
               ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
               : ''
         }`}
         style={isActive ? activeStyle : undefined}
      >
         <View
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: color }}
         />
         <Text
            className={`text-xs font-medium ${
               isActive
                  ? 'text-slate-900 dark:text-white'
                  : 'text-slate-700 dark:text-slate-300'
            }`}
         >
            {label}
         </Text>
         <Text
            className={`text-[10px] ml-0.5 ${
               isActive
                  ? 'opacity-80'
                  : isZero
                    ? 'text-slate-300 dark:text-slate-600'
                    : 'text-slate-400'
            }`}
            style={isActive ? { color: isDark ? '#f1f5f9' : '#334155' } : {}}
         >
            {count}
         </Text>
      </TouchableOpacity>
   );
};

const TopicChip = ({
   isActive,
   color,
   label,
   count,
   percentage,
   onPress,
   isDark,
}: {
   isActive: boolean;
   color: string;
   label: string;
   count: number;
   percentage: number;
   onPress: () => void;
   isDark: boolean;
}) => {
   // Opacity styling
   const activeStyle = {
      backgroundColor: isDark ? `${color}45` : `${color}15`,
      borderColor: isDark ? `${color}90` : `${color}50`,
      borderWidth: isDark ? 1.5 : 1,
   };

   return (
      <TouchableOpacity
         onPress={onPress}
         // Pill shape
         className={`flex-row items-center gap-2 px-3.5 py-2 rounded-full border mr-2 ${
            !isActive
               ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
               : ''
         }`}
         style={isActive ? activeStyle : undefined}
      >
         <View
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: color }}
         />
         <Text
            className={`text-xs font-bold ${
               isActive
                  ? 'text-slate-900 dark:text-white'
                  : 'text-slate-700 dark:text-slate-200'
            }`}
         >
            {label}
         </Text>

         <View
            className={`h-3 w-[1px] mx-0.5 ${
               isActive ? 'opacity-40' : 'bg-slate-200 dark:bg-slate-600'
            }`}
            style={
               isActive ? { backgroundColor: isDark ? '#fff' : '#000' } : {}
            }
         />

         <Text
            className={`text-xs font-medium ${
               isActive
                  ? 'text-slate-700 dark:text-slate-200'
                  : 'text-slate-500 dark:text-slate-400'
            }`}
         >
            {percentage}%{' '}
            <Text
               className={`text-[10px] ${
                  isActive ? 'opacity-80' : 'text-slate-400'
               }`}
            >
               ({count})
            </Text>
         </Text>
      </TouchableOpacity>
   );
};

export function MentalFocusSheet({
   sheetRef,
   analysis,
   entries,
   isDark,
   onDeleteEntry,
}: MentalFocusSheetProps) {
   const insets = useSafeAreaInsets();
   const { height: windowHeight } = useWindowDimensions();

   const [activeTopic, setActiveTopic] = useState<string | null>(null);
   const [activeStyle, setActiveStyle] = useState<StyleFilter | null>(null);
   const [activeMood, setActiveMood] = useState<MoodFilter | null>(null);
   const [openMenuEntryId, setOpenMenuEntryId] = useState<string | null>(null);

   const maxSheetHeight = useMemo(() => windowHeight * 0.9, [windowHeight]);

   // --- Filtering Logic ---
   const matchesTopic = (e: Entry, topic: string | null) => {
      if (!topic) return true;
      const rawCat = e.aiResponse?.meta?.category;
      const cat = !rawCat || rawCat === 'Other' ? 'Other' : rawCat;
      const tags = e.aiResponse?.meta?.tags || [];
      return cat === topic || tags.includes(topic);
   };

   const matchesStyle = (e: Entry, style: StyleFilter | null) => {
      if (!style) return true;
      return getEntryStyle(e)?.label === style;
   };

   const matchesMood = (e: Entry, mood: MoodFilter | null) => {
      if (!mood) return true;
      return getEntryMood(e) === mood;
   };

   // 1. Dynamic Topic Stats
   const dynamicTopicStats = useMemo(() => {
      const counts = new Map<string, number>();
      let total = 0;

      entries.forEach((e) => {
         if (
            e.aiResponse?.meta &&
            matchesStyle(e, activeStyle) &&
            matchesMood(e, activeMood)
         ) {
            const rawCat = e.aiResponse.meta.category;
            const cat = !rawCat || rawCat === 'Other' ? 'Other' : rawCat;
            counts.set(cat, (counts.get(cat) || 0) + 1);
            total++;
         }
      });

      return (analysis?.categoryStats ?? []).map((stat) => {
         const count = counts.get(stat.label) || 0;
         return {
            ...stat,
            dynamicCount: count,
            dynamicPercentage: total > 0 ? (count / total) * 100 : 0,
         };
      });
   }, [entries, activeStyle, activeMood, analysis?.categoryStats]);

   // 2. Dynamic Style Stats
   const dynamicStyleStats = useMemo(() => {
      const counts = new Map<StyleFilter, number>();
      entries.forEach((e) => {
         if (
            e.aiResponse?.meta &&
            matchesTopic(e, activeTopic) &&
            matchesMood(e, activeMood)
         ) {
            const s = getEntryStyle(e);
            if (s) counts.set(s.label, (counts.get(s.label) || 0) + 1);
         }
      });

      const allStyles = Object.values(STYLE_MAP).map((s) => ({
         ...s,
         count: counts.get(s.label) || 0,
      }));
      return allStyles.sort((a, b) => b.count - a.count);
   }, [entries, activeTopic, activeMood]);

   // 3. Dynamic Mood Stats
   const dynamicMoodStats = useMemo(() => {
      const counts = new Map<MoodFilter, number>();
      entries.forEach((e) => {
         if (
            e.aiResponse?.meta &&
            matchesTopic(e, activeTopic) &&
            matchesStyle(e, activeStyle)
         ) {
            const m = getEntryMood(e);
            if (m) counts.set(m, (counts.get(m) || 0) + 1);
         }
      });

      const allMoods = [
         {
            key: 'optimistic' as const,
            label: 'Optimistic',
            color: isDark ? '#34d399' : '#10b981',
         },
         {
            key: 'pessimistic' as const,
            label: 'Pessimistic',
            color: isDark ? '#fb7185' : '#ef4444',
         },
         {
            key: 'mixed' as const,
            label: 'Mixed',
            color: isDark ? '#a78bfa' : '#6366f1',
         },
      ].map((m) => ({
         ...m,
         count: counts.get(m.key) || 0,
      }));

      return allMoods;
   }, [entries, activeTopic, activeStyle, isDark]);

   // 4. Final Filtered List
   const filteredEntries = useMemo(() => {
      if (!entries?.length) return [];
      const hasAnyFilter = Boolean(activeTopic || activeStyle || activeMood);
      if (!hasAnyFilter) return [];

      return entries
         .filter(
            (e) =>
               e.aiResponse?.meta &&
               matchesTopic(e, activeTopic) &&
               matchesStyle(e, activeStyle) &&
               matchesMood(e, activeMood),
         )
         .sort(
            (a, b) =>
               new Date(b.createdAt).getTime() -
               new Date(a.createdAt).getTime(),
         );
   }, [activeTopic, activeStyle, activeMood, entries]);

   // --- Handlers ---
   const handleTopicPress = useCallback((val: string) => {
      setActiveTopic((prev) => (prev === val ? null : val));
      setActiveStyle(null);
      setActiveMood(null);
      setOpenMenuEntryId(null);
   }, []);

   const handleStylePress = useCallback((val: StyleFilter) => {
      setActiveStyle((prev) => (prev === val ? null : val));
      setOpenMenuEntryId(null);
   }, []);

   const handleMoodPress = useCallback((mood: MoodFilter) => {
      setActiveMood((prev) => (prev === mood ? null : mood));
      setOpenMenuEntryId(null);
   }, []);

   const clearFilters = useCallback(() => {
      setActiveTopic(null);
      setActiveStyle(null);
      setActiveMood(null);
      setOpenMenuEntryId(null);
   }, []);

   const handleToggleMenu = useCallback((entryId: string) => {
      setOpenMenuEntryId((current) => (current === entryId ? null : entryId));
   }, []);

   const handleCloseMenu = useCallback(() => {
      setOpenMenuEntryId(null);
   }, []);

   const handleDelete = useCallback(
      (entry: Entry) => {
         handleCloseMenu();
         onDeleteEntry?.(entry);
      },
      [handleCloseMenu, onDeleteEntry],
   );

   const handleNavigate = useCallback(
      (_entry: Entry) => {
         setOpenMenuEntryId(null);
         sheetRef.current?.dismiss();
      },
      [sheetRef],
   );

   const handleSheetDismiss = useCallback(() => {
      clearFilters();
   }, [clearFilters]);

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

   if (!analysis) return null;

   const showingLabel = [
      activeTopic && `Topic: ${activeTopic}`,
      activeStyle && `Style: ${activeStyle}`,
      activeMood &&
         `Tone: ${activeMood.charAt(0).toUpperCase() + activeMood.slice(1)}`,
   ]
      .filter(Boolean)
      .join(' • ');

   return (
      <BottomSheetModal
         ref={sheetRef}
         index={0}
         enableDynamicSizing={true}
         maxDynamicContentSize={maxSheetHeight}
         enablePanDownToClose
         onDismiss={handleSheetDismiss}
         backdropComponent={renderBackdrop}
         handleIndicatorStyle={bottomSheetHandleIndicatorStyle(isDark)}
         backgroundStyle={bottomSheetBackgroundStyle(
            isDark,
            isDark ? BOTTOM_SHEET_BG_DARK : BOTTOM_SHEET_BG_LIGHT,
         )}
      >
         <BottomSheetScrollView
            contentContainerStyle={{
               paddingHorizontal: 0,
               paddingTop: 12,
               paddingBottom: insets.bottom + 20,
               minHeight: 200,
            }}
            keyboardShouldPersistTaps="handled"
         >
            <View className="px-5 flex-row items-center justify-between mb-6">
               <View>
                  <Text className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                     Mental Focus
                  </Text>
                  <Text className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                     Observations
                  </Text>
               </View>
            </View>

            {/* 1. Observed Topics */}
            {dynamicTopicStats.length > 0 && (
               <View className="mb-6">
                  <ScrollableSectionHeader
                     title="Observed Topics"
                     isDark={isDark}
                  />
                  <ScrollableFilterRow isDark={isDark}>
                     {dynamicTopicStats.map((stat) => (
                        <TopicChip
                           key={stat.label}
                           isActive={activeTopic === stat.label}
                           color={stat.style.color}
                           label={stat.label}
                           count={stat.dynamicCount}
                           percentage={Math.round(stat.dynamicPercentage)}
                           onPress={() => handleTopicPress(stat.label)}
                           isDark={isDark}
                        />
                     ))}
                  </ScrollableFilterRow>
               </View>
            )}

            {/* 2. Explanatory Styles (Hidden if empty) */}
            <View className="mb-6">
               <ScrollableSectionHeader
                  title="Explanatory Style"
                  isDark={isDark}
               />
               <ScrollableFilterRow isDark={isDark}>
                  {dynamicStyleStats.map((style) => (
                     <FilterChip
                        key={style.label}
                        isActive={activeStyle === style.label}
                        color={style.color}
                        label={style.label}
                        count={style.count}
                        onPress={() => handleStylePress(style.label)}
                        isDark={isDark}
                     />
                  ))}
               </ScrollableFilterRow>
            </View>

            {/* 3. Detected Tones (Hidden if empty) */}
            <View className="mb-4">
               <ScrollableSectionHeader title="Detected Tone" isDark={isDark} />
               <ScrollableFilterRow isDark={isDark}>
                  {dynamicMoodStats.map((m) => (
                     <FilterChip
                        key={m.key}
                        isActive={activeMood === m.key}
                        color={m.color}
                        label={m.label}
                        count={m.count}
                        onPress={() => handleMoodPress(m.key)}
                        isDark={isDark}
                     />
                  ))}
               </ScrollableFilterRow>
            </View>

            {/* Filtered Results */}
            {(activeTopic || activeStyle || activeMood) && (
               <Animated.View
                  entering={FadeIn.duration(300)}
                  exiting={FadeOut.duration(200)}
                  className="mt-6 px-5"
               >
                  <View className="flex-row items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
                     <Text
                        className="text-xs font-bold text-indigo-500 flex-1 mr-2"
                        numberOfLines={1}
                     >
                        Showing: {showingLabel}
                     </Text>
                     <TouchableOpacity onPress={clearFilters}>
                        <Text className="text-xs font-bold text-slate-400">
                           Clear
                        </Text>
                     </TouchableOpacity>
                  </View>

                  <View className="gap-3">
                     {filteredEntries.map((entry) => (
                        <Animated.View
                           key={entry.id}
                           entering={FadeIn.duration(200)}
                           exiting={FadeOut.duration(150)}
                           // 2. ADD LAYOUT TRANSITION HERE
                           layout={LinearTransition.duration(200)}
                        >
                           <EntryCard
                              entry={entry}
                              isMenuOpen={openMenuEntryId === entry.id}
                              onToggleMenu={() => handleToggleMenu(entry.id)}
                              onCloseMenu={handleCloseMenu}
                              onDelete={handleDelete}
                              onNavigate={handleNavigate}
                              initialViewMode="original"
                           />
                        </Animated.View>
                     ))}
                  </View>
               </Animated.View>
            )}
         </BottomSheetScrollView>
      </BottomSheetModal>
   );
}
