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

const FONT_BIG = 34;
const FONT_SMALL = 22;

const DEFAULT_CLOSED_HEIGHT = 220; // Default "Big" height
const DEFAULT_OPEN_HEIGHT = 110;   // Default "Small" height

type Config = {
  closedHeight?: number; // Height when keyboard is HIDDEN
  openHeight?: number;   // Height when keyboard is VISIBLE
};

export function useSmoothKeyboard(config: Config = {}) {
  const insets = useSafeAreaInsets();
  
  // Resolve heights: Use config if provided, otherwise default
  const closedHeight = config.closedHeight ?? DEFAULT_CLOSED_HEIGHT;
  const openHeight = config.openHeight ?? DEFAULT_OPEN_HEIGHT;

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
    const fontSize = interpolate(
      progress.value,
      [0, 1],
      [FONT_BIG, FONT_SMALL],
      Extrapolation.CLAMP
    );

    return {
      fontSize,
      lineHeight: fontSize * 1.35, 
    };
  });

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