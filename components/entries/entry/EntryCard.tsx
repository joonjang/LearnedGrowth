import { Entry } from '@/models/entry';
import { useColorScheme } from 'nativewind';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
   Pressable,
   Text,
   View,
   type TextLayoutEvent
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Animated, {
   Easing,
   useAnimatedStyle,
   useSharedValue,
   withTiming,
} from 'react-native-reanimated';
import AnalyzeButton from '../../buttons/AnalyzeButton';
import CTAButton from '../../buttons/CTAButton';

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

// --- Truncation Logic (Kept intact) ---
const TRUNCATION_LIMITS = {
   adversity: 4,
   belief: 4,
   consequence: 4,
   dispute: 5,
   energy: 2,
} as const;

type TruncationKey = keyof typeof TRUNCATION_LIMITS;
type TruncationState = Record<TruncationKey, boolean>;

const createInitialTruncationState = (): TruncationState =>
   Object.keys(TRUNCATION_LIMITS).reduce((acc, key) => {
      acc[key as TruncationKey] = false;
      return acc;
   }, {} as TruncationState);

function useTruncations() {
   const [truncateState, setTruncateState] = useState<TruncationState>(
      createInitialTruncationState
   );

   const onLayout = useCallback(
      (key: TruncationKey) => (e: TextLayoutEvent) => {
         const totalLines = e.nativeEvent.lines.length;
         if (totalLines <= TRUNCATION_LIMITS[key]) return;

         setTruncateState((prev) => {
            if (prev[key]) return prev;
            return { ...prev, [key]: true };
         });
      },
      []
   );

   const reset = useCallback(() => {
      setTruncateState(createInitialTruncationState);
   }, []);

   return { truncateState, onLayout, reset };
}

