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
                           <Stack.Screen
                              name="(cards)/entry-new"
                              options={{
                                 presentation: 'card',
                                 animation: 'slide_from_bottom',
                              }}
                           />
                           <Stack.Screen
                              name="(cards)/[id]/dispute"
                              options={{
                                 title: 'Dispute',
                                 animation: 'fade_from_bottom',
                                 presentation: 'card',
                              }}
                           />
                        </Stack>
                     </AdapterGuard>
                  </SafeAreaProvider>
               </EntriesStoreProvider>
            </AdapterProvider>
         </KeyboardProvider>
      </GestureHandlerRootView>
   );
}
