import { useColorScheme } from 'nativewind';
import React, { forwardRef } from 'react';
import { Pressable, TextInput, TextInputProps, ViewStyle } from 'react-native';
import Animated, { AnimatedStyle } from 'react-native-reanimated';

type Props = TextInputProps & {
   animatedStyle?:
      | AnimatedStyle<ViewStyle>
      | (AnimatedStyle<ViewStyle> | ViewStyle)[];
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SmartInput = forwardRef<TextInput, Props>(
   ({ animatedStyle, ...props }, ref) => {
      const { colorScheme } = useColorScheme();
      const isDark = colorScheme === 'dark';

      return (
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
      );
   },
);

SmartInput.displayName = 'SmartInput';

export default SmartInput;
