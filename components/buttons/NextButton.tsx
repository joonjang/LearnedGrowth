import { useAuth } from '@/providers/AuthProvider';
import { useEntriesStore } from '@/providers/EntriesStoreProvider';
import { useRevenueCat } from '@/providers/RevenueCatProvider';
import { router } from 'expo-router';
import { Pressable, Text } from 'react-native';

type Prop = {
   id: string;
};

export default function NextButton({ id }: Prop) {
   const { status } = useAuth();
   const { isGrowthPlusActive } = useRevenueCat();
   const isSubscribed = status === 'signedIn' && isGrowthPlusActive;
   const entriesStore = useEntriesStore();
   const hasCachedAnalysis = entriesStore((state) =>
      Boolean(state.byId[id]?.aiResponse)
   );

   const handlePress = () => {
      if (isSubscribed) {
         router.push(`/dispute/${id}?analyze=1`);
         return;
      }

      // Cached AI results are safe to view without consuming credits.
      if (hasCachedAnalysis) {
         router.push(`/dispute/${id}?analyze=1`);
         return;
      }

      router.push({
         pathname: '/(modal)/free-user',
         params: { id },
      } as any);
   };

   return (
      <Pressable
         className="mt-1 py-2.5 px-3 rounded-full bg-dispute-cta items-center justify-center active:opacity-90"
         onPress={handlePress}
      >
         <Text className="text-base font-semibold text-white">
            Next
         </Text>
      </Pressable>
   );
}
