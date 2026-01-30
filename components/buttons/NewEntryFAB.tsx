import { getShadow } from '@/lib/shadow';
import {
    FAB_CTA_CLASS,
    PRIMARY_CTA_ICON_COLOR
} from '@/lib/styles';
import { Plus } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, { useMemo } from 'react';
import { Pressable } from 'react-native';
import Animated, {
    SharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface NewEntryFabProps {
   isVisible: SharedValue<boolean>;
   onPress: () => void;
}

export default function NewEntryFab({ isVisible, onPress }: NewEntryFabProps) {
   const insets = useSafeAreaInsets();
   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';

   const fabShadow = useMemo(
      () => getShadow({ isDark, preset: 'button', colorLight: '#4f46e5' }),
      [isDark],
   );

   const animatedStyle = useAnimatedStyle(() => {
      const show = isVisible.value;
      return {
         opacity: withTiming(show ? 1 : 0, { duration: 200 }),
         transform: [
            { scale: withSpring(show ? 1 : 0.8) },
            { translateY: withTiming(show ? 0 : 20) },
         ],
         pointerEvents: show ? 'auto' : 'none',
      };
   });

   return (
      <Animated.View
         style={[
            {
               position: 'absolute',
               bottom: insets.bottom,
               right: 24,
               zIndex: 50,
            },
            animatedStyle,
         ]}
      >
         <Pressable
            onPress={onPress}
            className={`h-14 w-14 rounded-full items-center justify-center ${FAB_CTA_CLASS}`}
            style={[fabShadow.ios, fabShadow.android]}
         >
            <Plus size={28} color={PRIMARY_CTA_ICON_COLOR} strokeWidth={2.5} />
         </Pressable>
      </Animated.View>
   );
}
