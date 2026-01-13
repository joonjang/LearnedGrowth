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
   Platform,
   ScrollView,
   StyleProp,
   Text,
   TextStyle,
   View,
   ViewStyle
} from 'react-native';
import Animated, { AnimatedStyle } from 'react-native-reanimated';
import ThreeDotsLoader from '../ThreeDotLoader';

const TYPING_SPEED = 35;
const CHAR_PER_TICK = 1;


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
   textMeasureStyle?: AnimatedStyle<TextStyle>;
   lineBreakKey?: string | number;
   textClassName?: string;
   containerClassName?: string;
   containerStyle?: StyleProp<ViewStyle>;
   containerAnimatedStyle?: AnimatedStyle<ViewStyle>;
   numberOfLines?: number;
   maxHeight?: number;
   scrollEnabled?: boolean;
   freezeLineBreaks?: boolean;
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
   }: Props,
   ref: Ref<PromptDisplayHandle>
) {
   const readyToAnimate = useDeferredReady(1200);
   const [revealVisibleText, setRevealVisibleText] = useState('');
   const revealTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
   const revealProgressRef = useRef(0);
   const revealFinishedRef = useRef(false);
   const revealTextRef = useRef(text);
   const revealOnVisitedRef = useRef(onVisited);
   const prevRevealTextRef = useRef(text);

   useEffect(() => {
      revealOnVisitedRef.current = onVisited;
   }, [onVisited]);

   const updateReveal = useCallback((rawIndex: number) => {
      const fullText = revealTextRef.current ?? '';
      const safeIndex = Math.max(0, Math.min(rawIndex, fullText.length));
      setRevealVisibleText(fullText.slice(0, safeIndex));
   }, []);

   const clearRevealTimer = useCallback(() => {
      if (revealTimerRef.current) {
         clearInterval(revealTimerRef.current);
         revealTimerRef.current = null;
      }
   }, []);

   const runFinished = useCallback(() => {
      if (revealFinishedRef.current) return;
      revealFinishedRef.current = true;
      revealOnVisitedRef.current?.();
   }, []);

   const stopReveal = useCallback(
      (finish = false) => {
         clearRevealTimer();
         if (finish) {
            revealProgressRef.current = revealTextRef.current.length;
            updateReveal(revealProgressRef.current);
            runFinished();
         }
      },
      [clearRevealTimer, runFinished, updateReveal]
   );

   useImperativeHandle(
      ref,
      () => ({
         stop: (options?: StopOptions) =>
            stopReveal(options?.finish ?? false),
         finish: () => stopReveal(true),
      }),
      [stopReveal]
   );

   useEffect(() => {
      revealTextRef.current = text;
      if (!text) {
         setRevealVisibleText('');
         prevRevealTextRef.current = text;
         return;
      }
      const isNewText = prevRevealTextRef.current !== text;
      if (isNewText) {
         revealProgressRef.current = 0;
         revealFinishedRef.current = false;
         updateReveal(0);
      } else {
         updateReveal(revealProgressRef.current);
      }
      prevRevealTextRef.current = text;
   }, [text, updateReveal]);

   const mergedStyle = useMemo(
      () => [{ flexWrap: 'wrap' as const }, textStyle],
      [textStyle]
   );
   const containerClasses =
      'justify-center min-h-0 px-4 self-stretch w-full pb-4';
   const scrollContentStyle = useMemo(
      () => ({ flexGrow: 0, paddingVertical: 12 }),
      []
   );
   const effectiveNumberOfLines = scrollEnabled ? undefined : numberOfLines;
   const textBreakStrategy =
      Platform.OS === 'android' ? 'highQuality' : undefined;
   const lineBreakStrategyIOS =
      Platform.OS === 'ios' ? 'standard' : undefined;
   const displayText = text;
   const loaderClasses = 'items-center min-h-[1px]';
   const textClasses = `font-bold text-slate-900 dark:text-slate-200 shrink ${textClassName ?? ''}`.trim();
   const safeRevealVisibleText =
      text && revealVisibleText && text.startsWith(revealVisibleText)
         ? revealVisibleText
         : '';

   const loader = (
      <View
         className={loaderClasses}
      >
         <ThreeDotsLoader />
      </View>
   );

   const canReveal = readyToAnimate;

   useEffect(() => {
      clearRevealTimer();
      if (visited || !canReveal) return;
      revealFinishedRef.current = false;
      if (!revealTextRef.current) {
         setRevealVisibleText('');
         runFinished();
         return;
      }
      revealTimerRef.current = setInterval(() => {
         const nextIndex = Math.min(
            revealProgressRef.current + CHAR_PER_TICK,
            revealTextRef.current.length
         );

         revealProgressRef.current = nextIndex;
         updateReveal(nextIndex);

         if (nextIndex >= revealTextRef.current.length) {
            clearRevealTimer();
            runFinished();
         }
      }, TYPING_SPEED);

      return clearRevealTimer;
   }, [
      canReveal,
      clearRevealTimer,
      runFinished,
      updateReveal,
      visited,
      text,
   ]);

   const staticText = (
      <Animated.Text
         className={textClasses}
         style={[mergedStyle, textAnimatedStyle]}
         numberOfLines={effectiveNumberOfLines}
         textBreakStrategy={textBreakStrategy}
         lineBreakStrategyIOS={lineBreakStrategyIOS}
         adjustsFontSizeToFit={false}
         minimumFontScale={1}
         allowFontScaling
      >
         {displayText}
      </Animated.Text>
   );
   const revealText = (
      <Animated.Text
         className={textClasses}
         style={[mergedStyle, textAnimatedStyle]}
         numberOfLines={effectiveNumberOfLines}
         textBreakStrategy={textBreakStrategy}
         lineBreakStrategyIOS={lineBreakStrategyIOS}
         adjustsFontSizeToFit={false}
         minimumFontScale={1}
         allowFontScaling
         accessibilityLabel={safeRevealVisibleText}
      >
         {safeRevealVisibleText}
         {text.length > safeRevealVisibleText.length ? (
            <Text style={{ color: 'transparent' }}>
               {text.slice(safeRevealVisibleText.length)}
            </Text>
         ) : null}
      </Animated.Text>
   );
   const content = visited ? (
      staticText
   ) : canReveal ? (
      revealText
   ) : (
      loader
   );

   const contentWithMeasurement = (
      <View style={{ width: '100%' }}>
         {content}
      </View>
   );

   if (!scrollEnabled) {
      return (
         <Animated.View
            className={`${containerClasses} ${containerClassName ?? ''}`}
            style={[containerStyle, containerAnimatedStyle]}
         >
            {contentWithMeasurement}
         </Animated.View>
      );
   }

   return (
      <Animated.View
         className={`${containerClasses} ${containerClassName ?? ''}`}
         style={[
            containerStyle,
            maxHeight ? { maxHeight, overflow: 'hidden' } : null,
            scrollEnabled ? { overflow: 'hidden' } : null,
            containerAnimatedStyle,
         ]}
      >
         <ScrollView
            className="grow-0"
            contentContainerStyle={scrollContentStyle}
            scrollEnabled
            showsVerticalScrollIndicator={false}
            bounces={false}
         >
            {contentWithMeasurement}
         </ScrollView>
      </Animated.View>
   );
}

export default forwardRef(PromptDisplay);
