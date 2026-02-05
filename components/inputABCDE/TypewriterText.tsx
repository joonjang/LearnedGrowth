import { TYPING_SPEED } from '@/lib/constants';
import React, {
   forwardRef,
   useCallback,
   useEffect,
   useImperativeHandle,
   useRef,
   useState,
} from 'react';
import { StyleProp, Text, TextStyle, View } from 'react-native';
import Animated from 'react-native-reanimated';

type TypewriterProps = {
   text: string;
   visited: boolean;
   style?: StyleProp<TextStyle>;
   onFinished?: () => void;
   speed?: number;
};

export type TypewriterHandle = {
   skip: () => void;
};

const TypewriterText = forwardRef<TypewriterHandle, TypewriterProps>(
   (props, ref) => {
      const { text, visited, style, onFinished, speed = TYPING_SPEED } = props;
      const [displayedText, setDisplayedText] = useState(visited ? text : '');

      const requestRef = useRef<number | null>(null);
      const lastUpdateRef = useRef<number>(0);
      const charIndexRef = useRef(visited ? text.length : 0);
      const isFinishedRef = useRef(visited);
      const textRef = useRef(text);
      const speedRef = useRef(speed);
      const onFinishedRef = useRef(onFinished);

      useEffect(() => {
         textRef.current = text;
      }, [text]);

      useEffect(() => {
         speedRef.current = speed;
      }, [speed]);

      useEffect(() => {
         onFinishedRef.current = onFinished;
      }, [onFinished]);

      const cancelAnimation = useCallback(() => {
         if (requestRef.current !== null) {
            cancelAnimationFrame(requestRef.current);
            requestRef.current = null;
         }
      }, []);

      const finish = useCallback(() => {
         isFinishedRef.current = true;
         charIndexRef.current = textRef.current.length;
         setDisplayedText(textRef.current);
         cancelAnimation();
         onFinishedRef.current?.();
      }, [cancelAnimation]);

      useImperativeHandle(ref, () => ({
         skip: finish,
      }));

      const animate = useCallback((time: number) => {
         if (isFinishedRef.current) return;

         if (lastUpdateRef.current === 0) {
            lastUpdateRef.current = time;
         }

         const delta = time - lastUpdateRef.current;

         if (delta > speedRef.current) {
            charIndexRef.current += 1;
            const currentText = textRef.current;
            setDisplayedText(currentText.slice(0, charIndexRef.current));
            lastUpdateRef.current = time;
         }

         if (charIndexRef.current < textRef.current.length) {
            requestRef.current = requestAnimationFrame(animate);
         } else {
            isFinishedRef.current = true;
            onFinishedRef.current?.();
         }
      }, []);

      useEffect(() => {
         cancelAnimation();
         lastUpdateRef.current = 0;

         if (visited) {
            setDisplayedText(text);
            isFinishedRef.current = true;
            charIndexRef.current = text.length;
            return;
         }

         setDisplayedText('');
         charIndexRef.current = 0;
         isFinishedRef.current = false;

         requestRef.current = requestAnimationFrame(animate);

         return () => {
            cancelAnimation();
         };
      }, [text, visited, animate, cancelAnimation]);

      const visibleLength = Math.min(displayedText.length, text.length);
      const visibleText = displayedText.slice(0, visibleLength);
      const hiddenText = text.slice(visibleLength);

      return (
         <View className="relative min-h-[60px]">
            <Animated.Text
               className="text-slate-900 dark:text-slate-100"
               style={style}
            >
               {visibleText}
               {hiddenText.length > 0 ? (
                  <Text style={{ color: 'transparent' }}>{hiddenText}</Text>
               ) : null}
            </Animated.Text>
         </View>
      );
   },
);

TypewriterText.displayName = 'TypewriterText';

const areEqual = (prev: TypewriterProps, next: TypewriterProps) =>
   prev.text === next.text &&
   prev.visited === next.visited &&
   prev.speed === next.speed;

export default React.memo(TypewriterText, areEqual);
