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
   TextLayoutEvent,
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
      textMeasureStyle,
      textClassName,
      containerClassName,
      containerStyle,
      containerAnimatedStyle,
      lineBreakKey,
      numberOfLines,
      maxHeight,
      scrollEnabled = false,
      freezeLineBreaks = false,
   }: Props,
   ref: Ref<PromptDisplayHandle>
) {
   const readyToAnimate = useDeferredReady(1200);
   const [revealVisibleText, setRevealVisibleText] = useState('');
   const revealTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
   const revealProgressRef = useRef(0);
   const revealFinishedRef = useRef(false);
   const [frozenText, setFrozenText] = useState<string | null>(null);
   const revealTextRef = useRef(text);
   const revealOnVisitedRef = useRef(onVisited);
   const prevRevealTextRef = useRef(text);

   useEffect(() => {
      revealOnVisitedRef.current = onVisited;
   }, [onVisited]);

   useEffect(() => {
      if (!freezeLineBreaks) {
         setFrozenText(null);
         return;
      }
      setFrozenText(null);
   }, [freezeLineBreaks, lineBreakKey, text]);

   const buildVisibleText = useCallback(
      (rawText: string, rawIndex: number) => {
         if (!rawText) return '';
         const safeIndex = Math.max(0, Math.min(rawIndex, rawText.length));
         if (!freezeLineBreaks || !frozenText) {
            return rawText.slice(0, safeIndex);
         }
         let remaining = safeIndex;
         let displayIndex = 0;
         while (displayIndex < frozenText.length && remaining > 0) {
            if (frozenText[displayIndex] !== '\n') {
               remaining -= 1;
            }
            displayIndex += 1;
         }
         return frozenText.slice(0, displayIndex);
      },
      [freezeLineBreaks, frozenText]
   );

   const updateReveal = useCallback(
      (rawIndex: number) => {
         const fullText = revealTextRef.current ?? '';
         setRevealVisibleText(buildVisibleText(fullText, rawIndex));
      },
      [buildVisibleText]
   );

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

   useEffect(() => {
      updateReveal(revealProgressRef.current);
   }, [freezeLineBreaks, frozenText, updateReveal]);

   const mergedStyle = useMemo(
      () => [{ flexWrap: 'wrap' as const }, textStyle],
      [textStyle]
   );
   const measureStyle = textMeasureStyle ?? textAnimatedStyle;
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
   const loaderClasses = 'items-center min-h-[1px]';
   const textClasses = `font-bold text-slate-900 dark:text-slate-200 shrink ${textClassName ?? ''}`.trim();
   const displayText =
      freezeLineBreaks && frozenText ? frozenText : text;
   const safeRevealVisibleText =
      displayText && revealVisibleText && displayText.startsWith(revealVisibleText)
         ? revealVisibleText
         : '';
   const canReveal = readyToAnimate;
   const showLoader = !visited && !canReveal;
   const visibleText = visited
      ? displayText
      : (canReveal ? safeRevealVisibleText : '');

   const handleTextLayout = useCallback(
      (event: TextLayoutEvent) => {
         if (!freezeLineBreaks) return;
         const lines = event.nativeEvent.lines ?? [];
         if (!lines.length) return;
         const nextFrozen = lines.map((line) => line.text).join('\n');
         setFrozenText((prev) => (prev === nextFrozen ? prev : nextFrozen));
      },
      [freezeLineBreaks]
   );

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

   const contentWithMeasurement = (
      <View style={{ width: '100%', position: 'relative' }}>
         <Animated.Text
            className={textClasses}
            style={[mergedStyle, measureStyle, { opacity: 0 }]}
            numberOfLines={effectiveNumberOfLines}
            textBreakStrategy={textBreakStrategy}
            lineBreakStrategyIOS={lineBreakStrategyIOS}
            adjustsFontSizeToFit={false}
            minimumFontScale={1}
            allowFontScaling
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            onTextLayout={handleTextLayout}
         >
            {text}
         </Animated.Text>
         <Animated.Text
            className={textClasses}
            style={[
               mergedStyle,
               textAnimatedStyle,
               { position: 'absolute', top: 0, left: 0, right: 0 },
            ]}
            numberOfLines={effectiveNumberOfLines}
            textBreakStrategy={textBreakStrategy}
            lineBreakStrategyIOS={lineBreakStrategyIOS}
            adjustsFontSizeToFit={false}
            minimumFontScale={1}
            allowFontScaling
            accessibilityLabel={visibleText}
         >
            {visibleText}
         </Animated.Text>
         {showLoader ? (
            <View
               className={loaderClasses}
               pointerEvents="none"
               style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
               }}
            >
               <ThreeDotsLoader />
            </View>
         ) : null}
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
