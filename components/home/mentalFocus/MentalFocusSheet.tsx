import {
   BOTTOM_SHEET_BG_DARK,
   BOTTOM_SHEET_BG_LIGHT,
   bottomSheetBackgroundStyle,
   bottomSheetHandleIndicatorStyle,
} from '@/components/bottomSheetStyles';
import { BOTTOM_SHEET_BACKDROP_OPACITY } from '@/components/constants';
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
   Pressable, // Changed from TouchableOpacity to Pressable for cleaner control
   Text,
   TouchableOpacity,
   useWindowDimensions,
   View,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import Animated, {
   FadeIn,
   FadeOut,
   LinearTransition,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MentalFocusViewModel } from '../types';

type MentalFocusSheetProps = {
   sheetRef: React.RefObject<BottomSheetModal | null>;
   analysis: MentalFocusViewModel;
   entries: Entry[];
   isDark: boolean;
   onDeleteEntry: (entry: Entry) => void;
};

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
               >
                  <ChevronLeft
                     size={16}
                     color={arrowIconColor}
                     strokeWidth={2.5}
                  />
               </TouchableOpacity>
            </Animated.View>
         )}

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
   const activeStyle = {
      backgroundColor: isDark ? `${color}45` : `${color}15`,
      borderColor: isDark ? `${color}90` : `${color}50`,
      borderWidth: isDark ? 1.5 : 1,
   };

   // Changed to Pressable to remove the "fade" animation that can get stuck
   return (
      <Pressable
         onPress={onPress}
         // Added active state for subtle feedback without the stuck opacity
         className={`flex-row items-center gap-2 px-3.5 py-2 rounded-full border mr-2 active:opacity-60 ${
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
      </Pressable>
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

   // 1. Dynamic Topic Stats
   const dynamicTopicStats = useMemo(() => {
      const counts = new Map<string, number>();
      let total = 0;

      entries.forEach((e) => {
         if (e.aiResponse?.meta) {
            const rawCat = e.aiResponse.meta.category;
            const cat = !rawCat || rawCat === 'Other' ? 'Other' : rawCat;
            counts.set(cat, (counts.get(cat) || 0) + 1);
            total++;
         }
      });

      return (analysis?.categoryStats ?? [])
         .map((stat) => {
            const count = counts.get(stat.label) || 0;
            return {
               ...stat,
               dynamicCount: count,
               dynamicPercentage: total > 0 ? (count / total) * 100 : 0,
            };
         })
         .filter((stat) => stat.dynamicCount > 0);
   }, [entries, analysis?.categoryStats]);

   // 2. Final Filtered List
   const filteredEntries = useMemo(() => {
      if (!entries?.length) return [];
      if (!activeTopic) return [];

      return entries
         .filter((e) => e.aiResponse?.meta && matchesTopic(e, activeTopic))
         .sort(
            (a, b) =>
               new Date(b.createdAt).getTime() -
               new Date(a.createdAt).getTime(),
         );
   }, [activeTopic, entries]);

   // --- Handlers ---
   const handleTopicPress = useCallback((val: string) => {
      setActiveTopic((prev) => (prev === val ? null : val));
      setOpenMenuEntryId(null);
   }, []);

   const clearFilters = useCallback(() => {
      setActiveTopic(null);
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
                     Observed Topics
                  </Text>
               </View>
            </View>

            {/* Observed Topics */}
            {dynamicTopicStats.length > 0 && (
               <View className="mb-6">
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

            {/* Filtered Results */}
            {activeTopic && (
               <Animated.View
                  entering={FadeIn.duration(300)}
                  exiting={FadeOut.duration(200)}
                  className="mt-2 px-5"
               >
                  <View className="gap-3">
                     {filteredEntries.map((entry) => (
                        <Animated.View
                           key={entry.id}
                           entering={FadeIn.duration(200)}
                           exiting={FadeOut.duration(150)}
                           // Ensures list items slide up when one is deleted
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
