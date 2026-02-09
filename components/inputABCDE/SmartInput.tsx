import { useColorScheme } from 'nativewind';
import React, { forwardRef } from 'react';
import {
   Pressable,
   Text,
   TextInput,
   TextInputProps,
   View,
   ViewStyle,
} from 'react-native';
import Animated, { AnimatedStyle } from 'react-native-reanimated';
import {
   ENTRY_CHAR_WARN_MIN_REMAINING,
   ENTRY_CHAR_WARN_RATIO,
} from '@/lib/constants';

type Props = TextInputProps & {
   animatedStyle?:
      | AnimatedStyle<ViewStyle>
      | (AnimatedStyle<ViewStyle> | ViewStyle)[];
   showCounter?: boolean;
   warnThresholdRatio?: number;
   warnMinRemaining?: number;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SmartInput = forwardRef<TextInput, Props>(
   (
      {
         animatedStyle,
         showCounter = false,
         warnThresholdRatio = ENTRY_CHAR_WARN_RATIO,
         warnMinRemaining = ENTRY_CHAR_WARN_MIN_REMAINING,
         ...props
      },
      ref,
   ) => {
      const { colorScheme } = useColorScheme();
      const isDark = colorScheme === 'dark';
      const maxLength =
         typeof props.maxLength === 'number' ? props.maxLength : undefined;
      const valueText = typeof props.value === 'string' ? props.value : '';
      const charCount = valueText.length;
      const remaining = maxLength ? maxLength - charCount : 0;
      const warnThreshold = maxLength
         ? Math.max(warnMinRemaining, Math.round(maxLength * warnThresholdRatio))
         : 0;
      const showCount = showCounter && Boolean(maxLength) && remaining <= warnThreshold;
      const counterClassName =
         remaining <= 0
            ? 'text-rose-600 dark:text-rose-400'
            : 'text-amber-600 dark:text-amber-400';

      return (
         <>
            <AnimatedPressable
               className="bg-slate-50 dark:bg-slate-700 rounded-2xl border border-slate-300 dark:border-slate-600 overflow-hidden p-3"
               style={animatedStyle}
               onPress={() => (ref as any)?.current?.focus()}
            >
               <TextInput
                  ref={ref}
                  className="flex-1 text-lg leading-7 text-slate-900 dark:text-slate-100 p-0"
                  multiline
                  placeholderTextColor={isDark ? '#94a3b8' : '#64748b'}
                  textAlignVertical="top"
                  {...props}
               />
            </AnimatedPressable>
            {showCount && (
               <View className="mt-1 flex-row justify-end">
                  <Text className={`text-[11px] font-medium ${counterClassName}`}>
                     {charCount}/{maxLength}
                  </Text>
               </View>
            )}
         </>
      );
   },
);

SmartInput.displayName = 'SmartInput';

export default SmartInput;
