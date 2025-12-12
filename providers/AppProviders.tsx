import { AdapterProvider } from '@/providers/AdapterProvider';
import { AuthProvider } from '@/providers/AuthProvider';
import { EntriesStoreProvider } from '@/providers/EntriesStoreProvider';
import { PreferencesProvider } from '@/providers/PreferencesProvider';
import { RevenueCatProvider } from '@/providers/RevenueCatProvider';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <KeyboardProvider>
      <PreferencesProvider>
        <AuthProvider>
          <RevenueCatProvider>
             <AdapterProvider>
                <EntriesStoreProvider>
                   <SafeAreaProvider>
                      {children}
                   </SafeAreaProvider>
                </EntriesStoreProvider>
             </AdapterProvider>
          </RevenueCatProvider>
        </AuthProvider>
      </PreferencesProvider>
    </KeyboardProvider>
  );
}