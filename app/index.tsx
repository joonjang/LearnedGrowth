import QuickStart from '@/components/appInfo/QuickStart';
import { MenuBounds } from '@/components/entries/entry/EntryCard';
import EntryRow, { UndoRow } from '@/components/entries/entry/EntryRow';
import { useEntries } from '@/hooks/useEntries';
import { useNavigationLock } from '@/hooks/useNavigationLock';
import { getTimeLabel } from '@/lib/date';
import { getShadow } from '@/lib/shadow';
import { Entry } from '@/models/entry';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, router } from 'expo-router';
import {
   Activity,
   HelpCircle,
   Layers,
   Scale,
   Settings,
   Sparkles,
   Wind,
   X,
} from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, { useMemo, useRef, useState } from 'react';
import {
   LayoutAnimation,
   Pressable,
   SectionList,
   Text,
   View,
} from 'react-native';
import { SwipeableMethods } from 'react-native-gesture-handler/lib/typescript/components/ReanimatedSwipeable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// --- Types ---

type RowItem = { kind: 'entry'; entry: Entry } | { kind: 'undo'; entry: Entry };

type CategorySegment = {
   category: string;
   count: number;
   percentage: number;
   colorHex: string;
};

type WeekSummary = {
   avgOptimism: number | null;
   entryCount: number;
   categorySegments: CategorySegment[];
};

type EntrySection = {
   title: string;
   weekKey: string;
   rangeLabel: string;
   data: RowItem[];
   summary: WeekSummary;
};

type ThreePScore = { score: number };

type DashboardData = {
   monthlyCount: number;
   last30DaysScore: number | null;
   threePs: {
      permanence: ThreePScore;
      pervasiveness: ThreePScore;
      personalization: ThreePScore;
   } | null;
};

// --- Config ---

const UNDO_TIMEOUT_MS = 5500;

const CATEGORY_COLOR_MAP: Record<string, string> = {
   Work: '#3b82f6', // Blue 500
   Education: '#8b5cf6', // Violet 500
   Relationships: '#e11d48', // Rose 600
   Health: '#10b981', // Emerald 500
   Finance: '#eab308', // Yellow 500
   'Self-Image': '#06b6d4', // Cyan 500
   'Daily Hassles': '#64748b', // Slate 500
   Other: '#9ca3af', // Gray 400
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

function isOptimistic(score: string | null): boolean {
   if (!score) return false;
   const s = score.toLowerCase();
   return (
      s.includes('optimis') ||
      s.includes('temporary') ||
      s.includes('specific') ||
      s.includes('external')
   );
}

// UPDATED SCORING LOGIC
function getMoodConfig(score: number | null, isDark: boolean) {
   if (score === null) {
      return {
         Icon: HelpCircle,
         label: 'No Data',
         description: 'Add entries to see your outlook.',
         color: isDark ? '#94a3b8' : '#64748b',
         bg: isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(100, 116, 139, 0.1)',
      };
   }
   // 7-10: Seeing Possibilities
   if (score >= 7.0) {
      return {
         Icon: Sparkles,
         label: 'Seeing Possibilities',
         description:
            'You are focusing on a way forward and seeing the scope of your potential.',
         color: isDark ? '#34d399' : '#059669', // Emerald
         bg: isDark ? 'rgba(52, 211, 153, 0.15)' : 'rgba(5, 150, 105, 0.1)',
      };
   }
   // 4-6: Grounded Reality
   if (score >= 4.0) {
      return {
         Icon: Scale,
         label: 'Grounded Reality',
         description:
            'You are seeing things as they are—a solid mix of good and bad.',
         color: isDark ? '#fbbf24' : '#d97706', // Amber
         bg: isDark ? 'rgba(251, 191, 36, 0.15)' : 'rgba(217, 119, 6, 0.1)',
      };
   }
   // 0-3: Turning Inward
   return {
      Icon: Wind,
      label: 'Turning Inward',
      description: 'You are in a protective, introspective state right now.',
      color: isDark ? '#a5b4fc' : '#6366f1', // Indigo/Slate
      bg: isDark ? 'rgba(165, 180, 252, 0.15)' : 'rgba(99, 102, 241, 0.1)',
   };
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

// --- Sub-Components ---

const SegmentedCategoryLine = React.memo(
   ({ segments }: { segments: CategorySegment[] }) => {
      if (!segments || segments.length === 0) return null;

      return (
         <View style={{ marginTop: 8 }}>
            <View
               style={{
                  flexDirection: 'row',
                  height: 10,
                  width: '100%',
                  borderRadius: 999,
                  overflow: 'hidden',
                  backgroundColor: '#f1f5f9',
               }}
            >
               {segments.map((seg) => (
                  <View
                     key={seg.category}
                     style={{
                        height: '100%',
                        width: `${seg.percentage}%`,
                        marginRight: 1,
                        backgroundColor: seg.colorHex,
                     }}
                  />
               ))}
            </View>
            <View
               style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  marginTop: 8,
                  gap: 12,
               }}
            >
               {segments.slice(0, 3).map((seg) => (
                  <View
                     key={seg.category}
                     style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                     }}
                  >
                     <View
                        style={{
                           width: 8,
                           height: 8,
                           borderRadius: 999,
                           backgroundColor: seg.colorHex,
                        }}
                     />
                     <Text
                        style={{
                           fontSize: 10,
                           fontWeight: '500',
                           color: '#64748b',
                        }}
                     >
                        {seg.category}{' '}
                        <Text style={{ opacity: 0.6 }}>
                           ({Math.round(seg.percentage)}%)
                        </Text>
                     </Text>
                  </View>
               ))}
            </View>
         </View>
      );
   }
);
SegmentedCategoryLine.displayName = 'SegmentedCategoryLine';

