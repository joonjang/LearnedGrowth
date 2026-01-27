import { CARD_PRESS_STYLE, DISPUTE_CTA_CLASS } from '@/lib/styles';
import { getShadow } from '@/lib/shadow';
import { Entry } from '@/models/entry';
import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
    FadeInDown,
    LinearTransition,
} from 'react-native-reanimated';

export type ResolutionStats = {
   label: string;
   subtext: string;
   colorClass: string;
   barColor: string; // Kept for type compatibility, even if unused in UI
   percent: number;
   resolvedCount: number;
   total: number;
};

// [Logic kept exactly as you provided]
export function getResolutionStatus(
   entries: Entry[],
   isDark: boolean,
): ResolutionStats {
   const total = entries.length;
   const resolvedCount = entries.filter(
      (e) => (e.dispute ?? '').trim().length > 5,
   ).length;

   if (total === 0) {
      return {
         label: 'Ready to Start',
         subtext: 'Your journal is waiting for your first thought.',
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
         label: 'Thoughts Reframed',
         subtext: 'You have successfully reframed your thoughts.',
         colorClass: 'text-indigo-600 dark:text-indigo-400',
         barColor: isDark ? '#818cf8' : '#4f46e5',
         percent,
         resolvedCount,
         total,
      };
   }

   if (ratio >= 0.5) {
      return {
         label: 'Processing',
         subtext: 'You are actively working through your thoughts.',
         colorClass: 'text-slate-600 dark:text-slate-300',
         barColor: isDark ? '#94a3b8' : '#64748b',
         percent,
         resolvedCount,
         total,
      };
   }

   return {
      label: 'Noting Thoughts',
      subtext: `You are capturing what's on your mind.`,
      colorClass: 'text-amber-600 dark:text-amber-500',
      barColor: isDark ? '#fbbf24' : '#d97706',
      percent,
      resolvedCount,
      total,
   };
}

type StatHeroProps = {
   resolutionStats: ResolutionStats;
   needsAttentionCount: number;
   onOpenNeedsAttention: () => void;
   isDark: boolean;
};

export default function StatHero({
   resolutionStats,
   needsAttentionCount,
   onOpenNeedsAttention,
   isDark,
}: StatHeroProps) {
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

   return (
      <Animated.View
         entering={FadeInDown.duration(600).springify()}
         layout={LinearTransition.springify()}
         className="px-4 py-6" // Added horizontal padding for breathing room
      >
         {/* Container: Row layout, items aligned to top */}
         <View className="flex-row justify-between items-start">
            {/* LEFT: Context & Actions */}
            <View className="flex-1 pr-6 pt-1">
               <Text
                  className={`text-sm font-bold uppercase tracking-widest mb-1.5 ${resolutionStats.colorClass}`}
               >
                  {resolutionStats.label}
               </Text>
               <Text
                  className={`text-base font-medium ${labelColor} leading-6 mb-4`} // Increased text size slightly for readability
               >
                  {resolutionStats.subtext}
               </Text>

               {/* Action Pill - Only renders if needed */}
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
                     {/* Optional: You could add a small icon here like a pencil or arrow */}
                     <Text
                        className={`text-[11px] font-bold uppercase tracking-wider text-white`}
                     >
                        {needsAttentionCount}{' '}
                        {needsAttentionCount === 1
                           ? 'Entry needs'
                           : 'Entries need'}{' '}
                        reframe
                     </Text>
                  </Pressable>
               )}
            </View>

            {/* RIGHT: Big Stat (No border, cleaner alignment) */}
            <View className="items-end">
               <Text
                  className={`font-black tracking-tighter ${resolutionStats.colorClass}`}
                  style={{
                     fontSize: 64, // Bumped size slightly for impact
                     lineHeight: 64, // Tight line height to prevent float
                     includeFontPadding: false,
                  }}
               >
                  {resolutionStats.resolvedCount}
               </Text>
               <Text
                  className={`text-[10px] font-bold uppercase tracking-[3px] ${labelColor} mt-1 mr-1`}
               >
                  Reframed
               </Text>
            </View>
         </View>
      </Animated.View>
   );
}
