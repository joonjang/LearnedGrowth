import QuickStart from '@/components/appInfo/QuickStart';
import { type MenuBounds } from '@/components/entries/entry/EntryCard';
import EntryRow, { UndoRow } from '@/components/entries/entry/EntryRow';
import { useEntries } from '@/hooks/useEntries';
import { useNavigationLock } from '@/hooks/useNavigationLock';
import { formatDate, getTimeLabel } from '@/lib/date';
import { getShadow } from '@/lib/shadow';
import { Entry } from '@/models/entry';
import { Link, router } from 'expo-router';
import { Settings } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, SectionList, Text, View } from 'react-native';
import { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type RowItem = { kind: 'entry'; entry: Entry } | { kind: 'undo'; entry: Entry };

type EntrySection = {
   title: string;
   weekKey: string;
   rangeLabel: string;
   data: RowItem[];
   entryCount: number;
};

const UNDO_TIMEOUT_MS = 5500;

export default function EntriesScreen() {
   const store = useEntries();
   const insets = useSafeAreaInsets();
   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';
   const iconColor = isDark ? '#cbd5e1' : '#475569';
   const { lock: lockNavigation } = useNavigationLock();
   const stickyInsetRef = useRef(false);
   const [stickyInset, setStickyInset] = useState(false);
   const headerHeightRef = useRef(0);
   
   const shadowSm = useMemo(
      () => getShadow({ isDark, preset: 'sm' }),
      [isDark]
   );

   // --- Menu & Swipe State ---
   const [openMenuEntryId, setOpenMenuEntryId] = useState<string | null>(null);
   const [, setOpenMenuBounds] = useState<MenuBounds | null>(null);
   const openSwipeableRef = useRef<{ id: string; ref: SwipeableMethods } | null>(null);

   // --- Undo State ---
   const [undoSlots, setUndoSlots] = useState<Entry[]>([]);
   const undoTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

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
         const closedId = openSwipeableRef.current.id;
         openSwipeableRef.current = null;
         return closedId;
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
      setOpenMenuEntryId((current) => {
         const next = current === entryId ? null : entryId;
         if (next !== current) setOpenMenuBounds(null);
         return next;
      });
   };

   const clearUndoTimer = (id: string) => {
      const timer = undoTimers.current.get(id);
      if (timer) {
         clearTimeout(timer);
         undoTimers.current.delete(id);
      }
   };

   const requestDelete = (entry: Entry) => {
      closeMenu();
      closeActiveSwipeable();
      setUndoSlots((prev) => [...prev.filter((e) => e.id !== entry.id), entry]);
      clearUndoTimer(entry.id);

      const timer = setTimeout(() => {
         setUndoSlots((prev) => prev.filter((e) => e.id !== entry.id));
         undoTimers.current.delete(entry.id);
      }, UNDO_TIMEOUT_MS);

      undoTimers.current.set(entry.id, timer);

      store.deleteEntry(entry.id).catch((e) => {
         clearUndoTimer(entry.id);
         setUndoSlots((prev) => prev.filter((s) => s.id !== entry.id));
         console.error('Failed to delete entry', e);
      });
   };

   const handleUndo = async (entry: Entry) => {
      setUndoSlots((prev) => prev.filter((e) => e.id !== entry.id));
      clearUndoTimer(entry.id);
      try {
         await store.restoreEntry(entry);
      } catch (e) {
         console.error('Failed to undo delete', e);
      }
   };

   // --- Data Prep ---
   const rowsWithUndo = useMemo(
      () => buildRowsWithUndo(store.rows, undoSlots),
      [store.rows, undoSlots]
   );
   const sections = useMemo(
      () => buildSections(rowsWithUndo),
      [rowsWithUndo]
   );

   useEffect(() => {
      const timers = undoTimers.current;
      return () => {
         timers.forEach((timer) => clearTimeout(timer));
         timers.clear();
      };
   }, []);

   return (
      <View className="flex-1 bg-slate-50 dark:bg-slate-900">
         <SectionList
            sections={sections}
            keyExtractor={(item) => `${item.kind}-${item.entry.id}`}
            className="flex-1"
            stickySectionHeadersEnabled={true}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
               sections.length > 0 ? (
                  <View
                     onLayout={(e) => {
                        headerHeightRef.current = e.nativeEvent.layout.height;
                     }}
                  >
                     <InfoHeader
                        sections={sections}
                        insetsTop={insets.top}
                        shadow={shadowSm}
                        iconColor={iconColor}
                     />
                  </View>
               ) : null
            }
            
            // Show onboarding when there are no entries
            ListEmptyComponent={store.isHydrating ? null : <QuickStart />}
         
         onScrollBeginDrag={() => {
            closeMenu();
            closeActiveSwipeable();
         }}
         onScroll={(e) => {
            const y = e.nativeEvent.contentOffset.y;
            const threshold = Math.max(0, headerHeightRef.current - 1);
            const next = y >= threshold;
            if (next !== stickyInsetRef.current) {
               stickyInsetRef.current = next;
               setStickyInset(next);
            }
         }}
         scrollEventThrottle={16}
         
         renderSectionHeader={({ section }) => (
            <View 
               pointerEvents="box-none"
               className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800"
               style={{
                  paddingTop: stickyInset ? insets.top + 8 : 0,
                  paddingHorizontal: 0,
               }}
            >
                  <View
                     className="flex-row items-baseline justify-between w-full bg-white dark:bg-slate-900 px-4 py-3 "
                  >
                     <View className="flex-1 pr-3">
                        <Text className="text-base font-bold text-slate-900 dark:text-white">
                           {section.title}
                        </Text>
                        <Text className="text-xs text-slate-500 dark:text-slate-400">
                           {section.rangeLabel}
                        </Text>
                     </View>
                     <View className="flex-row items-center gap-2">
                        <Text className="text-xs font-semibold uppercase tracking-tight text-slate-500 dark:text-slate-400">
                           Entries
                        </Text>
                        <Text className="text-lg font-bold text-slate-900 dark:text-white">
                           {section.entryCount}
                        </Text>
                     </View>
                  </View>
               </View>
            )}
            
            renderItem={({ item }) => {
               const timeLabel = getTimeLabel(item.entry);

               if (item.kind === 'undo') {
                  return (
                     <UndoRow
                        entry={item.entry}
                        timeLabel={timeLabel}
                        onUndo={() => handleUndo(item.entry)}
                        durationMs={UNDO_TIMEOUT_MS}
                     />
                  );
               }

               return (
                  <EntryRow
                     entry={item.entry}
                     timeLabel={timeLabel}
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

         {/* --- PERMANENT OVERLAYS (Buttons) --- */}
         
         {/* New Entry FAB: Bottom Right, Fixed */}
         {sections.length !== 0 && (
            <View 
               className="absolute bottom-0 right-0 left-0 items-end px-6" 
               pointerEvents="box-none"
            >
               <View className="mb-6">
                  <Link href={'/new'} asChild>
                     <Pressable
                        className={`h-14 w-14 items-center justify-center rounded-full bg-amber-500 active:opacity-90 ${shadowSm.className}`}
                        style={[shadowSm.ios, shadowSm.android]}
                        accessibilityLabel="Create new entry"
                        testID="new-entry-button"
                     >
                        <Text className="text-center text-[30px] font-medium leading-[30px] text-white">
                           +
                        </Text>
                     </Pressable>
                  </Link>
               </View>
            </View>
         )}
      </View>
   );
}

function InfoHeader({
   sections,
   insetsTop,
   shadow,
   iconColor,
}: {
   sections: EntrySection[];
   insetsTop: number;
   shadow: ReturnType<typeof getShadow>;
   iconColor: string;
}) {
   const totalEntries = sections.reduce((sum, section) => sum + section.entryCount, 0);
   const currentWeek = sections[0];

   return (
      <View className="px-6 pb-6" style={{ paddingTop: insetsTop + 12 }}>
         <View className="flex-row items-center justify-between">
            <Text className="text-xs font-semibold uppercase tracking-tight text-slate-500 dark:text-slate-400">
               Information
            </Text>
            <Link href="/settings" asChild>
               <Pressable
                  className="h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 active:opacity-80"
                  accessibilityLabel="Open settings"
                  hitSlop={8}
               >
                  <Settings size={20} color={iconColor} strokeWidth={2.5} />
               </Pressable>
            </Link>
         </View>

         <View
            className={`mt-3 rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 ${shadow.className}`}
            style={[shadow.ios, shadow.android]}
         >
            <View className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
               <Text className="text-base font-bold text-slate-900 dark:text-white">
                  Weekly overview
               </Text>
               <Text className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Entries are grouped by week so you can see your recent streaks.
               </Text>
            </View>

            <View className="flex-row items-center justify-between px-4 py-3">
               <View>
                  <Text className="text-xs font-semibold uppercase tracking-tight text-slate-500 dark:text-slate-400">
                     Current week
                  </Text>
                  <Text className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                     {currentWeek?.title ?? 'No entries yet'}
                  </Text>
                  <Text className="text-xs text-slate-500 dark:text-slate-400">
                     {currentWeek?.rangeLabel ?? ''}
                  </Text>
               </View>

               <View className="items-end">
                  <Text className="text-xs font-semibold uppercase tracking-tight text-slate-500 dark:text-slate-400">
                     Entries
                  </Text>
                  <Text className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                     {currentWeek?.entryCount ?? 0}
                  </Text>
               </View>
            </View>

               <View className="flex-row items-center justify-between px-4 pb-4 pt-1">
                  <Text className="text-sm font-medium text-slate-600 dark:text-slate-300">
                     Total entries
                  </Text>
                  <Text className="text-base font-semibold text-slate-900 dark:text-white">
                     {totalEntries}
                  </Text>
               </View>
            </View>
         </View>
      );
   }

// --- Helper Functions ---
function buildRowsWithUndo(rows: Entry[], undoSlots: Entry[]): RowItem[] {
   const merged: RowItem[] = rows.map((entry) => ({ kind: 'entry', entry }));
   for (const entry of undoSlots) {
      if (!rows.find((r) => r.id === entry.id)) {
         merged.push({ kind: 'undo', entry });
      }
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
   for (const entry of rows) {
      const { key, label, rangeLabel } = getWeekInfo(entry.entry.createdAt, now);
      const lastSection = sections[sections.length - 1];

      if (!lastSection || lastSection.weekKey !== key) {
         sections.push({
            title: label,
            weekKey: key,
            rangeLabel,
            data: [entry],
            entryCount: entry.kind === 'entry' ? 1 : 0,
         });
      } else {
         lastSection.data.push(entry);
         if (entry.kind === 'entry') {
            lastSection.entryCount += 1;
         }
      }
   }
   return sections;
}

function getWeekInfo(createdAt: string, now: Date) {
   const date = safeParseDate(createdAt) ?? now;
   const start = getWeekStart(date);
   const end = new Date(start);
   end.setDate(start.getDate() + 6);

   const currentStart = getWeekStart(now);
   const lastStart = getWeekStart(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7));

   const key = `${formatIsoDate(start)}_${formatIsoDate(end)}`;
   const weekMs = 7 * 24 * 60 * 60 * 1000;
   const diffWeeks = Math.round((currentStart.getTime() - start.getTime()) / weekMs);

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
   const diffToMonday = (start.getDay() + 6) % 7; // Monday as the first day
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
