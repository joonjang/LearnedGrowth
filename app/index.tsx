import QuickStart from '@/components/appInfo/QuickStart';
import {
   PRIMARY_CTA_CLASS,
   PRIMARY_CTA_ICON_COLOR,
   PRIMARY_CTA_TEXT_CLASS,
} from '@/components/constants';
import { MenuBounds } from '@/components/entries/entry/EntryCard';
import EntryRow from '@/components/entries/entry/EntryRow';
import HomeDashboard from '@/components/home/HomeDashboard';
import SectionHeader from '@/components/home/SectionHeader';
import { CategorySegment, WeekSummary } from '@/components/home/types';
import TopFade from '@/components/TopFade';
import { useDeletedEntries } from '@/hooks/useDeletedEntries';
import { useEntries } from '@/hooks/useEntries';
import { useNavigationLock } from '@/hooks/useNavigationLock';
import { getShadow } from '@/lib/shadow';
import { Entry } from '@/models/entry';
import { Link, router, useFocusEffect } from 'expo-router';
import {
   Check,
   ChevronDown,
   Infinity,
   Info,
   Plus,
   Settings,
   Trash2,
} from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, {
   useCallback,
   useEffect,
   useMemo,
   useRef,
   useState,
} from 'react';
import {
   Modal,
   Platform,
   Pressable,
   SectionList,
   Text,
   View,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SwipeableMethods } from 'react-native-gesture-handler/lib/typescript/components/ReanimatedSwipeable';
