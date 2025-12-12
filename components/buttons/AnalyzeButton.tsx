import { router, usePathname } from 'expo-router';
import { Pressable, Text } from 'react-native';

type Prop = {
   id: string;
};

export default function AnalyzeButton({ id }: Prop) {
   const pathname = usePathname();
   const entryPath = `/entries/${id}`;
   const alreadyOnEntry = pathname === entryPath;

   function aiAnalysis() {
      if (!alreadyOnEntry) {
         router.push(entryPath as any);
      }
      router.push(`/entries/${id}/dispute?analyze=1`);
   }
   
   return (
      <Pressable 
         className="mt-1 py-2.5 px-3 rounded-full bg-cta items-center justify-center active:opacity-90" 
         onPress={aiAnalysis}
      >
         <Text className="text-base font-semibold text-ctaText">
            Analyze My Thinking
         </Text>
      </Pressable>
   );
}