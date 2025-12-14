import { router, usePathname } from 'expo-router';
import { Pressable, Text } from 'react-native';

type Prop = {
   id: string;
};

export default function NextButton({ id }: Prop) {
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
         // if free user show option to display ai or directly dispute

         // if subscribed user
         router.push(`/entries/${id}/dispute?analyze=1`);
      }}
    >
         <Text className="text-base font-semibold text-white">
            Next
         </Text>
      </Pressable>
   );
}
