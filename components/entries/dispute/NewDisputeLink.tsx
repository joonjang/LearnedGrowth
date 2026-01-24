import { getShadow } from '@/lib/shadow';
import type { LucideIcon } from 'lucide-react-native';
import { Pencil } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

type Props = {
   onPress: () => void;
   label?: string;
   className?: string;
   textClassName?: string;
   icon?: LucideIcon;
};

export default function NewDisputeLink({
   onPress,
   label = 'New Dispute',
   className,
   textClassName,
   icon,
}: Props) {
   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';
   const shadow = useMemo(
      () => getShadow({ isDark, preset: 'button' }),
      [isDark],
   );
   const Icon = icon ?? Pencil;
   const iconColor = isDark ? '#fcd34d' : '#b45309';

   return (
      <Pressable
         onPress={onPress}
         hitSlop={10}
         accessibilityRole="button"
         className={`
            flex-row items-center relative h-14 justify-center
            px-5 rounded-2xl w-full
            border border-amber-200 dark:border-amber-700/50
            bg-amber-50 dark:bg-amber-900/20
            active:opacity-90 active:scale-[0.99]
            ${className ?? ''}
         `}
         style={[shadow.ios, shadow.android]}
      >
         <Text
            className={`text-[15px] font-bold text-center w-full text-amber-700 dark:text-amber-300 ${textClassName ?? ''}`}
         >
            {label}
         </Text>
         <View className="absolute right-5">
            <Icon size={18} color={iconColor} />
         </View>
      </Pressable>
   );
}
