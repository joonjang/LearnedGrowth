import { getIosShadowStyle } from '@/lib/shadow';
import { useAuth } from '@/providers/AuthProvider';
import { useEntriesStore } from '@/providers/EntriesStoreProvider';
import { useRevenueCat } from '@/providers/RevenueCatProvider';
import { router } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { useMemo } from 'react';
import WideButton from './WideButton';

type Prop = {
   id: string;
};

export default function CardNextButton({ id }: Prop) {
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
            label: 'View Analysis',
            icon: 'document-text',
            bgColor: 'bg-blue-500 dark:bg-blue-800',
            textColor: 'text-white',
         };
      }
      if (isSubscribed) {
         return {
            label: 'Analyze with AI',
            icon: 'sparkles',
            bgColor: 'bg-dispute-cta dark:bg-green-800',
            textColor: 'text-white',
         };
      }
      return {
         label: 'Continue',
         icon: 'arrow-forward',
         bgColor: 'bg-dispute-cta dark:bg-green-800',
         textColor: 'text-white',
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
      <WideButton
         label={config.label}
         icon={config.icon as any}
         onPress={handlePress}
         variant={hasCachedAnalysis ? 'neutral' : 'primary'}
      />
   );
}
