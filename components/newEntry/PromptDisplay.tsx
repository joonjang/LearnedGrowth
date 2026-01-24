import { useDeferredReady } from '@/hooks/useDeferredReady';
import {
   forwardRef,
   Ref,
   useCallback,
   useEffect,
   useImperativeHandle,
   useMemo,
   useRef,
   useState,
} from 'react';
import {
   ScrollView,
   StyleProp,
   StyleSheet,
   TextStyle,
   View,
   ViewStyle,
} from 'react-native';
import Animated, { AnimatedStyle } from 'react-native-reanimated';
import ThreeDotsLoader from '../ThreeDotLoader';

const TYPING_SPEED_MS = 20;

type StopOptions = {
   finish?: boolean;
};

export type PromptDisplayHandle = {
   stop: (options?: StopOptions) => void;
   finish: () => void;
};

type Props = {
   text: string;
   visited: boolean;
   onVisited?: () => void;
   textStyle: TextStyle;
   textAnimatedStyle?: AnimatedStyle<TextStyle>;
   textClassName?: string;
   containerClassName?: string;
   containerStyle?: StyleProp<ViewStyle>;
   containerAnimatedStyle?: AnimatedStyle<ViewStyle>;
   numberOfLines?: number;
   maxHeight?: number;
   scrollEnabled?: boolean;
   delay?: number;
};

function PromptDisplay(
   {
      text,
      visited,
      onVisited,
      textStyle,
      textAnimatedStyle,
      textClassName,
      containerClassName,
      containerStyle,
      containerAnimatedStyle,
      numberOfLines,
      maxHeight,
      scrollEnabled = false,
      delay = 0,
   }: Props,
   ref: Ref<PromptDisplayHandle>,
) {
   const readyToAnimate = useDeferredReady(delay);
   const [revealIndex, setRevealIndex] = useState(0);
   // Used ReturnType to satisfy TypeScript
   const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
   const revealOnVisitedRef = useRef(onVisited);

   useEffect(() => {
      revealOnVisitedRef.current = onVisited;
   }, [onVisited]);

   const clearTimer = () => {
      if (timerRef.current) {
         clearInterval(timerRef.current);
         timerRef.current = null;
      }
   };

   const triggerFinished = useCallback(() => {
      setTimeout(() => {
         revealOnVisitedRef.current?.();
      }, 0);
   }, []);

   const stopReveal = useCallback(
      (finish = false) => {
         clearTimer();
         if (finish) {
            setRevealIndex(text.length);
            triggerFinished();
         }
      },
      [text.length, triggerFinished],
   );

   useImperativeHandle(
      ref,
      () => ({
         stop: (options?: StopOptions) => stopReveal(options?.finish ?? false),
         finish: () => stopReveal(true),
      }),
      [stopReveal],
   );

   useEffect(() => {
      clearTimer();
      if (visited) {
         setRevealIndex(text.length);
         return;
      }
      if (!readyToAnimate || !text) {
         setRevealIndex(0);
         return;
      }
      setRevealIndex(0);
      timerRef.current = setInterval(() => {
         setRevealIndex((prev) => {
            if (prev >= text.length) {
               clearTimer();
               triggerFinished();
               return text.length;
            }
            return prev + 1;
         });
      }, TYPING_SPEED_MS);
      return clearTimer;
   }, [text, visited, readyToAnimate, triggerFinished]);

   const mergedStyle = useMemo(
      () => [{ flexWrap: 'wrap' as const }, textStyle],
      [textStyle],
   );

   // FIX 1: FLASH FIX
   // Changed 'justify-center' to 'flex-1' on the container.
   // We will handle centering inside the ScrollView contentContainerStyle.
   const containerClasses = 'flex-1 min-h-0 px-4 self-stretch w-full pb-4';

   // We use flexGrow: 1 and justifyContent: 'center' to keep text vertically centered
   // while the ScrollView itself stays full height (flex: 1).
   const scrollContentStyle = useMemo(
      () =>
         ({
            flexGrow: 1,
            paddingVertical: 12,
            justifyContent: 'center',
         }) as const,
      [],
   );

   const textClasses =
      `font-bold text-slate-900 dark:text-slate-200 shrink ${textClassName ?? ''}`.trim();
   const showLoader = !visited && !readyToAnimate;

   const stabilityStyle: TextStyle = {
      includeFontPadding: false,
   };

   const content = (
      <View style={{ position: 'relative' }}>
         {/* LAYER 1: Layout Driver (Invisible full text) */}
         <Animated.Text
            className={textClasses}
            style={[
               mergedStyle,
               textAnimatedStyle,
               stabilityStyle,
               { opacity: 0 },
            ]}
            numberOfLines={scrollEnabled ? undefined : numberOfLines}
            textBreakStrategy="simple"
            android_hyphenationFrequency="none"
         >
            {text}
         </Animated.Text>

         {/* LAYER 2: Visible Overlay (Animated partial text) */}
         <View
            style={[StyleSheet.absoluteFill, { justifyContent: 'center' }]}
            pointerEvents="none"
         >
            <Animated.Text
               className={textClasses}
               style={[mergedStyle, textAnimatedStyle, stabilityStyle]}
               numberOfLines={scrollEnabled ? undefined : numberOfLines}
               textBreakStrategy="simple"
               android_hyphenationFrequency="none"
            >
               {text.slice(0, revealIndex)}
            </Animated.Text>
         </View>

         {/* FIX 2: LOADER POSITION
             Changed 'justify-center' to 'justify-start' and added 'pt-24' (approx 96px).
             This puts the loader at the top-center instead of center-center.
             The background matches your theme to cover the text while loading.
         */}
         {showLoader && (
            <View className="absolute inset-0 items-center justify-start bg-slate-50 dark:bg-slate-900">
               <ThreeDotsLoader />
            </View>
         )}
      </View>
   );

   if (!scrollEnabled) {
      return (
         <Animated.View
            className={`${containerClasses} ${containerClassName ?? ''}`}
            style={[containerStyle, containerAnimatedStyle]}
         >
            {content}
         </Animated.View>
      );
   }

   return (
      <Animated.View
         className={`${containerClasses} ${containerClassName ?? ''}`}
         style={[
            containerStyle,
            maxHeight ? { maxHeight, overflow: 'hidden' } : null,
            { overflow: 'hidden' },
            containerAnimatedStyle,
         ]}
      >
         {/* FIX 1 Continued: ScrollView takes flex-1 to stop shrinking/flashing */}
         <ScrollView
            className="flex-1"
            contentContainerStyle={scrollContentStyle}
            scrollEnabled
            showsVerticalScrollIndicator={false}
            bounces={false}
         >
            {content}
         </ScrollView>
      </Animated.View>
   );
}

export default forwardRef(PromptDisplay);
