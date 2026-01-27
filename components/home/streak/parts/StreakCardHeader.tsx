import { HOME_ICON_DARK, HOME_ICON_LIGHT } from '@/lib/styles';
import { cx } from '@/lib/utils';
import {
   CalendarCheck,
   CalendarDays,
   Flame,
   Sprout
} from 'lucide-react-native';
import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
   FadeIn,
   useAnimatedStyle,
   useSharedValue,
   withRepeat,
   withSequence,
   withTiming,
} from 'react-native-reanimated';

type StreakCardHeaderProps = {
   streakCount: number;
   activeCount: number;
   isCurrentWeek: boolean;
   monthName: string;
   currentYear: number;
   encouragement?: string | null;
   isDark: boolean;
   isLoading?: boolean; // <--- New Prop
};

// --- Skeleton Component ---
const SkeletonItem = ({
   width,
   height,
   borderRadius = 8,
}: {
   width: number | string;
   height: number;
   borderRadius?: number;
}) => {
   const opacity = useSharedValue(0.3);
   useEffect(() => {
      opacity.value = withRepeat(
         withSequence(
            withTiming(0.7, { duration: 800 }),
            withTiming(0.3, { duration: 800 }),
         ),
         -1,
         true,
      );
   }, [opacity]);
   const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
   return (
      <Animated.View
         style={[style, { width: width as any, height, borderRadius }]}
         className="bg-slate-200 dark:bg-slate-700"
      />
   );
};

export function StreakCardHeader({
   streakCount,
   activeCount,
   isCurrentWeek,
   monthName,
   currentYear,
   encouragement,
   isDark,
   isLoading = false,
}: StreakCardHeaderProps) {
   const hasStreak = streakCount > 0;
   const iconColor = isDark ? HOME_ICON_DARK : HOME_ICON_LIGHT;

   const badgeClassName = cx(
      'flex-row items-center gap-1.5 px-2.5 py-1 rounded-full border',
      isCurrentWeek
         ? hasStreak
            ? 'bg-orange-50 border-orange-100 dark:bg-[rgba(124,45,18,0.2)] dark:border-[rgba(124,45,18,0.3)]'
            : 'bg-slate-50 border-slate-100 dark:bg-slate-800 dark:border-slate-700'
         : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700',
   );

   const badgeTextClassName = cx(
      'text-xs font-bold',
      isCurrentWeek
         ? hasStreak
            ? 'text-orange-700 dark:text-orange-400'
            : 'text-slate-400'
         : 'text-indigo-600 dark:text-indigo-300',
   );

   return (
      <View className="px-5 pt-4 pb-2">
         {/* TOP ROW */}
         <View className="flex-row items-center justify-between mb-3 h-8">
            <View className="flex-row items-center gap-2">
               {isCurrentWeek ? (
                  <Sprout size={16} color={iconColor} className="dark:hidden" />
               ) : (
                  <CalendarDays
                     size={16}
                     color={iconColor}
                     className="dark:hidden"
                  />
               )}
               <Text className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  {isCurrentWeek ? 'Days of Growth' : 'Weekly Activity'}
               </Text>
            </View>

            {/* RIGHT SIDE: Skeleton OR Animated Badge */}
            {isLoading ? (
               <SkeletonItem width={100} height={28} borderRadius={99} />
            ) : (
               <Animated.View
                  className={badgeClassName}
                  entering={FadeIn.duration(500)} // Smooth fade, no growing
               >
                  {isCurrentWeek ? (
                     <Flame
                        size={14}
                        color={hasStreak ? '#f97316' : '#94a3b8'}
                        fill={hasStreak ? '#f97316' : 'transparent'}
                     />
                  ) : (
                     <CalendarCheck
                        size={14}
                        color={hasStreak ? '#4f46e5' : '#4f46e5'}
                     />
                  )}
                  <Text className={badgeTextClassName} numberOfLines={1}>
                     {isCurrentWeek
                        ? `${streakCount} Day Streak`
                        : `${activeCount}/7 Days Reframed`}
                  </Text>
               </Animated.View>
            )}
         </View>

         {/* BOTTOM ROW */}
         <View className="mb-3 pl-0.5 min-h-[36px] justify-center">
            <Text className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
               {monthName} {currentYear}
            </Text>

            {/* ENCOURAGEMENT: Skeleton OR Text */}
            {isCurrentWeek && (
               <>
                  {isLoading ? (
                     <View className="mt-1">
                        <SkeletonItem width="80%" height={14} />
                     </View>
                  ) : (
                     encouragement && (
                        <Animated.View entering={FadeIn.duration(400)}>
                           <Text className="text-xs font-medium text-slate-600 dark:text-slate-300 italic">
                              {encouragement}
                           </Text>
                        </Animated.View>
                     )
                  )}
               </>
            )}
         </View>
      </View>
   );
}
