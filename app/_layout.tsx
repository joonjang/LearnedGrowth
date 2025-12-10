import { AdapterGuard } from '@/components/AdapterGuard';
import { AuthGate } from '@/components/AuthGate';
import { AdapterProvider } from '@/providers/AdapterProvider';
import { AuthProvider } from '@/providers/AuthProvider';
import { EntriesStoreProvider } from '@/providers/EntriesStoreProvider';
import { RevenueCatProvider } from '@/providers/RevenueCatProvider';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
   return (
      <GestureHandlerRootView style={{ flex: 1 }}>
         <KeyboardProvider>
            <AuthProvider>
               <RevenueCatProvider>
                  <AdapterProvider>
                     <EntriesStoreProvider>
                        <SafeAreaProvider>
                           <AuthGate>
                              <AdapterGuard>
                                 <Stack screenOptions={{ headerShown: false }}>
                                    <Stack.Screen name="login" />
                                    <Stack.Screen name="(tabs)" />
                                 </Stack>
                              </AdapterGuard>
                           </AuthGate>
                        </SafeAreaProvider>
                     </EntriesStoreProvider>
                  </AdapterProvider>
               </RevenueCatProvider>
            </AuthProvider>
         </KeyboardProvider>
      </GestureHandlerRootView>
   );
}
