import * as Haptics from 'expo-haptics';
import { useColorScheme } from 'nativewind';
import { useEffect, useMemo } from 'react';
import { Text, View } from 'react-native';
import Animated, {
   cancelAnimation,
   Easing,
   Extrapolation,
   interpolate,
   interpolateColor,
   useAnimatedReaction,
   useAnimatedStyle,
   useSharedValue,
   withDelay,
   withSequence,
   withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { AI_INSIGHT_ANIMATION } from './animation';

// Updated Helper: Supports 'success' for a stronger finale
function triggerHaptic(type: 'selection' | 'final') {
   'worklet';
   if (type === 'final') {
      // "Success" is a distinct double-tap pattern that feels very "Done"
      scheduleOnRN(
         Haptics.notificationAsync,
         Haptics.NotificationFeedbackType.Success
      );
   } else {
      scheduleOnRN(Haptics.selectionAsync);
   }
}

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

   const theme = useMemo(
      () => ({
         inactiveBg: isDark ? '#0f172a' : '#f8fafc',
         inactiveBorder: isDark ? '#1e293b' : '#f1f5f9',
         inactiveText: isDark ? '#475569' : '#94a3b8',
         
         // Ghost Beam Color
         highlightBg: isDark ? '#334155' : '#e2e8f0', 

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

   const rowVisibility = useSharedValue(skipAnimation ? 1 : 0);
   const revealState = useSharedValue(0);
   const textOpacity = useSharedValue(skipAnimation ? 1 : 0);
   const scannerProgress = useSharedValue(skipAnimation ? targetPosition : -0.2); 
   const impactScale = useSharedValue(1);

   useEffect(() => {
      if (!skipAnimation) {
         revealState.value = 0;
         textOpacity.value = 0;
         scannerProgress.value = -0.2;
         rowVisibility.value = 0;
      }

      if (!skipAnimation) {
         rowVisibility.value = withDelay(
            startDelay, 
            withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) })
         );
      }

      if (skipAnimation) {
         scannerProgress.value = targetPosition;
         revealState.value = withTiming(1, { duration: spectrum.revealSkipDuration });
         textOpacity.value = withTiming(1, { duration: spectrum.revealSkipDuration });
         return;
      }

      const DELAY_UNTIL_SCAN = startDelay + spectrum.scanDelayOffset;
      const SWEEP_DURATION = 1400; 

      const onFinish = (finished: boolean | undefined) => {
         'worklet';
         if (finished) {
            triggerHaptic('final'); // Stronger "Success" haptic
            impactScale.value = withSequence(
               withTiming(0.96, { duration: 100 }),
               withTiming(1, { duration: 200 })
            );
            revealState.value = withTiming(1, { duration: 300 });
            textOpacity.value = withDelay(400, withTiming(1, { duration: 600 }));
         }
      };

      scannerProgress.value = withDelay(
         DELAY_UNTIL_SCAN,
         withSequence(
            withTiming(1.05, { duration: SWEEP_DURATION, easing: Easing.inOut(Easing.sin) }),
            withTiming(
               targetPosition,
               { duration: 700, easing: Easing.out(Easing.cubic) },
               onFinish
            )
         )
      );

      return () => {
         cancelAnimation(scannerProgress);
         cancelAnimation(revealState);
         cancelAnimation(impactScale);
         cancelAnimation(rowVisibility);
         cancelAnimation(textOpacity);
      };
   }, [targetPosition, startDelay, skipAnimation, spectrum, scannerProgress, rowVisibility, revealState, impactScale, textOpacity]);

   // --- ANTICIPATORY HAPTICS ---
   useAnimatedReaction(
      () => scannerProgress.value,
      (current, prev) => {
         if (skipAnimation || !prev || current === prev) return;

         const PILL_CENTERS = [0.0, 0.5, 1.0];
         
         // ANTICIPATION FACTOR:
         // We fire the haptic 0.04 units *before* the beam hits the center.
         // This accounts for bridge latency (~16ms) and perception lag (~50ms),
         // making the "click" feel like it happens exactly when the beam is brightest.
         const OFFSET = 0.04; 

         // Determine direction
         const movingRight = current > prev;

         // Check if we crossed the "Trigger Line" for any pill
         const hit = PILL_CENTERS.find(center => {
            // If moving right, the trigger line is slightly to the left of center (center - OFFSET)
            // If moving left, the trigger line is slightly to the right of center (center + OFFSET)
            const triggerPoint = center + (movingRight ? -OFFSET : OFFSET);
            
            return (prev < triggerPoint && current >= triggerPoint) || 
                   (prev > triggerPoint && current <= triggerPoint);
         });

         if (hit !== undefined && movingRight) {
             triggerHaptic('selection');
         }
      }
   );

   // --- STYLES ---
   const entryStyle = useAnimatedStyle(() => ({
      opacity: rowVisibility.value,
      transform: [{ translateY: interpolate(rowVisibility.value, [0, 1], [10, 0]) }]
   }));

   const usePillLogic = (pillPosition: number, isWinner: boolean, activeType: 'green' | 'red' | 'mixed') => {
      
      const highlightStyle = useAnimatedStyle(() => {
         const dist = Math.abs(scannerProgress.value - pillPosition);
         const opacity = interpolate(dist, [0, 0.5], [1, 0], Extrapolation.CLAMP);

         return {
            opacity: interpolate(revealState.value, [0, 1], [opacity, 0]), 
         };
      });

      const containerStyle = useAnimatedStyle(() => {
         if (revealState.value === 0) {
            return {
                borderColor: theme.inactiveBorder,
                backgroundColor: theme.inactiveBg,
                transform: [{ scale: 1 }]
            };
         }
         
         const finalBg = isWinner ? theme[`${activeType}Bg`] : theme.inactiveBg;
         const finalBorder = isWinner ? theme[`${activeType}Border`] : theme.inactiveBorder;
         
         return {
            backgroundColor: interpolateColor(revealState.value, [0, 1], [theme.inactiveBg, finalBg]),
            borderColor: interpolateColor(revealState.value, [0, 1], [theme.inactiveBorder, finalBorder]),
            transform: [{ scale: isWinner ? impactScale.value : 1 }],
         };
      });

      const textStyle = useAnimatedStyle(() => {
         if (revealState.value === 0) return { color: theme.inactiveText };
         
         const finalText = isWinner ? theme[`${activeType}Text`] : theme.inactiveText;
         return { 
             color: interpolateColor(revealState.value, [0, 1], [theme.inactiveText, finalText]) 
         };
      });

      return { containerStyle, highlightStyle, textStyle };
   };

   const insightAnimStyle = useAnimatedStyle(() => ({
      opacity: textOpacity.value,
      transform: [{ translateY: interpolate(textOpacity.value, [0, 1], [5, 0], Extrapolation.CLAMP) }],
   }));

   const left = usePillLogic(0.0, isOptimistic, 'green');
   const mixed = usePillLogic(0.5, isMixed, 'mixed');
   const right = usePillLogic(1.0, isPessimistic, 'red');
   
   const basePill = 'flex-1 py-2 rounded-lg items-center justify-center border overflow-hidden relative';
   const baseText = 'font-medium text-xs z-10'; 
   const overlayBase = 'absolute top-0 bottom-0 left-0 right-0';

   const pillsVisibleStyle = useAnimatedStyle(() => {
      if(skipAnimation) return { opacity: 1 };
      const showPills = rowVisibility.value > 0.5 ? 1 : 0;
      return { opacity: withTiming(showPills, { duration: 500 }) };
   });

   return (
      <Animated.View className="gap-3" style={entryStyle}>
         <View className="flex-row items-baseline gap-2">
            <Text className="text-sm font-bold text-slate-900 dark:text-slate-100">{label}</Text>
            <Text className="text-xs text-slate-400 dark:text-slate-500">{subLabel}</Text>
         </View>

         {detectedPhrase && (
            <Animated.Text
               style={{ opacity: rowVisibility }}
               className="text-sm italic text-slate-500 dark:text-slate-400"
            >
               &quot;{detectedPhrase}&quot;
            </Animated.Text>
         )}

         <Animated.View className="flex-row items-center gap-1.5" style={pillsVisibleStyle}>
            <Animated.View className={basePill} style={left.containerStyle}>
                <Animated.View style={[left.highlightStyle, { backgroundColor: theme.highlightBg }]} className={overlayBase} />
                <Animated.Text className={baseText} style={left.textStyle}>{leftText}</Animated.Text>
            </Animated.View>

            <Animated.View className={`${basePill} max-w-[20%]`} style={mixed.containerStyle}>
                <Animated.View style={[mixed.highlightStyle, { backgroundColor: theme.highlightBg }]} className={overlayBase} />
                <Animated.Text className={baseText} style={mixed.textStyle}>Mixed</Animated.Text>
            </Animated.View>

            <Animated.View className={basePill} style={right.containerStyle}>
                <Animated.View style={[right.highlightStyle, { backgroundColor: theme.highlightBg }]} className={overlayBase} />
                <Animated.Text className={baseText} style={right.textStyle}>{rightText}</Animated.Text>
            </Animated.View>
         </Animated.View>

         <Animated.View className="pl-1 gap-1" style={insightAnimStyle}>
            <Text className="text-sm leading-6 text-slate-700 dark:text-slate-300">{insight || 'No clear pattern detected.'}</Text>
         </Animated.View>
      </Animated.View>
   );
}
