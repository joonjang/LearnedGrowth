import { ThemedStack } from '@/components/Navigation';
import { Stack } from 'expo-router';

export default function ModalLayout() {
   return (
      <ThemedStack>
         <Stack.Screen name="login" options={{animation: 'none',}} />
         <Stack.Screen name="free-user" />
      </ThemedStack>
   );
}
