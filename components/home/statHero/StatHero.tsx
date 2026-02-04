import { getShadow } from '@/lib/shadow';
import { CARD_PRESS_STYLE, DISPUTE_CTA_CLASS } from '@/lib/styles';
import { Entry } from '@/models/entry';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import Animated, {
   FadeIn,
   FadeOut,
   LinearTransition,
   useAnimatedStyle,
   useSharedValue,
   withRepeat,
   withSequence,
   withTiming,
} from 'react-native-reanimated';

// --- Types & Logic ---
export type ResolutionStats = {
   label: string;
   subtext: string;
   colorClass: string;
   barColor: string;
   percent: number;
   resolvedCount: number;
   total: number;
};

export function getResolutionStatus(
   entries: Entry[],
   isDark: boolean,
   t: (key: string) => string,
): ResolutionStats {
   const total = entries.length;
   const resolvedCount = entries.filter(
      (e) => (e.dispute ?? '').trim().length > 5,
   ).length;

   if (total === 0) {
      return {
         label: t('home.stat_hero.ready_title'),
         subtext: t('home.stat_hero.ready_subtext'),
         colorClass: 'text-slate-500 dark:text-slate-400',
         barColor: isDark ? '#334155' : '#cbd5e1',
         percent: 0,
         resolvedCount: 0,
         total: 0,
      };
   }

   const ratio = resolvedCount / total;
   const percent = Math.round(ratio * 100);

   if (ratio >= 0.8) {
      return {
         label: t('home.stat_hero.resilience_title'),
         subtext: t('home.stat_hero.resilience_subtext'),
         colorClass: 'text-indigo-600 dark:text-indigo-400',
         barColor: isDark ? '#818cf8' : '#4f46e5',
         percent,
         resolvedCount,
         total,
      };
   }

   if (ratio >= 0.5) {
      return {
         label: t('home.stat_hero.steady_title'),
         subtext: t('home.stat_hero.steady_subtext'),
         colorClass: 'text-slate-600 dark:text-slate-300',
         barColor: isDark ? '#94a3b8' : '#64748b',
         percent,
         resolvedCount,
         total,
      };
   }

   return {
      label: t('home.stat_hero.capturing_title'),
      subtext: t('home.stat_hero.capturing_subtext'),
      colorClass: 'text-amber-600 dark:text-amber-500',
      barColor: isDark ? '#fbbf24' : '#d97706',
      percent,
      resolvedCount,
      total,
   };
}

// --- SKELETON COMPONENT ---
function StatHeroSkeleton() {
   const opacity = useSharedValue(0.4);

   useEffect(() => {
      opacity.value = withRepeat(
         withSequence(
            withTiming(0.8, { duration: 1000 }),
            withTiming(0.4, { duration: 1000 }),
         ),
         -1,
         true,
      );
   }, [opacity]);

   const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

   return (
      <Animated.View
         // Clean fade for the skeleton itself
         entering={FadeIn.duration(300)}
         exiting={FadeOut.duration(300)}
         className="px-4 py-6 flex-row justify-between items-start"
      >
         {/* Left Side Skeleton */}
         <View className="flex-1 pr-6 pt-1 gap-3">
            <Animated.View
               style={animatedStyle}
               className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded-md"
            />
            <View className="gap-2">
               <Animated.View
                  style={animatedStyle}
                  className="h-5 w-full bg-slate-200 dark:bg-slate-800 rounded-md"
               />
               <Animated.View
                  style={animatedStyle}
                  className="h-5 w-2/3 bg-slate-200 dark:bg-slate-800 rounded-md"
               />
            </View>
            <Animated.View
               style={animatedStyle}
               className="h-8 w-40 bg-slate-200 dark:bg-slate-800 rounded-full mt-2"
            />
         </View>

         {/* Right Side Skeleton */}
         <View className="items-end gap-2">
            <Animated.View
               style={animatedStyle}
               className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded-sm mb-1"
            />
            <Animated.View
               style={animatedStyle}
               className="h-16 w-20 bg-slate-200 dark:bg-slate-800 rounded-xl"
            />
            <Animated.View
               style={animatedStyle}
               className="h-3 w-14 bg-slate-200 dark:bg-slate-800 rounded-sm"
            />
         </View>
      </Animated.View>
   );
}

// --- MAIN COMPONENT ---
type StatHeroProps = {
   resolutionStats: ResolutionStats;
   needsAttentionCount: number;
   onOpenNeedsAttention: () => void;
   isDark: boolean;
   isLoading?: boolean;
};

export default function StatHero({
   resolutionStats,
   needsAttentionCount,
   onOpenNeedsAttention,
   isDark,
   isLoading = false,
}: StatHeroProps) {
   const { t } = useTranslation();
   const labelColor = 'text-slate-400 dark:text-slate-500';
   const [isPressed, setIsPressed] = useState(false);

   const buttonShadow = useMemo(
      () =>
         getShadow({
            isDark,
            preset: 'button',
            androidElevation: 3,
            colorLight: '#000000',
         }),
      [isDark],
   );

   if (isLoading) {
      return <StatHeroSkeleton />;
   }

   return (
      <Animated.View
         // CHANGED: Use simple FadeIn for smooth Skeleton replacement
         entering={FadeIn.duration(500)}
         layout={LinearTransition.springify()}
         className="px-4 pb-6"
      >
         <View className="flex-row justify-between items-start">
            <View className="items-end pr-6">
               <View className="self-end mb-1 flex-row items-center">
                  <Text
                     className={`text-[10px] font-bold uppercase tracking-[3px] ${labelColor} mr-1`}
                  >
                     {t('home.stat_hero.reframed_label')}
                  </Text>
               </View>

               <Text
                  className={`font-black tracking-tighter ${resolutionStats.colorClass} mt-1 mr-1`}
                  style={{
                     fontSize: 64,
                     lineHeight: 64,
                     includeFontPadding: false,
                     fontVariant: ['tabular-nums'],
                  }}
               >
                  {resolutionStats.resolvedCount}
               </Text>
            </View>

            <View className="flex-1">
               <Text
                  className={`text-sm font-bold uppercase tracking-widest mb-1.5 ${resolutionStats.colorClass}`}
               >
                  {resolutionStats.label}
               </Text>

               <Text
                  className={`text-base font-medium ${labelColor} leading-6 mb-4`}
               >
                  {resolutionStats.subtext}
               </Text>

               {/* Action Pill */}
               {needsAttentionCount > 0 && (
                  <Pressable
                     onPress={onOpenNeedsAttention}
                     onPressIn={() => setIsPressed(true)}
                     onPressOut={() => setIsPressed(false)}
                     className={`self-start flex-row items-center rounded-full px-4 py-2 active:opacity-80 ${DISPUTE_CTA_CLASS}`}
                     style={[
                        buttonShadow.ios,
                        buttonShadow.android,
                        isPressed && CARD_PRESS_STYLE.cardPressed,
                     ]}
                  >
                     <Text className="text-[11px] font-bold uppercase tracking-wider text-white">
                        {t('home.stat_hero.needs_reframe', {
                           count: needsAttentionCount,
                        })}
                     </Text>
                  </Pressable>
               )}
            </View>
         </View>
      </Animated.View>
   );
}
