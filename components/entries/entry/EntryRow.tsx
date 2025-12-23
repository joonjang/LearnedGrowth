import { useThemeColor } from '@/hooks/useThemeColor';
import { getIosShadowStyle } from '@/lib/shadow';
import { Entry } from '@/models/entry';
import { Pencil, Trash2 } from 'lucide-react-native';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
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
import Animated, {
   FadeIn,
   FadeOut,
   useAnimatedStyle,
   useSharedValue,
   withTiming,
} from 'react-native-reanimated';
import EntryCard, { type MenuBounds } from './EntryCard';

type EntryRowProps = {
   entry: Entry;
   timeLabel: string;
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
};

export function UndoRow({
   entry,
   timeLabel,
   durationMs,
   onUndo,
}: {
   entry: Entry;
   timeLabel: string;
   durationMs: number;
   onUndo: () => void;
}) {
   const progress = useSharedValue(1);
   const [textWidth, setTextWidth] = useState(0);

   useEffect(() => {
      progress.value = 1;
      progress.value = withTiming(0, { duration: durationMs });
   }, [entry.id, durationMs, progress]);

   const barStyle = useAnimatedStyle(() => ({
      transform: [{ scaleX: progress.value }],
      transformOrigin: 'left center',
   }));

   return (
      <Animated.View
         entering={FadeIn.duration(220)}
         exiting={FadeOut.duration(220)}
         className="pt-4 pb-10"
      >
         <Text className="text-[13px] font-bold text-slate-500 dark:text-slate-400 pb-2 pl-2">
            {timeLabel}
         </Text>
         <View className="min-h-[80px] justify-center items-center py-1 px-2 gap-0.5">
            <Pressable
               accessibilityRole="button"
               accessibilityLabel="Undo delete"
               testID="entry-undo-btn" // <--- ADDED TEST ID
               onPress={onUndo}
            >
               <Text
                  className="text-amber-600 dark:text-amber-400 text-[15px] py-1.5 text-center font-medium"
                  onLayout={(e) => setTextWidth(e.nativeEvent.layout.width)}
               >
                  Undo delete
               </Text>
            </Pressable>
            <View
               className="h-0.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mt-0.5"
               style={textWidth ? { width: textWidth } : undefined}
            >
               <Animated.View
                  className="absolute inset-0 bg-amber-500"
                  style={barStyle}
               />
            </View>
         </View>
      </Animated.View>
   );
}

function EntryRow({
   entry,
   timeLabel,
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
}: EntryRowProps) {
   const swipeableRef = useRef<SwipeableMethods | null>(null);
   const { isDark } = useThemeColor();

   const iosShadowSm = useMemo(
      () => getIosShadowStyle({ isDark, preset: 'sm' }),
      [isDark]
   );

   const handleEdit = () => {
      swipeableRef.current?.close();
      onEdit();
   };

   const handleDelete = () => {
      swipeableRef.current?.close();
      onDelete();
   };

   return (
      <Animated.View
         entering={FadeIn.duration(240)}
         exiting={FadeOut.duration(240)}
         className="pt-4 pb-10"
         style={[
            style,
            { zIndex: isMenuOpen ? 100 : 1, elevation: isMenuOpen ? 100 : 0 },
         ]}
      >
         <Swipeable
            ref={swipeableRef}
            overshootRight={false}
            friction={1}
            enableTrackpadTwoFingerGesture
            onSwipeableWillOpen={() => {
               onCloseMenu();
               if (swipeableRef.current && onSwipeOpen) {
                  onSwipeOpen(entry.id, swipeableRef.current);
               }
            }}
            rightThreshold={25}
            onSwipeableClose={() => {
               if (onSwipeClose) onSwipeClose(entry.id);
            }}
            onSwipeableWillClose={() => {
               if (onSwipeClose) onSwipeClose(entry.id);
            }}
            renderRightActions={() => (
               <View
                  className="flex-row items-center justify-center h-full gap-1 mr-7"
               >
                  {/* Edit Action */}
                  <View className="items-center gap-1.5">
                     <Pressable
                        className="w-14 h-14 rounded-full items-center justify-center bg-amber-500 shadow-sm active:opacity-90"
                        style={iosShadowSm}
                        onPress={handleEdit}
                        testID="entry-swipe-edit-btn" // <--- ADDED TEST ID
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
                        className="w-14 h-14 rounded-full items-center justify-center bg-rose-600 shadow-sm active:opacity-90"
                        style={iosShadowSm}
                        onPress={handleDelete}
                        testID="entry-swipe-delete-btn" // <--- ADDED TEST ID
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
               <Text className="text-[13px] font-bold text-slate-500 dark:text-slate-400 pb-2 pl-2">
                  {timeLabel}
               </Text>
               <EntryCard
                  entry={entry}
                  isMenuOpen={isMenuOpen}
                  onToggleMenu={onToggleMenu}
                  onCloseMenu={onCloseMenu}
                  onMenuLayout={onMenuLayout}
                  onDelete={onDelete}
                  closeActiveSwipeable={closeActiveSwipeable}
               />
            </View>
         </Swipeable>
      </Animated.View>
   );
}

const arePropsEqual = (prev: EntryRowProps, next: EntryRowProps) => {
   const prevEntry = prev.entry;
   const nextEntry = next.entry;

   if (prev.isMenuOpen !== next.isMenuOpen) return false;
   if (prev.timeLabel !== next.timeLabel) return false;
   if (prevEntry.id !== nextEntry.id) return false;
   if (prevEntry.updatedAt !== nextEntry.updatedAt) return false;
   if (prevEntry.isDeleted !== nextEntry.isDeleted) return false;
   if (prevEntry.adversity !== nextEntry.adversity) return false;
   if (prevEntry.belief !== nextEntry.belief) return false;
   if ((prevEntry.consequence ?? '') !== (nextEntry.consequence ?? '')) return false;
   if ((prevEntry.dispute ?? '') !== (nextEntry.dispute ?? '')) return false;
   if ((prevEntry.energy ?? '') !== (nextEntry.energy ?? '')) return false;
   return true;
};

export default memo(EntryRow, arePropsEqual);
