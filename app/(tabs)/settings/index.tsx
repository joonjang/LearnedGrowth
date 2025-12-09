import { useAuth } from '@/providers/AuthProvider';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getSupabaseClient } from '@/lib/supabase';
import * as Linking from 'expo-linking';

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
   const extraCredits = profile?.extraAiCredits ?? 0;
   const subStatus = profile?.stripeSubscriptionStatus ?? 'inactive';

   const [coupon, setCoupon] = useState('');
   const [redeeming, setRedeeming] = useState(false);
   const [redeemMessage, setRedeemMessage] = useState<string | null>(null);
   const [checkoutLoading, setCheckoutLoading] = useState<null | 'sub' | 'credits'>(null);

   const redeemCoupon = async () => {
      if (!coupon.trim()) {
         setRedeemMessage('Enter a code');
         return;
      }
      setRedeemMessage(null);
      setRedeeming(true);
      try {
         const supabase = getSupabaseClient();
         const { data, error } = await supabase.functions.invoke('redeem', {
            body: { code: coupon.trim() },
         });
         if (error) {
            throw new Error(error.message ?? 'Redeem failed');
         }
         setRedeemMessage('Redeemed! Credits added');
         setCoupon('');
         await refreshProfile();
      } catch (err: any) {
         setRedeemMessage(err?.message ?? 'Redeem failed');
      } finally {
         setRedeeming(false);
      }
   };

   const startCheckout = async (mode: 'subscription' | 'payment') => {
      setCheckoutLoading(mode === 'subscription' ? 'sub' : 'credits');
      try {
         const supabase = getSupabaseClient();
         const { data, error } = await supabase.functions.invoke(
            'stripe-checkout',
            {
               body: {
                  mode,
                  quantity: mode === 'payment' ? 1 : undefined,
                  successUrl: 'https://example.com/success',
                  cancelUrl: 'https://example.com/cancel',
               },
            }
         );
         if (error) {
            throw new Error(error.message ?? 'Checkout failed');
         }
         const url = (data as any)?.url;
         if (!url) throw new Error('Missing checkout url');
         Linking.openURL(url);
      } catch (err: any) {
         setRedeemMessage(err?.message ?? 'Checkout failed');
      } finally {
         setCheckoutLoading(null);
      }
   };

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

               <Text style={styles.label}>Extra credits</Text>
               <Text style={styles.value}>{extraCredits}</Text>

               <Text style={styles.label}>Subscription status</Text>
               <Text style={styles.value}>{subStatus}</Text>

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

               <View style={styles.actions}>
                  <Pressable
                     style={[
                        styles.button,
                        checkoutLoading === 'sub' && styles.buttonDisabled,
                     ]}
                     onPress={() => startCheckout('subscription')}
                     disabled={checkoutLoading !== null}
                  >
                     <Text style={styles.buttonLabel}>
                        {checkoutLoading === 'sub'
                           ? 'Opening…'
                           : 'Go Invested'}
                     </Text>
                  </Pressable>
                  <Pressable
                     style={[
                        styles.secondary,
                        checkoutLoading === 'credits' && styles.buttonDisabled,
                     ]}
                     onPress={() => startCheckout('payment')}
                     disabled={checkoutLoading !== null}
                  >
                     <Text style={styles.secondaryLabel}>
                        {checkoutLoading === 'credits'
                           ? 'Opening…'
                           : 'Buy credits'}
                     </Text>
                  </Pressable>
               </View>

               <View style={styles.couponRow}>
                  <Text style={styles.label}>Redeem coupon</Text>
                  <View style={styles.couponForm}>
                     <TextInput
                        style={styles.input}
                        value={coupon}
                        onChangeText={setCoupon}
                        placeholder="Code"
                        autoCapitalize="characters"
                        editable={!redeeming}
                     />
                     <Pressable
                        style={[
                           styles.button,
                           styles.couponButton,
                           redeeming && styles.buttonDisabled,
                        ]}
                        onPress={redeemCoupon}
                        disabled={redeeming}
                     >
                        <Text style={styles.buttonLabel}>
                           {redeeming ? 'Redeeming…' : 'Apply'}
                        </Text>
                     </Pressable>
                  </View>
                  {redeemMessage ? (
                     <Text style={styles.redeemMessage}>{redeemMessage}</Text>
                  ) : null}
               </View>
            </View>
         )}

         <ScrollView>
            <Text>{JSON.stringify(profile, null, 4)}</Text>
            <Text>{JSON.stringify(user, null, 4)}</Text>
         </ScrollView>
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
   input: {
      borderWidth: 1,
      borderColor: '#e5e7eb',
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 16,
      backgroundColor: '#f8fafc',
      flex: 1,
   },
   couponRow: {
      marginTop: 12,
      gap: 8,
   },
   couponForm: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
   },
   couponButton: {
      paddingHorizontal: 16,
      paddingVertical: 10,
   },
   redeemMessage: {
      color: '#0f172a',
      fontSize: 12,
   },
});
