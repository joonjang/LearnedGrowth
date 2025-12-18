import { BTN_HEIGHT } from '@/components/constants';
import { getIosShadowStyle } from '@/lib/shadow';
import { useAuth } from '@/providers/AuthProvider';
import { useEntriesStore } from '@/providers/EntriesStoreProvider';
import { useRevenueCat } from '@/providers/RevenueCatProvider';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

type Prop = {
   id: string;
};

export default function NextButton({ id }: Prop) {
   const { status } = useAuth();
   const { isGrowthPlusActive } = useRevenueCat();
   const isSubscribed = status === 'signedIn' && isGrowthPlusActive;

   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';
   
   const entriesStore = useEntriesStore();
   const hasCachedAnalysis = entriesStore((state) =>
      Boolean(state.byId[id]?.aiResponse)
   );

   const iosShadowStyle = useMemo(
      () => getIosShadowStyle({ isDark, preset: 'md' }),
      [isDark]
   );

   const config = useMemo(() => {
      if (hasCachedAnalysis) {
         return {
            label: "View Analysis",
            icon: "document-text",
            bgColor: "bg-blue-500 dark:bg-blue-800",
            textColor: "text-white"
         };
      }
      if (isSubscribed) {
         return {
            label: "Analyze with AI",
            icon: "sparkles",
            bgColor: "bg-dispute-cta dark:bg-green-800",
            textColor: "text-white"
         };
      }
      return {
         label: "Continue",
         icon: "arrow-forward",
         bgColor: "bg-dispute-cta dark:bg-green-800",
         textColor: "text-white"
      };
   }, [hasCachedAnalysis, isSubscribed]);

   const handlePress = () => {
      if (hasCachedAnalysis) {
         router.push(`/dispute/${id}?view=analysis`);
         return;
      }
      if (isSubscribed) {
         router.push(`/dispute/${id}?view=analysis&refresh=true`);
         return;
      }

      router.push({
         pathname: '/(modal)/free-user',
         params: { id },
      } as any);
   };

   return (
      <View className="mt-6 mb-3">
         <Pressable
            onPress={handlePress}
            style={iosShadowStyle}
            // 1. 'relative' allows us to position the icon absolutely inside
            // 2. 'items-center' aligns text vertically
            className={`
               flex-row items-center relative ${BTN_HEIGHT}
               ${config.bgColor}
               px-5 rounded-2xl 
               shadow-md shadow-slate-300 dark:shadow-none
               active:opacity-90 active:scale-[0.99]
            `}
         >
            {/* Text is centered by the parent's justify-center (from BTN_HEIGHT) */}
            <Text className={`text-[17px] font-bold text-center w-full ${config.textColor}`}>
               {config.label}
            </Text>

            {/* Icon is absolutely positioned to the right */}
            <View className="absolute right-5">
               <Ionicons 
                  name={config.icon as any} 
                  size={18} 
                  color="white" 
                  style={{ opacity: 0.9 }}
               />
            </View>
         </Pressable>
      </View>
   );
}
