import { ThemedStack } from '@/components/Navigation';
import { Stack } from 'expo-router';

export default function ModalLayout() {
  return (
    <ThemedStack>
      <Stack.Screen
        name="login"
        options={{
          presentation: 'transparentModal',
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
      <Stack.Screen
        name="free-user"
        options={{
          presentation: 'transparentModal',
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
    </ThemedStack>
   );
}
