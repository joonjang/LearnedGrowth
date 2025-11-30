import { useCallback, useEffect, useRef, useState } from 'react';
import { Entry } from '@/models/entry';
import {
   Text,
   View,
   StyleSheet,
   Pressable,
} from 'react-native';
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

   const menuScale = useSharedValue(0.7);
   const menuOpacity = useSharedValue(0);
   const menuWidth = useSharedValue(0);
   const menuHeight = useSharedValue(0);
   const expandProgress = useSharedValue(0);

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
      transform: [{ scale: 1 + expandProgress.value * 0.02 }],
      shadowOpacity: 0.06 + expandProgress.value * 0.04,
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

   return (
      <AnimatedPressable
         style={[styles.card, cardAnimatedStyle]}
         accessibilityRole="button"
         accessibilityLabel="View entry details"
         onPress={toggleExpanded}
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
            <Text
               style={styles.text}
               numberOfLines={expanded ? undefined : 4}
               ellipsizeMode={expanded ? undefined : 'tail'}
            >
               {entry.adversity}
            </Text>
         </View>

         <View style={styles.section}>
            <Text style={styles.label}>Belief</Text>
            <View style={[styles.accentBoxBase, styles.beliefBox]}>
               <Text
                  style={styles.beliefText}
                  numberOfLines={expanded ? undefined : 4}
                  ellipsizeMode={expanded ? undefined : 'tail'}
               >
                  {entry.belief}
               </Text>
            </View>
         </View>

         <View style={styles.section}>
            <Text style={styles.label}>Consequence</Text>
            <Text
               style={styles.text}
               numberOfLines={expanded ? undefined : 4}
               ellipsizeMode={expanded ? undefined : 'tail'}
            >
               {entry.consequence}
            </Text>
         </View>

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
                     >
                        {entry.dispute}
                     </Text>
                  </View>
               </View>

               <View style={styles.section}>
                  <Text style={styles.label}>Energy</Text>
                  <Text
                     style={styles.text}
                     numberOfLines={expanded ? undefined : 2}
                     ellipsizeMode={expanded ? undefined : 'tail'}
                  >
                     {entry.energy}
                  </Text>
               </View>
            </>
         )}
      </AnimatedPressable>
   );
}

const styles = StyleSheet.create({
   card: {
      paddingTop: 20,
      paddingHorizontal: 16,
      paddingBottom: 16,

      borderRadius: 16,
      backgroundColor: '#FFFFFF',

      // iOS shadow: softer + less offset so corners don’t look heavy
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },

      // Android
      elevation: 3,
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
      backgroundColor: 'rgba(255, 255, 255, 1)',
      borderRadius: 12,
      paddingVertical: 6,
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
      minWidth: 140,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: '#E5E7EB',
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
      color: '#1F2937',
      fontWeight: '500',
   },
   deleteText: {
      color: '#B91C1C',
   },
   section: {
      marginBottom: 8,
   },
   label: {
      fontSize: 12,
      fontWeight: '600',
      color: '#6B7280', // gray-500-ish
      marginBottom: 2,
   },
   text: {
      fontSize: 14,
      color: '#111827',
   },
   accentBoxBase: {
      marginHorizontal: -10,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 10,
   },
   beliefBox: {
      borderLeftWidth: 4,
      borderLeftColor: '#F43F5E',
   },
   beliefText: {
      fontSize: 14,
      fontWeight: '500',
      color: '#9F1239',
   },
   disputeBox: {
      borderLeftWidth: 4,
      borderLeftColor: '#22C55E',
   },
   disputeText: {
      fontSize: 14,
      fontWeight: '500',
      color: '#065F46',
   },
});
