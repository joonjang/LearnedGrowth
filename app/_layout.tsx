import { AdapterGuard } from '@/components/AdapterGuard';
import { AuthGate } from '@/components/AuthGate';
import TopFade from '@/components/TopFade';
import { AppProviders } from '@/providers/AppProviders';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
   useSafeAreaInsets
} from 'react-native-safe-area-context';
import '../global.css';

function EdgeToEdge({ children }: { children: React.ReactNode }) {
   const insets = useSafeAreaInsets();
   return (
      <View className="flex-1 bg-slate-50 dark:bg-slate-900">
         <TopFade height={insets.top + 48} />
         <StatusBar
            translucent
            // Logic: If Dark Mode -> Light Text. If Light Mode -> Dark Text.
            style={useColorScheme() === 'dark' ? 'light' : 'dark'}
         />
         {children}
      </View>
   );
}

export default function RootLayout() {
   return (
      <GestureHandlerRootView style={{ flex: 1 }}>
         <AppProviders>
            <AuthGate>
               <AdapterGuard>
                  <EdgeToEdge>
                     <Stack screenOptions={{ headerShown: false }}>
                        <Stack.Screen name="(tabs)" />
                        <Stack.Screen
                           name="(modal)"
                           options={{
                              animation: 'fade',
                              presentation: 'transparentModal',
                           }}
                        />
                     </Stack>
                  </EdgeToEdge>
               </AdapterGuard>
            </AuthGate>
         </AppProviders>
      </GestureHandlerRootView>
   );
}
