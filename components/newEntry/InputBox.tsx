import { forwardRef } from 'react';
import {
   Pressable,
   StyleSheet,
   TextInput,
   TextInputProps,
   ViewStyle,
} from 'react-native';

type Dims = { minHeight?: number; maxHeight?: number };

type Props = {
   value: string;
   onChangeText: (text: string) => void;
   dims?: Dims;
   containerStyle?: ViewStyle;
   scrollEnabled?: boolean;
   onFocus?: () => void;
   placeholder?: string;
} & Omit<TextInputProps, 'style' | 'value' | 'onChangeText' | 'multiline'>;

const InputBox = forwardRef<TextInput, Props>(function InputBox(
   {
      value,
      onChangeText,
      dims,
      containerStyle,
      placeholder = 'Enter here',
   },
   ref
) {
   return (
      <Pressable
         onPress={() =>
            typeof ref === 'object' && ref?.current ? ref.current.focus() : null
         }
         style={[styles.inputBox, dims, containerStyle]}
      >
         <TextInput
            ref={ref}
            placeholder={placeholder}
            value={value}
            onChangeText={onChangeText}
            style={styles.inputText}
            multiline
            scrollEnabled
            textAlignVertical="top"
         />
      </Pressable>
   );
});

export default InputBox;

const styles = StyleSheet.create({
   inputBox: {
      borderRadius: 10,
      backgroundColor: '#e3e3e3ff',
      paddingHorizontal: 12,
      paddingVertical: 8,
      overflow: 'hidden',
   },
   inputText: {
      fontSize: 18,
      lineHeight: 24,
      color: '#111',
      includeFontPadding: false as any,
   },
});
