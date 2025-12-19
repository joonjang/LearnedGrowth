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
      () => [styles.promptText, textStyle],
      [textStyle]
   );

   const loader = (
      <View
         style={[
            styles.loaderBase,
         ]}
      >
         <ThreeDotsLoader />
      </View>
   );

   const content = visited ? (
      <Text
         className={textClassName}
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
         className={textClassName}
         style={mergedStyle}
         numberOfLines={numberOfLines}
         onFinished={onVisited}
      />
   ) : (
      loader
   );

   if (!scrollEnabled) {
      return (
         <View className={containerClassName} style={[styles.container, containerStyle]}>
            {content}
         </View>
      );
   }

   return (
      <View
         className={containerClassName}
         style={[
            styles.container,
            containerStyle,
            maxHeight ? { maxHeight, overflow: 'hidden' } : null,
         ]}
      >
         <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
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

const styles = StyleSheet.create({
   container: {
      justifyContent: 'center',
      minHeight: 0,
      paddingHorizontal: 16,
      alignSelf: 'stretch',
      width: '100%',
      paddingBottom: 16
   },
   promptText: {
      fontWeight: '600',
      flexShrink: 1,
      flexWrap: 'wrap',
   },
   scroll: {
      flexGrow: 0,
   },
   scrollContent: {
      flexGrow: 0,
      paddingVertical: 12,
   },
   loaderBase: {
      alignItems: 'center',
      minHeight: 1,
   }
});
