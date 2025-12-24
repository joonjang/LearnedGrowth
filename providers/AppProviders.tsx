import { AdapterProvider } from '@/providers/AdapterProvider';
import { AuthProvider } from '@/providers/AuthProvider';
import { EncryptionProvider } from '@/providers/EncryptionProvider';
import { EntriesStoreProvider } from '@/providers/EntriesStoreProvider';
import { PreferencesProvider } from '@/providers/PreferencesProvider';
import { RevenueCatProvider } from '@/providers/RevenueCatProvider';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <KeyboardProvider>
      <PreferencesProvider>
        <AuthProvider>
          <EncryptionProvider>
            <RevenueCatProvider>
               <AdapterProvider>
                  <EntriesStoreProvider>
                     <SafeAreaProvider>
                        <BottomSheetModalProvider>
                           {children}
                        </BottomSheetModalProvider>
                     </SafeAreaProvider>
                  </EntriesStoreProvider>
               </AdapterProvider>
            </RevenueCatProvider>
          </EncryptionProvider>
        </AuthProvider>
      </PreferencesProvider>
    </KeyboardProvider>
  );
}
