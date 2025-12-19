import { useMemo } from 'react';
import { TextStyle } from 'react-native';
import { useKeyboardVisible } from './useKeyboardVisible';
import { useResponsiveFont } from './useResponsiveFont';

export type PromptLayoutVariant = 'default' | 'compact';

export function usePromptLayout(variant: PromptLayoutVariant = 'default') {
   const isKeyboardVisible = useKeyboardVisible();
   const { scaleFont } = useResponsiveFont();

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
      if (isKeyboardVisible) {
         if (variant === 'compact') {
            return { minHeight: 100, maxHeight: 160 }; // shrink dispute input when keyboard is up
         }
         return { minHeight: 140, maxHeight: 240 };
      }

      const baseMin = variant === 'compact' ? 140 : 280;
      const baseMax = variant === 'compact' ? 280 : 480;
      return { minHeight: baseMin, maxHeight: baseMax };
   }, [variant, isKeyboardVisible]);

   const promptMaxHeight = useMemo(() => {
      if (!isKeyboardVisible) return undefined;
      return variant === 'compact' ? 200 : 240;
   }, [isKeyboardVisible, variant]);

   return { promptTextStyle, inputBoxDims, promptMaxHeight };
}
