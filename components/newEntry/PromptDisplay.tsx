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
   TextProps,
   TextStyle,
   TextLayoutEvent,
   View,
   ViewStyle,
} from 'react-native';
import ThreeDotsLoader from '../ThreeDotLoader';

const TYPING_SPEED = 35;
const CHAR_PER_TICK = 1;

const formatTextWithBreaks = (
   text: string,
   lineBreaks: number[],
   limit?: number
) => {
   const slice = limit === undefined ? text : text.slice(0, limit);
   if (!lineBreaks.length || !slice) return slice;
   let out = '';
   let prev = 0;
   for (const br of lineBreaks) {
      if (br <= 0) continue;
      if (br >= slice.length) break;
      out += slice.slice(prev, br) + '\n';
      prev = br;
      while (slice[prev] === ' ') prev += 1;
   }
   out += slice.slice(prev);
   return out;
};

const deriveLineBreaks = (
   text: string,
   lines: { text: string }[]
) => {
   if (!text || !lines.length) return [];
   const breaks: number[] = [];
   let cursor = 0;
   for (const line of lines) {
      const lineText = line.text ?? '';
      if (!lineText) continue;
      cursor += lineText.length;
      if (cursor > text.length) cursor = text.length;
      breaks.push(cursor);
   }
   if (!breaks.length) return [];
   breaks.pop();
   return breaks;
};

const areBreaksEqual = (prev: number[] | null, next: number[]) => {
   if (!prev) return false;
   if (prev.length !== next.length) return false;
   for (let i = 0; i < prev.length; i += 1) {
      if (prev[i] !== next[i]) return false;
   }
   return true;
};

type StopOptions = {
   finish?: boolean;
};

type TypewriterHandle = {
   stop: (options?: StopOptions) => void;
   finish: () => void;
};

type TypewriterProps = {
   text: string;
   className?: string;
   style?: StyleProp<TextStyle>;
   numberOfLines?: number;
   onFinished?: () => void;
   allowFontScaling?: boolean;
   adjustsFontSizeToFit?: boolean;
   minimumFontScale?: number;
   textBreakStrategy?: TextProps['textBreakStrategy'];
   lineBreakStrategyIOS?: TextProps['lineBreakStrategyIOS'];
   lineBreaks?: number[];
   tickMs?: number;
   charsPerTick?: number;
};

function Typewriter(
   {
      text,
      className,
      style,
      numberOfLines,
      onFinished,
      allowFontScaling = true,
      adjustsFontSizeToFit = false,
      minimumFontScale = 1,
      textBreakStrategy,
      lineBreakStrategyIOS,
      lineBreaks = [],
      tickMs = TYPING_SPEED,
      charsPerTick = CHAR_PER_TICK,
   }: TypewriterProps,
   ref: Ref<TypewriterHandle>
) {
   const [displayed, setDisplayed] = useState('');
   const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
   const progressRef = useRef(0);
   const finishedRef = useRef(false);
   const textRef = useRef(text);
   const lineBreaksRef = useRef(lineBreaks);
   const onFinishedRef = useRef(onFinished);

   useEffect(() => {
      textRef.current = text;
   }, [text]);

   useEffect(() => {
      onFinishedRef.current = onFinished;
   }, [onFinished]);

   useEffect(() => {
      lineBreaksRef.current = lineBreaks;
      if (!textRef.current) return;
      setDisplayed(
         formatTextWithBreaks(
            textRef.current,
            lineBreaksRef.current,
            progressRef.current
         )
      );
   }, [lineBreaks]);

   const clearTimer = useCallback(() => {
      if (timerRef.current) {
         clearInterval(timerRef.current);
         timerRef.current = null;
      }
   }, []);

   const runFinished = useCallback(() => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      onFinishedRef.current?.();
   }, []);

   const stop = useCallback(
      (finish = false) => {
         clearTimer();
         if (finish) {
            progressRef.current = textRef.current.length;
            setDisplayed(
               formatTextWithBreaks(textRef.current, lineBreaksRef.current)
            );
            runFinished();
         }
      },
      [clearTimer, runFinished]
   );

   useImperativeHandle(
      ref,
      () => ({
         stop: (options?: StopOptions) => stop(options?.finish ?? false),
         finish: () => stop(true),
      }),
      [stop]
   );

   useEffect(() => {
      clearTimer();
      finishedRef.current = false;
      progressRef.current = 0;

      if (!textRef.current) {
         setDisplayed('');
         runFinished();
         return;
      }

      setDisplayed(
         formatTextWithBreaks(textRef.current, lineBreaksRef.current, 0)
      );

      timerRef.current = setInterval(() => {
         const nextIndex = Math.min(
            progressRef.current + charsPerTick,
            textRef.current.length
         );

         progressRef.current = nextIndex;
         setDisplayed(
            formatTextWithBreaks(
               textRef.current,
               lineBreaksRef.current,
               nextIndex
            )
         );

         if (nextIndex >= textRef.current.length) {
            clearTimer();
            runFinished();
         }
      }, tickMs);

      return clearTimer;
   }, [charsPerTick, clearTimer, runFinished, tickMs, text]);

   return (
      <Text
         className={className}
         style={style}
         numberOfLines={numberOfLines}
         textBreakStrategy={textBreakStrategy}
         lineBreakStrategyIOS={lineBreakStrategyIOS}
         allowFontScaling={allowFontScaling}
         adjustsFontSizeToFit={adjustsFontSizeToFit}
         minimumFontScale={minimumFontScale}
      >
         {displayed}
      </Text>
   );
}

