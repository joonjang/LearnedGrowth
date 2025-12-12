import { ThemedStack } from '@/components/Navigation';
import { Stack } from 'expo-router';
export default function EntriesStack() {
   return (
      <ThemedStack>
         <Stack.Screen name="index" options={{ title: 'Entries' }} />
         <Stack.Screen
            name="new"
            options={{
               title: 'New Entry',
               presentation: 'modal',
               animation: 'slide_from_bottom',
            }}
         />
         <Stack.Screen
            name="[id]/dispute"
            options={{
               title: 'Dispute',
               presentation: 'modal',
               animation: 'slide_from_bottom',
            }}
         />
         <Stack.Screen
            name="[id]/index"
            options={({ route }) => {
               const animateInstant = (
                  route.params as
                     | { animateInstant?: string | string[] }
                     | undefined
               )?.animateInstant;
               const shouldBeInstant = Array.isArray(animateInstant)
                  ? animateInstant[0]
                  : animateInstant;

               return {
                  title: 'Entry',
                  animation: 'slide_from_right', // keep a horizontal transition so swipe works
                  animationDuration: shouldBeInstant ? 120 : undefined, // very fast when “instant”
                  gestureEnabled: true,
                  fullScreenGestureEnabled: true,
                  gestureDirection: 'horizontal',
               };
            }}
         />
      </ThemedStack>
   );
}
