import { useRef, useState, useEffect, useMemo } from 'react';
import {
   Pressable,
   TextInput,
   Text,
   View,
   StyleSheet,
   Keyboard,
   Platform,
} from 'react-native';
import { TypeAnimation } from 'react-native-type-animation';
import { EntryType } from '@/app/(modals)/entry-new';
import { useDeferredReady } from '@/features/hooks/useDeferredReady';
import ThreeDotsLoader from '../ThreeDotLoader';
import { useResponsiveFont } from '@/features/hooks/useResponsiveFont';
import { useKeyboardVisible } from '@/features/hooks/useKeyboardVisible';

type Props = {
   value: string;
   setValue: (text: string) => void;
   entryType: EntryType;
   prompt: string;
   visited: boolean;
   setVisited: React.Dispatch<React.SetStateAction<Set<EntryType>>>;
};

export default function InputField({
   value,
   setValue,
   entryType,
   prompt,
   visited,
   setVisited,
}: Props) {
   const inputRef = useRef<TextInput>(null);
   const readyToAnimate = useDeferredReady(1200);
   const { scaleFont } = useResponsiveFont();
   const isKeyboardVisible = useKeyboardVisible();

   const baseFont = scaleFont(38, { min: 26, max: 48, factor: 0.4 });
   const minFont = scaleFont(30, { min: 22, max: 40, factor: 0.4 });

   // destructure object approach needed in order to use the style in type animation
   const promptTextStyle = {
      ...styles.promptText,
      ...{ fontSize: isKeyboardVisible ? minFont : baseFont },
   };

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
            style={[
               styles.bottomHalf,
               isKeyboardVisible ? styles.bottomStick : styles.bottomCenter,
            ]}
         >
            <Pressable
               onPress={() => inputRef.current?.focus()}
               style={styles.inputBox}
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
   container: { flex: 1 },

   topHalf: {
      flex: 1,
      paddingHorizontal: 16,
      justifyContent: 'center',
   },

   bottomHalf: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 8,
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
