import { useWindowDimensions } from 'react-native';
import {
  KeyboardController,
  useKeyboardHandler,
} from 'react-native-keyboard-controller';
import {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DEFAULT_CLOSED_HEIGHT = 220; // Default "Big" height
const DEFAULT_OPEN_HEIGHT = 110;   // Default "Small" height
const DEFAULT_LINE_HEIGHT_MULTIPLIER = 1.35;
const DEFAULT_PROMPT_HOLD = 0;

type Config = {
  closedHeight?: number; // Height when keyboard is HIDDEN
  openHeight?: number;   // Height when keyboard is VISIBLE
  closedFontSize?: number; // Font size when keyboard is HIDDEN
  openFontSize?: number;   // Font size when keyboard is VISIBLE
  lineHeightMultiplier?: number; // Multiplier for computed line height
  promptHold?: number; // 0-1 range to hold closed font before shrinking
};

export function useSmoothKeyboard(config: Config = {}) {
  const insets = useSafeAreaInsets();

  const { height: screenHeight } = useWindowDimensions();

  // Define breakpoints/ratios
  const isSmallScreen = screenHeight < 750;

  // Calculate dynamic font constants based on screen height
  const baseFontClosed = isSmallScreen ? 36 : 44;
  const baseFontOpen = isSmallScreen ? 24 : 36;
  
  // Resolve heights: Use config if provided, otherwise default
  const closedHeight = config.closedHeight ?? DEFAULT_CLOSED_HEIGHT;
  const openHeight = config.openHeight ?? DEFAULT_OPEN_HEIGHT;
  const closedFontSize = config.closedFontSize ?? baseFontClosed;
  const openFontSize = config.openFontSize ?? baseFontOpen;
  const lineHeightMultiplier =
    config.lineHeightMultiplier ?? DEFAULT_LINE_HEIGHT_MULTIPLIER;
  const promptHold = Math.min(
    Math.max(config.promptHold ?? DEFAULT_PROMPT_HOLD, 0),
    0.95
  );

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

  const animatedPromptStyle = useAnimatedStyle(() => {
    const fontSize = promptHold > 0
      ? interpolate(
          progress.value,
          [0, promptHold, 1],
          [closedFontSize, closedFontSize, openFontSize],
          Extrapolation.CLAMP
        )
      : interpolate(
          progress.value,
          [0, 1],
          [closedFontSize, openFontSize],
          Extrapolation.CLAMP
        );

    return {
      fontSize,
      lineHeight: fontSize * lineHeightMultiplier,
    };
  }, [closedFontSize, openFontSize, lineHeightMultiplier, promptHold]);

  const animatedInputStyle = useAnimatedStyle(() => {
    const height = interpolate(
      progress.value,
      [0, 1],
      [closedHeight, openHeight], // Uses the dynamic values
      Extrapolation.CLAMP
    );

    return { height };
  }, [closedHeight, openHeight]); // Dependencies ensure it updates if props change

  const animatedWrapperStyle = useAnimatedStyle(() => {
    const paddingBottom = Math.max(
       insets.bottom + 10, 
       keyboardHeight.value
    );
    return { paddingBottom };
  }, [insets.bottom]);

  return {
    animatedPromptStyle,
    animatedInputStyle,
    animatedWrapperStyle,
    progress,
  };
}
