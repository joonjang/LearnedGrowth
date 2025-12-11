import { ThemedStack } from '@/theme/Navigation';
import { Stack } from 'expo-router';

export default function ModalLayout() {
  return (
    <ThemedStack>
      <Stack.Screen name="login" />
      <Stack.Screen name="free-user" />
    </ThemedStack>
   );
}