import Animated, {
   FadeIn,
   FadeInDown,
   FadeOut,
   useAnimatedRef,
   useAnimatedScrollHandler,
   useAnimatedStyle,
   useSharedValue,
   withRepeat,
   withSequence,
   withSpring,
   withTiming,
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
type WeekOption = {
   key: string;
   label: string;
   rangeLabel: string;
   start: Date;
   end: Date;
   count: number;
};

const SCROLL_THRESHOLD_FOR_FAB = 320;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const UNCATEGORIZED_LABEL = 'Not categorized';
const CATEGORY_COLOR_MAP: Record<string, string> = {
   Work: '#3b82f6',
   Education: '#8b5cf6',
   Relationships: '#e11d48',
   Health: '#10b981',
   Finance: '#eab308',
   'Self-Image': '#06b6d4',
   'Daily Hassles': '#64748b',
   Other: '#9ca3af',
   [UNCATEGORIZED_LABEL]: '#e2e8f0',
};
const DEFAULT_CATEGORY_COLOR = '#cbd5e1';

// --- Helper: Title Skeleton ---
const TitleSkeleton = () => {
   const opacity = useSharedValue(0.3);
   useEffect(() => {
      opacity.value = withRepeat(
         withSequence(
            withTiming(0.7, { duration: 800 }),
            withTiming(0.3, { duration: 800 }),
         ),
         -1,
         true,
      );
   }, [opacity]);
   const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
   return (
      <Animated.View
         style={style}
         className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg mb-4 ml-2"
      />
   );
};

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

// DATE HELPERS
function getWeekStart(date: Date) {
   const start = new Date(date);
   start.setHours(0, 0, 0, 0);
   const diffToSunday = start.getDay();
   start.setDate(start.getDate() - diffToSunday);
   return start;
}

function formatIsoDate(date: Date) {
   const year = date.getFullYear();
   const month = `${date.getMonth() + 1}`.padStart(2, '0');
   const day = `${date.getDate()}`.padStart(2, '0');
   return `${year}-${month}-${day}`;
}

function formatDate(date: Date) {
   return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getWeekKey(start: Date) {
   return formatIsoDate(start);
}

function getWeekRangeLabel(start: Date) {
   const end = new Date(start);
   end.setDate(start.getDate() + 6);
   return `${formatDate(start)} - ${formatDate(end)}`;
}

function parseLocalIsoDate(isoDateString: string): Date | null {
   const parts = isoDateString.split('-').map(Number);
   if (parts.length !== 3) return null;
   const [year, month, day] = parts;
   return new Date(year, month - 1, day);
}

function getWeekLabel(start: Date, now: Date) {
   const currentStart = getWeekStart(now);
   const diffTime = currentStart.getTime() - start.getTime();
   const diffWeeks = Math.round(diffTime / WEEK_MS);
   if (start.getTime() === currentStart.getTime()) return 'This Week';
   const lastStart = new Date(currentStart);
   lastStart.setDate(lastStart.getDate() - 7);
   if (start.getTime() === lastStart.getTime()) return 'Last Week';
   return `${Math.max(2, diffWeeks)} Weeks Ago`;
}

function buildWeekOptions(entries: Entry[], now: Date): WeekOption[] {
   const weeks = new Map<string, WeekOption>();
   const currentStart = getWeekStart(now);
   const currentKey = getWeekKey(currentStart);
   weeks.set(currentKey, {
      key: currentKey,
      label: 'This Week',
      rangeLabel: getWeekRangeLabel(currentStart),
      start: currentStart,
      end: new Date(
         currentStart.getTime() + 6 * 24 * 60 * 60 * 1000 + 86399999,
      ),
      count: 0,
   });
   entries.forEach((entry) => {
      const created = new Date(entry.createdAt);
      if (Number.isNaN(created.getTime())) return;
      const weekStart = getWeekStart(created);
      const key = getWeekKey(weekStart);
      let week = weeks.get(key);
      if (!week) {
         const end = new Date(weekStart);
         end.setDate(weekStart.getDate() + 6);
         end.setHours(23, 59, 59, 999);
         week = {
            key,
            label: getWeekLabel(weekStart, now),
            rangeLabel: getWeekRangeLabel(weekStart),
            start: weekStart,
            end,
            count: 0,
         };
         weeks.set(key, week);
      }
      week.count++;
   });
   return Array.from(weeks.values()).sort(
      (a, b) => b.start.getTime() - a.start.getTime(),
   );
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

export default function EntriesScreen() {
   const store = useEntries();
   const { deletedCount, refresh: refreshDeletedEntries } = useDeletedEntries();
   const insets = useSafeAreaInsets();
   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';
   const iconColor = isDark ? '#cbd5e1' : '#475569';
   const { lock: lockNavigation } = useNavigationLock();
   const [showHelpModal, setShowHelpModal] = useState(false);
   const [isDropdownOpen, setIsDropdownOpen] = useState(false);

   const [selectedWeekKey, setSelectedWeekKey] = useState<string>(() =>
      formatIsoDate(getWeekStart(new Date())),
   );

   const listRef = useAnimatedRef<SectionList<RowItem, EntrySection>>();
   const shadowSm = useMemo(
      () => getShadow({ isDark, preset: 'sm' }),
      [isDark],
   );
   const ctaShadow = useMemo(
      () =>
         getShadow({
            isDark,
            preset: 'button',
            androidElevation: 3,
            colorLight: '#000000',
         }),
      [isDark],
   );
   const fabShadow = useMemo(
      () => getShadow({ isDark, preset: 'button', colorLight: '#4f46e5' }),
      [isDark],
   );
   const dropdownShadow = useMemo(
      () => getShadow({ isDark, preset: 'md', disableInDark: true }),
      [isDark],
   );

   const scrollY = useSharedValue(0);
   const scrollHandler = useAnimatedScrollHandler((event) => {
      scrollY.value = event.contentOffset.y;
   });

   const fabStyle = useAnimatedStyle(() => {
      const showFab = scrollY.value > SCROLL_THRESHOLD_FOR_FAB;
      return {
         opacity: withTiming(showFab ? 1 : 0, { duration: 200 }),
         transform: [
            { scale: withSpring(showFab ? 1 : 0.8) },
            { translateY: withTiming(showFab ? 0 : 20) },
         ],
         pointerEvents: showFab ? 'auto' : 'none',
      };
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
      if (isDropdownOpen) {
         setIsDropdownOpen(false);
      }
   }, [openMenuEntryId, isDropdownOpen]);

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

   // --- LOADING STATES ---
   // 1. Check if store has loaded
   const isHydrated = store.lastHydratedAt !== null && !store.isHydrating;

   // 2. Visual Ready State (Delayed)
   // We force a 500ms delay after hydration so skeletons have time to show
   // and animations don't glitch out.
   const [isReady, setIsReady] = useState(false);

   useEffect(() => {
      if (isHydrated) {
         const timer = setTimeout(() => setIsReady(true), 500);
         return () => clearTimeout(timer);
      }
   }, [isHydrated]);

   // --- Filtering ---
   const weekOptions = useMemo(
      () => buildWeekOptions(store.rows, new Date()),
      [store.rows],
   );

   const filteredRows = useMemo(() => {
      if (selectedWeekKey === 'all') return store.rows;
      const option = weekOptions.find((w) => w.key === selectedWeekKey);
      let start, end;
      if (option) {
         start = option.start.getTime();
         end = option.end.getTime();
      } else {
         const startDate = parseLocalIsoDate(selectedWeekKey);
         if (!startDate) return store.rows;
         start = startDate.getTime();
         const endDate = new Date(startDate);
         endDate.setDate(endDate.getDate() + 6);
         endDate.setHours(23, 59, 59, 999);
         end = endDate.getTime();
      }
      return store.rows.filter((entry) => {
         const t = new Date(entry.createdAt).getTime();
         return t >= start && t <= end;
      });
   }, [store.rows, selectedWeekKey, weekOptions]);

   const sections = useMemo(() => buildSections(filteredRows), [filteredRows]);
   const selectedWeekObj = useMemo(() => {
      if (selectedWeekKey === 'all') return null;
      return weekOptions.find((w) => w.key === selectedWeekKey);
   }, [selectedWeekKey, weekOptions]);

   const displayLabel = useMemo(() => {
      if (selectedWeekKey === 'all') return 'All Time';
      if (selectedWeekObj) return selectedWeekObj.label;
      const date = parseLocalIsoDate(selectedWeekKey);
      return date ? getWeekLabel(date, new Date()) : 'Select Week';
   }, [selectedWeekKey, selectedWeekObj]);

   const isCurrentWeek =
      selectedWeekKey === formatIsoDate(getWeekStart(new Date()));

   const streakAnchorDate = useMemo(() => {
      if (selectedWeekKey === 'all' || isCurrentWeek) return new Date();
      if (selectedWeekObj) return new Date(selectedWeekObj.end);
      const fallbackStart = parseLocalIsoDate(selectedWeekKey);
      if (fallbackStart) {
         const fallbackEnd = new Date(fallbackStart);
         fallbackEnd.setDate(fallbackEnd.getDate() + 6);
         return fallbackEnd;
      }
      return new Date();
   }, [selectedWeekKey, isCurrentWeek, selectedWeekObj]);

   const reframedCount = useMemo(() => {
      return filteredRows.filter((e) => (e.dispute ?? '').trim().length > 0)
         .length;
   }, [filteredRows]);

   const thoughtLabel = reframedCount === 1 ? 'Thought' : 'Thoughts';
   const handleSelectWeek = useCallback((key: string) => {
      setSelectedWeekKey(key);
      setIsDropdownOpen(false);
   }, []);

   const renderSectionHeader = useCallback(
      ({ section }: { section: EntrySection }) => (
         <SectionHeader
            title={section.title}
            rangeLabel={section.rangeLabel}
            summary={section.summary}
            isDark={isDark}
            paddingTop={insets.top}
         />
      ),
      [insets.top, isDark],
   );

   const renderItem = useCallback(
      ({ item }: { item: RowItem }) => (
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
                     pathname: '/entries/[id]',
                     params: { id: item.entry.id, mode: 'edit' },
                  }),
               )
            }
            onDelete={() => requestDelete(item.entry)}
         />
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

   const hasEntries = store.rows.length > 0;
   const showQuickStart =
      store.lastHydratedAt !== null && !store.isHydrating && !hasEntries;
   const shouldShowContent = !showQuickStart;

   return (
      <View
         className="flex-1 bg-slate-50 dark:bg-slate-900"
         onStartShouldSetResponderCapture={() => {
            if (openMenuEntryId) closeMenu();
            return false;
         }}
      >
         <AnimatedSectionList<RowItem, EntrySection>
            ref={listRef}
            sections={sections}
            keyExtractor={(item) => item.entry.id}
            className="flex-1"
            stickySectionHeadersEnabled={true}
            showsVerticalScrollIndicator={false}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
            scrollIndicatorInsets={{ top: insets.top, bottom: insets.bottom }}
            ListHeaderComponent={
               shouldShowContent ? (
                  <View
                     style={{ paddingTop: insets.top + 12 }}
                     className="px-6 pb-6 bg-slate-50 dark:bg-slate-900 z-50"
                  >
                     {isDropdownOpen && (
                        <Pressable
                           style={{
                              position: 'absolute',
                              top: -1000,
                              left: -1000,
                              right: -1000,
                              bottom: -1000,
                              zIndex: 40,
                           }}
                           onPress={() => setIsDropdownOpen(false)}
                        />
                     )}

                     <View className="flex-row items-center justify-between mb-2 z-50">
                        <View className="z-50 flex-1">
                           <View className="z-50">
                              <Pressable
                                 onPress={() =>
                                    setIsDropdownOpen(!isDropdownOpen)
                                 }
                              >
                                 <View className="flex-row items-center gap-2 bg-white dark:bg-slate-800 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 self-start">
                                    <Text
                                       numberOfLines={1}
                                       ellipsizeMode="tail"
                                       className="text-xl font-bold text-slate-900 dark:text-white max-w-[200px]"
                                    >
                                       {displayLabel}
                                    </Text>
                                    <View
                                       className={`transform ${isDropdownOpen ? 'rotate-180' : 'rotate-0'}`}
                                    >
                                       <ChevronDown
                                          size={16}
                                          color={isDark ? '#94a3b8' : '#64748b'}
                                          strokeWidth={2.5}
                                       />
                                    </View>
                                 </View>
                              </Pressable>
                              {isDropdownOpen && (
                                 <Animated.View
                                    entering={FadeIn.duration(150)}
                                    exiting={FadeOut.duration(150)}
                                    style={[
                                       {
                                          position: 'absolute',
                                          top: 54,
                                          left: 0,
                                          width: 240,
                                          maxHeight: 320,
                                          backgroundColor: isDark
                                             ? '#1e293b'
                                             : '#ffffff',
                                          borderRadius: 16,
                                          borderWidth: 1,
                                          borderColor: isDark
                                             ? '#334155'
                                             : '#e2e8f0',
                                          zIndex: 100,
                                       },
                                       dropdownShadow.ios,
                                       dropdownShadow.android,
                                    ]}
                                 >
                                    <ScrollView
                                       contentContainerStyle={{ padding: 6 }}
                                       showsVerticalScrollIndicator={true}
                                       nestedScrollEnabled={true}
                                    >
                                       <Pressable
                                          onPress={() =>
                                             handleSelectWeek('all')
                                          }
                                       >
                                          <View
                                             className={`flex-row items-center justify-between p-3 rounded-xl ${selectedWeekKey === 'all' ? 'bg-slate-100 dark:bg-slate-700/50' : ''}`}
                                          >
                                             <View className="flex-row items-center gap-3">
                                                <Infinity
                                                   size={16}
                                                   color={
                                                      isDark
                                                         ? '#94a3b8'
                                                         : '#64748b'
                                                   }
                                                />
                                                <Text className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                                   All Time
                                                </Text>
                                             </View>
                                             {selectedWeekKey === 'all' && (
                                                <Check
                                                   size={14}
                                                   color={
                                                      isDark
                                                         ? '#94a3b8'
                                                         : '#64748b'
                                                   }
                                                />
                                             )}
                                          </View>
                                       </Pressable>
                                       <View className="h-[1px] bg-slate-100 dark:bg-slate-700 my-1 mx-2" />
                                       {weekOptions.map((week) => {
                                          const isSelected =
                                             selectedWeekKey === week.key;
                                          return (
                                             <Pressable
                                                key={week.key}
                                                onPress={() =>
                                                   handleSelectWeek(week.key)
                                                }
                                             >
                                                <View
                                                   className={`flex-row items-center justify-between p-3 rounded-xl ${isSelected ? 'bg-slate-100 dark:bg-slate-700/50' : ''}`}
                                                >
                                                   <View>
                                                      <Text
                                                         className={`text-xs font-bold ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-200'}`}
                                                      >
                                                         {week.label}
                                                      </Text>
                                                      <Text className="text-[10px] text-slate-400 mt-0.5">
                                                         {week.rangeLabel}
                                                      </Text>
                                                   </View>
                                                   {isSelected && (
                                                      <Check
                                                         size={14}
                                                         color={
                                                            isDark
                                                               ? '#818cf8'
                                                               : '#4f46e5'
                                                         }
                                                      />
                                                   )}
                                                </View>
                                             </Pressable>
                                          );
                                       })}
                                    </ScrollView>
                                 </Animated.View>
                              )}
                           </View>
                        </View>
                        <View className="flex-row items-center gap-3">
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
                           <Pressable
                              onPress={() => setShowHelpModal(true)}
                              className="h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 active:opacity-80"
                           >
                              <Info
                                 size={20}
                                 color={iconColor}
                                 strokeWidth={2.5}
                              />
                           </Pressable>
                           <Link href="/settings" asChild>
                              <Pressable className="h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 active:opacity-80">
                                 <Settings
                                    size={20}
                                    color={iconColor}
                                    strokeWidth={2.5}
                                 />
                              </Pressable>
                           </Link>
                        </View>
                     </View>

                     {/* TITLE SKELETON */}
                     {isReady ? (
                        <Animated.View entering={FadeIn.duration(500)}>
                           <Text className="text-2xl font-extrabold text-slate-900 dark:text-white mb-4 z-10 ml-2">
                              {reframedCount} {thoughtLabel}{' '}
                              <Text className="text-indigo-600 font-extrabold">
                                 Reframed
                              </Text>
                           </Text>
                        </Animated.View>
                     ) : (
                        <TitleSkeleton />
                     )}

                     {/* DASHBOARD */}
                     <View className="z-10 mb-6">
                        <HomeDashboard
                           entries={filteredRows}
                           anchorDate={streakAnchorDate}
                           shadowSm={shadowSm}
                           isDark={isDark}
                           showEncouragement={isCurrentWeek}
                           onDeleteEntry={requestDelete}
                           isLoading={!isReady} // <--- Pass Loading State
                        />
                     </View>

                     {/* BUTTON - Only render when ready */}
                     {isReady && (
                        <Animated.View
                           entering={FadeInDown.duration(600).springify()}
                           className="mt-1 z-10"
                        >
                           <Pressable
                              onPress={handleNewEntryPress}
                              className={`relative flex-row items-center justify-center rounded-2xl px-6 py-4 ${PRIMARY_CTA_CLASS}`}
                              style={[ctaShadow.ios, ctaShadow.android]}
                           >
                              <Text
                                 className={`text-lg font-bold text-center ${PRIMARY_CTA_TEXT_CLASS}`}
                              >
                                 What&apos;s on your mind?
                              </Text>
                           </Pressable>
                        </Animated.View>
                     )}
                  </View>
               ) : null
            }
            ListEmptyComponent={showQuickStart ? <QuickStart /> : null}
            onScrollBeginDrag={() => {
               closeMenu();
               closeActiveSwipeable();
            }}
            renderSectionHeader={renderSectionHeader}
            renderItem={renderItem}
         />
         {!showQuickStart && (
            <Animated.View
               style={[
                  {
                     position: 'absolute',
                     bottom: insets.bottom + 24,
                     right: 24,
                     zIndex: 50,
                  },
                  fabStyle,
               ]}
            >
               <Pressable
                  onPress={handleNewEntryPress}
                  className={`h-14 w-14 rounded-full items-center justify-center ${PRIMARY_CTA_CLASS}`}
                  style={[fabShadow.ios, fabShadow.android]}
               >
                  <Plus
                     size={28}
                     color={PRIMARY_CTA_ICON_COLOR}
                     strokeWidth={2.5}
                  />
               </Pressable>
            </Animated.View>
         )}
         <Modal
            visible={showHelpModal}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setShowHelpModal(false)}
         >
            {Platform.OS === 'android' && <TopFade height={insets.top + 12} />}
            <View className="flex-1 pt-2 bg-slate-50 dark:bg-slate-900">
               <QuickStart
                  isModal={true}
                  onClose={() => setShowHelpModal(false)}
               />
            </View>
         </Modal>
      </View>
   );
}
