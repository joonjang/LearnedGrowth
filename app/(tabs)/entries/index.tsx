import { type MenuBounds } from '@/components/entries/entry/EntryCard';
import EntryRow, { UndoRow } from '@/components/entries/entry/EntryRow';
import { useEntries } from '@/hooks/useEntries';
import { getDateParts, getTimeLabel } from '@/lib/date';
import { getIosShadowStyle } from '@/lib/shadow';
import { Entry } from '@/models/entry';
import { Link, router } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
   Pressable,
   SectionList,
   Text,
   View
} from 'react-native';
import { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import {
   SafeAreaView,
   useSafeAreaInsets,
} from 'react-native-safe-area-context';

type RowItem = { kind: 'entry'; entry: Entry } | { kind: 'undo'; entry: Entry };

type EntrySection = {
   title: string;
   dateKey: string;
   data: RowItem[];
};

const UNDO_TIMEOUT_MS = 5500;

export default function EntriesScreen() {
   const store = useEntries();
   const insets = useSafeAreaInsets();
   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';
   const iosShadowSm = useMemo(
      () => getIosShadowStyle({ isDark, preset: 'sm' }),
      [isDark]
   );

   // --- Menu State ---
   const [openMenuEntryId, setOpenMenuEntryId] = useState<string | null>(null);
   const [openMenuBounds, setOpenMenuBounds] = useState<MenuBounds | null>(
      null
   );

   // --- Swipe State (New) ---
   // We use a ref to track the currently open swipe row so we can close it imperatively
   const openSwipeableRef = useRef<SwipeableMethods | null>(null);

   // --- Undo State ---
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

   // Helper: Closes the active swipe row (if any)
   // Returns true if something was closed, false otherwise
   const closeActiveSwipeable = () => {
      if (openSwipeableRef.current) {
         openSwipeableRef.current.close();
         openSwipeableRef.current = null;
         return true;
      }
      return false;
   };

   // Callback: Passed to EntryRow to track when it opens
   const onRowSwipeOpen = (ref: SwipeableMethods) => {
      // If a different row is already open, close it
      if (openSwipeableRef.current && openSwipeableRef.current !== ref) {
         openSwipeableRef.current.close();
      }
      openSwipeableRef.current = ref;
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
      closeActiveSwipeable(); // Close swipe if open
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
   const rowsWithUndo = buildRowsWithUndo(store.rows, undoSlots);
   const sections = buildSections(rowsWithUndo);

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
            contentContainerStyle={{
               paddingBottom: 128,
            }}
            stickySectionHeadersEnabled
            showsVerticalScrollIndicator={false}

            // FIX: This triggers when you start scrolling/dragging the list
            onScrollBeginDrag={() => {
               closeMenu();
               closeActiveSwipeable(); 
            }}
            
            renderSectionHeader={({ section }) => (
               <View 
                  className="items-center pb-2 "
                  style={{ paddingTop: insets.top }}
               >
                  <View
                     className="items-center self-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 shadow-sm"
                     style={iosShadowSm}
                  >
                     <Text className="text-center text-sm font-bold text-slate-600 dark:text-slate-300">
                        {section.title}
                     </Text>
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
                     
                     // Pass the handlers down
                     onSwipeOpen={onRowSwipeOpen}
                     closeActiveSwipeable={closeActiveSwipeable}
                     
                     onEdit={() =>
                        router.push({
                           pathname: '/(tabs)/entries/[id]',
                           params: { id: item.entry.id },
                        })
                     }
                     onDelete={() => requestDelete(item.entry)}
                  />
               );
            }}
         />

         <SafeAreaView
            edges={['bottom']}
            className="absolute bottom-0 right-0 left-0 items-end px-6 pointer-events-box-none"
         >
            <View className="mb-4">
               <Link href={'/new'} asChild>
                  <Pressable
                     className="h-14 w-14 items-center justify-center rounded-full bg-amber-500 shadow-sm active:opacity-90"
                     style={iosShadowSm}
                     accessibilityLabel="Create new entry"
                  >
                     <Text className="text-center text-[28px] font-bold leading-[30px] text-white">
                        +
                     </Text>
                  </Pressable>
               </Link>
            </View>
         </SafeAreaView>
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
   for (const entry of rows) {
      const { dateKey, dateLabel } = getDateParts(entry.entry);
      const lastSection = sections[sections.length - 1];

      if (!lastSection || lastSection.dateKey !== dateKey) {
         sections.push({
            title: dateLabel,
            dateKey,
            data: [entry],
         });
      } else {
         lastSection.data.push(entry);
      }
   }
   return sections;
}
