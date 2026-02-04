import { useEntriesAdapter } from '@/providers/AdapterProvider';
import { useTranslation } from 'react-i18next';
import { Button, StyleSheet, Text, View } from 'react-native';

export function AdapterGuard({ children }: { children: React.ReactNode }) {
   const { ready, error, reload } = useEntriesAdapter();
   const { t } = useTranslation();


   return (
      <View style={styles.container}>

         {children}

         {!ready && !error && (
            <Overlay>
               <Text>{t('common.loading')}</Text>
            </Overlay>
         )}

         {!!error && (
            <Overlay>
               <Text>{t('common.error')}</Text>
               <Text>{error}</Text>
               <Button title={t('common.reload')} onPress={reload} />
            </Overlay>
         )}
      </View>
   );
}

function Overlay({ children }: { children: React.ReactNode }) {
   return (
      <View style={styles.overlay} pointerEvents="auto">
         <View style={styles.bubble}>{children}</View>
      </View>
   );
}

const styles = StyleSheet.create({
   container: {
      flex: 1,
      position: 'relative', // <-- makes absolute children fill this
   },
   overlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.3)',
      zIndex: 9999,
      elevation: 10,
   },
   bubble: {
      paddingVertical: 14,
      paddingHorizontal: 18,
      borderRadius: 12,
      backgroundColor: 'white',
      alignItems: 'center',
   },
});
