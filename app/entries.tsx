import LeftBackChevron from '@/components/buttons/LeftBackChevron';
import NewEntryFab from '@/components/buttons/NewEntryFAB';
import { ROUTE_ENTRY_DETAIL } from '@/components/constants';
import { MenuBounds } from '@/components/entries/entry/EntryCard';
import EntryRow from '@/components/entries/entry/EntryRow';
import { CategorySegment, WeekSummary } from '@/components/home/types';
import { useDeletedEntries } from '@/hooks/useDeletedEntries';
import { useEntries } from '@/hooks/useEntries';
import { useNavigationLock } from '@/hooks/useNavigationLock';
import {
   getWeekKey,
   getWeekLabel,
   getWeekRangeLabel,
   getWeekStart,
} from '@/lib/date';
import {
   CATEGORY_COLOR_MAP,
   DEFAULT_CATEGORY_COLOR,
   UNCATEGORIZED_LABEL,
} from '@/lib/styles';
import type { Entry } from '@/models/entry';
import { Link, router, useFocusEffect } from 'expo-router';
import { Trash2 } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, {
   useCallback,
   useEffect,
   useMemo,
   useRef,
   useState,
} from 'react';
import { Pressable, SectionList, Text, View, ViewToken } from 'react-native';
import { SwipeableMethods } from 'react-native-gesture-handler/lib/typescript/components/ReanimatedSwipeable';
import Animated, {
   FadeIn,
   FadeOutUp,
   LinearTransition,
   useAnimatedRef,
   useAnimatedScrollHandler,
   useDerivedValue,
   useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const AnimatedSectionList = Animated.createAnimatedComponent(
   SectionList,
) as typeof SectionList;

// --- Types & Config ---
type RowItem = { kind: 'entry'; entry: Entry };
type EntrySection = {
   title: string;
   weekKey: string;
   rangeLabel: string;
   data: RowItem[];
   summary: WeekSummary;
};

const SCROLL_THRESHOLD_FOR_FAB = 100;

// --- Logic Helpers ---
function getNumericScore(val: any): number | null {
   if (typeof val === 'number') return val;
   if (typeof val === 'string') {
      const n = parseFloat(val);
      if (!isNaN(n)) return n;
   }
   return null;
}

function getCategorySegments(entries: Entry[]): CategorySegment[] {
   if (entries.length === 0) return [];
   const counts: Record<string, number> = {};
   entries.forEach((e) => {
      const cat = e.aiResponse?.meta?.category ?? UNCATEGORIZED_LABEL;
      counts[cat] = (counts[cat] || 0) + 1;
   });
   const total = entries.length;
   return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, count]) => ({
         category: cat,
         count,
         percentage: (count / total) * 100,
         colorHex: CATEGORY_COLOR_MAP[cat] || DEFAULT_CATEGORY_COLOR,
      }));
}

function getSectionSummary(rows: RowItem[]): WeekSummary {
   const entries = rows.map((r) => r.entry);
   if (entries.length === 0)
      return { categorySegments: [], entryCount: 0, avgOptimism: null };
   let optSum = 0;
   let optCount = 0;
   entries.forEach((e) => {
      const score = getNumericScore(
         e.aiResponse?.meta?.optimismScore ??
            e.aiResponse?.meta?.sentimentScore,
      );
      if (score !== null) {
         optSum += score;
         optCount++;
      }
   });
   const avgOptimism = optCount > 0 ? optSum / optCount : null;
   const categorySegments = getCategorySegments(entries);
   return { categorySegments, entryCount: entries.length, avgOptimism };
}

function buildSections(filteredRows: Entry[]): EntrySection[] {
   if (filteredRows.length === 0) return [];
   const now = new Date();
   const groups = new Map<
      string,
      { title: string; rangeLabel: string; rows: RowItem[] }
   >();
   const sortedEntries = [...filteredRows].sort(
      (a, b) =>
         new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
   );
   for (const entry of sortedEntries) {
      const created = new Date(entry.createdAt);
      if (Number.isNaN(created.getTime())) continue;
      const weekStart = getWeekStart(created);
      const key = getWeekKey(weekStart);
      if (!groups.has(key)) {
         groups.set(key, {
            title: getWeekLabel(weekStart, now),
            rangeLabel: getWeekRangeLabel(weekStart),
            rows: [],
         });
      }
      groups.get(key)!.rows.push({ kind: 'entry', entry });
   }
   const sections: EntrySection[] = [];
   groups.forEach((group, key) => {
      const summary = getSectionSummary(group.rows);
      sections.push({
         title: group.title,
         weekKey: key,
         rangeLabel: group.rangeLabel,
         data: group.rows,
         summary,
      });
   });
   return sections;
}

