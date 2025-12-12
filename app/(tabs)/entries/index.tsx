import { type MenuBounds } from '@/components/entries/entry/EntryCard';
import EntryRow, { UndoRow } from '@/components/entries/entry/EntryRow';
import { useEntries } from '@/hooks/useEntries';
import { getDateParts, getTimeLabel } from '@/lib/date';
import { Entry } from '@/models/entry';
import { Link, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
   Pressable,
   SectionList,
   Text,
   View,
   type GestureResponderEvent,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
// The layout hero:
import { SafeAreaView } from 'react-native-safe-area-context';

type RowItem =
   | { kind: 'entry'; entry: Entry }
   | { kind: 'undo'; entry: Entry };

type EntrySection = {
   title: string;
   dateKey: string;
   data: RowItem[];
};

const UNDO_TIMEOUT_MS = 5500;

export default function EntriesScreen() {
   const store = useEntries();
   
   // State for Context Menu
   const [openMenuEntryId, setOpenMenuEntryId] = useState<string | null>(null);
   const [openMenuBounds, setOpenMenuBounds] = useState<MenuBounds | null>(null);
   
   // State for Undo Logic
   const [undoSlots, setUndoSlots] = useState<Entry[]>([]);
   const undoTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

   // --- Menu Logic ---
   const closeMenu = () => {
      if (openMenuEntryId !== null) {
         setOpenMenuEntryId(null);
         setOpenMenuBounds(null);
      }
   };

   const toggleMenu = (entryId: string) => {
      setOpenMenuEntryId((current) => {
         const next = current === entryId ? null : entryId;
         if (next !== current) setOpenMenuBounds(null);
         return next;
      });
   };

   const handleTouchCapture = (event: GestureResponderEvent) => {
      if (!openMenuEntryId) return false;
      if (!openMenuBounds) {
         closeMenu();
         return false;
      }
      const { pageX, pageY } = event.nativeEvent;
      const insideX = pageX >= openMenuBounds.x && pageX <= openMenuBounds.x + openMenuBounds.width;
      const insideY = pageY >= openMenuBounds.y && pageY <= openMenuBounds.y + openMenuBounds.height;

      if (insideX && insideY) return false;
      closeMenu();
      return false;
   };

   // --- Data Preparation ---
   const rowsWithUndo = buildRowsWithUndo(store.rows, undoSlots);
   const sections = buildSections(rowsWithUndo);

   // --- Action Handlers ---
   const clearUndoTimer = (id: string) => {
      const timer = undoTimers.current.get(id);
      if (timer) {
         clearTimeout(timer);
         undoTimers.current.delete(id);
      }
   };

   const requestDelete = (entry: Entry) => {
      closeMenu();
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

   useEffect(() => {
      const timers = undoTimers.current;
      return () => {
         timers.forEach((timer) => clearTimeout(timer));
         timers.clear();
      };
   }, []);

   return (
      <GestureHandlerRootView
         className="flex-1 bg-slate-50 dark:bg-slate-900"
         onStartShouldSetResponderCapture={handleTouchCapture}
      >
           <SectionList
              sections={sections}
              keyExtractor={(item) => `${item.kind}-${item.entry.id}`}
              className="flex-1"
              // Add huge bottom padding so the last item scrolls well above the FAB
              contentContainerClassName="pb-32"
              stickySectionHeadersEnabled
              onScrollBeginDrag={closeMenu}
              renderSectionHeader={({ section }) => (
                 // NativeWind Solution for Sticky Header:
                 // 1. edges=['top'] -> automatically adds padding matching the status bar height
                 // 2. bg-slate-50/95 -> fills the space behind the status bar
                 <SafeAreaView 
                    edges={['top']} 
                    className="bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-sm pb-3 pt-2"
                 >
                    <View className="items-center self-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 shadow-sm">
                       <Text className="text-center text-sm font-bold text-slate-600 dark:text-slate-300">
                          {section.title}
                       </Text>
                    </View>
                 </SafeAreaView>
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
                       onEdit={() => router.push({ pathname: '/(tabs)/entries/[id]', params: { id: item.entry.id } })}
                       onDelete={() => requestDelete(item.entry)}
                    />
                 );
              }}
           />

           {/* NativeWind Solution for FAB:
               1. edges=['bottom'] -> Ensures we respect the Home Indicator area 
               2. pointer-events-box-none -> allows clicks to pass through the empty areas
           */}
           <SafeAreaView 
             edges={['bottom']} 
             className="absolute bottom-0 right-0 left-0 items-end px-6 pointer-events-box-none"
           >
              <View className="mb-4">
                <Link href={'/(tabs)/entries/new'} asChild>
                    <Pressable
                       className="h-14 w-14 items-center justify-center rounded-full bg-amber-500 shadow-sm active:opacity-90"
                       accessibilityLabel="Create new entry"
                    >
                       <Text className="text-center text-[28px] font-bold leading-[30px] text-white">
                          +
                       </Text>
                    </Pressable>
                 </Link>
              </View>
           </SafeAreaView>

      </GestureHandlerRootView>
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
