import { Entry } from '@/models/entry';
import { RefObject } from '@testing-library/react-native/build/types';
import { Pencil, Trash2 } from 'lucide-react-native';
import { memo, useRef } from 'react';
import {
   Pressable,
   Text,
   View,
   type StyleProp,
   type ViewStyle,
} from 'react-native';
import Swipeable, {
   type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import EntryCard, { type MenuBounds } from './EntryCard';

type EntryRowProps = {
   entry: Entry;
   isMenuOpen: boolean;
   onToggleMenu: () => void;
   onCloseMenu: () => void;
   onMenuLayout: (bounds: MenuBounds) => void;
   onEdit: () => void;
   onDelete: () => void;
   style?: StyleProp<ViewStyle>;
   onSwipeOpen?: (id: string, ref: SwipeableMethods) => void;
   onSwipeClose?: (id: string) => void;
   closeActiveSwipeable?: () => string | null;
   swipeGestureRef?: RefObject<boolean>;
   searchQuery?: string; // <--- 1. Added Prop Type
};

function EntryRow({
   entry,
   isMenuOpen,
   onToggleMenu,
   onCloseMenu,
   onMenuLayout,
   onEdit,
   onDelete,
   style,
   onSwipeOpen,
   onSwipeClose,
   closeActiveSwipeable,
   swipeGestureRef,
   searchQuery, // <--- 2. Destructured Prop
}: EntryRowProps) {
   const swipeableRef = useRef<SwipeableMethods | null>(null);

   const handleEdit = () => {
      swipeableRef.current?.close();
      onEdit();
   };

   const handleDelete = () => {
      swipeableRef.current?.close();
      onDelete();
   };

   return (
      <View className="pt-4 pb-10" style={[style]}>
         <Swipeable
            ref={swipeableRef}
            overshootRight={false}
            friction={1}
            enableTrackpadTwoFingerGesture
            onSwipeableOpenStartDrag={() => {
               if (swipeGestureRef) swipeGestureRef.current = true;
            }}
            onSwipeableWillOpen={() => {
               onCloseMenu();
               if (swipeableRef.current && onSwipeOpen) {
                  onSwipeOpen(entry.id, swipeableRef.current);
               }
            }}
            onSwipeableOpen={() => {
               if (swipeGestureRef) swipeGestureRef.current = false;
            }}
            rightThreshold={25}
            onSwipeableClose={() => {
               if (swipeGestureRef) swipeGestureRef.current = false;
               if (onSwipeClose) onSwipeClose(entry.id);
            }}
            onSwipeableWillClose={() => {
               if (swipeGestureRef) swipeGestureRef.current = false;
               if (onSwipeClose) onSwipeClose(entry.id);
            }}
            renderRightActions={() => (
               <View className="flex-row items-center justify-center h-full gap-1 mr-7">
                  {/* Edit Action */}
                  <View className="items-center gap-1.5">
                     <Pressable
                        className="w-14 h-14 rounded-full items-center justify-center bg-amber-500 active:bg-amber-600 dark:bg-amber-600 dark:active:bg-amber-700"
                        onPress={handleEdit}
                        testID="entry-swipe-edit-btn"
                     >
                        <Pencil size={24} color="#ffffff" />
                     </Pressable>
                     <Text className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Edit
                     </Text>
                  </View>

                  {/* Delete Action */}
                  <View className="items-center ml-3 gap-1.5">
                     <Pressable
                        className="w-14 h-14 rounded-full items-center justify-center bg-rose-600 active:bg-rose-700 dark:bg-rose-700 dark:active:bg-rose-800"
                        onPress={handleDelete}
                        testID="entry-swipe-delete-btn"
                     >
                        <Trash2 size={24} color="#ffffff" />
                     </Pressable>
                     <Text className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Delete
                     </Text>
                  </View>
               </View>
            )}
         >
            <View className="p-4">
               <EntryCard
                  entry={entry}
                  isMenuOpen={isMenuOpen}
                  onToggleMenu={onToggleMenu}
                  onCloseMenu={onCloseMenu}
                  onMenuLayout={onMenuLayout}
                  onDelete={onDelete}
                  closeActiveSwipeable={closeActiveSwipeable}
                  swipeGestureRef={swipeGestureRef}
                  searchQuery={searchQuery} // <--- 3. Passed Prop to Card
               />
            </View>
         </Swipeable>
      </View>
   );
}

const arePropsEqual = (prev: EntryRowProps, next: EntryRowProps) => {
   const prevEntry = prev.entry;
   const nextEntry = next.entry;

   // <--- 4. Important: Check if search query changed to trigger re-render
   if (prev.searchQuery !== next.searchQuery) return false;

   if (prev.isMenuOpen !== next.isMenuOpen) return false;
   if (prevEntry.id !== nextEntry.id) return false;
   if (prevEntry.updatedAt !== nextEntry.updatedAt) return false;
   if (prevEntry.isDeleted !== nextEntry.isDeleted) return false;
   if (prevEntry.adversity !== nextEntry.adversity) return false;
   if (prevEntry.belief !== nextEntry.belief) return false;
   if ((prevEntry.consequence ?? '') !== (nextEntry.consequence ?? ''))
      return false;
   if ((prevEntry.dispute ?? '') !== (nextEntry.dispute ?? '')) return false;
   if ((prevEntry.energy ?? '') !== (nextEntry.energy ?? '')) return false;
   return true;
};

export default memo(EntryRow, arePropsEqual);
