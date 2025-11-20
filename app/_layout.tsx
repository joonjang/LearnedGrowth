import { AdapterGuard } from '@/components/AdapterGuard';
import { AdapterProvider } from '@/providers/AdapterProvider';
import { EntriesStoreProvider } from '@/providers/EntriesStoreProvider';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
   return (
      <AdapterProvider>
         <EntriesStoreProvider>
            <SafeAreaProvider>
               <AdapterGuard>
                  <Stack screenOptions={{ headerShown: false }}>
                     <Stack.Screen name="(tabs)" />
                     <Stack.Screen
                        name="(modals)/entry-new"
                        options={{
                           presentation: 'modal',
                        }}
                     />
                  </Stack>
               </AdapterGuard>
            </SafeAreaProvider>
         </EntriesStoreProvider>
      </AdapterProvider>
   );
}
