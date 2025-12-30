import CardNextButton from '@/components/buttons/CardNextButton';
import { useNavigationLock } from '@/hooks/useNavigationLock';
import { getShadow } from '@/lib/shadow';
import { FieldTone, getFieldStyles } from '@/lib/theme';
import { Entry } from '@/models/entry';
import { router } from 'expo-router';
import { ArrowDown, ChevronRight, MoreHorizontal, Pencil, Trash2 } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, type TextLayoutEvent, View } from 'react-native';
import Animated, {
   Easing,
   useAnimatedStyle,
   useSharedValue,
   withTiming,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// --- Types ---
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
   closeActiveSwipeable?: () => string | null;
};

// --- Truncation Constants ---
const TRUNCATION_LIMITS = {
   adversity: 4,
   belief: 4,
   consequence: 4,
   dispute: 10,
   energy: 4,
} as const;

type TruncationKey = keyof typeof TRUNCATION_LIMITS;
type TruncationState = Record<TruncationKey, boolean>;

// --- Helper Components ---

/**
 * Renders the "Adversity -> Belief -> Consequence" header line
 */
const FlowBreadcrumb = ({ steps }: { steps: string[] }) => (
   <View className="flex-row items-center gap-1.5 mb-3 px-1">
      {steps.map((step, index) => (
         <View key={step} className="flex-row items-center gap-1.5">
            <Text className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
               {step}
            </Text>
            {index < steps.length - 1 && (
               <ChevronRight size={12} color="#94a3b8" />
            )}
         </View>
      ))}
   </View>
);

/**
 * A connector arrow between fields
 */
const FlowConnector = () => (
   <View className="items-center -my-1.5 z-10 relative">
      {/* Small circle background behind arrow to cover borders */}
      <View className="bg-slate-50 dark:bg-slate-800/40 rounded-full p-1"> 
         <ArrowDown size={14} className="text-slate-300 dark:text-slate-600" />
      </View>
   </View>
);

/**
 * The individual text block within the flow (No Label Version)
 */
const FlowBlock = memo(({ 
   text, 
   type, 
   textKey, 
   isTruncated, 
   onLayout,
   isLast = false
}: { 
   text: string, 
   type: FieldTone, 
   textKey: TruncationKey,
   isTruncated: boolean,
   onLayout: (e: TextLayoutEvent) => void,
   isLast?: boolean
}) => {
   const styles = getFieldStyles(type, false);

   return (
      <View>
         {/* Text Container */}
         <View className={`px-3.5 py-3 rounded-xl border ${styles.container} bg-white dark:bg-slate-900/50 shadow-sm`}>
            <Text
               className={`text-[15px] leading-[22px] ${styles.text}`}
               onTextLayout={onLayout}
               numberOfLines={isTruncated ? TRUNCATION_LIMITS[textKey] : undefined}
               ellipsizeMode="tail"
            >
               {text}
            </Text>
         </View>

         {/* Connector Arrow (if not last) */}
         {!isLast && <FlowConnector />}
      </View>
   );
});
FlowBlock.displayName = 'FlowBlock';

