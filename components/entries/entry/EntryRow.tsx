import { useThemeColor } from '@/hooks/useThemeColor'; // Assuming you made this hook from earlier steps
import { Entry } from '@/models/entry';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
   Pressable,
   Text,
   View,
   type StyleProp,
   type ViewStyle
} from 'react-native';
import Swipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
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
   onSwipeOpen?: (ref: SwipeableMethods) => void;
   onSwipeClose?: () => void;
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
         <Text className="text-[13px] font-bold text-slate-500 dark:text-slate-400 pb-2 pl-2">{timeLabel}</Text>
         <View className="min-h-[80px] justify-center items-center py-1 px-2 gap-0.5">
            <Pressable
               accessibilityRole="button"
               accessibilityLabel="Undo delete"
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
               <Animated.View className="absolute inset-0 bg-amber-500" style={barStyle} />
            </View>
         </View>
      </Animated.View>
   );
}

export default function EntryRow({
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
}: EntryRowProps) {
   const swipeableRef = useRef<SwipeableMethods | null>(null);
   const { colors } = useThemeColor(); // For icons

   const handleEdit = () => {
      swipeableRef.current?.close();
      onEdit();
   };

   return (
      <Animated.View
         entering={FadeIn.duration(240)}
         exiting={FadeOut.duration(240)}
         className="pt-4 pb-10"
         style={style}
      >
         <Swipeable
            ref={swipeableRef}
            overshootRight={false}
            onSwipeableWillOpen={() => {
               if (swipeableRef.current && onSwipeOpen) onSwipeOpen(swipeableRef.current);
            }}
            onSwipeableClose={() => {
               if (onSwipeClose) onSwipeClose();
            }}
            renderRightActions={() => (
               <View className="flex-row items-center h-full ml-3 mr-4">
                  {/* Edit Action */}
                  <View className="items-center ml-2 gap-1">
                     <Pressable
                        className="w-12 h-12 rounded-full items-center justify-center bg-amber-500 shadow-sm active:opacity-90"
                        onPress={handleEdit}
                     >
                        <Ionicons name="pencil-outline" size={22} color={colors.active} />
                     </Pressable>
                     <Text className="text-xs text-slate-500 dark:text-slate-400">Edit</Text>
                  </View>
                  
                  {/* Delete Action */}
                  <View className="items-center ml-2 gap-1">
                     <Pressable
                        className="w-12 h-12 rounded-full items-center justify-center bg-rose-600 shadow-sm active:opacity-90"
                        onPress={onDelete}
                     >
                        <Ionicons name="trash-outline" size={22} color="#ffffff" />
                     </Pressable>
                     <Text className="text-xs text-slate-500 dark:text-slate-400">Delete</Text>
                  </View>
               </View>
            )}
         >
            <View className="px-4">
               <Text className="text-[13px] font-bold text-slate-500 dark:text-slate-400 pb-2 pl-2">{timeLabel}</Text>
               <EntryCard
                  entry={entry}
                  isMenuOpen={isMenuOpen}
                  onToggleMenu={onToggleMenu}
                  onCloseMenu={onCloseMenu}
                  onMenuLayout={onMenuLayout}
                  onDelete={onDelete}
               />
            </View>
         </Swipeable>
      </Animated.View>
   );
}
