import { AdapterGuard } from '@/components/AdapterGuard';
import {
   AdapterProvider
} from '@/providers/AdapterProvider';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
   return (
      <AdapterProvider>
         <SafeAreaProvider>
            <AdapterGuard>
               <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(tabs)" />
               </Stack>
            </AdapterGuard>
         </SafeAreaProvider>
      </AdapterProvider>
   );
}
