import { BTN_HEIGHT } from '@/components/constants';
import { getIosShadowStyle } from '@/lib/shadow';
import { LucideIcon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

type Props = {
   label: string;
   icon?: LucideIcon;
   onPress: () => void;
   variant?: 'primary' | 'neutral'; // specific color schemes
};

export default function WideButton({ label, icon, onPress, variant = 'primary' }: Props) {
   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';
   const Icon = icon;

   const iosShadowStyle = useMemo(
      () => getIosShadowStyle({ isDark, preset: 'md' }),
      [isDark]
   );

   const bgClass = variant === 'primary' 
      ? 'bg-dispute-cta dark:bg-green-800' 
      : 'bg-blue-500 dark:bg-blue-800';

   return (
      <View className="mt-6 mb-3">
         <Pressable
            onPress={onPress}
            style={iosShadowStyle}
            className={`
               flex-row items-center relative ${BTN_HEIGHT}
               ${bgClass}
               px-5 rounded-2xl 
               shadow-md shadow-slate-300 dark:shadow-none
               active:opacity-90 active:scale-[0.99]
            `}
         >
            <Text className="text-[17px] font-bold text-center w-full text-white">
               {label}
            </Text>

            {Icon && (
               <View className="absolute right-5">
                  <Icon size={18} color="white" style={{ opacity: 0.9 }} />
               </View>
            )}
         </Pressable>
      </View>
   );
}