export default function EntryCard({
   entry,
   isMenuOpen,
   onToggleMenu,
   onCloseMenu,
   onDelete,
   onMenuLayout,
}: Prop) {
   const menuRef = useRef<View | null>(null);
   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';
   
   // Raw colors for Animations & Icons
   const colors = {
      hint: isDark ? '#94a3b8' : '#64748b',
      menuText: isDark ? '#1e293b' : '#334155', // slate-800 / slate-700
      delete: isDark ? '#fb7185' : '#b91c1c',
      elevatedBorder: isDark ? 'rgba(148, 163, 184, 0.45)' : 'rgba(15, 23, 42, 0.06)',
      shadowColor: '#000000',
   };

   const [expanded, setExpanded] = useState(false);
   const { truncateState, onLayout, reset } = useTruncations();

   useEffect(() => {
      setExpanded(false);
      reset();
   }, [entry.id, reset]);

   const isExpandable = useMemo(
      () => Object.values(truncateState).some(Boolean),
      [truncateState]
   );

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
      transform: [{ scale: 1 + pressProgress.value * 0.015 }],
      shadowOpacity: 0.06 + expandProgress.value * 0.04,
      borderColor: colors.elevatedBorder,
      shadowColor: colors.shadowColor,
   }));

   useEffect(() => {
      if (isMenuOpen) {
         menuScale.value = withTiming(1, { duration: 140, easing: Easing.out(Easing.cubic) });
         menuOpacity.value = withTiming(1, { duration: 120, easing: Easing.out(Easing.quad) });
      } else {
         menuScale.value = withTiming(0.7, { duration: 90, easing: Easing.in(Easing.cubic) });
         menuOpacity.value = withTiming(0, { duration: 80, easing: Easing.in(Easing.quad) });
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

   const toggleExpanded = useCallback(() => {
      if (isMenuOpen) onCloseMenu();
      if (!isExpandable) return;
      setExpanded((prev) => !prev);
   }, [isMenuOpen, onCloseMenu, isExpandable]);

   const expandHintView = (
      <View className="flex-row items-center justify-center gap-2 pt-2.5 pb-1">
         <Text className="text-xs text-slate-500 dark:text-slate-400 tracking-wide">Tap to expand details</Text>
      </View>
   );

   // Reusable Text Block Component
   const SectionBlock = ({ label, text, type, textKey }: { label: string, text: string, type: 'default' | 'belief' | 'dispute', textKey: TruncationKey }) => {
      const boxClass = type === 'belief' 
         ? 'bg-belief-bg border-belief-border border'
         : type === 'dispute'
            ? 'bg-dispute-bg border-dispute-border border'
            : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700';
      
      const textClass = type === 'belief'
         ? 'text-[15px] font-semibold text-belief-text'
         : type === 'dispute'
            ? 'text-[15px] font-semibold text-dispute-text'
            : 'text-[15px] text-slate-900 dark:text-slate-100 leading-[22px]';

      return (
         <View className="mb-3 gap-1.5">
            <Text className="text-[11px] font-semibold tracking-wider text-slate-500 dark:text-slate-400 uppercase">{label}</Text>
            <View className={`px-3 py-3 rounded-xl ${boxClass}`}>
               <Text
                  className={textClass}
                  onTextLayout={onLayout(textKey)}
                  numberOfLines={expanded || !truncateState[textKey] ? undefined : TRUNCATION_LIMITS[textKey]}
                  ellipsizeMode="tail"
               >
                  {text}
               </Text>
            </View>
         </View>
      );
   };

   return (
      <AnimatedPressable
         className="pt-[22px] px-[18px] pb-[18px] rounded-[18px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm"
         style={cardAnimatedStyle}
         onPress={toggleExpanded}
         onPressIn={() => (pressProgress.value = withTiming(1, { duration: 120 }))}
         onPressOut={() => (pressProgress.value = withTiming(0, { duration: 140 }))}
      >
         {/* --- Menu Row --- */}
         <View className="absolute top-2 right-4 flex-row z-30">
            <Pressable
               hitSlop={8}
               className="w-7 h-7 rounded-full items-center justify-center active:bg-black/5 dark:active:bg-white/10"
               onPress={onToggleMenu}
            >
               <Ionicons name="ellipsis-horizontal" size={18} color={colors.hint} />
            </Pressable>
            
            <Animated.View
               ref={menuRef}
               pointerEvents={isMenuOpen ? 'auto' : 'none'}
               className="absolute top-2 right-0 bg-white dark:bg-slate-800 rounded-xl py-1.5 shadow-lg min-w-[140px] border border-slate-200 dark:border-slate-700 z-20"
               style={menuStyle}
               onLayout={(e) => {
                  const { width, height } = e.nativeEvent.layout;
                  menuWidth.value = width;
                  menuHeight.value = height;
                  measureMenu();
               }}
            >
               <Pressable
                  className="flex-row items-center gap-2 py-2 px-3 active:bg-slate-100 dark:active:bg-slate-800"
                  onPress={() => { onCloseMenu(); router.push({ pathname: '/(tabs)/entries/[id]', params: { id: entry.id } }); }}
               >
                  <Ionicons name="pencil-outline" size={16} color={isDark ? '#f8fafc' : '#1e293b'} />
                  <Text className="text-sm font-medium text-slate-900 dark:text-slate-100">Edit</Text>
               </Pressable>
               <Pressable
                  className="flex-row items-center gap-2 py-2 px-3 active:bg-slate-100 dark:active:bg-slate-800"
                  onPress={() => { onCloseMenu(); onDelete(entry); }}
               >
                  <Ionicons name="trash-outline" size={16} color={colors.delete} />
                  <Text className="text-sm font-medium text-rose-600 dark:text-rose-400">Delete</Text>
               </Pressable>
            </Animated.View>
         </View>

         {/* --- Content --- */}
         <SectionBlock label="Adversity" text={entry.adversity} type="default" textKey="adversity" />
         <SectionBlock label="Belief" text={entry.belief} type="belief" textKey="belief" />
         <SectionBlock label="Consequence" text={entry.consequence ?? ''} type="default" textKey="consequence" />

         {/* Pre-dispute Hint */}
         {isExpandable && !expanded && !entry.dispute && expandHintView}

         {!entry.dispute ? (
            <>
               <View className="h-[0.5px] bg-slate-200 dark:bg-slate-700 my-2" />
               <CTAButton id={entry.id} />
               <AnalyzeButton id={entry.id} />
            </>
         ) : (
            <>
               <SectionBlock label="Dispute" text={entry.dispute} type="dispute" textKey="dispute" />
               <SectionBlock label="Energy" text={entry.energy ?? ''} type="default" textKey="energy" />
               {isExpandable && !expanded && expandHintView}
            </>
         )}
      </AnimatedPressable>
   );
}
