import { AdapterGuard } from '@/components/AdapterGuard';
import { AdapterProvider } from '@/providers/AdapterProvider';
import { EntriesStoreProvider } from '@/providers/EntriesStoreProvider';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
   return (
      <GestureHandlerRootView style={{ flex: 1 }}>
         <KeyboardProvider>
            <AdapterProvider>
               <EntriesStoreProvider>
                  <SafeAreaProvider>
                     <AdapterGuard>
                        <Stack screenOptions={{ headerShown: false }}>
                        <Stack.Screen name="(tabs)" />
                     </Stack>
                  </AdapterGuard>
               </SafeAreaProvider>
            </EntriesStoreProvider>
            </AdapterProvider>
         </KeyboardProvider>
      </GestureHandlerRootView>
   );
}
