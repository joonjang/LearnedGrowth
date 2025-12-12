import { router, usePathname } from 'expo-router';
import { Pressable, Text } from 'react-native';

type Prop = {
   id: string;
};

export default function CTAButton({ id }: Prop) {
   const pathname = usePathname();
   const entryPath = `/entries/${id}`;
   const alreadyOnEntry = pathname === entryPath;

   return (
      <Pressable
         className="mt-1 py-2.5 px-3 rounded-full bg-dispute-cta items-center justify-center active:opacity-90"
      onPress={() => {
         if (!alreadyOnEntry) {
            router.push(entryPath as any);
         }
         router.push(`/entries/${id}/dispute`);
      }}
    >
         <Text className="text-base font-semibold text-white">
            Dispute this Belief
         </Text>
      </Pressable>
   );
}
