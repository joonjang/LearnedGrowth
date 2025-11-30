import EntryCard, { type MenuBounds } from '@/components/entries/EntryCard';
import { getDateParts, getTimeLabel } from '@/lib/date';
import { useEntries } from '@/features/hooks/useEntries';
import { Entry } from '@/models/entry';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import {
   Pressable,
   SectionList,
   StyleSheet,
   View,
   Text,
   type GestureResponderEvent,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

type EntrySection = {
   title: string; // e.g. "Today", "Yesterday", "Jan 10"
   dateKey: string; // "YYYY-MM-DD"
   data: Entry[];
};

export default function EntriesScreen() {
   const store = useEntries();
   const insets = useSafeAreaInsets();
   const [openMenuEntryId, setOpenMenuEntryId] = useState<string | null>(null);
   const [openMenuBounds, setOpenMenuBounds] = useState<MenuBounds | null>(null);

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
      if (!openMenuEntryId || !openMenuBounds) {
         return false;
      }

      const { pageX, pageY } = event.nativeEvent;
      const insideX =
         pageX >= openMenuBounds.x &&
         pageX <= openMenuBounds.x + openMenuBounds.width;
      const insideY =
         pageY >= openMenuBounds.y &&
         pageY <= openMenuBounds.y + openMenuBounds.height;

      if (insideX && insideY) {
         return false;
      }

      closeMenu();
      return false;
   };

   const sections = buildSections(store.rows);

   return (
      <GestureHandlerRootView
         style={styles.container}
         onStartShouldSetResponderCapture={handleTouchCapture}
      >
         <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
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
            renderItem={({ item, index, section }) => {
               const timeLabel = getTimeLabel(item);
               let swipeableRef: Swipeable | null = null;

               const handleEdit = () => {
                  swipeableRef?.close();
                  router.push(`/(tabs)/entries/${item.id}`);
               };

               const handleDelete = () => {
                  swipeableRef?.close();
                  store.deleteEntry(item.id);
               };

               return (
                  <View style={styles.listContent}>
                     <Swipeable
                        ref={(ref) => {
                           swipeableRef = ref;
                        }}
                        overshootRight={false}
                        renderRightActions={() => (
                           <View style={styles.actionsContainer}>
                              <View style={styles.actionWrapper}>
                                 <Pressable
                                    accessibilityLabel="Edit entry"
                                    style={[styles.actionButton, styles.editButton]}
                                    onPress={handleEdit}
                                 >
                                    <Ionicons
                                       name="pencil-outline"
                                       size={22}
                                       color="#FFFFFF"
                                    />
                                 </Pressable>
                                 <Text style={styles.actionLabel}>Edit</Text>
                              </View>
                              <View style={styles.actionWrapper}>
                                 <Pressable
                                    accessibilityLabel="Delete entry"
                                    style={[styles.actionButton, styles.deleteButton]}
                                    onPress={handleDelete}
                                 >
                                    <Ionicons
                                       name="trash-outline"
                                       size={22}
                                       color="#FFFFFF"
                                    />
                                 </Pressable>
                                 <Text style={styles.actionLabel}>Delete</Text>
                              </View>
                           </View>
                        )}
                     >
                        <View>
                           <Text style={styles.sectionHeaderText}>{timeLabel}</Text>
                           <EntryCard
                              entry={item}
                              isMenuOpen={openMenuEntryId === item.id}
                              onToggleMenu={() => toggleMenu(item.id)}
                              onCloseMenu={closeMenu}
                              onMenuLayout={setOpenMenuBounds}
                           />
                        </View>
                     </Swipeable>
                  </View>
               );
            }}
         />

         <View style={styles.newButtonWrapper}>
            <Link href={'/(modals)/entry-new'} asChild>
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

function buildSections(rows: Entry[]): EntrySection[] {
   const sections: EntrySection[] = [];

   for (const entry of rows) {
      const { dateKey, dateLabel } = getDateParts(entry);

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
   listContent: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 40,
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
   sectionHeaderText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#6B7280',
      paddingBottom: 8,
      paddingLeft: 8,
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
   actionsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      height: '100%',
      marginLeft: 12,
   },
   actionWrapper: {
      alignItems: 'center',
      marginLeft: 8,
      gap: 4,
   },
   actionButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
   },
   editButton: {
      backgroundColor: '#2563EB',
   },
   deleteButton: {
      backgroundColor: '#DC2626',
   },
   actionLabel: {
      fontSize: 12,
      color: '#6B7280',
   },
});
