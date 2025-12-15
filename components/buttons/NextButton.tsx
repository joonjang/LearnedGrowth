import { useAuth } from '@/providers/AuthProvider';
import { router, usePathname } from 'expo-router';
import { Pressable, Text } from 'react-native';

type Prop = {
   id: string;
};

export default function NextButton({ id }: Prop) {
   const { status, profile } = useAuth();
   const pathname = usePathname();
   const entryPath = `/entries/${id}`;
   const alreadyOnEntry = pathname === entryPath;
   const isSubscribed = status === 'signedIn' && profile?.plan === 'invested';

   const handlePress = () => {
    //   if (!alreadyOnEntry) {
    //      router.push(entryPath as any);
    //   }

      if (isSubscribed) {
         router.push(`/entries/${id}/dispute?analyze=1`);
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
