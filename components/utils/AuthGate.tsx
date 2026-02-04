import { useAuth } from '@/providers/AuthProvider';
import { useColorScheme } from 'nativewind';
import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Text, View } from 'react-native';

export function AuthGate({ children }: { children: ReactNode }) {
   const { status, isConfigured } = useAuth();
   const { t } = useTranslation();
   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';

   // --- REMOVED: The hijacked useEffect ---
   // We trust the Login/Signup screens to handle navigation upon success.
   // The global listener is too aggressive for specific flows.

   if (!isConfigured) {
      return <>{children}</>;
   }

   if (status === 'checking') {
      return (
         <View className="flex-1 items-center justify-center bg-slate-50 dark:bg-slate-900 pointer-events-auto">
            <View className="items-center gap-2.5">
               <ActivityIndicator
                  size="large"
                  color={isDark ? '#ffffff' : '#000000'}
               />
               <Text className="text-base font-medium text-slate-900 dark:text-slate-100">
                  {t('auth.checking_session')}
               </Text>
            </View>
         </View>
      );
   }

   return <>{children}</>;
}
