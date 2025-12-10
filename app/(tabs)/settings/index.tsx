import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useRevenueCat } from '@/providers/RevenueCatProvider';
import { GROWTH_PLUS_ENTITLEMENT } from '@/services/revenuecat';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { SafeAreaView } from 'react-native-safe-area-context';

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
   const {
      loading: rcLoading,
      error: rcError,
      customerInfo,
      isGrowthPlusActive,
      showPaywall,
      showCustomerCenter,
      buyConsumable,
      restorePurchases,
      refreshCustomerInfo: refreshRevenueCat,
   } = useRevenueCat();
   const router = useRouter();
   const plan = profile?.plan ?? 'free';
   const aiUsed = profile?.aiCallsUsed ?? 0;
   const extraCredits = profile?.extraAiCredits ?? 0;
   const growthEntitlement =
      customerInfo?.entitlements?.active?.[GROWTH_PLUS_ENTITLEMENT] ?? null;

   const [coupon, setCoupon] = useState('');
   const [redeeming, setRedeeming] = useState(false);
   const [redeemMessage, setRedeemMessage] = useState<string | null>(null);
   const [billingMessage, setBillingMessage] = useState<string | null>(null);
   const [billingAction, setBillingAction] = useState<
      null | 'paywall' | 'customer-center' | 'consumable' | 'restore' | 'refresh'
   >(null);

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

   const refreshEntitlements = async () => {
      setBillingAction('refresh');
      setBillingMessage(null);
      try {
         await refreshRevenueCat();
         setBillingMessage('Entitlements refreshed');
      } catch (err: any) {
         setBillingMessage(err?.message ?? 'Refresh failed');
      } finally {
         setBillingAction(null);
      }
   };

   const openPaywall = async () => {
      setBillingAction('paywall');
      setBillingMessage(null);
      try {
         const result = await showPaywall();
         if (result === PAYWALL_RESULT.PURCHASED) {
            setBillingMessage('Growth Plus unlocked!');
         } else {
            setBillingMessage(`Paywall closed (${result})`);
         }
         await refreshProfile();
      } catch (err: any) {
         setBillingMessage(err?.message ?? 'Paywall failed');
      } finally {
         setBillingAction(null);
      }
   };

   const openCustomerCenter = async () => {
      setBillingAction('customer-center');
      setBillingMessage(null);
      try {
         await showCustomerCenter();
         setBillingMessage('Customer Center closed');
      } catch (err: any) {
         setBillingMessage(err?.message ?? 'Unable to open Customer Center');
      } finally {
         setBillingAction(null);
      }
   };

   const buyOneConsumable = async () => {
      setBillingAction('consumable');
      setBillingMessage(null);
      try {
         const result = await buyConsumable();
         setBillingMessage(
            `Consumable purchased (${result.customerInfo.allPurchasedProductIdentifiers.join(
               ', '
            )})`
         );
      } catch (err: any) {
         setBillingMessage(err?.message ?? 'Purchase failed');
      } finally {
         setBillingAction(null);
      }
   };

   const handleRestore = async () => {
      setBillingAction('restore');
      setBillingMessage(null);
      try {
         await restorePurchases();
         setBillingMessage('Purchases restored');
      } catch (err: any) {
         setBillingMessage(err?.message ?? 'Restore failed');
      } finally {
         setBillingAction(null);
      }
   };

   return (
      <SafeAreaView style={styles.container}>
         <ScrollView>
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

               <Text style={styles.label}>Growth Plus entitlement</Text>
               <Text style={styles.value}>
                  {isGrowthPlusActive
                     ? `Active${growthEntitlement?.expirationDate ? ` (renews ${growthEntitlement.expirationDate})` : ''}`
                     : 'Inactive'}
               </Text>

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
                        (billingAction === 'paywall' || rcLoading) &&
                           styles.buttonDisabled,
                     ]}
                     onPress={openPaywall}
                     disabled={billingAction !== null || rcLoading}
                  >
                     <Text style={styles.buttonLabel}>
                        {billingAction === 'paywall'
                           ? 'Opening…'
                           : 'Open paywall'}
                     </Text>
                  </Pressable>
                  <Pressable
                     style={[
                        styles.secondary,
                        (billingAction === 'customer-center' || rcLoading) &&
                           styles.buttonDisabled,
                     ]}
                     onPress={openCustomerCenter}
                     disabled={billingAction !== null || rcLoading}
                  >
                     <Text style={styles.secondaryLabel}>
                        {billingAction === 'customer-center'
                           ? 'Opening…'
                           : 'Customer Center'}
                     </Text>
                  </Pressable>
               </View>
               <View style={styles.actions}>
                  <Pressable
                     style={[
                        styles.secondary,
                        (billingAction === 'restore' || rcLoading) &&
                           styles.buttonDisabled,
                     ]}
                     onPress={handleRestore}
                     disabled={billingAction !== null || rcLoading}
                  >
                     <Text style={styles.secondaryLabel}>
                        {billingAction === 'restore'
                           ? 'Restoring…'
                           : 'Restore purchases'}
                     </Text>
                  </Pressable>
                  <Pressable
                     style={[
                        styles.button,
                        (billingAction === 'consumable' || rcLoading) &&
                           styles.buttonDisabled,
                     ]}
                     onPress={buyOneConsumable}
                     disabled={billingAction !== null || rcLoading}
                  >
                     <Text style={styles.buttonLabel}>
                        {billingAction === 'consumable'
                           ? 'Purchasing…'
                           : 'Buy consumable'}
                     </Text>
                  </Pressable>
               </View>
               <View style={styles.actions}>
                  <Pressable
                     style={[
                        styles.secondary,
                        (billingAction === 'refresh' || rcLoading) &&
                           styles.buttonDisabled,
                     ]}
                     onPress={refreshEntitlements}
                     disabled={billingAction !== null || rcLoading}
                  >
                     <Text style={styles.secondaryLabel}>
                        {billingAction === 'refresh'
                           ? 'Refreshing…'
                           : 'Refresh entitlements'}
                     </Text>
                  </Pressable>
               </View>
               {billingMessage ? (
                  <Text style={styles.redeemMessage}>{billingMessage}</Text>
               ) : null}
               {rcError ? (
                  <Text style={styles.redeemMessage}>
                     RevenueCat error: {rcError}
                  </Text>
               ) : null}

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

         
            <Text>{JSON.stringify(profile, null, 4)}</Text>
            <Text>{JSON.stringify(user, null, 4)}</Text>
            <Text>{JSON.stringify(customerInfo, null, 4)}</Text>
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
