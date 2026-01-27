import {
   ENTRY_CHAR_WARN_MIN_REMAINING,
   ENTRY_CHAR_WARN_RATIO,
} from '@/components/constants';
import {
   INPUT_BOX_BOTTOM_INSET,
   INPUT_BOX_HORIZONTAL_INSET,
   INPUT_BOX_TOP_INSET,
} from '@/lib/styles';
import { getShadow } from '@/lib/shadow';
import { useColorScheme } from 'nativewind';
import {
   forwardRef,
   useCallback,
   useMemo,
   useRef,
   useState,
} from 'react';
import {
   Pressable,
   Text,
   TextInput,
   TextInputProps,
   View,
   ViewStyle,
} from 'react-native';
import Animated, { AnimatedStyle } from 'react-native-reanimated';
// REMOVED: import { makeThemedStyles } from '@/theme/theme';

type Dims = { minHeight?: number; maxHeight?: number };

type Props = {
   value: string;
   onChangeText: (text: string) => void;
   dims?: Dims;
   containerStyle?: ViewStyle;
   animatedStyle?: AnimatedStyle<ViewStyle>;
   scrollEnabled?: boolean;
   onFocus?: TextInputProps['onFocus'];
   onBlur?: TextInputProps['onBlur'];
   placeholder?: string;
   compact?: boolean;
} & Omit<TextInputProps, 'style' | 'value' | 'onChangeText' | 'multiline'>;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const InputBox = forwardRef<TextInput, Props>(function InputBox(
   {
      value,
      onChangeText,
      dims,
      containerStyle,
      animatedStyle,
      placeholder = 'Enter here',
      scrollEnabled = true,
      compact = false,
      autoCorrect = true,
      maxLength,
      onScroll,
      ...rest
   },
   ref
) {
   const [focused, setFocused] = useState(false);
   const inputRef = useRef<TextInput | null>(null);
   
   // Hook for placeholder color
   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';
   const placeholderColor = isDark ? '#94a3b8' : '#64748b';
   const fontSize = compact ? 18 : 22;
   const lineHeight = Math.round(fontSize * 1.3);
   const shadow = useMemo(
      () => getShadow({ isDark, preset: focused ? 'md' : 'sm' }),
      [focused, isDark]
   );
   const charCount = value.length;
   const remaining = maxLength ? maxLength - charCount : 0;
   const warnThreshold = maxLength
      ? Math.max(ENTRY_CHAR_WARN_MIN_REMAINING, Math.round(maxLength * ENTRY_CHAR_WARN_RATIO))
      : 0;
   const showCount = Boolean(maxLength) && remaining <= warnThreshold;
   const counterClassName =
      remaining <= 0
         ? 'text-rose-600 dark:text-rose-400'
         : 'text-amber-600 dark:text-amber-400';

   const setRefs = useCallback(
      (node: TextInput | null) => {
         inputRef.current = node;
         if (typeof ref === 'function') {
            ref(node);
            return;
         }
         if (ref && typeof ref === 'object') {
            ref.current = node;
         }
      },
      [ref]
   );

   return (
      <AnimatedPressable
         onPress={() =>
            inputRef.current ? inputRef.current.focus() : null
         }
         className={`rounded-[14px] bg-zinc-50 dark:bg-slate-700 border mb-1.5 ${
            focused
               ? 'border-slate-300 dark:border-slate-500 opacity-100'
               : 'border-slate-200 dark:border-slate-700'
         }`}
         style={[dims, containerStyle, shadow.ios, shadow.android, animatedStyle]}
      >
          
         <TextInput
            ref={setRefs}
            testID="entry-input"
            placeholder={placeholder}
            value={value}
            onChangeText={onChangeText}
            autoCorrect={autoCorrect}
            // Compact vs Standard Text Size
            className="flex-1 text-slate-900 dark:text-slate-100"
            style={{
               includeFontPadding: false,
               margin: 0,
               padding: 0,
               paddingHorizontal: INPUT_BOX_HORIZONTAL_INSET,
               fontSize,
               lineHeight,
               paddingTop: INPUT_BOX_TOP_INSET,
               paddingBottom: INPUT_BOX_BOTTOM_INSET,
            }} // NativeWind handles most, but this is specific
            multiline
            scrollEnabled={scrollEnabled}
            textAlignVertical="top"
            placeholderTextColor={placeholderColor}
            onScroll={onScroll}
            onFocus={(e) => {
               setFocused(true);
               rest.onFocus?.(e);
            }}
            onBlur={(e) => {
               setFocused(false);
               rest.onBlur?.(e);
            }}
            maxLength={maxLength}
            {...rest}
         />
         {showCount && (
            <View
               className="mt-1 absolute bottom-2 flex-row justify-end"
               style={{ right: INPUT_BOX_HORIZONTAL_INSET }}
            >
               <Text className={`text-[11px] font-medium ${counterClassName}`}>
                  {charCount}/{maxLength}
               </Text>
            </View>
         )}
      </AnimatedPressable>
   );
});

export default InputBox;