const GradientSpectrumBar = React.memo(
   ({
      label,
      subLabel,
      leftLabel,
      rightLabel,
      optimisticPercentage,
      isDark,
   }: {
      label?: string;
      subLabel?: string;
      leftLabel: string;
      rightLabel: string;
      optimisticPercentage: number;
      isDark: boolean;
   }) => {
      const position = Math.max(0, Math.min(100, 100 - optimisticPercentage));

      const green = isDark ? '#059669' : '#34d399';
      const mid = isDark ? '#475569' : '#cbd5e1';
      const red = isDark ? '#be123c' : '#f43f5e';

      const textColor = isDark ? '#e2e8f0' : '#334155';
      const trackBg = isDark ? '#1e293b' : '#f1f5f9';
      const markerColor = isDark ? '#ffffff' : '#0f172a';

      return (
         <View>
            {label && (
               <View className="flex-row items-baseline gap-2 mb-1">
                  <Text
                     style={{
                        fontSize: 13,
                        fontWeight: '600',
                        color: textColor,
                     }}
                  >
                     {label}
                  </Text>
                  <Text className="text-xs text-slate-400 dark:text-slate-500">
                     {subLabel}
                  </Text>
               </View>
            )}

            <View
               style={{
                  height: 10,
                  width: '100%',
                  borderRadius: 999,
                  overflow: 'hidden',
                  backgroundColor: trackBg,
                  position: 'relative',
               }}
            >
               <LinearGradient
                  colors={[green, mid, red]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={{ flex: 1, opacity: 0.3 }}
               />

               <View
                  style={{
                     position: 'absolute',
                     top: 0,
                     bottom: 0,
                     width: 4,
                     backgroundColor: markerColor,
                     left: `${position}%`,
                     transform: [{ translateX: -2 }],
                     shadowColor: '#000',
                     shadowOpacity: 0.2,
                     shadowRadius: 2,
                     elevation: 2,
                  }}
               />
            </View>

            <View
               style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  marginTop: 4,
               }}
            >
               <Text
                  style={{
                     fontSize: 9,
                     fontWeight: '600',
                     color: isDark ? '#34d399' : '#059669',
                  }}
               >
                  {leftLabel}
               </Text>
               <Text
                  style={{
                     fontSize: 9,
                     fontWeight: '600',
                     color: isDark ? '#f43f5e' : '#e11d48',
                  }}
               >
                  {rightLabel}
               </Text>
            </View>
         </View>
      );
   }
);
GradientSpectrumBar.displayName = 'GradientSpectrumBar';

