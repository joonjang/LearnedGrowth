import { useMemo } from 'react';
import { TextStyle } from 'react-native';
import {
   useReanimatedKeyboardAnimation,
} from 'react-native-keyboard-controller';
import { useAnimatedStyle } from 'react-native-reanimated';
import { useKeyboardVisible } from './useKeyboardVisible';
import { useResponsiveFont } from './useResponsiveFont';

export type PromptLayoutVariant = 'default' | 'compact';

export function usePromptLayout(variant: PromptLayoutVariant = 'default') {
   const isKeyboardVisible = useKeyboardVisible();
   const { scaleFont } = useResponsiveFont();
   const { progress } = useReanimatedKeyboardAnimation();

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

   const promptTextStyle: TextStyle = useMemo(() => {
      const fontSize = isKeyboardVisible
         ? fontSizes.minFont
         : fontSizes.baseFont;
      return {
         fontSize,
         // lineHeight: Math.round(fontSize * 1.18),
         flexShrink: 1,
         flexWrap: 'wrap' as const,
      };
   }, [isKeyboardVisible, fontSizes]);

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

      const minHeight =
         hidden.min + (shown.min - hidden.min) * progress.value;
      const maxHeight =
         hidden.max + (shown.max - hidden.max) * progress.value;

      return {
         minHeight,
         maxHeight,
      };
   }, [progress, variant]);

   const promptMaxHeight = useMemo(() => {
      if (!isKeyboardVisible) return undefined;
      return variant === 'compact' ? 200 : 240;
   }, [isKeyboardVisible, variant]);

   return { promptTextStyle, inputBoxDims, inputBoxAnimatedStyle, promptMaxHeight };
}
