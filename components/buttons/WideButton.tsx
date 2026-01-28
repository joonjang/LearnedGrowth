import { ANALYSIS_CTA_CLASS, BTN_HEIGHT, DISPUTE_CTA_CLASS } from '@/lib/styles';
import { getShadow } from '@/lib/shadow';
import { LucideIcon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

type Props = {
   label: string;
   icon?: LucideIcon;
   onPress: () => void;
   variant?: 'primary' | 'neutral'; // specific color schemes
   bgClassName?: string;
   textClassName?: string;
   iconColor?: string;
};

export default function WideButton({
   label,
   icon,
   onPress,
   variant = 'primary',
   bgClassName,
   textClassName,
   iconColor,
}: Props) {
   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';
   const Icon = icon;

   const shadow = useMemo(
      () => getShadow({ isDark, preset: 'button' }),
      [isDark]
   );

   const bgClass =
      bgClassName ??
      (variant === 'primary' ? DISPUTE_CTA_CLASS : ANALYSIS_CTA_CLASS);
   const textClass = textClassName ?? 'text-white';
   const resolvedIconColor = iconColor ?? 'white';

   return (
      <View className="mt-6 mb-3">
         <Pressable
            onPress={onPress}
            style={[shadow.ios, shadow.android]}
            className={`
               flex-row items-center relative ${BTN_HEIGHT}
               ${bgClass}
               px-5 rounded-2xl 
               active:opacity-90 active:scale-[0.99]
            `}
         >
            <Text className={`text-[17px] font-bold text-center w-full ${textClass}`}>
               {label}
            </Text>

            {Icon && (
               <View className="absolute right-5">
                  <Icon
                     size={18}
                     color={resolvedIconColor}
                     style={{ opacity: 0.9 }}
                  />
               </View>
            )}
         </Pressable>
      </View>
   );
}