const GlobalDashboard = React.memo(
   ({
      data,
      shadowSm,
      isDark,
   }: {
      data: DashboardData;
      shadowSm: any;
      isDark: boolean;
   }) => {
      const [showHelp, setShowHelp] = useState(false);

      if (data.last30DaysScore === null) {
         return (
            <View className="py-8 items-center justify-center">
               <Text className="text-slate-400 text-sm text-center">
                  Add your first entry to unlock insights.
               </Text>
            </View>
         );
      }

      const mood = getMoodConfig(data.last30DaysScore, isDark);

      const toggleHelp = () => {
         LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
         setShowHelp(!showHelp);
      };

      return (
         <View className="gap-4">
            {/* 1. MONTHLY OUTLOOK (No Legend) */}
            <View
               className={`p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 ${shadowSm.className}`}
               style={[shadowSm.ios, shadowSm.android]}
            >
               <View className="flex-row items-center gap-2 mb-4">
                  <Activity size={16} color={isDark ? '#cbd5e1' : '#64748b'} />
                  <Text className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                     30-Day Outlook
                  </Text>
               </View>

               <View className="flex-row items-start gap-4">
                  <View
                     className="h-14 w-14 rounded-full items-center justify-center"
                     style={{ backgroundColor: mood.bg }}
                  >
                     <mood.Icon size={32} color={mood.color} />
                  </View>

                  <View className="flex-1 pt-1">
                     <Text
                        className="text-xl font-bold mb-1"
                        style={{ color: mood.color }}
                     >
                        {mood.label}
                     </Text>
                     <Text className="text-sm text-slate-600 dark:text-slate-300 leading-5">
                        {mood.description}
                     </Text>
                  </View>
               </View>
            </View>

            {/* 2. THE 3 P's TREND (Restored to User Request) */}
            {data.threePs && (
               <View
                  className={`p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 ${shadowSm.className}`}
                  style={[shadowSm.ios, shadowSm.android]}
               >
                  <View className="flex-row items-center justify-between mb-4">
                     <View className="flex-row items-center gap-2">
                        <Layers
                           size={16}
                           color={isDark ? '#cbd5e1' : '#64748b'}
                        />
                        <Text className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                           Thinking Patterns (The 3 P&apos;s)
                        </Text>
                     </View>

                     <Pressable
                        onPress={toggleHelp}
                        hitSlop={10}
                        className="active:opacity-60"
                     >
                        {showHelp ? (
                           <X
                              size={18}
                              color={isDark ? '#94a3b8' : '#64748b'}
                           />
                        ) : (
                           <HelpCircle
                              size={18}
                              color={isDark ? '#94a3b8' : '#64748b'}
                           />
                        )}
                     </Pressable>
                  </View>

                  {showHelp && (
                     <View className="mb-6 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700 gap-3">
                        <View>
                           <Text className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-0.5">
                              Time (Permanence)
                           </Text>
                           <Text className="text-[11px] text-slate-500 dark:text-slate-400">
                              Do you see problems as temporary setbacks or
                              forever flaws?
                           </Text>
                        </View>
                        <View>
                           <Text className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-0.5">
                              Scope (Pervasiveness)
                           </Text>
                           <Text className="text-[11px] text-slate-500 dark:text-slate-400">
                              Do problems ruin everything or just one specific
                              area?
                           </Text>
                        </View>
                        <View>
                           <Text className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-0.5">
                              Blame (Personalization)
                           </Text>
                           <Text className="text-[11px] text-slate-500 dark:text-slate-400">
                              Do you blame yourself entirely or consider the
                              situation?
                           </Text>
                        </View>
                     </View>
                  )}

                  <View className="gap-6">
                     <GradientSpectrumBar
                        label="Time"
                        subLabel="(Permanence)"
                        leftLabel="Temporary"
                        rightLabel="Permanent"
                        optimisticPercentage={data.threePs.permanence.score}
                        isDark={isDark}
                     />
                     <GradientSpectrumBar
                        label="Scope"
                        subLabel="(Pervasiveness)"
                        leftLabel="Specific"
                        rightLabel="Pervasive"
                        optimisticPercentage={data.threePs.pervasiveness.score}
                        isDark={isDark}
                     />
                     <GradientSpectrumBar
                        label="Blame"
                        subLabel="(Personalization)"
                        leftLabel="External"
                        rightLabel="Internal"
                        optimisticPercentage={
                           data.threePs.personalization.score
                        }
                        isDark={isDark}
                     />
                  </View>
               </View>
            )}
         </View>
      );
   }
);
GlobalDashboard.displayName = 'GlobalDashboard';

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

   // --- Global Dashboard Data (Last 30 Days) ---
   const dashboardData = useMemo(() => {
      const allEntries = store.rows;

      // 1. Calculate Monthly Count
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthlyCount = allEntries.filter(
         (e) => new Date(e.createdAt) >= startOfMonth
      ).length;

      // 2. Last 30 Days Logic
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      cutoff.setHours(0, 0, 0, 0);

      const recentEntries = allEntries.filter(
         (e) => new Date(e.createdAt) >= cutoff
      );

      if (recentEntries.length === 0)
         return { monthlyCount, last30DaysScore: null, threePs: null };

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
         monthlyCount,
         last30DaysScore: avgScore,
         threePs: {
            permanence: { score: getScore(threePsStats.perm) },
            pervasiveness: { score: getScore(threePsStats.perv) },
            personalization: { score: getScore(threePsStats.pers) },
         },
      };
   }, [store.rows]);

   return (
      <View className="flex-1 bg-slate-50 dark:bg-slate-900">
         <SectionList
            sections={sections}
            keyExtractor={(item) => `${item.kind}-${item.entry.id}`}
            className="flex-1"
            stickySectionHeadersEnabled={true}
            contentContainerStyle={{
               paddingBottom: insets.bottom + 20 
            }}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
               <View
                  style={{ paddingTop: insets.top + 12 }}
                  className="px-6 pb-6 bg-slate-50 dark:bg-slate-900"
               >
                  {/* Header Top Bar - DYNAMIC TEXT */}
                  <View className="flex-row items-center justify-between mb-4">
                     <View>
                        <Text className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">
                           Weekly Progress
                        </Text>
                        <Text className="text-2xl font-bold text-slate-900 dark:text-white">
                           {dashboardData.monthlyCount} Thoughts{' '}
                           <Text className="text-amber-500">Untangled</Text>
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

                  {/* New Entry Button */}
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
            renderSectionHeader={({ section }) => {
               const mood = getMoodConfig(section.summary.avgOptimism, isDark);

               return (
                  <View
                     pointerEvents="box-none"
                     className="w-full bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 pb-3"
                     style={{ paddingTop: insets.top }}
                  >
                     <View className="flex-row items-baseline justify-between w-full px-4 pt-3 pb-2">
                        <View className="flex-1 pr-2">
                           <Text className="text-base font-bold text-slate-900 dark:text-white">
                              {section.title}
                           </Text>
                           <Text className="text-xs text-slate-500 dark:text-slate-400">
                              {section.rangeLabel}
                           </Text>
                        </View>

                        {/* WEEKLY OUTLOOK LABEL (CLEAN, NO COLORS) */}
                        {section.summary.avgOptimism !== null && (
                           <View className="items-end">
                              <View className="flex-row items-center gap-1.5">
                                 <mood.Icon
                                    size={14}
                                    color={isDark ? '#94a3b8' : '#64748b'}
                                 />
                                 <Text className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                    {mood.label}
                                 </Text>
                              </View>
                           </View>
                        )}
                     </View>

                     {/* WEEKLY CATEGORY LINE */}
                     <View className="px-4">
                        <SegmentedCategoryLine
                           segments={section.summary.categorySegments}
                        />
                     </View>
                  </View>
               );
            }}
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
      </View>
   );
}
