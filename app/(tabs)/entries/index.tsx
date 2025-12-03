import EntryRow, { UndoRow } from '@/components/entries/EntryRow';
import { type MenuBounds } from '@/components/entries/EntryCard';
import { getDateParts, getTimeLabel } from '@/lib/date';
import { useEntries } from '@/features/hooks/useEntries';
import { Entry } from '@/models/entry';
import { Link, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
   Pressable,
   SectionList,
   StyleSheet,
   View,
   Text,
   type GestureResponderEvent,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type RowItem =
   | { kind: 'entry'; entry: Entry }
   | { kind: 'undo'; entry: Entry };

type EntrySection = {
   title: string; // e.g. "Today", "Yesterday", "Jan 10"
   dateKey: string; // "YYYY-MM-DD"
   data: RowItem[];
};

const UNDO_TIMEOUT_MS = 5500;

export default function EntriesScreen() {
   const store = useEntries();
   const insets = useSafeAreaInsets();
   const [openMenuEntryId, setOpenMenuEntryId] = useState<string | null>(null);
   const [openMenuBounds, setOpenMenuBounds] = useState<MenuBounds | null>(null);
   const [undoSlots, setUndoSlots] = useState<Entry[]>([]);
   const undoTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
      new Map()
   );

   const closeMenu = () => {
      if (openMenuEntryId !== null) {
         setOpenMenuEntryId(null);
         setOpenMenuBounds(null);
      }
   };

   const toggleMenu = (entryId: string) => {
      setOpenMenuEntryId((current) => {
         const next = current === entryId ? null : entryId;
         if (next !== current) {
            setOpenMenuBounds(null);
         }
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
      const insideX =
         pageX >= openMenuBounds.x &&
         pageX <= openMenuBounds.x + openMenuBounds.width;
      const insideY =
         pageY >= openMenuBounds.y &&
         pageY <= openMenuBounds.y + openMenuBounds.height;

      if (insideX && insideY) return false;

      closeMenu();
      return false;
   };

   const rowsWithUndo = buildRowsWithUndo(store.rows, undoSlots);
   const sections = buildSections(rowsWithUndo);

   const clearUndoTimer = (id: string) => {
      const timer = undoTimers.current.get(id);
      if (timer) {
         clearTimeout(timer);
         undoTimers.current.delete(id);
      }
   };

   const requestDelete = (entry: Entry) => {
      closeMenu();
      setUndoSlots((prev) => [
         ...prev.filter((e) => e.id !== entry.id),
         entry,
      ]);

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
         style={styles.container}
         onStartShouldSetResponderCapture={handleTouchCapture}
      >
         <SectionList
            sections={sections}
            keyExtractor={(item) => `${item.kind}-${item.entry.id}`}
            contentInset={{ top: insets.top }}
            contentOffset={{ y: -insets.top, x: 0 }}
            scrollIndicatorInsets={{ top: insets.top }}
            onScrollBeginDrag={closeMenu}
            renderSectionHeader={({ section }) => (
               <View style={styles.sectionHeaderWrapper}>
                  <View style={styles.sectionHeaderPill}>
                     <Text style={styles.sectionHeader}>{section.title}</Text>
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

               const handleEdit = () => {
                  router.push(`/(tabs)/entries/${item.entry.id}`);
               };

               return (
                  <EntryRow
                     entry={item.entry}
                     timeLabel={timeLabel}
                     isMenuOpen={openMenuEntryId === item.entry.id}
                     onToggleMenu={() => toggleMenu(item.entry.id)}
                     onCloseMenu={closeMenu}
                     onMenuLayout={setOpenMenuBounds}
                     onEdit={handleEdit}
                     onDelete={() => requestDelete(item.entry)}
                  />
               );
            }}
         />

         <View style={styles.newButtonWrapper}>
            <Link href={'/(cards)/entry-new'} asChild>
               <Pressable
                  style={styles.newButton}
                  accessibilityLabel="Create new entry"
               >
                  <Text style={styles.newButtonText}>+</Text>
               </Pressable>
            </Link>
         </View>
      </GestureHandlerRootView>
   );
}

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

const styles = StyleSheet.create({
   container: {
      flex: 1,
      backgroundColor: '#F9FAFB',
   },
   sectionHeaderWrapper: {
      paddingVertical: 12,
      alignItems: 'center',
   },
   sectionHeaderPill: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: '#D1D5DB',
      backgroundColor: 'rgba(219, 219, 219, 0.66)',
   },
   sectionHeader: {
      textAlign: 'center',
      fontSize: 14,
      fontWeight: '700',
      color: '#374151',
   },
   newButtonWrapper: {
      position: 'absolute',
      right: 24,
      bottom: 18,
   },
   newButton: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: '#F39C12',
      alignItems: 'center',
      justifyContent: 'center',
   },
   newButtonText: {
      fontSize: 28,
      fontWeight: '600',
      color: '#FFFFFF',
      lineHeight: 30,
   },
});
