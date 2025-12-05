import { palette } from '@/theme/colors';
import { shadowSoft } from '@/theme/shadows';
import { forwardRef, useState } from 'react';
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
   onFocus?: TextInputProps['onFocus'];
   onBlur?: TextInputProps['onBlur'];
   placeholder?: string;
   compact?: boolean;
} & Omit<TextInputProps, 'style' | 'value' | 'onChangeText' | 'multiline'>;

const InputBox = forwardRef<TextInput, Props>(function InputBox(
   {
      value,
      onChangeText,
      dims,
      containerStyle,
      placeholder = 'Enter here',
      scrollEnabled = true,
      compact = false,
      ...rest
   },
   ref
) {
   const [focused, setFocused] = useState(false);
   return (
      <Pressable
         onPress={() =>
            typeof ref === 'object' && ref?.current ? ref.current.focus() : null
         }
         style={[
            styles.inputBox,
            focused && styles.inputBoxFocused,
            dims,
            containerStyle,
         ]}
      >
         <TextInput
            ref={ref}
            placeholder={placeholder}
            value={value}
            onChangeText={onChangeText}
            style={compact ? styles.inputTextCompact : styles.inputText}
            multiline
            scrollEnabled={scrollEnabled}
            textAlignVertical="top"
            placeholderTextColor="#9ca3af"
            onFocus={(e) => {
               setFocused(true);
               rest.onFocus?.(e);
            }}
            onBlur={(e) => {
               setFocused(false);
               rest.onBlur?.(e);
            }}
            {...rest}
         />
      </Pressable>
   );
});

export default InputBox;

const styles = StyleSheet.create({
   inputBox: {
      borderRadius: 14,
      backgroundColor: palette.cardInput,
      borderWidth: 1,
      borderColor: palette.cardInputBorder,
      ...shadowSoft,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
      paddingHorizontal: 16,
      paddingVertical: 12,
   },
   inputBoxFocused: {
      shadowOpacity: 0.16,
      shadowRadius: 2,
      elevation: 3,
   },
   inputText: {
      fontSize: 22,
      lineHeight: 24,
      color: '#111',
      includeFontPadding: false as any,
   },
   inputTextCompact: {
      fontSize: 18,
      lineHeight: 21,
      color: '#111',
      includeFontPadding: false as any,
   },
});
