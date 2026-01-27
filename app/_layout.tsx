import { AdapterGuard } from '@/components/AdapterGuard';
import { AuthGate } from '@/components/AuthGate';
import TopFade from '@/components/TopFade';
import { AppProviders } from '@/providers/AppProviders';
import { useAuth } from '@/providers/AuthProvider';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import '../global.css';

SplashScreen.preventAutoHideAsync().catch(() => {});

function EdgeToEdge({ children }: { children: React.ReactNode }) {
   const insets = useSafeAreaInsets();
   return (
      <View className="flex-1 bg-slate-50 dark:bg-slate-900">
         {/* Adjust height/intensity here to control the blur depth and strength. */}
         <TopFade height={insets.top + 12} />
         <StatusBar
            translucent
            // Logic: If Dark Mode -> Light Text. If Light Mode -> Dark Text.
            style={useColorScheme() === 'dark' ? 'light' : 'dark'}
         />
         {children}
      </View>
   );
}

function RootLayoutContent() {
   const { status, isConfigured } = useAuth();

   useEffect(() => {
      if (!isConfigured || status !== 'checking') {
         requestAnimationFrame(() => {
            SplashScreen.hideAsync().catch(() => {});
         });
      }
   }, [isConfigured, status]);

   return (
      <AuthGate>
         <AdapterGuard>
            <EdgeToEdge>
               <Stack
                  initialRouteName="index"
                  screenOptions={{
                     headerShown: false,
                     animation:
                        __DEV__ && Platform.OS === 'android'
                           ? 'none'
                           : 'default',
                  }}
               >
                  <Stack.Screen name="index" options={{ headerShown: false }} />
                  <Stack.Screen
                     name="entries"
                     options={{ headerShown: false }}
                  />
                  <Stack.Screen
                     name="settings"
                     options={{
                        presentation: 'card',
                        headerShown: false,
                     }}
                  />
                  <Stack.Screen
                     name="entryDetail/[id]"
                     options={{ headerShown: false }}
                  />
                  <Stack.Screen
                     name="(modal)"
                     options={{
                        animation: 'none',
                        presentation: 'containedTransparentModal',
                     }}
                  />
                  <Stack.Screen
                     name="dispute/[id]"
                     options={{
                        presentation: 'containedModal',
                        animation: 'slide_from_bottom',
                        headerShown: false,
                     }}
                  />
                  <Stack.Screen
                     name="new"
                     options={{
                        presentation: 'modal',
                        animation: 'slide_from_bottom',
                        headerShown: false,
                     }}
                  />
               </Stack>
            </EdgeToEdge>
         </AdapterGuard>
      </AuthGate>
   );
}

export default function RootLayout() {
   return (
      <GestureHandlerRootView style={{ flex: 1 }}>
         <AppProviders>
            <RootLayoutContent />
         </AppProviders>
      </GestureHandlerRootView>
   );
}
