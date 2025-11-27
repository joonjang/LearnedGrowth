import { useKeyboardVisible } from '@/features/hooks/useKeyboardVisible';
import { useRef } from 'react';
import { Pressable, TextInput, StyleSheet } from 'react-native';

export default function PromptInput() {
   const inputRef = useRef<TextInput>(null);
   const isKeyboardVisible = useKeyboardVisible();

   return (
      <Pressable
         onPress={() => inputRef.current?.focus()}
         style={[
            styles.inputBoxBase,
            isKeyboardVisible? styles.inputBoxKeyboard : styles.inputBoxDefault
            ]
         }
      >
         <TextInput
            ref={inputRef}
            style={styles.inputText}
            placeholder="Enter here"
            multiline
            scrollEnabled
            textAlignVertical='top'
         />
      </Pressable>
   );
}

const styles = StyleSheet.create({
   inputText: {
      fontSize: 18,
   },
   inputBoxBase: {
      borderRadius: 10,
      backgroundColor: '#e3e3e3ff',
      paddingHorizontal: 12,
      paddingVertical: 8,
   },
   inputBoxKeyboard: {   
      height: 140,
   },
   inputBoxDefault: {
    height: 220,
   }
});
