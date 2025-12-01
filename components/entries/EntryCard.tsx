import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Entry } from '@/models/entry';
import {
   Text,
   View,
   StyleSheet,
   Pressable,
   type TextLayoutEvent,
} from 'react-native';
import { palette } from '@/theme/colors';
import CTA from './CTA';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Animated, {
   useSharedValue,
   useAnimatedStyle,
   withTiming,
   Easing,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type MenuBounds = {
   x: number;
   y: number;
   width: number;
   height: number;
};

type Prop = {
   entry: Entry;
   isMenuOpen: boolean;
   onToggleMenu: () => void;
   onCloseMenu: () => void;
   onDelete: (entry: Entry) => void;
   onMenuLayout?: (bounds: MenuBounds) => void;
};

export default function EntryCard({
   entry,
   isMenuOpen,
   onToggleMenu,
   onCloseMenu,
   onDelete,
   onMenuLayout,
}: Prop) {
   const menuRef = useRef<View | null>(null);
   const [expanded, setExpanded] = useState(false);
   const [hasOverflow, setHasOverflow] = useState(false);

   const menuScale = useSharedValue(0.7);
   const menuOpacity = useSharedValue(0);
   const menuWidth = useSharedValue(0);
   const menuHeight = useSharedValue(0);
   const expandProgress = useSharedValue(0);
   const pressProgress = useSharedValue(0);

   useEffect(() => {
      expandProgress.value = withTiming(expanded ? 1 : 0, {
         duration: 160,
         easing: Easing.out(Easing.quad),
      });
   }, [expanded, expandProgress]);

   const menuStyle = useAnimatedStyle(() => {
      const width = menuWidth.value || 1;

      // anchor the scale near the top-right so it feels attached to the icon
      return {
         opacity: menuOpacity.value,
         transform: [
            { translateX: width },
            { scale: menuScale.value },
            { translateX: -width },
         ],
      };
   });

   const cardAnimatedStyle = useAnimatedStyle(() => ({
      transform: [
         {
            scale: 1 + pressProgress.value * 0.015,
         },
      ],
      shadowOpacity: 0.06 + expandProgress.value * 0.04,
      borderColor: `rgba(17, 24, 39, ${
         0.05 + pressProgress.value * 0.25
      })`,
   }));

   useEffect(() => {
      if (isMenuOpen) {
         // zoom in from top-right
         menuScale.value = withTiming(1, {
            duration: 140,
            easing: Easing.out(Easing.cubic),
         });

         menuOpacity.value = withTiming(1, {
            duration: 120,
            easing: Easing.out(Easing.quad),
         });
      } else {
         // zoom out toward top-right
         menuScale.value = withTiming(0.7, {
            duration: 90,
            easing: Easing.in(Easing.cubic),
         });

         menuOpacity.value = withTiming(0, {
            duration: 80,
            easing: Easing.in(Easing.quad),
         });
      }
   }, [isMenuOpen, menuScale, menuOpacity]);

   const measureMenu = useCallback(() => {
      if (!menuRef.current || !onMenuLayout) return;

      menuRef.current.measureInWindow((x, y, width, height) => {
         onMenuLayout({ x, y, width, height });
      });
   }, [onMenuLayout]);

   useEffect(() => {
      if (!isMenuOpen) return;

      const id = requestAnimationFrame(measureMenu);
      return () => cancelAnimationFrame(id);
   }, [isMenuOpen, measureMenu]);

   const handleEdit = () => {
      onCloseMenu();
      router.push(`/(tabs)/entries/${entry.id}`);
   };

   const handleDelete = () => {
      onCloseMenu();
      onDelete(entry);
   };

   const toggleExpanded = useCallback(() => {
      if (isMenuOpen) onCloseMenu();
      setExpanded((prev) => !prev);
   }, [isMenuOpen, onCloseMenu]);

   useEffect(() => {
      setHasOverflow(false);
   }, [entry.id]);

   const heuristicExpandable = useMemo(() => {
      const long = (value: string | undefined, limit: number) => {
         if (!value) return false;
         const trimmed = value.trim();
         return trimmed.length > limit || trimmed.includes('\n');
      };

      return (
         long(entry.adversity, 80) ||
         long(entry.belief, 80) ||
         long(entry.consequence, 80) ||
         long(entry.dispute, 110) ||
         long(entry.energy, 50)
      );
   }, [entry]);

   const recordOverflow = useCallback(
      (limit: number) =>
         (e: TextLayoutEvent) => {
            if (hasOverflow) return;
            if (e.nativeEvent.lines.length >= limit) setHasOverflow(true);
         },
      [hasOverflow]
   );

   const isExpandable = hasOverflow || heuristicExpandable;

   const expandHintView = (
      <View style={styles.expandHint}>
         <Text style={styles.expandText}>Tap to expand details</Text>
      </View>
   );

   return (
      <AnimatedPressable
         style={[styles.card, cardAnimatedStyle]}
         accessibilityRole="button"
         accessibilityLabel="View entry details"
         onPress={toggleExpanded}
         onPressIn={() => {
            pressProgress.value = withTiming(1, { duration: 120 });
         }}
         onPressOut={() => {
            pressProgress.value = withTiming(0, { duration: 140 });
         }}
      >
         <View style={styles.menuRow}>
            <Pressable
               accessibilityLabel="More options"
               hitSlop={8}
               style={styles.menuButton}
               onPress={onToggleMenu}
            >
               <Ionicons name="ellipsis-horizontal" size={18} color="#6B7280" />
            </Pressable>
            <Animated.View
               ref={menuRef}
               pointerEvents={isMenuOpen ? 'auto' : 'none'}
               style={[styles.menu, menuStyle]}
               onLayout={(e) => {
                  const { width, height } = e.nativeEvent.layout;
                  menuWidth.value = width;
                  menuHeight.value = height;
                  measureMenu();
               }}
            >
               <Pressable
                  style={styles.menuItem}
                  onPress={handleEdit}
                  accessibilityRole="button"
                  accessibilityLabel="Edit entry"
               >
                  <Ionicons name="pencil-outline" size={16} color="#1F2937" />
                  <Text style={styles.menuText}>Edit</Text>
               </Pressable>
               <Pressable
                  style={styles.menuItem}
                  onPress={handleDelete}
                  accessibilityRole="button"
                  accessibilityLabel="Delete entry"
               >
                  <Ionicons name="trash-outline" size={16} color="#B91C1C" />
                  <Text style={[styles.menuText, styles.deleteText]}>
                     Delete
                  </Text>
               </Pressable>
            </Animated.View>
         </View>

         <View style={styles.section}>
            <Text style={styles.label}>Adversity</Text>
            <View style={styles.sectionCard}>
               <Text
                  style={styles.text}
                  numberOfLines={expanded ? undefined : 4}
                  ellipsizeMode={expanded ? undefined : 'tail'}
                  onTextLayout={recordOverflow(4)}
               >
                  {entry.adversity}
               </Text>
            </View>
         </View>

         <View style={styles.section}>
            <Text style={styles.label}>Belief</Text>
            <View style={[styles.accentBoxBase, styles.beliefBox]}>
               <Text
                  style={styles.beliefText}
                  numberOfLines={expanded ? undefined : 4}
                  ellipsizeMode={expanded ? undefined : 'tail'}
                  onTextLayout={recordOverflow(4)}
               >
                  {entry.belief}
               </Text>
            </View>
         </View>

         <View style={styles.section}>
            <Text style={styles.label}>Consequence</Text>
            <View style={styles.sectionCard}>
               <Text
                  style={styles.text}
                  numberOfLines={expanded ? undefined : 4}
                  ellipsizeMode={expanded ? undefined : 'tail'}
                  onTextLayout={recordOverflow(4)}
               >
                  {entry.consequence}
               </Text>
            </View>
         </View>

         {isExpandable && !expanded && !entry.dispute && (
            expandHintView
         )}

         {!entry.dispute ? (
            <CTA id={entry.id} />
         ) : (
            <>
               <View style={styles.section}>
                  <Text style={styles.label}>Dispute</Text>
                  <View style={[styles.accentBoxBase, styles.disputeBox]}>
                     <Text
                        style={styles.disputeText}
                        numberOfLines={expanded ? undefined : 5}
                        ellipsizeMode={expanded ? undefined : 'tail'}
                        onTextLayout={recordOverflow(5)}
                     >
                        {entry.dispute}
                     </Text>
                  </View>
               </View>

               <View style={styles.section}>
                  <Text style={styles.label}>Energy</Text>
                  <View style={styles.sectionCard}>
                     <Text
                        style={styles.text}
                        numberOfLines={expanded ? undefined : 2}
                        ellipsizeMode={expanded ? undefined : 'tail'}
                        onTextLayout={recordOverflow(2)}
                     >
                        {entry.energy}
                     </Text>
                  </View>
               </View>

               {isExpandable && !expanded && (
                  expandHintView
               )}
            </>
         )}

         
      </AnimatedPressable>
   );
}

const styles = StyleSheet.create({
   card: {
      paddingTop: 22,
      paddingHorizontal: 18,
      paddingBottom: 18,

      borderRadius: 18,
      backgroundColor: palette.cardBg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: palette.border,
      overflow: 'hidden',

      // iOS shadow: softer + less offset so corners don’t look heavy
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },

      // Android
      elevation: 4,
   },
   menuRow: {
      position: 'absolute',
      top: 8, // relative to card’s padding
      right: 16, // uses card’s padding as the “inset”
      flexDirection: 'row',
      zIndex: 30,
   },

   menuButton: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
   },
   menu: {
      position: 'absolute',
      top: 8,
      right: 0,
      backgroundColor: palette.cardBg,
      borderRadius: 12,
      paddingVertical: 6,
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
      minWidth: 140,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: palette.border,
      zIndex: 20,
   },
   menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 8,
      paddingHorizontal: 12,
   },
   menuText: {
      fontSize: 14,
      color: palette.menuText,
      fontWeight: '500',
   },
   deleteText: {
      color: palette.delete,
   },
   section: {
      marginBottom: 12,
      gap: 6,
   },
   label: {
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 0.4,
      color: palette.hint,
      textTransform: 'uppercase',
   },
   text: {
      fontSize: 15,
      lineHeight: 22,
      color: palette.text,
   },
   sectionCard: {
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: palette.surfaceMuted,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: palette.border,
   },
   accentBoxBase: {
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
   },
   beliefBox: {
      backgroundColor: palette.accentBeliefBg,
      borderColor: palette.accentBeliefBorder,
   },
   beliefText: {
      fontSize: 15,
      fontWeight: '600',
      color: palette.accentBeliefText,
   },
   disputeBox: {
      backgroundColor: palette.accentDisputeBg,
      borderColor: palette.accentDisputeBorder,
   },
   disputeText: {
      fontSize: 15,
      fontWeight: '600',
      color: palette.accentDisputeText,
   },
   expandHint: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingTop: 10,
      paddingBottom: 4,
   },
   expandText: {
      fontSize: 12,
      color: palette.hint,
      letterSpacing: 0.2,
   },
});
