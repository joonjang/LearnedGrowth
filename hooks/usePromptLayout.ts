import { useMemo } from 'react';
import { TextStyle, useWindowDimensions } from 'react-native';
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

export function usePromptLayout() {
   const { height: screenHeight } = useWindowDimensions();
   const { scaleFont } = useResponsiveFont();

   // 0 = Closed, 1 = Open
   const initialProgress = KeyboardController.isVisible() ? 1 : 0;
   const progress = useSharedValue(initialProgress);
   const keyboardHeight = useSharedValue(0);

   useKeyboardHandler(
      {
         onStart: (e) => {
            'worklet';
            progress.value = e.progress;
            keyboardHeight.value = e.height;
         },
         onMove: (e) => {
            'worklet';
            progress.value = e.progress;
            keyboardHeight.value = e.height;
         },
         onEnd: (e) => {
            'worklet';
            progress.value = e.progress;
            keyboardHeight.value = e.height;
         },
      },
      []
   );

   // --- 1. Dynamic Heights ---
   const layoutConfig = useMemo(() => {
      const isSmallScreen = screenHeight < 700;

      // State A: KEYBOARD CLOSED (Big Box)
      // Takes up ~32% of screen. Spacious.
      const tallHeight = Math.floor(screenHeight * 0.32);

      // State B: KEYBOARD OPEN (Small Box)
      // AGGRESSIVE SHRINK: Only 15-16% of screen. 
      // This leaves maximum room for the prompt.
      // on iPhone SE: ~105px height (enough for ~3 lines of text)
      const shortRatio = isSmallScreen ? 0.16 : 0.15;
      const shortHeight = Math.floor(screenHeight * shortRatio);

      return { tallHeight, shortHeight, isSmallScreen };
   }, [screenHeight]);

   // --- 2. Dynamic Font Sizing ---
   const fontSizes = useMemo(() => {
      const { isSmallScreen } = layoutConfig;
      return {
         // Base: Huge text when just reading
         base: isSmallScreen 
            ? scaleFont(30, { min: 26, max: 34 }) 
            : scaleFont(38, { min: 30, max: 44 }),

         // Min: When typing, we keep it RELATIVELY large now because
         // we made the input box smaller to compensate.
         min: isSmallScreen
            ? scaleFont(24, { min: 22, max: 26 }) // Kept large!
            : scaleFont(28, { min: 26, max: 32 }),
      };
   }, [layoutConfig, scaleFont]);

   // --- Styles ---

   const promptTextStyle: TextStyle = useMemo(
      () => ({
         fontSize: fontSizes.base,
         lineHeight: Math.round(fontSizes.base * 1.3),
      }),
      [fontSizes.base]
   );

   const promptTextAnimatedStyle = useAnimatedStyle(() => {
      const fontSize = interpolate(
         progress.value,
         [0, 1],
         [fontSizes.base, fontSizes.min]
      );
      
      const lineHeight = Math.round(fontSize * 1.3);
      
      return { fontSize, lineHeight };
   }, [fontSizes]);

   const inputBoxAnimatedStyle = useAnimatedStyle(() => {
      // Smoothly interpolate height from Big -> Small
      const height = interpolate(
         progress.value,
         [0, 1], 
         [layoutConfig.tallHeight, layoutConfig.shortHeight]
      );

      return { height };
   }, [layoutConfig]);

   const keyboardPaddingStyle = useAnimatedStyle(() => {
      return {
         paddingBottom: keyboardHeight.value,
      };
   }, []);

   const inputBoxDims = useMemo(() => ({
      height: layoutConfig.tallHeight, 
   }), [layoutConfig.tallHeight]);

   return {
      promptTextStyle,
      promptTextAnimatedStyle,
      inputBoxDims,
      inputBoxAnimatedStyle,
      keyboardPaddingStyle,
   };
}