import CardNextButton from '@/components/buttons/CardNextButton';
import { getIosShadowStyle } from '@/lib/shadow';
import { FieldTone, getFieldStyles } from '@/lib/theme';
import { Entry } from '@/models/entry';
import { router } from 'expo-router';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react-native';
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
   dispute: 5,
   energy: 2,
} as const;

type TruncationKey = keyof typeof TRUNCATION_LIMITS;
type TruncationState = Record<TruncationKey, boolean>;

// --- Helper Components ---
const SectionBlock = memo(({ 
   label, 
   text, 
   type, 
   textKey, 
   isTruncated, 
   onLayout 
}: { 
   label: string, 
   text: string, 
   type: FieldTone, 
   textKey: TruncationKey,
   isTruncated: boolean,
   onLayout: (e: TextLayoutEvent) => void
}) => {
   // Use shared theme source
   const styles = getFieldStyles(type, false);

   return (
      <View className="mb-3 mt-2 gap-1.5">
         <Text className="text-[11px] font-semibold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
            {label}
         </Text>
         <View className={`px-3 py-3 rounded-xl border ${styles.container}`}>
            <Text
               className={`text-[15px] leading-[22px] ${styles.text}`}
               onTextLayout={onLayout}
               numberOfLines={isTruncated ? TRUNCATION_LIMITS[textKey] : undefined}
               ellipsizeMode="tail"
            >
               {text}
            </Text>
         </View>
      </View>
   );
});
SectionBlock.displayName = 'SectionBlock';

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

   const iosShadowStyle = useMemo(
      () => getIosShadowStyle({ isDark, preset: 'md' }),
      [isDark]
   );

   const iosMenuShadowStyle = useMemo(
      () => getIosShadowStyle({ isDark, preset: 'xl' }),
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
      router.push({ pathname: '/(tabs)/entries/[id]', params: { id: entry.id } });
   }, [closeActiveSwipeable, entry.id, isMenuOpen, onCloseMenu]);

   return (
      <AnimatedPressable
         className="pt-[22px] px-[18px] pb-[18px] rounded-[18px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-md dark:shadow-none mx-2 my-3"
         style={[cardAnimatedStyle, iosShadowStyle]}
         onPress={handleOpenEntry}
         onPressIn={() => (pressProgress.value = withTiming(1, { duration: 120 }))}
         onPressOut={() => (pressProgress.value = withTiming(0, { duration: 140 }))}
      >
         {/* --- Menu Row --- */}
         <View className="absolute top-3 right-3 z-30">
            <Pressable
               hitSlop={12}
               testID="entry-menu-btn"
               className="w-8 h-8 rounded-full items-center justify-center active:bg-slate-100 dark:active:bg-slate-800"
               onPress={onToggleMenu}
            >
               <MoreHorizontal size={20} color={colors.hint} />
            </Pressable>

            <Animated.View
               ref={menuRef}
               pointerEvents={isMenuOpen ? 'auto' : 'none'}
               className="absolute top-0 right-0 bg-white dark:bg-slate-800 rounded-xl py-2 shadow-xl border border-slate-200 dark:border-slate-700 min-w-[160px]"
               style={[menuStyle, iosMenuShadowStyle]}
               onLayout={measureMenu}
            >
               <Pressable
                  className="flex-row items-center gap-3 py-3 px-4 active:bg-slate-50 dark:active:bg-slate-700/50"
                  onPress={() => { onCloseMenu(); router.push({ pathname: '/(tabs)/entries/[id]', params: { id: entry.id } }); }}
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

         {/* --- Content --- */}
         <SectionBlock 
            label="Adversity" 
            text={entry.adversity} 
            type="default" 
            textKey="adversity" 
            isTruncated={truncateState.adversity}
            onLayout={handleTextLayout('adversity')}
         />
         <SectionBlock 
            label="Belief" 
            text={entry.belief} 
            type="belief" 
            textKey="belief" 
            isTruncated={truncateState.belief}
            onLayout={handleTextLayout('belief')}
         />
         <SectionBlock 
            label="Consequence" 
            text={entry.consequence ?? ''} 
            type="default" 
            textKey="consequence" 
            isTruncated={truncateState.consequence}
            onLayout={handleTextLayout('consequence')}
         />

         {!entry.dispute ? (
            <View className="mt-2">
               <View className="h-[1px] bg-slate-100 dark:bg-slate-800 mb-2" />
               <CardNextButton id={entry.id} />
            </View>
         ) : (
            <>
               <SectionBlock 
                  label="Dispute" 
                  text={entry.dispute} 
                  type="dispute" 
                  textKey="dispute" 
                  isTruncated={truncateState.dispute}
                  onLayout={handleTextLayout('dispute')}
               />
               <SectionBlock 
                  label="Energy" 
                  text={entry.energy ?? ''} 
                  type="energy" 
                  textKey="energy" 
                  isTruncated={truncateState.energy}
                  onLayout={handleTextLayout('energy')}
               />
            </>
         )}
      </AnimatedPressable>
   );
}
