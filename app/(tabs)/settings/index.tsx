import { useAuth } from '@/providers/AuthProvider';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import {
   SafeAreaView,
   useSafeAreaInsets,
} from 'react-native-safe-area-context';

export default function SettingsScreen() {
   const {
      status,
      user,
      profile,
      signOut,
      refreshProfile,
      loadingProfile,
      isConfigured,
   } = useAuth();
   const router = useRouter();
   const plan = profile?.plan ?? 'free';
   const aiUsed = profile?.aiCallsUsed ?? 0;

   return (
      <SafeAreaView style={styles.container}>
         <Text style={styles.title}>Account</Text>

         {!isConfigured && (
            <Text style={styles.warning}>
               Supabase env vars are missing. Add EXPO_PUBLIC_SUPABASE_URL and
               EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY to enable auth and sync.
            </Text>
         )}

         {status !== 'signedIn' ? (
            <View style={styles.card}>
               <Text style={styles.label}>Not signed in</Text>
               <Pressable
                  style={styles.button}
                  onPress={() => router.push('/login')}
               >
                  <Text style={styles.buttonLabel}>Go to login</Text>
               </Pressable>
            </View>
         ) : (
            <View style={styles.card}>
               <Text style={styles.label}>Email</Text>
               <Text style={styles.value}>{user?.email ?? 'Unknown'}</Text>

               <Text style={styles.label}>Plan</Text>
               <Text style={styles.value}>{plan}</Text>

               <Text style={styles.label}>AI calls this month</Text>
               <Text style={styles.value}>{aiUsed} / 5</Text>

               <View style={styles.actions}>
                  <Pressable
                     style={[
                        styles.button,
                        loadingProfile && styles.buttonDisabled,
                     ]}
                     onPress={refreshProfile}
                     disabled={loadingProfile}
                  >
                     <Text style={styles.buttonLabel}>
                        {loadingProfile ? 'Refreshing…' : 'Refresh usage'}
                     </Text>
                  </Pressable>
                  <Pressable style={styles.secondary} onPress={signOut}>
                     <Text style={styles.secondaryLabel}>Sign out</Text>
                  </Pressable>
               </View>
            </View>
         )}

         <ScrollView><Text>{JSON.stringify(profile, null, 4)}</Text><Text>{JSON.stringify(user, null, 4)}</Text></ScrollView>
      </SafeAreaView>
   );
}

const styles = StyleSheet.create({
   container: {
      flex: 1,
      padding: 16,
      backgroundColor: '#f8fafc',
   },
   title: {
      fontSize: 24,
      fontWeight: '700',
      marginBottom: 12,
   },
   card: {
      backgroundColor: 'white',
      borderRadius: 12,
      padding: 16,
      gap: 8,
      elevation: 3,
   },
   label: {
      fontSize: 12,
      color: '#475569',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
   },
   value: {
      fontSize: 16,
      fontWeight: '600',
      color: '#0f172a',
   },
   actions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 10,
   },
   button: {
      backgroundColor: '#2563eb',
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
   },
   buttonDisabled: {
      opacity: 0.6,
   },
   buttonLabel: {
      color: 'white',
      fontWeight: '700',
   },
   secondary: {
      backgroundColor: '#e2e8f0',
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
   },
   secondaryLabel: {
      color: '#0f172a',
      fontWeight: '700',
   },
   warning: {
      backgroundColor: '#fff3cd',
      color: '#854d0e',
      padding: 12,
      borderRadius: 10,
      marginBottom: 12,
   },
});