// --- Main Component ---

export default function EntriesListScreen() {
   const store = useEntries();
   const { deletedCount, refresh: refreshDeletedEntries } = useDeletedEntries();
   const insets = useSafeAreaInsets();
   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';
   const { lock: lockNavigation } = useNavigationLock();

   const listRef = useAnimatedRef<SectionList<RowItem, EntrySection>>();

   const scrollY = useSharedValue(0);
   const scrollHandler = useAnimatedScrollHandler((event) => {
      scrollY.value = event.contentOffset.y;
   });

   // Derived visibility value for the FAB
   const isFabVisible = useDerivedValue(() => {
      return scrollY.value > SCROLL_THRESHOLD_FOR_FAB;
   });

   const [openMenuEntryId, setOpenMenuEntryId] = useState<string | null>(null);
   const [, setOpenMenuBounds] = useState<MenuBounds | null>(null);
   const openSwipeableRef = useRef<{
      id: string;
      ref: SwipeableMethods;
   } | null>(null);

   const handleNewEntryPress = useCallback(() => {
      lockNavigation(() => router.push('/new'));
   }, [lockNavigation]);

   useFocusEffect(
      useCallback(() => {
         refreshDeletedEntries();
      }, [refreshDeletedEntries]),
   );
   useEffect(() => {
      refreshDeletedEntries();
   }, [refreshDeletedEntries, store.rows.length]);

   const closeMenu = useCallback(() => {
      if (openMenuEntryId !== null) {
         setOpenMenuEntryId(null);
         setOpenMenuBounds(null);
      }
   }, [openMenuEntryId]);

   const closeActiveSwipeable = useCallback(() => {
      if (openSwipeableRef.current) {
         openSwipeableRef.current.ref.close();
         const id = openSwipeableRef.current.id;
         openSwipeableRef.current = null;
         return id;
      }
      return null;
   }, []);

   const onRowSwipeOpen = useCallback((id: string, ref: SwipeableMethods) => {
      if (openSwipeableRef.current && openSwipeableRef.current.ref !== ref) {
         openSwipeableRef.current.ref.close();
      }
      openSwipeableRef.current = { id, ref };
   }, []);
   const onRowSwipeClose = useCallback((id: string) => {
      if (openSwipeableRef.current?.id === id) {
         openSwipeableRef.current = null;
      }
   }, []);
   const toggleMenu = useCallback((entryId: string) => {
      setOpenMenuEntryId((c) => {
         const n = c === entryId ? null : entryId;
         if (n !== c) setOpenMenuBounds(null);
         return n;
      });
   }, []);

   const requestDelete = useCallback(
      (entry: Entry) => {
         closeMenu();
         closeActiveSwipeable();
         store.deleteEntry(entry.id).catch((e) => console.error(e));
      },
      [closeActiveSwipeable, closeMenu, store],
   );

   // --- Filtering & Data ---
   const filteredRows = store.rows;
   const sections = useMemo(() => buildSections(filteredRows), [filteredRows]);

   // --- INDEX MAP (For looking up entry index by ID) ---
   const entryIdToIndexRef = useRef(new Map<string, number>());

   useEffect(() => {
      const map = new Map<string, number>();
      filteredRows.forEach((e, i) => {
         map.set(e.id, i);
      });
      entryIdToIndexRef.current = map;
   }, [filteredRows]);

   // --- Dynamic Title Logic ---
   const [headerInfo, setHeaderInfo] = useState({
      title: 'Journal History',
      range: '',
      bucketLabel: null as string | null,
   });

   const onViewableItemsChanged = useCallback(
      ({ viewableItems }: { viewableItems: ViewToken[] }) => {
         if (!viewableItems || viewableItems.length === 0) return;

         const firstItem = viewableItems[0];
         let newTitle = '';
         let newRange = '';
         let newBucketLabel: string | null = null;

         if (firstItem.section) {
            const section = firstItem.section as EntrySection;
            newTitle = section.title;
            newRange = section.rangeLabel;

            let targetEntry: Entry | null = null;

            if (firstItem.item && (firstItem.item as RowItem).entry) {
               targetEntry = (firstItem.item as RowItem).entry;
            } else if (section.data && section.data.length > 0) {
               targetEntry = section.data[0].entry;
            }

            if (targetEntry) {
               const index = entryIdToIndexRef.current.get(targetEntry.id);
               if (index !== undefined) {
                  const bucket = Math.ceil((index + 1) / 5) * 5;
                  newBucketLabel = `Last ${bucket} Entries`;
               }
            }
         }

         setHeaderInfo((prev) => {
            if (
               prev.title !== newTitle ||
               prev.range !== newRange ||
               prev.bucketLabel !== newBucketLabel
            ) {
               return {
                  title: newTitle || prev.title,
                  range: newRange || prev.range,
                  bucketLabel: newBucketLabel,
               };
            }
            return prev;
         });
      },
      [],
   );

   const viewabilityConfig = useRef({
      itemVisiblePercentThreshold: 50,
      waitForInteraction: false,
   }).current;

   const renderItem = useCallback(
      ({ item }: { item: RowItem }) => (
         <Animated.View
            layout={LinearTransition.duration(180)}
            exiting={FadeOutUp.duration(180)}
            style={{ width: '100%' }}
         >
            <EntryRow
               entry={item.entry}
               isMenuOpen={openMenuEntryId === item.entry.id}
               onToggleMenu={() => toggleMenu(item.entry.id)}
               onCloseMenu={closeMenu}
               onMenuLayout={setOpenMenuBounds}
               onSwipeOpen={onRowSwipeOpen}
               onSwipeClose={onRowSwipeClose}
               closeActiveSwipeable={closeActiveSwipeable}
               onEdit={() =>
                  lockNavigation(() =>
                     router.push({
                        pathname: ROUTE_ENTRY_DETAIL,
                        params: { id: item.entry.id, mode: 'edit' },
                     }),
                  )
               }
               onDelete={() => requestDelete(item.entry)}
            />
         </Animated.View>
      ),
      [
         closeActiveSwipeable,
         closeMenu,
         lockNavigation,
         onRowSwipeClose,
         onRowSwipeOpen,
         openMenuEntryId,
         requestDelete,
         toggleMenu,
      ],
   );

   const HEADER_HEIGHT = 64;
   const totalTopPadding = insets.top + 10;

   return (
      <View
         className="flex-1 bg-slate-50 dark:bg-slate-900"
         onStartShouldSetResponderCapture={() => {
            if (openMenuEntryId) closeMenu();
            return false;
         }}
      >
         <View
            style={{ paddingTop: totalTopPadding, paddingBottom: 12 }}
            className="px-6 bg-slate-50/95 dark:bg-slate-900/95 absolute z-50 top-0 left-0 right-0 border-b border-slate-200/50 dark:border-slate-800/50"
         >
            <View className="flex-row items-center justify-between">
               <View className="flex-row items-center gap-3 flex-1">
                  <LeftBackChevron isDark={isDark} />
                  <View className="flex-1 overflow-hidden justify-center">
                     <Animated.View
                        key={
                           headerInfo.title +
                           headerInfo.range +
                           headerInfo.bucketLabel
                        }
                        entering={FadeIn.duration(200)}
                        exiting={FadeOutUp.duration(200)}
                        className="flex-1 justify-center"
                     >
                        <Text
                           className="text-xl font-bold text-slate-900 dark:text-white"
                           numberOfLines={1}
                        >
                           {headerInfo.title}
                        </Text>
                        {headerInfo.range ? (
                           <Text
                              className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5 uppercase tracking-wide"
                              numberOfLines={1}
                           >
                              {headerInfo.range}
                              {headerInfo.bucketLabel && (
                                 <Text className="text-slate-400 dark:text-slate-500">
                                    {' '}
                                    • {headerInfo.bucketLabel}
                                 </Text>
                              )}
                           </Text>
                        ) : null}
                     </Animated.View>
                  </View>
               </View>

               <View className="flex-row items-center gap-4">
                  {deletedCount > 0 && (
                     <Link href="/bin" asChild>
                        <Pressable className="h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 active:opacity-80">
                           <Trash2
                              size={20}
                              color="#ef4444"
                              strokeWidth={2.5}
                           />
                        </Pressable>
                     </Link>
                  )}
               </View>
            </View>
         </View>

         <AnimatedSectionList<RowItem, EntrySection>
            ref={listRef}
            sections={sections}
            keyExtractor={(item) => item.entry.id}
            className="flex-1"
            stickySectionHeadersEnabled={false}
            showsVerticalScrollIndicator={false}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            removeClippedSubviews={false}
            contentContainerStyle={{
               paddingBottom: insets.bottom + 80,
               paddingTop: totalTopPadding + HEADER_HEIGHT,
            }}
            scrollIndicatorInsets={{
               top: totalTopPadding + HEADER_HEIGHT,
               bottom: insets.bottom,
            }}
            onScrollBeginDrag={() => {
               closeMenu();
               closeActiveSwipeable();
            }}
            renderItem={renderItem}
         />

         <NewEntryFab isVisible={isFabVisible} onPress={handleNewEntryPress} />
      </View>
   );
}
