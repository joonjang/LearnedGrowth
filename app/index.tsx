import QuickStart from '@/components/appInfo/QuickStart';
import { MenuBounds } from '@/components/entries/entry/EntryCard';
import EntryRow, { UndoRow } from '@/components/entries/entry/EntryRow';
import { useEntries } from '@/hooks/useEntries';
import { useNavigationLock } from '@/hooks/useNavigationLock';
import { getTimeLabel } from '@/lib/date';
import { getShadow } from '@/lib/shadow';
import { Entry } from '@/models/entry';
import GlobalDashboard from '@/components/entries/home/GlobalDashboard';
import SectionHeader from '@/components/entries/home/SectionHeader';
import { CategorySegment, WeekSummary } from '@/components/entries/home/types';
import { isOptimistic } from '@/components/entries/home/utils';
import { Link, router } from 'expo-router';
import {
   Plus,
   Settings,
} from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, { useMemo, useRef, useState } from 'react';
import { Pressable, SectionList, Text, View } from 'react-native';
import { SwipeableMethods } from 'react-native-gesture-handler/lib/typescript/components/ReanimatedSwipeable';
import Animated, {
   useAnimatedScrollHandler,
   useAnimatedStyle,
   useSharedValue,
   withSpring,
   withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// --- FIXED: Create Animated Component ---
const AnimatedSectionList = Animated.createAnimatedComponent(SectionList) as typeof SectionList;

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

const CATEGORY_COLOR_MAP: Record<string, string> = {
   Work: '#3b82f6',
   Education: '#8b5cf6',
   Relationships: '#e11d48',
   Health: '#10b981',
   Finance: '#eab308',
   'Self-Image': '#06b6d4',
   'Daily Hassles': '#64748b',
   Other: '#9ca3af',
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
   const counts: Record<string, number> = {};
   let total = 0;
   entries.forEach((e) => {
      const cat = e.aiResponse?.meta?.category;
      if (cat) {
         counts[cat] = (counts[cat] || 0) + 1;
         total++;
      }
   });
   if (total === 0) return [];

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

   const shadowSm = useMemo(
      () => getShadow({ isDark, preset: 'sm' }),
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
   const closeMenu = () => {
      if (openMenuEntryId !== null) {
         setOpenMenuEntryId(null);
         setOpenMenuBounds(null);
      }
   };

   const closeActiveSwipeable = () => {
      if (openSwipeableRef.current) {
         openSwipeableRef.current.ref.close();
         const id = openSwipeableRef.current.id;
         openSwipeableRef.current = null;
         return id;
      }
      return null;
   };

   const onRowSwipeOpen = (id: string, ref: SwipeableMethods) => {
      if (openSwipeableRef.current && openSwipeableRef.current.ref !== ref) {
         openSwipeableRef.current.ref.close();
      }
      openSwipeableRef.current = { id, ref };
   };
   const onRowSwipeClose = (id: string) => {
      if (openSwipeableRef.current?.id === id) {
         openSwipeableRef.current = null;
      }
   };
   const toggleMenu = (entryId: string) => {
      setOpenMenuEntryId((c) => {
         const n = c === entryId ? null : entryId;
         if (n !== c) setOpenMenuBounds(null);
         return n;
      });
   };

   const requestDelete = (entry: Entry) => {
      closeMenu();
      closeActiveSwipeable();
      setUndoSlots((prev) => [...prev.filter((e) => e.id !== entry.id), entry]);
      const timer = setTimeout(() => {
         setUndoSlots((prev) => prev.filter((e) => e.id !== entry.id));
         undoTimers.current.delete(entry.id);
      }, UNDO_TIMEOUT_MS);
      undoTimers.current.set(entry.id, timer);
      store.deleteEntry(entry.id).catch((e) => console.error(e));
   };

   const handleUndo = async (entry: Entry) => {
      setUndoSlots((prev) => prev.filter((e) => e.id !== entry.id));
      const timer = undoTimers.current.get(entry.id);
      if (timer) clearTimeout(timer);
      undoTimers.current.delete(entry.id);
      try {
         await store.restoreEntry(entry);
      } catch (e) {
         console.error(e);
      }
   };

   // --- Data Prep ---
   const rowsWithUndo = useMemo(
      () => buildRowsWithUndo(store.rows, undoSlots),
      [store.rows, undoSlots]
   );
   const sections = useMemo(() => buildSections(rowsWithUndo), [rowsWithUndo]);

   // --- Global Dashboard Data (Last 7 Days) ---
   const dashboardData = useMemo(() => {
      const allEntries = store.rows;

      // FIXED: Removed unused 'now' variable
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);
      cutoff.setHours(0, 0, 0, 0);

      const recentEntries = allEntries.filter(
         (e) => new Date(e.createdAt) >= cutoff
      );

      const weeklyCount = recentEntries.length;

      if (recentEntries.length === 0)
         return { weeklyCount, last7DaysScore: null, threePs: null };

      let optSum = 0;
      let optCount = 0;
      recentEntries.forEach((e) => {
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

      recentEntries.forEach((e) => {
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
         last7DaysScore: avgScore,
         threePs: {
            permanence: { score: getScore(threePsStats.perm) },
            pervasiveness: { score: getScore(threePsStats.perv) },
            personalization: { score: getScore(threePsStats.pers) },
         },
      };
   }, [store.rows]);

   return (
      <View className="flex-1 bg-slate-50 dark:bg-slate-900">
         {/* FIXED: Using createAnimatedComponent version with Explicit Generics */}
         <AnimatedSectionList
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
               <View
                  style={{ paddingTop: insets.top + 12 }}
                  className="px-6 pb-6 bg-slate-50 dark:bg-slate-900"
               >
                  {/* Header Top Bar */}
                  <View className="flex-row items-center justify-between mb-4">
                     <View>
                        <Text className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">
                           Weekly Progress
                        </Text>
                        <Text className="text-2xl font-extrabold text-slate-900 dark:text-white">
                           {dashboardData.weeklyCount} Thoughts{' '}
                           <Text className="text-indigo-600 font-extrabold">Untangled</Text>
                        </Text>
                     </View>
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

                  {/* GLOBAL DASHBOARD */}
                  <GlobalDashboard
                     data={dashboardData}
                     shadowSm={shadowSm}
                     isDark={isDark}
                  />

                  {/* MAIN NEW ENTRY BUTTON */}
                  <View
                     className={`mt-12 ${shadowSm.className}`}
                     style={[shadowSm.ios, shadowSm.android]}
                  >
                     <Link href={'/new'} asChild>
                        <Pressable
                           className={`relative flex-row items-center justify-center overflow-hidden rounded-2xl bg-indigo-600 px-6 py-4 active:bg-indigo-700 ${shadowSm.className}`}
                           style={[shadowSm.ios, shadowSm.android]}
                        >
                           <Text className="text-lg font-bold text-center text-white">
                              Untangle a thought
                           </Text>
                        </Pressable>
                     </Link>
                  </View>
               </View>
            }
            ListEmptyComponent={store.isHydrating ? null : <QuickStart />}
            onScrollBeginDrag={() => {
               closeMenu();
               closeActiveSwipeable();
            }}
            renderSectionHeader={({ section }) => (
               <SectionHeader
                  title={section.title}
                  rangeLabel={section.rangeLabel}
                  summary={section.summary}
                  isDark={isDark}
                  paddingTop={insets.top}
               />
            )}
            renderItem={({ item }) => {
               if (item.kind === 'undo')
                  return (
                     <UndoRow
                        entry={item.entry}
                        timeLabel={getTimeLabel(item.entry)}
                        onUndo={() => handleUndo(item.entry)}
                        durationMs={UNDO_TIMEOUT_MS}
                     />
                  );
               return (
                  <EntryRow
                     entry={item.entry}
                     timeLabel={getTimeLabel(item.entry)}
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
            }}
         />

         {/* FLOATING ACTION BUTTON (FAB) */}
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
                  className="h-14 w-14 bg-indigo-600 rounded-full items-center justify-center shadow-xl active:bg-indigo-700"
                  style={{
                     shadowColor: '#4f46e5',
                     shadowOpacity: 0.4,
                     shadowRadius: 4,
                     shadowOffset: { width: 0, height: 4 },
                     elevation: 8,
                  }}
               >
                  <Plus size={28} color="white" strokeWidth={2.5} />
               </Pressable>
            </Link>
         </Animated.View>
      </View>
   );
}
