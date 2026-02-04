import { AdapterGuard } from '@/components/utils/AdapterGuard';
import { AuthGate } from '@/components/utils/AuthGate';
import TopFade from '@/components/utils/TopFade';
import '@/lib/i18n';
import { AppProviders } from '@/providers/AppProviders';
import { useAuth } from '@/providers/AuthProvider';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, Text, useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import '../global.css';

SplashScreen.preventAutoHideAsync().catch(() => {});

function EdgeToEdge({ children }: { children: React.ReactNode }) {
   const insets = useSafeAreaInsets();
   return (
      <View className="flex-1 bg-slate-50 dark:bg-slate-900">
         {/* Ensure TopFade is absolute so it doesn't push the Stack down layout-wise */}
         <View
            style={{
               position: 'absolute',
               top: 0,
               left: 0,
               right: 0,
               zIndex: 10,
            }}
         >
            <TopFade height={insets.top + 12} />
         </View>
         <StatusBar
            translucent
            style={useColorScheme() === 'dark' ? 'light' : 'dark'}
         />
         {children}
      </View>
   );
}

function RootLayoutContent() {
   const { status, isConfigured } = useAuth();
   const { i18n } = useTranslation();

   useEffect(() => {
      if (!isConfigured || status !== 'checking') {
         requestAnimationFrame(() => {
            SplashScreen.hideAsync().catch(() => {});
         });
      }
   }, [isConfigured, status]);

   useEffect(() => {
      const isKorean = i18n.language?.startsWith('ko');
      const existing = Text.defaultProps ?? {};
      const textProps =
         Platform.OS === 'ios'
            ? { lineBreakStrategyIOS: isKorean ? 'hangul-word' : 'standard' }
            : Platform.OS === 'android'
              ? { textBreakStrategy: isKorean ? 'simple' : 'highQuality' }
              : {};
      Text.defaultProps = { ...existing, ...textProps };
   }, [i18n.language]);

   return (
      <AuthGate>
         <AdapterGuard>
            <EdgeToEdge>
               <Stack
                  initialRouteName="index"
                  screenOptions={{
                     headerShown: false,
                     animation: Platform.OS === 'android' ? 'none' : 'default',
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
                        animation: 'slide_from_right',
                     }}
                  />
                  <Stack.Screen
                     name="entryDetail/[id]"
                     options={{
                        headerShown: false,
                        animation: 'slide_from_right',
                     }}
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
                        // CHANGED: fullScreenModal removes the top gap on iOS
                        presentation: 'fullScreenModal',
                        animation: 'slide_from_bottom',
                        headerShown: false,
                     }}
                  />
                  <Stack.Screen
                     name="new"
                     options={{
                        // CHANGED: fullScreenModal removes the top gap on iOS
                        presentation: 'fullScreenModal',
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
