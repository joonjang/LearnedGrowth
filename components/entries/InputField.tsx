import { useRef, useMemo } from 'react';
import {
   Pressable,
   TextInput,
   Text,
   View,
   StyleSheet,
} from 'react-native';
import { TypeAnimation } from 'react-native-type-animation';
import { useDeferredReady } from '@/features/hooks/useDeferredReady';
import ThreeDotsLoader from '../ThreeDotLoader';
import { useResponsiveFont } from '@/features/hooks/useResponsiveFont';
import { useKeyboardVisible } from '@/features/hooks/useKeyboardVisible';

type PromptSize = 'default' | 'compact';

type Props<T extends string> = {
   value: string;
   setValue: (text: string) => void;
   entryType: T;
   prompt: string;
   visited: boolean;
   setVisited: React.Dispatch<React.SetStateAction<Set<T>>>;
   promptSize?: PromptSize;
};

export default function InputField<T extends string>({
   value,
   setValue,
   entryType,
   prompt,
   visited,
   setVisited,
   promptSize = 'default',
}: Props<T>) {
   const inputRef = useRef<TextInput>(null);
   const readyToAnimate = useDeferredReady(1200);
   const { scaleFont } = useResponsiveFont();
   const isKeyboardVisible = useKeyboardVisible();

   const { baseFont, minFont } = useMemo(() => {
      if (promptSize === 'compact') {
         return {
            baseFont: scaleFont(30, { min: 22, max: 40, factor: 0.35 }),
            minFont: scaleFont(24, { min: 20, max: 32, factor: 0.35 }),
         };
      }
      return {
         baseFont: scaleFont(38, { min: 26, max: 48, factor: 0.4 }),
         minFont: scaleFont(30, { min: 22, max: 40, factor: 0.4 }),
      };
   }, [promptSize, scaleFont]);

   // destructure object approach needed in order to use the style in type animation
   const promptTextStyle = {
      ...styles.promptText,
      ...{ fontSize: isKeyboardVisible ? minFont : baseFont },
   };

   const inputBoxDims = useMemo(() => {
      const baseMin = promptSize === 'compact' ? 140 : 160;
      const baseMax = promptSize === 'compact' ? 280 : 320;
      const minHeight = isKeyboardVisible ? Math.max(100, baseMin - 40) : baseMin;

      return { minHeight, maxHeight: baseMax };
   }, [promptSize, isKeyboardVisible]);

   const sequence = useMemo(
      () => [
         { text: prompt },
         {
            action: () =>
               setVisited((prev) => {
                  if (prev.has(entryType)) return prev;
                  const next = new Set(prev);
                  next.add(entryType);
                  return next;
               }),
         },
      ],
      [prompt, entryType, setVisited]
   );

   return (
      <View style={styles.container}>
         {/* TOP — prompt (transform scale; no font-size animation) */}
         <View style={styles.topHalf}>
            {visited ? (
               <Text
                  style={promptTextStyle}
                  numberOfLines={6}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                  allowFontScaling
               >
                  {prompt}
               </Text>
            ) : readyToAnimate ? (
               <TypeAnimation
                  sequence={sequence}
                  cursor={false}
                  typeSpeed={50}
                  style={promptTextStyle} 
               />
            ) : (
               <ThreeDotsLoader />
            )}
         </View>

         {/* BOTTOM — input lane anchored to bottom */}
         <View
            style={[styles.bottomHalf, styles.bottomStick]}
         >
            <Pressable
               onPress={() => inputRef.current?.focus()}
               style={[styles.inputBox, inputBoxDims]}
            >
               <TextInput
                  ref={inputRef}
                  placeholder="Enter here"
                  value={value}
                  onChangeText={setValue}
                  style={styles.inputText}
                  multiline
                  scrollEnabled // let content scroll instead of resizing container
                  textAlignVertical="top"
               />
            </Pressable>
         </View>
      </View>
   );
}

const styles = StyleSheet.create({
   container: { flex: 1, minHeight: 0 },

   topHalf: {
      flex: 1,
      paddingHorizontal: 16,
      justifyContent: 'center',
      minHeight: 0,
   },

   bottomHalf: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 8,
      minHeight: 0,
   },
   bottomCenter: {
      justifyContent: 'center',
   },
   // keyboard OPEN -> stick to bottom of lane (glued to keyboard)
   bottomStick: {
      justifyContent: 'flex-end',
   },
   promptText: {
      fontWeight: '600',
      flexShrink: 1,
   },

   inputBox: {
      // Bottom-anchored, clamped height so it doesn't "grow from top"
      minHeight: 160,
      maxHeight: 320,
      borderRadius: 10,
      backgroundColor: '#e3e3e3ff',
      paddingHorizontal: 12,
      paddingVertical: 8,
      overflow: 'hidden',
      flex: 1,
   },

   inputText: {
      fontSize: 18,
      lineHeight: 24,
      color: '#111',
      includeFontPadding: false as any, // Android only; ignored on iOS
   },
});
