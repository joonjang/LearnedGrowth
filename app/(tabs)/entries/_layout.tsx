import { ThemedStack } from '@/theme/Navigation';
import { Stack } from 'expo-router';
export default function EntriesStack() {
   return (
      <ThemedStack>
         <Stack.Screen name="index" options={{ title: 'Entries' }} />
         <Stack.Screen
            name="[id]/index"
            options={{
               title: 'Entry',
               animation: 'default',
            }}
         />
         <Stack.Screen
            name="[id]/dispute"
            options={({ route }) => {
               const { animateFromBottom } = (route.params ?? {}) as {
                  animateFromBottom?: string;
               };

               return {
                  title: 'Dispute',
                  animation: animateFromBottom ? 'fade_from_bottom' : 'none',
               };
            }}
         />
      </ThemedStack>
   );
}
