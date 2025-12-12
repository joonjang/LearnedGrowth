import { useColorScheme } from 'nativewind';
import { forwardRef, useState } from 'react';
import {
   Pressable,
   TextInput,
   TextInputProps,
   ViewStyle,
} from 'react-native';
// REMOVED: import { makeThemedStyles } from '@/theme/theme';

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
   
   // Hook for placeholder color
   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';
   const placeholderColor = isDark ? '#94a3b8' : '#64748b';

   return (
      <Pressable
         onPress={() =>
            typeof ref === 'object' && ref?.current ? ref.current.focus() : null
         }
         className={`rounded-[14px] bg-zinc-50 dark:bg-slate-700 border px-4 py-3 mb-1.5 shadow-sm ${
            focused 
               ? 'border-slate-300 dark:border-slate-500 shadow-md opacity-100' 
               : 'border-slate-200 dark:border-slate-700'
         }`}
         style={[dims, containerStyle]}
      >
         <TextInput
            ref={ref}
            placeholder={placeholder}
            value={value}
            onChangeText={onChangeText}
            // Compact vs Standard Text Size
            className={`text-slate-900 dark:text-slate-100 leading-6 ${compact ? 'text-lg' : 'text-[22px]'}`}
            style={{ includeFontPadding: false }} // NativeWind handles most, but this is specific
            multiline
            scrollEnabled={scrollEnabled}
            textAlignVertical="top"
            placeholderTextColor={placeholderColor}
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
