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
   Text,
   TextStyle,
   View,
   ViewStyle,
} from 'react-native';
import ThreeDotsLoader from '../ThreeDotLoader';

const TYPING_SPEED = 35;
const CHAR_PER_TICK = 1;

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
      adjustsFontSizeToFit = true,
      minimumFontScale = 0.85,
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
   const onFinishedRef = useRef(onFinished);

   useEffect(() => {
      textRef.current = text;
   }, [text]);

   useEffect(() => {
      onFinishedRef.current = onFinished;
   }, [onFinished]);

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
            setDisplayed(textRef.current);
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

      setDisplayed('');

      timerRef.current = setInterval(() => {
         const nextIndex = Math.min(
            progressRef.current + charsPerTick,
            textRef.current.length
         );

         progressRef.current = nextIndex;
         setDisplayed(textRef.current.slice(0, nextIndex));

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
   const loaderClasses = 'items-center min-h-[1px]';
   const textClasses = `font-bold shrink ${textClassName ?? ''}`.trim();

   const loader = (
      <View
         className={loaderClasses}
      >
         <ThreeDotsLoader />
      </View>
   );

   const content = visited ? (
      <Text
         className={textClasses}
         style={mergedStyle}
         numberOfLines={numberOfLines}
         adjustsFontSizeToFit
         minimumFontScale={0.85}
         allowFontScaling
      >
         {text}
      </Text>
   ) : readyToAnimate ? (
      <ForwardedTypewriter
         ref={typewriterRef}
         key={text}
         text={text}
         className={textClasses}
         style={mergedStyle}
         numberOfLines={numberOfLines}
         onFinished={onVisited}
      />
   ) : (
      loader
   );

   if (!scrollEnabled) {
      return (
         <View
            className={`${containerClasses} ${containerClassName ?? ''}`}
            style={containerStyle}
         >
            {content}
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
            {content}
         </ScrollView>
      </View>
   );
}

export default forwardRef(PromptDisplay);