const ForwardedTypewriter = forwardRef<TypewriterHandle, TypewriterProps>(
   Typewriter
);

export type PromptDisplayHandle = {
   stop: (options?: StopOptions) => void;
   finish: () => void;
};

type Props = {
   text: string;
   visited: boolean;
   onVisited?: () => void;
   textStyle: TextStyle;
   textClassName?: string;
   containerClassName?: string;
   containerStyle?: StyleProp<ViewStyle>;
   numberOfLines?: number;
   maxHeight?: number;
   scrollEnabled?: boolean;
};

function PromptDisplay(
   {
      text,
      visited,
      onVisited,
      textStyle,
      textClassName,
      containerClassName,
      containerStyle,
      numberOfLines,
      maxHeight,
      scrollEnabled = false,
   }: Props,
   ref: Ref<PromptDisplayHandle>
) {
   const readyToAnimate = useDeferredReady(1200);
   const [lineBreaks, setLineBreaks] = useState<number[] | null>(null);
   const typewriterRef = useRef<TypewriterHandle | null>(null);

   useImperativeHandle(
      ref,
      () => ({
         stop: (options?: StopOptions) =>
            typewriterRef.current?.stop(options),
         finish: () => typewriterRef.current?.finish(),
      }),
      []
   );

   useEffect(() => {
      setLineBreaks(text ? null : []);
   }, [text]);

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
   const effectiveBreaks = lineBreaks ?? [];
   const displayText = formatTextWithBreaks(text, effectiveBreaks);
   const loaderClasses = 'items-center min-h-[1px]';
   const textClasses = `font-bold text-slate-900 dark:text-slate-200 shrink ${textClassName ?? ''}`.trim();

   const handleTextLayout = useCallback((event: TextLayoutEvent) => {
      if (!text) {
         setLineBreaks([]);
         return;
      }
      const lines = event.nativeEvent.lines ?? [];
      if (!lines.length) return;
      const next = deriveLineBreaks(text, lines);
      setLineBreaks((prev) => (areBreaksEqual(prev, next) ? prev : next));
   }, [text]);

   const loader = (
      <View
         className={loaderClasses}
      >
         <ThreeDotsLoader />
      </View>
   );

   const canType = readyToAnimate && (lineBreaks !== null || !text);
   const content = visited ? (
      <Text
         className={textClasses}
         style={mergedStyle}
         numberOfLines={effectiveNumberOfLines}
         textBreakStrategy={textBreakStrategy}
         lineBreakStrategyIOS={lineBreakStrategyIOS}
         adjustsFontSizeToFit={false}
         minimumFontScale={1}
         allowFontScaling
      >
         {displayText}
      </Text>
   ) : canType ? (
      <ForwardedTypewriter
         ref={typewriterRef}
         key={text}
         text={text}
         className={textClasses}
         style={mergedStyle}
         numberOfLines={effectiveNumberOfLines}
         textBreakStrategy={textBreakStrategy}
         lineBreakStrategyIOS={lineBreakStrategyIOS}
         adjustsFontSizeToFit={false}
         minimumFontScale={1}
         allowFontScaling
         lineBreaks={effectiveBreaks}
         onFinished={onVisited}
      />
   ) : (
      loader
   );

   const contentWithMeasurement = (
      <View style={{ position: 'relative', width: '100%' }}>
         {!!text && (
            <Text
               className={textClasses}
               style={[
                  mergedStyle,
                  { position: 'absolute', opacity: 0, width: '100%' },
               ]}
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
            </Text>
         )}
         {content}
      </View>
   );

   if (!scrollEnabled) {
      return (
         <View
            className={`${containerClasses} ${containerClassName ?? ''}`}
            style={containerStyle}
         >
            {contentWithMeasurement}
         </View>
      );
   }

   return (
      <View
         className={`${containerClasses} ${containerClassName ?? ''}`}
         style={[
            containerStyle,
            maxHeight ? { maxHeight, overflow: 'hidden' } : null,
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
      </View>
   );
}

export default forwardRef(PromptDisplay);
