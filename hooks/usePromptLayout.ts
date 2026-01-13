import { useMemo } from 'react';
import { TextStyle } from 'react-native';
import {
   KeyboardController,
   useReanimatedKeyboardAnimation,
} from 'react-native-keyboard-controller';
import {
   Easing,
   interpolate,
   useAnimatedReaction,
   useAnimatedStyle,
   useSharedValue,
   withTiming,
} from 'react-native-reanimated';
import { useKeyboardVisible } from './useKeyboardVisible';
import { useResponsiveFont } from './useResponsiveFont';

export type PromptLayoutVariant = 'default' | 'compact';

export function usePromptLayout(variant: PromptLayoutVariant = 'default') {
   const { scaleFont } = useResponsiveFont();
   const { progress } = useReanimatedKeyboardAnimation();
   const isKeyboardVisible = useKeyboardVisible();
   const initialTarget = KeyboardController.isVisible?.() ? 1 : 0;
   const smoothProgress = useSharedValue(initialTarget);

   // Follow native keyboard progress; only smooth large jumps (common on Android).
   useAnimatedReaction(
      () => progress.value,
      (next, prev) => {
         if (prev == null) {
            smoothProgress.value = next;
            return;
         }
         const delta = Math.abs(next - prev);
         if (delta > 0.2) {
            smoothProgress.value = withTiming(next, {
               duration: 200,
               easing: Easing.out(Easing.cubic),
            });
            return;
         }
         smoothProgress.value = next;
      }
   );

   const fontSizes = useMemo(() => {
      if (variant === 'compact') {
         return {
            baseFont: scaleFont(30, { min: 22, max: 40, factor: 0.35 }),
            minFont: scaleFont(24, { min: 20, max: 32, factor: 0.35 }),
         };
      }
      return {
         baseFont: scaleFont(38, { min: 26, max: 48, factor: 0.4 }),
         minFont: scaleFont(30, { min: 22, max: 40, factor: 0.4 }),
      };
   }, [variant, scaleFont]);

   const promptTextStyle: TextStyle = useMemo(
      () => ({
         fontSize: fontSizes.baseFont,
         // lineHeight: Math.round(fontSizes.baseFont * 1.18),
         flexShrink: 1,
         flexWrap: 'wrap' as const,
      }),
      [fontSizes.baseFont]
   );

   const promptTextAnimatedStyle = useAnimatedStyle(
      () => {
         const fontSize = interpolate(
            smoothProgress.value,
            [0, 1],
            [fontSizes.baseFont, fontSizes.minFont]
         );
         return { fontSize };
      },
      [fontSizes.baseFont, fontSizes.minFont, smoothProgress]
   );

   const promptTextMeasureStyle = useAnimatedStyle(
      () => {
         const fontSize = interpolate(
            smoothProgress.value,
            [0, 1],
            [fontSizes.baseFont, fontSizes.minFont]
         );
         return { fontSize };
      },
      [fontSizes.baseFont, fontSizes.minFont, smoothProgress]
   );

   const inputBoxDims = useMemo(() => {
      // Base (keyboard hidden) dims to keep the component shape consistent before animation kicks in.
      const baseMin = variant === 'compact' ? 140 : 280;
      const baseMax = variant === 'compact' ? 280 : 480;
      return { minHeight: baseMin, maxHeight: baseMax };
   }, [variant]);

   const inputBoxAnimatedStyle = useAnimatedStyle(() => {
      const hidden = {
         min: variant === 'compact' ? 140 : 280,
         max: variant === 'compact' ? 280 : 480,
      };
      const shown = {
         min: variant === 'compact' ? 100 : 140,
         max: variant === 'compact' ? 160 : 240,
      };

      const minHeight = interpolate(
         smoothProgress.value,
         [0, 1],
         [hidden.min, shown.min]
      );
      const maxHeight = interpolate(
         smoothProgress.value,
         [0, 1],
         [hidden.max, shown.max]
      );

      return {
         minHeight,
         maxHeight,
      };
   }, [smoothProgress, variant]);

   const promptContainerAnimatedStyle = useAnimatedStyle(
      () => {
         const shownMax = variant === 'compact' ? 200 : 240;
         const maxHeight = interpolate(
            smoothProgress.value,
            [0, 1],
            [10000, shownMax]
         );
         return { maxHeight };
      },
      [smoothProgress, variant]
   );

   return {
      promptTextStyle,
      promptTextAnimatedStyle,
      promptTextMeasureStyle,
      promptLineBreakKey: isKeyboardVisible ? 'keyboard' : 'default',
      promptContainerAnimatedStyle,
      inputBoxDims,
      inputBoxAnimatedStyle,
   };
}
