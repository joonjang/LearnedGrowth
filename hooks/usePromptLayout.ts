import { useMemo } from 'react';
import { TextStyle } from 'react-native';
import {
   KeyboardController,
   useKeyboardHandler,
} from 'react-native-keyboard-controller';
import {
   interpolate,
   useAnimatedStyle,
   useSharedValue,
} from 'react-native-reanimated';
import { useResponsiveFont } from './useResponsiveFont';

export type PromptLayoutVariant = 'default' | 'compact';

export function usePromptLayout(variant: PromptLayoutVariant = 'default') {
   const { scaleFont } = useResponsiveFont();

   const initialProgress = KeyboardController.isVisible() ? 1 : 0;
   const progress = useSharedValue(initialProgress);
   const height = useSharedValue(0);

   useKeyboardHandler(
      {
         onStart: (e) => {
            'worklet';
            progress.value = e.progress;
            height.value = e.height;
         },
         onMove: (e) => {
            'worklet';
            progress.value = e.progress;
            height.value = e.height;
         },
         onEnd: (e) => {
            'worklet';
            progress.value = e.progress;
            height.value = e.height;
         },
      },
      []
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
         // FIX: Set initial line height explicitly to match animation
         lineHeight: fontSizes.baseFont * 1.3,
         flexShrink: 1,
         flexWrap: 'wrap',
      }),
      [fontSizes.baseFont]
   );

   const promptTextAnimatedStyle = useAnimatedStyle(() => {
      const fontSize = interpolate(
         progress.value,
         [0, 1],
         [fontSizes.baseFont, fontSizes.minFont]
      );
      
      // FIX: Round lineHeight to nearest integer. 
      // Android hates sub-pixel line heights (e.g. 34.42px) and will snap them, causing jumps.
      const lineHeight = Math.round(fontSize * 1.3);
      
      return { fontSize, lineHeight };
   }, [fontSizes, progress]);

   const inputBoxAnimatedStyle = useAnimatedStyle(() => {
      const hidden = {
         min: variant === 'compact' ? 140 : 280,
         max: variant === 'compact' ? 280 : 480,
      };
      const shown = {
         min: variant === 'compact' ? 100 : 140,
         max: variant === 'compact' ? 160 : 240,
      };

      const minHeight = interpolate(progress.value, [0, 1], [hidden.min, shown.min]);
      const maxHeight = interpolate(progress.value, [0, 1], [hidden.max, shown.max]);

      return { minHeight, maxHeight };
   }, [variant, progress]);

   // REMOVED: promptContainerAnimatedStyle
   // We now let the font size naturally dictate the container height.

   const keyboardPaddingStyle = useAnimatedStyle(() => {
      return {
         paddingBottom: height.value,
      };
   }, [height]);

   const inputBoxDims = useMemo(() => {
      const baseMin = variant === 'compact' ? 140 : 280;
      const baseMax = variant === 'compact' ? 280 : 480;
      return { minHeight: baseMin, maxHeight: baseMax };
   }, [variant]);

   return {
      promptTextStyle,
      promptTextAnimatedStyle,
      inputBoxDims,
      inputBoxAnimatedStyle,
      keyboardPaddingStyle,
   };
}