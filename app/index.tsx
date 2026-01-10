import QuickStart from '@/components/appInfo/QuickStart';
import {
   PRIMARY_CTA_CLASS,
   PRIMARY_CTA_ICON_COLOR,
   PRIMARY_CTA_TEXT_CLASS,
} from '@/components/constants';
import { MenuBounds } from '@/components/entries/entry/EntryCard';
import EntryRow, { UndoRow } from '@/components/entries/entry/EntryRow';
import GlobalDashboard from '@/components/entries/home/GlobalDashboard';
import SectionHeader from '@/components/entries/home/SectionHeader';
import StreakCard from '@/components/entries/home/StreakCard';
import { CategorySegment, WeekSummary } from '@/components/entries/home/types';
import { isOptimistic } from '@/components/entries/home/utils';
import TopFade from '@/components/TopFade';
import { useEntries } from '@/hooks/useEntries';
import { useNavigationLock } from '@/hooks/useNavigationLock';
import { getShadow } from '@/lib/shadow';
import { Entry } from '@/models/entry';
import { Link, router } from 'expo-router';
import {
   ChevronDown,
   CircleDashed,
   Flame,
   Info,
   Plus,
   Settings,
   Sun,
   Zap,
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
   LayoutChangeEvent,
   Modal,
   Platform,
   Pressable,
   SectionList,
   Text,
   View,
} from 'react-native';
import { SwipeableMethods } from 'react-native-gesture-handler/lib/typescript/components/ReanimatedSwipeable';
import Animated, {
   Extrapolation,
   interpolate,
   useAnimatedRef,
   useAnimatedScrollHandler,
   useAnimatedStyle,
   useSharedValue,
   withSpring,
   withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// --- FIXED: Create Animated Component ---
const AnimatedSectionList = Animated.createAnimatedComponent(
   SectionList
) as typeof SectionList;

// --- Types ---

type RowItem = { kind: 'entry'; entry: Entry } | { kind: 'undo'; entry: Entry };

type EntrySection = {
   title: string;
   weekKey: string;
   rangeLabel: string;
   data: RowItem[];
   summary: WeekSummary;
};

// --- Config ---

const UNDO_TIMEOUT_MS = 5500;
const SCROLL_THRESHOLD_FOR_FAB = 320;

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
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
   const entries = rows.filter((r) => r.kind === 'entry').map((r) => r.entry);
   if (entries.length === 0)
      return { categorySegments: [], entryCount: 0, avgOptimism: null };

   let optSum = 0;
   let optCount = 0;
   entries.forEach((e) => {
      const score = getNumericScore(
         e.aiResponse?.meta?.optimismScore ?? e.aiResponse?.meta?.sentimentScore
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

function buildRowsWithUndo(rows: Entry[], undoSlots: Entry[]): RowItem[] {
   const merged: RowItem[] = rows.map((entry) => ({ kind: 'entry', entry }));
   for (const entry of undoSlots) {
      if (!rows.find((r) => r.id === entry.id))
         merged.push({ kind: 'undo', entry });
   }
   return merged.sort((a, b) => {
      const aTime = new Date(a.entry.createdAt).getTime();
      const bTime = new Date(b.entry.createdAt).getTime();
      if (bTime !== aTime) return bTime - aTime;
      return a.entry.id < b.entry.id ? -1 : a.entry.id > b.entry.id ? 1 : 0;
   });
}

function buildSections(rows: RowItem[]): EntrySection[] {
   const sections: EntrySection[] = [];
   const now = new Date();
   const groups = new Map<
      string,
      { title: string; rangeLabel: string; rows: RowItem[] }
   >();

   for (const entry of rows) {
      const { key, label, rangeLabel } = getWeekInfo(
         entry.entry.createdAt,
         now
      );
      if (!groups.has(key))
         groups.set(key, { title: label, rangeLabel, rows: [] });
      groups.get(key)!.rows.push(entry);
   }

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

function getWeekInfo(createdAt: string, now: Date) {
   const date = safeParseDate(createdAt) ?? now;
   const start = getWeekStart(date);
   const end = new Date(start);
   end.setDate(start.getDate() + 6);
   const currentStart = getWeekStart(now);
   const lastStart = getWeekStart(
      new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
   );
   const key = `${formatIsoDate(start)}_${formatIsoDate(end)}`;
   const weekMs = 7 * 24 * 60 * 60 * 1000;
   const diffWeeks = Math.round(
      (currentStart.getTime() - start.getTime()) / weekMs
   );
   const label =
      start.getTime() === currentStart.getTime()
         ? 'This Week'
         : start.getTime() === lastStart.getTime()
           ? 'Last Week'
           : `${Math.max(2, diffWeeks)} Weeks Ago`;
   const rangeLabel = `${formatDate(start)} - ${formatDate(end)}`;
   return { key, label, rangeLabel };
}

function getWeekStart(date: Date) {
   const start = new Date(date);
   start.setHours(0, 0, 0, 0);
   const diffToMonday = (start.getDay() + 6) % 7;
   start.setDate(start.getDate() - diffToMonday);
   return start;
}
function safeParseDate(value: string) {
   const parsed = new Date(value);
   return Number.isNaN(parsed.getTime()) ? null : parsed;
}
function formatIsoDate(date: Date) {
   const year = date.getFullYear();
   const month = `${date.getMonth() + 1}`.padStart(2, '0');
   const day = `${date.getDate()}`.padStart(2, '0');
   return `${year}-${month}-${day}`;
}

function getStreakIcon(streak: number, isDark: boolean) {
   const muted = isDark ? '#94a3b8' : '#64748b';
   if (streak >= 5) return { Icon: Flame, color: '#f97316' };
   if (streak >= 3) return { Icon: Zap, color: '#4f46e5' };
   if (streak >= 1) return { Icon: Sun, color: '#eab308' };
   return { Icon: CircleDashed, color: muted };
}
function formatDate(date: Date) {
   return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// --- Main Component ---

export default function EntriesScreen() {
   const store = useEntries();
   const insets = useSafeAreaInsets();
   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';
   const iconColor = isDark ? '#cbd5e1' : '#475569';
   const { lock: lockNavigation } = useNavigationLock();
   const [showHelpModal, setShowHelpModal] = useState(false);
   const [listHeaderHeight, setListHeaderHeight] = useState(0);
   const listRef = useAnimatedRef<SectionList<RowItem, EntrySection>>();

   const shadowSm = useMemo(
      () => getShadow({ isDark, preset: 'sm' }),
      [isDark]
   );
   const ctaShadow = useMemo(
      () =>
         getShadow({
            isDark,
            preset: 'button',
            androidElevation: 3,
            colorLight: '#000000',
         }),
      [isDark]
   );
   const fabShadow = useMemo(
      () => getShadow({ isDark, preset: 'button', colorLight: '#4f46e5' }),
      [isDark]
   );

   // --- Animation State (FAB) ---
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

   const scrollIndicatorStyle = useAnimatedStyle(() => {
      return {
         opacity: interpolate(
            scrollY.value,
            [0, 60], // Range: 0px to 60px of scroll
            [0.4, 0], // Opacity: starts at 0.4, fades to 0
            Extrapolation.CLAMP
         ),
         transform: [
            // Optional: Move it up slightly as it fades for a "floating away" feel
            {
               translateY: interpolate(
                  scrollY.value,
                  [0, 60],
                  [0, -10],
                  Extrapolation.CLAMP
               ),
            },
         ],
      };
   });

   // --- Menu & Swipe State ---
   const [openMenuEntryId, setOpenMenuEntryId] = useState<string | null>(null);
   const [, setOpenMenuBounds] = useState<MenuBounds | null>(null);
   const openSwipeableRef = useRef<{
      id: string;
      ref: SwipeableMethods;
   } | null>(null);
   const [undoSlots, setUndoSlots] = useState<Entry[]>([]);
   const undoTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
      new Map()
   );

   // --- Actions ---
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
         setUndoSlots((prev) => [
            ...prev.filter((e) => e.id !== entry.id),
            entry,
         ]);
         const timer = setTimeout(() => {
            setUndoSlots((prev) => prev.filter((e) => e.id !== entry.id));
            undoTimers.current.delete(entry.id);
         }, UNDO_TIMEOUT_MS);
         undoTimers.current.set(entry.id, timer);
         store.deleteEntry(entry.id).catch((e) => console.error(e));
      },
      [closeActiveSwipeable, closeMenu, store]
   );

   const handleUndo = useCallback(
      async (entry: Entry) => {
         setUndoSlots((prev) => prev.filter((e) => e.id !== entry.id));
         const timer = undoTimers.current.get(entry.id);
         if (timer) clearTimeout(timer);
         undoTimers.current.delete(entry.id);
         try {
            await store.restoreEntry(entry);
         } catch (e) {
            console.error(e);
         }
      },
      [store]
   );

   // --- Data Prep ---
   const rowsWithUndo = useMemo(
      () => buildRowsWithUndo(store.rows, undoSlots),
      [store.rows, undoSlots]
   );
   const sections = useMemo(() => buildSections(rowsWithUndo), [rowsWithUndo]);

   const handleHeaderLayout = useCallback((event: LayoutChangeEvent) => {
      const nextHeight = Math.round(event.nativeEvent.layout.height);
      setListHeaderHeight((prev) => (prev === nextHeight ? prev : nextHeight));
   }, []);

   const scrollToContent = useCallback(() => {
      if (sections.length === 0 || !listRef.current) return;
      if (listHeaderHeight > 0) {
         listRef.current
            .getScrollResponder()
            ?.scrollTo({ y: listHeaderHeight, animated: true });
         return;
      }
      listRef.current.scrollToLocation({
         sectionIndex: 0,
         itemIndex: 0,
         animated: true,
         viewOffset: insets.top + 40,
      });
   }, [insets.top, listHeaderHeight, listRef, sections.length]);

   // --- Global Dashboard Data (Current Week: Mon-Sun) ---
   const dashboardData = useMemo(() => {
      const allEntries = store.rows;

      const weekStart = getWeekStart(new Date());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const weekEntries = allEntries.filter((e) => {
         const created = safeParseDate(e.createdAt);
         if (!created) return false;
         return created >= weekStart && created <= weekEnd;
      });

      const weekWithDispute = weekEntries.filter(
         (e) => (e.dispute ?? '').trim().length > 0
      );

      const weeklyCount = weekWithDispute.length;

      if (weekEntries.length === 0)
         return { weeklyCount, weeklyScore: null, threePs: null };

      let optSum = 0;
      let optCount = 0;
      weekEntries.forEach((e) => {
         const score = getNumericScore(
            e.aiResponse?.meta?.optimismScore ??
               e.aiResponse?.meta?.sentimentScore
         );
         if (score !== null) {
            optSum += score;
            optCount++;
         }
      });
      const avgScore = optCount > 0 ? optSum / optCount : null;

      const threePsStats = {
         perm: { good: 0, total: 0 },
         perv: { good: 0, total: 0 },
         pers: { good: 0, total: 0 },
      };

      weekEntries.forEach((e) => {
         const dims = e.aiResponse?.analysis?.dimensions;
         if (dims) {
            if (dims.permanence) {
               threePsStats.perm.total++;
               if (isOptimistic(dims.permanence.score))
                  threePsStats.perm.good++;
            }
            if (dims.pervasiveness) {
               threePsStats.perv.total++;
               if (isOptimistic(dims.pervasiveness.score))
                  threePsStats.perv.good++;
            }
            if (dims.personalization) {
               threePsStats.pers.total++;
               if (isOptimistic(dims.personalization.score))
                  threePsStats.pers.good++;
            }
         }
      });

      const getScore = (stat: { good: number; total: number }) =>
         stat.total > 0 ? (stat.good / stat.total) * 100 : 50;

      return {
         weeklyCount,
         weeklyScore: avgScore,
         threePs: {
            permanence: { score: getScore(threePsStats.perm) },
            pervasiveness: { score: getScore(threePsStats.perv) },
            personalization: { score: getScore(threePsStats.pers) },
         },
      };
   }, [store.rows]);

   const hasEntries = store.rows.length > 0;
   const hasHydrated = store.lastHydratedAt !== null;
   const showQuickStart = hasHydrated && !store.isHydrating && !hasEntries;
   const prevHasEntries = useRef(hasEntries);

   useEffect(() => {
      if (!prevHasEntries.current && hasEntries) {
         requestAnimationFrame(() => {
            listRef.current
               ?.getScrollResponder()
               ?.scrollTo({ y: 0, animated: false });
         });
      }
      prevHasEntries.current = hasEntries;
   }, [hasEntries, listRef]);

   const streakData = useMemo(() => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const weekStart = getWeekStart(today);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const filledDays = new Set<string>();
      store.rows.forEach((entry) => {
         const dispute = (entry.dispute ?? '').trim();
         if (!dispute) return;
         const created = safeParseDate(entry.createdAt);
         if (!created) return;
         if (created < weekStart || created > weekEnd) return;
         filledDays.add(formatIsoDate(created));
      });

      const days = Array.from({ length: 7 }, (_, i) => {
         const date = new Date(weekStart);
         date.setDate(weekStart.getDate() + i);
         const key = formatIsoDate(date);
         return {
            date,
            label: DAY_LABELS[i],
            filled: filledDays.has(key),
         };
      });

      const todayKey = formatIsoDate(today);
      const todayIndex =
         days.findIndex((d) => formatIsoDate(d.date) === todayKey) ?? -1;
      const startIndex =
         todayIndex >= 0
            ? todayIndex
            : Math.max(
                 0,
                 Math.min(
                    6,
                    Math.floor(
                       (today.getTime() - weekStart.getTime()) /
                          (24 * 60 * 60 * 1000)
                    )
                 )
              );

      let streakCount = 0;
      for (let i = startIndex; i >= 0; i--) {
         if (days[i].filled) streakCount++;
         else break;
      }

      return { days, streakCount };
   }, [store.rows]);

   const thoughtLabel =
      dashboardData.weeklyCount === 1 ? 'Thought' : 'Thoughts';
   const streakIcon = getStreakIcon(streakData.streakCount, isDark);

   // Stable render functions to avoid extra renders as list scrolls
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
      [insets.top, isDark]
   );

   const renderItem = useCallback(
      ({ item }: { item: RowItem }) => {
         if (item.kind === 'undo')
            return (
               <UndoRow
                  entry={item.entry}
                  onUndo={() => handleUndo(item.entry)}
                  durationMs={UNDO_TIMEOUT_MS}
               />
            );
         return (
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
                     })
                  )
               }
               onDelete={() => requestDelete(item.entry)}
            />
         );
      },
      [
         closeActiveSwipeable,
         closeMenu,
         handleUndo,
         lockNavigation,
         onRowSwipeClose,
         onRowSwipeOpen,
         openMenuEntryId,
         requestDelete,
         toggleMenu,
      ]
   );

   return (
      <View
         className="flex-1 bg-slate-50 dark:bg-slate-900"
         onStartShouldSetResponderCapture={() => {
            if (openMenuEntryId) {
               closeMenu();
            }
            return false;
         }}
      >
         {/* FIXED: Using createAnimatedComponent version with explicit generics */}
         <AnimatedSectionList<RowItem, EntrySection>
            ref={listRef}
            sections={sections}
            keyExtractor={(item) => `${item.kind}-${item.entry.id}`}
            className="flex-1"
            stickySectionHeadersEnabled={true}
            showsVerticalScrollIndicator={false}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
            scrollIndicatorInsets={{ top: insets.top, bottom: insets.bottom }}
            ListHeaderComponent={
               hasEntries ? (
                  <View
                     style={{ paddingTop: insets.top + 12 }}
                     className="px-6 pb-6 bg-slate-50 dark:bg-slate-900"
                     onLayout={handleHeaderLayout}
                  >
                     {/* Header Top Bar */}
                     <View className="flex-row items-center justify-between mb-4">
                        <View>
                           <Text className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">
                              Weekly Progress
                           </Text>
                           <Text className="text-2xl font-extrabold text-slate-900 dark:text-white">
                              {dashboardData.weeklyCount} {thoughtLabel}{' '}
                              <Text className="text-indigo-600 font-extrabold">
                                 Reframed
                              </Text>
                           </Text>
                        </View>

                        {/* 👇 Right Side Icons Container */}
                        <View className="flex-row items-center gap-3">
                           {/* Help Button */}
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

                           {/* Settings Button */}
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

                     {/* GLOBAL DASHBOARD */}
                     {hasEntries && (
                        <GlobalDashboard
                           data={dashboardData}
                           shadowSm={shadowSm}
                           isDark={isDark}
                        />
                     )}

                     <View className="mt-4 mb-6">
                        <StreakCard
                           streakCount={streakData.streakCount}
                           days={streakData.days}
                           icon={streakIcon}
                           shadowSm={shadowSm}
                        />
                     </View>

                     {/* MAIN NEW ENTRY BUTTON */}
                     <View className="mt-3">

                           <Pressable
                              onPress={() => router.push('/new')}
                              className={`relative flex-row items-center justify-center rounded-2xl px-6 py-4 ${PRIMARY_CTA_CLASS}`}
                              style={[ctaShadow.ios, ctaShadow.android]} // ✅ iOS shadow on the actual button is fine
                           >
                              <Text
                                 className={`text-lg font-bold text-center ${PRIMARY_CTA_TEXT_CLASS}`}
                              >
                                 What&apos;s on your mind?
                              </Text>
                           </Pressable>

                     </View>

                     <Animated.View
                        className="items-center mt-4"
                        style={scrollIndicatorStyle}
                     >
                        <Pressable
                           onPress={scrollToContent}
                           hitSlop={20} // Makes it easier to tap
                        >
                           <ChevronDown size={24} color={iconColor} />
                        </Pressable>
                     </Animated.View>
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

         {/* FLOATING ACTION BUTTON (FAB) */}
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
               <Link href="/new" asChild>
                  <Pressable
                     className={`h-14 w-14 rounded-full items-center justify-center ${PRIMARY_CTA_CLASS}`}
                     style={[fabShadow.ios, fabShadow.android]}
                  >
                     <Plus
                        size={28}
                        color={PRIMARY_CTA_ICON_COLOR}
                        strokeWidth={2.5}
                     />
                  </Pressable>
               </Link>
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