// --- Main Component ---
export default function EntryCard({
   entry,
   isMenuOpen,
   onToggleMenu,
   onCloseMenu,
   onDelete,
   onMenuLayout,
   closeActiveSwipeable,
}: Prop) {
   const menuRef = useRef<View | null>(null);
   const swipeClosedRecently = useRef(false);
   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';
   const { lock: lockNavigation, locked: navigationLocked } = useNavigationLock();
   
   const colors = {
      hint: isDark ? '#94a3b8' : '#64748b',
      delete: isDark ? '#fb7185' : '#b91c1c',
      elevatedBorder: isDark ? 'rgba(148, 163, 184, 0.45)' : 'rgba(15, 23, 42, 0.06)',
   };

   // --- State ---
   const [truncateState, setTruncateState] = useState<TruncationState>(() =>
      Object.keys(TRUNCATION_LIMITS).reduce(
         (acc, key) => ({ ...acc, [key]: false }),
         {} as TruncationState
      )
   );

   const handleTextLayout = useCallback((key: TruncationKey) => (e: TextLayoutEvent) => {
      const lines = e.nativeEvent.lines.length;
      if (lines > TRUNCATION_LIMITS[key]) {
         setTruncateState(prev => prev[key] ? prev : { ...prev, [key]: true });
      }
   }, []);

   useEffect(() => {
      setTruncateState(
         Object.keys(TRUNCATION_LIMITS).reduce(
            (acc, key) => ({ ...acc, [key]: false }),
            {} as TruncationState
         )
      );
   }, [entry.id]);

   // --- Animations ---
   const menuOpacity = useSharedValue(0);
   const menuScale = useSharedValue(0.5);
   const menuTranslateX = useSharedValue(20);
   const menuTranslateY = useSharedValue(-20);
   const pressProgress = useSharedValue(0);

   const cardAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: 1 + pressProgress.value * 0.015 }],
      borderColor: colors.elevatedBorder,
   }));

   const cardShadow = useMemo(
      () => getShadow({ isDark, preset: 'md' }),
      [isDark]
   );

   const menuShadow = useMemo(
      () => getShadow({ isDark, preset: 'xl' }),
      [isDark]
   );

   const menuStyle = useAnimatedStyle(() => ({
      opacity: menuOpacity.value,
      transform: [
         { translateX: menuTranslateX.value },
         { translateY: menuTranslateY.value },
         { scale: menuScale.value },
      ],
      transformOrigin: 'top right', 
   }));

   useEffect(() => {
      if (isMenuOpen) {
         menuOpacity.value = withTiming(1, { duration: 200 });
         menuScale.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.back(1.2)) });
         menuTranslateX.value = withTiming(0, { duration: 250, easing: Easing.out(Easing.cubic) });
         menuTranslateY.value = withTiming(0, { duration: 250, easing: Easing.out(Easing.cubic) });
      } else {
         menuOpacity.value = withTiming(0, { duration: 150 });
         menuScale.value = withTiming(0.5, { duration: 150 });
         menuTranslateX.value = withTiming(20, { duration: 150 });
         menuTranslateY.value = withTiming(-20, { duration: 150 });
      }
   }, [isMenuOpen, menuOpacity, menuScale, menuTranslateX, menuTranslateY]);

   const measureMenu = useCallback(() => {
      if (!menuRef.current || !onMenuLayout) return;
      menuRef.current.measureInWindow((x, y, width, height) => {
         onMenuLayout({ x, y, width, height });
      });
   }, [onMenuLayout]);

   useEffect(() => {
      if (isMenuOpen) {
         const id = requestAnimationFrame(measureMenu);
         return () => cancelAnimationFrame(id);
      }
   }, [isMenuOpen, measureMenu]);

   const handleOpenEntry = useCallback(() => {
      if (closeActiveSwipeable) {
         const closedId = closeActiveSwipeable();
         if (closedId === entry.id && !swipeClosedRecently.current) {
            swipeClosedRecently.current = true;
            return;
         }
         swipeClosedRecently.current = false;
      }
      if (isMenuOpen) {
         onCloseMenu();
      }
      lockNavigation(() => {
         router.push({ pathname: '/entries/[id]', params: { id: entry.id } });
      });
   }, [closeActiveSwipeable, entry.id, isMenuOpen, lockNavigation, onCloseMenu]);

   const handleEditFromMenu = useCallback(() => {
      lockNavigation(() => {
         onCloseMenu();
         router.push({
            pathname: '/entries/[id]',
            params: { id: entry.id, mode: 'edit' },
         });
      });
   }, [entry.id, lockNavigation, onCloseMenu]);

   return (
      <AnimatedPressable
         className={`p-3 rounded-[24px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 mx-3 my-3 ${cardShadow.className}`}
         style={[cardAnimatedStyle, cardShadow.ios, cardShadow.android]}
         disabled={navigationLocked}
         onPress={handleOpenEntry}
         onPressIn={() => (pressProgress.value = withTiming(1, { duration: 120 }))}
         onPressOut={() => (pressProgress.value = withTiming(0, { duration: 140 }))}
      >
         {/* --- Menu Row --- */}
         <View className="absolute top-4 right-4 z-30">
            <Pressable
               hitSlop={12}
               testID="entry-menu-btn"
               className="w-8 h-8 rounded-full items-center justify-center "
               onPress={onToggleMenu}
            >
               <MoreHorizontal size={18} color={colors.hint} />
            </Pressable>

            <Animated.View
               ref={menuRef}
               pointerEvents={isMenuOpen ? 'auto' : 'none'}
               className={`absolute top-0 right-0 bg-white dark:bg-slate-800 rounded-xl py-2 border border-slate-200 dark:border-slate-700 min-w-[160px] ${menuShadow.className}`}
               style={[menuStyle, menuShadow.ios, menuShadow.android]}
               onLayout={measureMenu}
            >
               <Pressable
                  className="flex-row items-center gap-3 py-3 px-4 active:bg-slate-50 dark:active:bg-slate-700/50"
                  onPress={handleEditFromMenu}
                  disabled={navigationLocked}
                  testID="entry-edit-menu-btn"
               >
                  <Pencil size={18} color={isDark ? '#f8fafc' : '#334155'} />
                  <Text className="text-[15px] font-medium text-slate-700 dark:text-slate-200">Edit Entry</Text>
               </Pressable>
               <View className="h-[1px] bg-slate-100 dark:bg-slate-700 mx-2" />
               <Pressable
                  className="flex-row items-center gap-3 py-3 px-4 active:bg-rose-50 dark:active:bg-rose-900/20"
                  onPress={() => { onCloseMenu(); onDelete(entry); }}
                  testID="entry-delete-btn"
               >
                  <Trash2 size={18} color={colors.delete} />
                  <Text className="text-[15px] font-medium text-rose-600 dark:text-rose-400">Delete</Text>
               </Pressable>
            </Animated.View>
         </View>

         {/* --- SECTION 1: The Spiral (ABC) --- */}
         <View className="bg-slate-50/80 dark:bg-slate-800/40 p-3 pb-5 rounded-2xl mb-2">
            <FlowBreadcrumb steps={['Adversity', 'Belief', 'Consequence']} />
            
            <View className="gap-0.5">
               <FlowBlock 
                  text={entry.adversity} 
                  type="default" 
                  textKey="adversity" 
                  isTruncated={truncateState.adversity}
                  onLayout={handleTextLayout('adversity')}
               />
               <FlowBlock 
                  text={entry.belief} 
                  type="belief" 
                  textKey="belief" 
                  isTruncated={truncateState.belief}
                  onLayout={handleTextLayout('belief')}
               />
               <FlowBlock 
                  text={entry.consequence ?? ''} 
                  type="default" 
                  textKey="consequence" 
                  isTruncated={truncateState.consequence}
                  onLayout={handleTextLayout('consequence')}
                  isLast={true}
               />
            </View>
         </View>

         {/* --- SECTION 2: The Pivot (DE) --- */}
         {!entry.dispute ? (
             <View className="mt-1 px-1">
                 <CardNextButton id={entry.id} />
             </View>
         ) : (
            <View className="bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100/50 dark:border-emerald-800/30 p-3 pb-5 rounded-2xl mt-1">
               <FlowBreadcrumb steps={['Dispute', 'Energy']} />
               
               <View className="gap-0.5">
                  <FlowBlock 
                     text={entry.dispute} 
                     type="dispute" 
                     textKey="dispute" 
                     isTruncated={truncateState.dispute}
                     onLayout={handleTextLayout('dispute')}
                  />
                  <FlowBlock 
                     text={entry.energy ?? ''} 
                     type="energy" 
                     textKey="energy" 
                     isTruncated={truncateState.energy}
                     onLayout={handleTextLayout('energy')}
                     isLast={true}
                  />
               </View>
            </View>
         )}
      </AnimatedPressable>
   );
}