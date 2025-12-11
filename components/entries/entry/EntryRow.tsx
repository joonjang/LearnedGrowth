import { Entry } from '@/models/entry';
import { makeThemedStyles, useTheme } from '@/theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
   Pressable,
   StyleSheet,
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
   const styles = useStyles();
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
         style={styles.listContent}
      >
         <Text style={styles.sectionHeaderText}>{timeLabel}</Text>
         <View style={styles.undoPlaceholder}>
            <Pressable
               accessibilityRole="button"
               accessibilityLabel="Undo delete"
               onPress={onUndo}
            >
               <Text
                  style={styles.undoLink}
                  onLayout={(e) => setTextWidth(e.nativeEvent.layout.width)}
               >
                  Undo delete
               </Text>
            </Pressable>
            <View
               style={[
                  styles.undoTimerTrack,
                  textWidth ? { width: textWidth } : null,
               ]}
            >
               <Animated.View style={[styles.undoTimerFill, barStyle]} />
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
   const { colors } = useTheme();
   const styles = useStyles();

   const handleEdit = () => {
      swipeableRef.current?.close();
      onEdit();
   };

   const handleDelete = () => {
      onDelete();
   };

   return (
      <Animated.View
         entering={FadeIn.duration(240)}
         exiting={FadeOut.duration(240)}
         style={[styles.listContent, style]}
      >
         <Swipeable
            ref={swipeableRef}
            overshootRight={false}
            onSwipeableWillOpen={() => {
               if (swipeableRef.current && onSwipeOpen)
                  onSwipeOpen(swipeableRef.current);
            }}
            onSwipeableClose={() => {
               if (onSwipeClose) onSwipeClose();
            }}
            renderRightActions={() => (
               <View style={styles.actionsContainer}>
                  <View style={styles.actionWrapper}>
                    <Pressable
                       accessibilityLabel="Edit entry"
                       style={[styles.actionButton, styles.editButton]}
                       onPress={handleEdit}
                    >
                        <Ionicons name="pencil-outline" size={22} color={colors.ctaText} />
                     </Pressable>
                     <Text style={styles.actionLabel}>Edit</Text>
                  </View>
                  <View style={styles.actionWrapper}>
                     <Pressable
                        accessibilityLabel="Delete entry"
                        style={[styles.actionButton, styles.deleteButton]}
                        onPress={handleDelete}
                     >
                        <Ionicons name="trash-outline" size={22} color={colors.ctaText} />
                     </Pressable>
                     <Text style={styles.actionLabel}>Delete</Text>
                  </View>
               </View>
            )}
         >
            <View style={{padding: 16}}>
               <Text style={styles.sectionHeaderText}>{timeLabel}</Text>
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

const useStyles = makeThemedStyles(({ colors }) =>
   StyleSheet.create({
      listContent: {
         paddingHorizontal: 0,
         paddingTop: 16,
         paddingBottom: 40,
      },
      sectionHeaderText: {
         fontSize: 13,
         fontWeight: '700',
         color: colors.hint,
         paddingBottom: 8,
         paddingLeft: 8,
      },
      actionsContainer: {
         flexDirection: 'row',
         alignItems: 'center',
         height: '100%',
         marginLeft: 12,
         marginRight: 16,
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
         backgroundColor: colors.cta,
      },
      deleteButton: {
         backgroundColor: colors.delete,
      },
      actionLabel: {
         fontSize: 12,
         color: colors.hint,
      },
      undoPlaceholder: {
         minHeight: 80,
         justifyContent: 'center',
         alignItems: 'center',
         paddingVertical: 4,
         paddingHorizontal: 8,
         gap: 2,
      },
      undoLink: {
         color: colors.cta,
         fontSize: 15,
         paddingVertical: 6,
         textAlign: 'center',
      },
      undoTimerTrack: {
         height: 2,
         backgroundColor: colors.border,
         borderRadius: 999,
         overflow: 'hidden',
         marginTop: 2,
      },
      undoTimerFill: {
         ...StyleSheet.absoluteFillObject,
         backgroundColor: colors.cta,
         transformOrigin: 'left center',
      },
   })
);
