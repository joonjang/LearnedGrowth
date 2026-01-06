import * as Haptics from 'expo-haptics';
import { useColorScheme } from 'nativewind';
import { useEffect, useMemo } from 'react';
import { Text, View } from 'react-native';
import Animated, {
   Easing,
   Extrapolation,
   FadeIn,
   FadeInDown,
   interpolate,
   interpolateColor,
   useAnimatedReaction,
   useAnimatedStyle,
   useSharedValue,
   withDelay,
   withSequence,
   withSpring,
   withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { AI_INSIGHT_ANIMATION } from './animation';

const HAPTIC_LIGHT = Haptics.ImpactFeedbackStyle.Light;
const HAPTIC_MEDIUM = Haptics.ImpactFeedbackStyle.Medium;

const fireHaptic = (style: Haptics.ImpactFeedbackStyle) => {
   Haptics.impactAsync(style);
};

export function AnimatedSpectrumRow({
   label,
   subLabel,
   leftText,
   rightText,
   score,
   insight,
   detectedPhrase,
   startDelay,
   skipAnimation,
}: {
   label: string;
   subLabel: string;
   leftText: string;
   rightText: string;
   score: string | null | undefined;
   insight?: string | null;
   detectedPhrase?: string | null;
   startDelay: number;
   skipAnimation: boolean;
}) {
   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';
   const spectrum = AI_INSIGHT_ANIMATION.spectrum;

   const lowerScore = score?.toLowerCase() || '';
   const isOptimistic = lowerScore === 'optimistic';
   const isPessimistic = lowerScore === 'pessimistic';
   const isMixed = lowerScore === 'mixed';
   const targetPosition = isOptimistic ? 0 : isPessimistic ? 1 : 0.5;

   // Memoize theme to prevent re-renders
   const theme = useMemo(
      () => ({
         inactiveBg: isDark ? '#0f172a' : '#f8fafc',
         inactiveBorder: isDark ? '#1e293b' : '#f1f5f9',
         inactiveText: isDark ? '#475569' : '#94a3b8',

         // Gaussian Buffer Colors
         bufferBgLow: isDark ? '#0f172a' : '#f8fafc',
         bufferBgHigh: isDark ? 'rgba(99, 102, 241, 0.25)' : '#e0e7ff',
         bufferBorderLow: isDark ? '#1e293b' : '#f1f5f9',
         bufferBorderHigh: isDark ? 'rgba(99, 102, 241, 0.6)' : '#c7d2fe',
         bufferTextLow: isDark ? '#475569' : '#94a3b8',
         bufferTextHigh: isDark ? '#a5b4fc' : '#6366f1',

         // Final Colors
         greenBg: isDark ? 'rgba(6, 95, 70, 0.5)' : '#d1fae5',
         greenBorder: isDark ? '#065f46' : '#a7f3d0',
         greenText: isDark ? '#a7f3d0' : '#065f46',

         redBg: isDark ? 'rgba(136, 19, 55, 0.5)' : '#ffe4e6',
         redBorder: isDark ? '#881337' : '#fecdd3',
         redText: isDark ? '#fecdd3' : '#9f1239',

         mixedBg: isDark ? '#334155' : '#e2e8f0',
         mixedBorder: isDark ? '#475569' : '#cbd5e1',
         mixedText: isDark ? '#f1f5f9' : '#1e293b',
      }),
      [isDark]
   );

   // Shared Values
   const revealState = useSharedValue(0);
   const scannerProgress = useSharedValue(skipAnimation ? targetPosition : 0);
   const impactScale = useSharedValue(1);
   const lastHapticProgress = useSharedValue(-1);

   useEffect(() => {
      // Reset tracked progress each time a new animation run starts.
      lastHapticProgress.value = -1;

      // FAST TRACK: If not fresh analysis, skip logic
      if (skipAnimation) {
         scannerProgress.value = targetPosition;
         revealState.value = withTiming(1, {
            duration: spectrum.revealSkipDuration,
         });
         return;
      }

      // TIMELINE (offsets from startDelay):
      // - Quote begins fade immediately.
      // - Pills fade in after the configured offset.
      // - Scanner starts after the configured offset.

      const DELAY_UNTIL_SCAN = startDelay + spectrum.scanDelayOffset;
      const SWIPE_SPEED = spectrum.swipeSpeed;
      const SWIPE_EASING = Easing.inOut(Easing.sin);

      // FIX: Calculate distance from 0 (Left) because the sequence
      // moves Right -> Left, ending at 0 before the final move.
      const dist = Math.abs(targetPosition - 0);
      const finalDuration = dist === 0 ? 0 : SWIPE_SPEED * dist;

      const onFinish = (finished: boolean | undefined) => {
         if (finished) {
            scheduleOnRN(fireHaptic, HAPTIC_MEDIUM);
            impactScale.value = withSequence(
               withTiming(0.92, {
                  duration: spectrum.impactShrinkDuration,
               }),
               withSpring(1.0, spectrum.impactSpring)
            );
            revealState.value = withDelay(
               spectrum.revealDelayAfterFinish,
               withTiming(1, {
                  duration: spectrum.revealAfterFinishDuration,
               })
            );
         }
      };

      // ANIMATION: Right (1) -> Left (0) -> Target (from 0)
      scannerProgress.value = withDelay(
         DELAY_UNTIL_SCAN,
         withSequence(
            withTiming(1, { duration: SWIPE_SPEED, easing: SWIPE_EASING }),
            withTiming(0, { duration: SWIPE_SPEED, easing: SWIPE_EASING }),
            dist > 0
               ? withTiming(
                    targetPosition,
                    { duration: finalDuration, easing: Easing.out(Easing.sin) },
                    onFinish
                 )
               : withDelay(
                    spectrum.noMoveDelay,
                    withTiming(0, { duration: 0 }, onFinish)
                 )
         )
      );

      return () => {};
   }, [
      targetPosition,
      startDelay,
      skipAnimation,
      spectrum,
      scannerProgress,
      revealState,
      impactScale,
      lastHapticProgress,
   ]);

   // Drive haptics from the UI-thread animation to avoid drift.
   useAnimatedReaction(
      () => scannerProgress.value,
      (current, _prev) => {
         if (skipAnimation) return;
         if (lastHapticProgress.value < 0) {
            lastHapticProgress.value = current;
            return;
         }

         const delta = Math.abs(current - lastHapticProgress.value);
         if (delta >= 0.12) {
            lastHapticProgress.value = current;
            const magnitude = Math.min(1, Math.abs(current - 0.5) * 2);
            scheduleOnRN(
               fireHaptic,
               magnitude > 0.66 ? HAPTIC_MEDIUM : HAPTIC_LIGHT
            );
         }
      }
   );

   const usePillAnimatedStyles = (
      pillPosition: number,
      isWinner: boolean,
      activeType: 'green' | 'red' | 'mixed'
   ) => {
      const containerStyle = useAnimatedStyle(() => {
         const positionDelta = scannerProgress.value - pillPosition;
         const intensity = Math.exp(-Math.pow(positionDelta, 2) / 0.1);

         const currentBufferBg = interpolateColor(
            intensity,
            [0, 1],
            [theme.bufferBgLow, theme.bufferBgHigh]
         );
         const currentBufferBorder = interpolateColor(
            intensity,
            [0, 1],
            [theme.bufferBorderLow, theme.bufferBorderHigh]
         );
         const finalBg = isWinner ? theme[`${activeType}Bg`] : theme.inactiveBg;
         const finalBorder = isWinner
            ? theme[`${activeType}Border`]
            : theme.inactiveBorder;

         return {
            backgroundColor: interpolateColor(
               revealState.value,
               [0, 1],
               [currentBufferBg, finalBg]
            ),
            borderColor: interpolateColor(
               revealState.value,
               [0, 1],
               [currentBufferBorder, finalBorder]
            ),
            transform: [{ scale: isWinner ? impactScale.value : 1 }],
         };
      });

      const textStyle = useAnimatedStyle(() => {
         const positionDelta = scannerProgress.value - pillPosition;
         const intensity = Math.exp(-Math.pow(positionDelta, 2) / 0.15);
         const currentBufferText = interpolateColor(
            intensity,
            [0, 1],
            [theme.bufferTextLow, theme.bufferTextHigh]
         );
         const finalText = isWinner
            ? theme[`${activeType}Text`]
            : theme.inactiveText;

         return {
            color: interpolateColor(
               revealState.value,
               [0, 1],
               [currentBufferText, finalText]
            ),
         };
      });
      return { containerStyle, textStyle };
   };

   const insightAnimStyle = useAnimatedStyle(() => ({
      opacity: revealState.value,
      transform: [
         {
            translateY: interpolate(
               revealState.value,
               [0, 1],
               [10, 0],
               Extrapolation.CLAMP
            ),
         },
      ],
   }));

   const leftStyles = usePillAnimatedStyles(0.0, isOptimistic, 'green');
   const mixedStyles = usePillAnimatedStyles(0.5, isMixed, 'mixed');
   const rightStyles = usePillAnimatedStyles(1.0, isPessimistic, 'red');
   const basePill = 'flex-1 py-2 rounded-lg items-center justify-center border';
   const baseText = 'font-medium text-xs';

   // CHANGE: Pills appear sooner (offset lives in AI_INSIGHT_ANIMATION).
   const PILLS_ENTRY_DELAY = startDelay + spectrum.pillsEntryOffset;

   return (
      <View className="gap-3">
         <View className="flex-row items-baseline gap-2">
            <Text className="text-sm font-bold text-slate-900 dark:text-slate-100">
               {label}
            </Text>
            <Text className="text-xs text-slate-400 dark:text-slate-500">
               {subLabel}
            </Text>
         </View>

         {detectedPhrase && (
            <Animated.Text
               entering={FadeInDown.delay(startDelay).duration(
                  spectrum.phraseEntryDuration
               )}
               className="text-sm italic text-slate-500 dark:text-slate-400"
            >
               &quot;{detectedPhrase}&quot;
            </Animated.Text>
         )}

         <Animated.View
            className="flex-row items-center gap-1.5"
            entering={
               skipAnimation
                  ? undefined
                  : FadeIn.delay(PILLS_ENTRY_DELAY).duration(
                       spectrum.pillsEntryDuration
                    )
            }
         >
            <Animated.View className={basePill} style={leftStyles.containerStyle}>
               <Animated.Text className={baseText} style={leftStyles.textStyle}>
                  {leftText}
               </Animated.Text>
            </Animated.View>

            <Animated.View
               className={`${basePill} max-w-[20%]`}
               style={mixedStyles.containerStyle}
            >
               <Animated.Text className={baseText} style={mixedStyles.textStyle}>
                  Mixed
               </Animated.Text>
            </Animated.View>

            <Animated.View className={basePill} style={rightStyles.containerStyle}>
               <Animated.Text className={baseText} style={rightStyles.textStyle}>
                  {rightText}
               </Animated.Text>
            </Animated.View>
         </Animated.View>

         <Animated.View className="pl-1 gap-1" style={insightAnimStyle}>
            <Text className="text-sm leading-6 text-slate-700 dark:text-slate-300">
               {insight || 'No clear pattern detected.'}
            </Text>
         </Animated.View>
      </View>
   );
}
