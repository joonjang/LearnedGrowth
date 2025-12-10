import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useRevenueCat } from '@/providers/RevenueCatProvider';
import { usePreferences } from '@/providers/PreferencesProvider';
import { palette } from '@/theme/colors';
import { useRouter } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
   ActivityIndicator,
   Alert,
   Linking,
   Platform,
   Pressable,
   ScrollView,
   StyleSheet,
   Switch,
   Text,
   TextInput,
   View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PAYWALL_RESULT } from 'react-native-purchases-ui';

const FREE_MONTHLY_LIMIT = 5;
const STORAGE_KEYS = {
   biometric: 'prefs:biometricLock',
} as const;

const MANAGE_SUBSCRIPTION_URL = Platform.select({
   ios: 'https://apps.apple.com/account/subscriptions',
   android: 'https://play.google.com/store/account/subscriptions',
   default: 'https://apps.apple.com/account/subscriptions',
});

export default function AccountScreen() {
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
      showPaywall,
      buyConsumable,
      restorePurchases,
      isGrowthPlusActive,
   } = useRevenueCat();
   const {
      loading: prefsLoading,
      error: prefsError,
      showAiAnalysis,
      hapticsEnabled,
      hapticsAvailable,
      triggerHaptic,
      theme,
      setShowAiAnalysis,
      setHapticsEnabled,
      setTheme,
      clearError: clearPrefError,
   } = usePreferences();
   const router = useRouter();

   const [bannerDismissed, setBannerDismissed] = useState(false);
   const [isOffline, setIsOffline] = useState(false);
   const [billingNote, setBillingNote] = useState<string | null>(null);
   const [billingAction, setBillingAction] = useState<
      null | 'upgrade' | 'consumable' | 'restore' | 'manage'
   >(null);

   const [biometricEnabled, setBiometricEnabled] = useState(false);
   const [biometricInfo, setBiometricInfo] = useState({
      hasHardware: false,
      isEnrolled: false,
   });

   const [feedback, setFeedback] = useState('');
   const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
   const [feedbackSending, setFeedbackSending] = useState(false);

   const [deleteLoading, setDeleteLoading] = useState(false);

   const plan = profile?.plan ?? 'free';
   const entitlementActive = isGrowthPlusActive;
   const hasGrowth = entitlementActive;
   const aiUsed = profile?.aiCallsUsed ?? 0;
   const extraCredits = profile?.extraAiCredits ?? 0;
   const monthlyRemaining = Math.max(FREE_MONTHLY_LIMIT - aiUsed, 0);
   const totalAvailable =
      hasGrowth ? 'Unlimited' : `${monthlyRemaining + extraCredits}`;
   const darkMode = theme === 'dark';

   useEffect(() => {
      const unsubscribe = NetInfo.addEventListener((state) => {
         const online = Boolean(
            state.isConnected &&
               (state.isInternetReachable === null ||
                  state.isInternetReachable === undefined ||
                  state.isInternetReachable)
         );
         setIsOffline(!online);
      });
      return () => unsubscribe();
   }, []);

   useEffect(() => {
      AsyncStorage.getItem(STORAGE_KEYS.biometric)
         .then((val) => setBiometricEnabled(val === 'true'))
         .catch((err) => console.warn('Failed to load biometric preference', err));
   }, []);

   const refreshBiometricInfo = useCallback(async () => {
      try {
         const hasHardware = await LocalAuthentication.hasHardwareAsync();
         const isEnrolled = hasHardware
            ? await LocalAuthentication.isEnrolledAsync()
            : false;
         setBiometricInfo({ hasHardware, isEnrolled });
         return { hasHardware, isEnrolled };
      } catch (err) {
         console.warn('Biometric check failed', err);
         const fallback = { hasHardware: false, isEnrolled: false };
         setBiometricInfo(fallback);
         return fallback;
      }
   }, []);

   useEffect(() => {
      refreshBiometricInfo();
   }, [refreshBiometricInfo]);

   const handleUpgrade = async () => {
      setBillingAction('upgrade');
      setBillingNote(null);
      try {
         const result = await showPaywall();
         if (result === PAYWALL_RESULT.PURCHASED) {
            setBillingNote('Growth Plus unlocked.');
            await refreshProfile();
         } else {
            setBillingNote('Closed the upgrade sheet.');
         }
      } catch (err: any) {
         setBillingNote(err?.message ?? 'Unable to open paywall.');
      } finally {
         setBillingAction(null);
      }
   };

   const handleBuyConsumable = async () => {
      setBillingAction('consumable');
      setBillingNote(null);
      try {
         await buyConsumable();
         setBillingNote('Added 10 more analysis credits.');
         await refreshProfile();
      } catch (err: any) {
         setBillingNote(err?.message ?? 'Purchase failed.');
      } finally {
         setBillingAction(null);
      }
   };

   const handleRestore = async () => {
      if (isOffline) {
         setBillingNote('Go online to restore purchases.');
         return;
      }
      setBillingAction('restore');
      setBillingNote(null);
      try {
         await restorePurchases();
         await refreshProfile();
         setBillingNote('Purchases restored.');
      } catch (err: any) {
         setBillingNote(err?.message ?? 'Restore failed.');
      } finally {
         setBillingAction(null);
      }
   };

   const handleManageSubscription = async () => {
      if (isOffline) return;
      setBillingAction('manage');
      setBillingNote(null);
      try {
         if (!MANAGE_SUBSCRIPTION_URL) {
            throw new Error('Subscription management is not supported here.');
         }
         const supported = await Linking.canOpenURL(MANAGE_SUBSCRIPTION_URL);
         if (!supported) {
            throw new Error('Unable to open subscription settings on this device.');
         }
         await Linking.openURL(MANAGE_SUBSCRIPTION_URL);
         setBillingNote('Opening subscription settings...');
      } catch (err: any) {
         setBillingNote(err?.message ?? 'Manage subscription failed.');
         Alert.alert('Manage subscription', err?.message ?? 'Unable to open settings.');
      } finally {
         setBillingAction(null);
      }
   };

   const handleToggleBiometric = async (next: boolean) => {
      clearPrefError();
      try {
         const info = await refreshBiometricInfo();
         if (!info.hasHardware) {
            Alert.alert(
               'Biometric unavailable',
               'This device does not support Face ID or fingerprint unlock.'
            );
            return;
         }
         if (!info.isEnrolled) {
            Alert.alert(
               'Set up biometrics',
               'Add a fingerprint or face unlock in your system settings first.'
            );
            return;
         }
         if (next) {
            const result = await LocalAuthentication.authenticateAsync({
               promptMessage: 'Enable biometric lock',
               cancelLabel: 'Cancel',
            });
            if (!result.success) {
               return;
            }
         }
         setBiometricEnabled(next);
         await AsyncStorage.setItem(STORAGE_KEYS.biometric, String(next));
         if (next && hapticsEnabled) {
            triggerHaptic();
         }
      } catch (err: any) {
         console.warn('Could not update biometric setting.', err);
      }
   };

   const handleToggleAnalysis = async (next: boolean) => {
      try {
         clearPrefError();
         await setShowAiAnalysis(next);
      } catch (err: any) {
         console.warn('Could not update AI setting.', err);
      }
   };

   const handleToggleHaptics = async (next: boolean) => {
      try {
         clearPrefError();
         await setHapticsEnabled(next);
      } catch (err: any) {
         console.warn('Could not update haptics.', err);
      }
   };

   const handleToggleTheme = async (nextDark: boolean) => {
      try {
         clearPrefError();
         await setTheme(nextDark ? 'dark' : 'light');
      } catch (err: any) {
         console.warn('Could not update theme.', err);
      }
   };

   const handleSendFeedback = async () => {
      if (!feedback.trim()) {
         setFeedbackMessage('Add a quick note before sending.');
         return;
      }
      setFeedbackSending(true);
      setFeedbackMessage(null);
      try {
         const supabase = getSupabaseClient();
         const { error } = await supabase.from('feedback').insert({
            message: feedback.trim(),
            user_id: user?.id ?? null,
            email: user?.email ?? null,
         });
         if (error) throw new Error(error.message);
         setFeedback('');
         setFeedbackMessage('Thanks for the feedback.');
      } catch (err: any) {
         setFeedbackMessage(err?.message ?? 'Unable to send feedback right now.');
      } finally {
         setFeedbackSending(false);
      }
   };

   const handleDeleteAccount = async () => {
      if (isOffline) return;
      setDeleteLoading(true);
      try {
         const supabase = getSupabaseClient();
         const { error } = await supabase.functions.invoke('delete-account');
         if (error) throw new Error(error.message);
         await signOut();
         router.replace('/login');
      } catch (err: any) {
         Alert.alert('Delete account', err?.message ?? 'Delete failed.');
      } finally {
         setDeleteLoading(false);
      }
   };

   const confirmDelete = () =>
      Alert.alert(
         'Delete account',
         'This will remove your account and synced data. This cannot be undone.',
         [
            { text: 'Cancel', style: 'cancel' },
            {
               text: 'Delete',
               style: 'destructive',
               onPress: handleDeleteAccount,
            },
         ]
      );

   const planLabel = useMemo(() => {
      if (entitlementActive) return 'Growth Plus (RevenueCat)';
      return plan === 'invested' ? 'Growth Plus (database only)' : 'Free';
   }, [entitlementActive, plan]);
   const biometricUnavailable = !biometricInfo.hasHardware;
   const biometricNeedsEnroll = biometricInfo.hasHardware && !biometricInfo.isEnrolled;

   return (
      <SafeAreaView style={styles.safeArea}>
         <ScrollView contentContainerStyle={styles.scroll}>
            <View style={styles.headerRow}>
               <View>
                  <Text style={styles.title}>Account</Text>
                  <Text style={styles.subtitle}>
                     {user?.email ?? 'Guest data stays on this device'}
                  </Text>
               </View>
               <View style={styles.badgeRow}>
                  {isOffline && (
                     <View style={styles.offlineBadge}>
                        <Text style={styles.offlineText}>Offline</Text>
                     </View>
                  )}
               </View>
            </View>

            {!isConfigured && (
               <View style={styles.warningCard}>
                  <Text style={styles.warningTitle}>Supabase not configured</Text>
                  <Text style={styles.warningText}>
                     Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
                     to enable sync.
                  </Text>
               </View>
            )}

            {!user && !bannerDismissed && (
               <View style={styles.banner}>
                  <View style={{ flex: 1 }}>
                     <Text style={styles.bannerTitle}>
                        Your data is only on this phone.
                     </Text>
                     <Text style={styles.bannerText}>
                        Sign in to back it up and sync across installs.
                     </Text>
                  </View>
                  <Pressable
                     onPress={() => setBannerDismissed(true)}
                     style={styles.bannerDismiss}
                  >
                     <Text style={styles.bannerDismissText}>Dismiss</Text>
                  </Pressable>
               </View>
            )}

            <View style={styles.card}>
               <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>Subscription</Text>
                  {(loadingProfile || rcLoading) && (
                     <ActivityIndicator size="small" color="#111827" />
                  )}
               </View>

               <View style={styles.planRow}>
                  <View style={{ flex: 1 }}>
                     <Text style={styles.label}>Current plan</Text>
                     <Text style={styles.value}>{planLabel}</Text>
                     {hasGrowth ? (
                        <Text style={styles.hint}>
                           Growth Plus active via RevenueCat.
                        </Text>
                     ) : (
                        <Text style={styles.hint}>
                           {monthlyRemaining} monthly uses left + {extraCredits} extra credits
                        </Text>
                     )}
                  </View>
                  <Pressable
                     style={[
                        styles.ghostButton,
                        loadingProfile && styles.buttonDisabled,
                     ]}
                     onPress={refreshProfile}
                     disabled={loadingProfile}
                  >
                     <Text style={styles.ghostButtonText}>
                        {loadingProfile ? 'Refreshing...' : 'Refresh'}
                     </Text>
                  </Pressable>
               </View>

               <View style={styles.metricsRow}>
                  <View style={styles.metric}>
                     <Text style={styles.metricLabel}>Monthly uses remaining</Text>
                     <Text style={styles.metricValue}>
                        {hasGrowth ? 'Unlimited' : monthlyRemaining}
                     </Text>
                  </View>
                  <View style={styles.metric}>
                     <Text style={styles.metricLabel}>Extra credits</Text>
                     <Text style={styles.metricValue}>
                        {hasGrowth ? 'N/A' : extraCredits}
                     </Text>
                  </View>
                  <View style={styles.metric}>
                     <Text style={styles.metricLabel}>Total available</Text>
                     <Text style={styles.metricValue}>{totalAvailable}</Text>
                  </View>
               </View>

               {!entitlementActive ? (
                  <View style={styles.actionStack}>
                     <Pressable
                        style={[
                           styles.primaryButton,
                           billingAction === 'upgrade' && styles.buttonDisabled,
                        ]}
                        onPress={handleUpgrade}
                        disabled={billingAction !== null}
                     >
                        <Text style={styles.primaryLabel}>
                           {billingAction === 'upgrade'
                              ? 'Opening...'
                              : 'Upgrade to Growth Plus'}
                        </Text>
                     </Pressable>
                     <Pressable
                        style={[
                           styles.secondaryButton,
                           billingAction === 'consumable' && styles.buttonDisabled,
                        ]}
                        onPress={handleBuyConsumable}
                        disabled={billingAction !== null}
                     >
                        <Text style={styles.secondaryLabel}>
                           {billingAction === 'consumable'
                              ? 'Purchasing...'
                              : 'Buy 10 More Analysis'}
                        </Text>
                     </Pressable>
                  </View>
               ) : (
                  <Pressable
                     style={[
                        styles.secondaryButton,
                        (isOffline || billingAction === 'manage') &&
                           styles.buttonDisabled,
                     ]}
                     onPress={handleManageSubscription}
                     disabled={isOffline || billingAction !== null}
                  >
                     <Text style={styles.secondaryLabel}>
                        {billingAction === 'manage'
                           ? 'Opening...'
                           : 'Manage Subscription'}
                     </Text>
                  </Pressable>
               )}

               <Pressable
                  style={[
                     styles.ghostButton,
                     (isOffline || billingAction === 'restore') &&
                        styles.buttonDisabled,
                  ]}
                  onPress={handleRestore}
                  disabled={isOffline || billingAction !== null}
               >
                  <Text style={styles.ghostButtonText}>
                     {billingAction === 'restore'
                        ? 'Restoring...'
                        : 'Restore Purchases'}
                  </Text>
               </Pressable>

               {(billingNote || rcError) && (
                  <Text style={styles.noteText}>
                     {billingNote ?? `RevenueCat: ${rcError}`}
                  </Text>
               )}
            </View>

            <View style={styles.card}>
               <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>App preferences</Text>
                  {prefsLoading && <ActivityIndicator size="small" color="#111827" />}
               </View>

               <SettingRow
                  title="Enable Biometric Lock"
                  description="Require Face ID / Touch ID on launch."
                  disabled={prefsLoading || biometricUnavailable}
               >
                  <Switch
                     value={biometricEnabled}
                     onValueChange={handleToggleBiometric}
                     disabled={prefsLoading || biometricUnavailable}
                     trackColor={{ true: '#111827', false: '#d1d5db' }}
                     thumbColor="white"
                  />
               </SettingRow>
               {biometricUnavailable && (
                  <Text style={styles.noteText}>
                     Biometric lock is not available on this device.
                  </Text>
               )}
               {biometricNeedsEnroll && (
                  <Text style={styles.noteText}>
                     Add a fingerprint or face profile in system settings to turn this on.
                  </Text>
               )}

               <SettingRow
                  title="Show AI Analysis"
                  description="Hide or show AI insights in the UI."
               >
                  <Switch
                     value={showAiAnalysis}
                     onValueChange={handleToggleAnalysis}
                     disabled={prefsLoading}
                     trackColor={{ true: '#111827', false: '#d1d5db' }}
                     thumbColor="white"
                  />
               </SettingRow>

               <SettingRow
                  title="Dark mode"
                  description="Switch between light and dark surfaces."
               >
                  <Switch
                     value={darkMode}
                     onValueChange={handleToggleTheme}
                     disabled={prefsLoading}
                     trackColor={{ true: '#111827', false: '#d1d5db' }}
                     thumbColor="white"
                  />
               </SettingRow>

               <SettingRow
                  title="Tactile feedback"
                  description="Use haptics when finishing an entry."
               >
                  <Switch
                     value={hapticsEnabled}
                     onValueChange={handleToggleHaptics}
                     disabled={prefsLoading || !hapticsAvailable}
                     trackColor={{ true: '#111827', false: '#d1d5db' }}
                     thumbColor="white"
                  />
               </SettingRow>

               {prefsError && <Text style={styles.noteText}>{prefsError}</Text>}
            </View>

            <View style={styles.card}>
               <Text style={styles.cardTitle}>Account actions</Text>

               <View style={styles.feedbackBlock}>
                  <Text style={styles.label}>Send feedback</Text>
                  <TextInput
                     style={styles.input}
                     placeholder="Tell us what is working or what is rough"
                     multiline
                     value={feedback}
                     onChangeText={setFeedback}
                     editable={!feedbackSending}
                  />
                  <Pressable
                     style={[
                        styles.secondaryButton,
                        feedbackSending && styles.buttonDisabled,
                     ]}
                     onPress={handleSendFeedback}
                     disabled={feedbackSending}
                  >
                     <Text style={styles.secondaryLabel}>
                        {feedbackSending ? 'Sending...' : 'Send Feedback'}
                     </Text>
                  </Pressable>
                  {feedbackMessage && (
                     <Text style={styles.noteText}>{feedbackMessage}</Text>
                  )}
               </View>

               {status === 'signedIn' && (
                  <Pressable style={styles.ghostButton} onPress={signOut}>
                     <Text style={styles.ghostButtonText}>Sign out</Text>
                  </Pressable>
               )}

               <Pressable
                  style={[
                     styles.dangerButton,
                     (isOffline || deleteLoading) && styles.buttonDisabled,
                  ]}
                  onPress={confirmDelete}
                  disabled={isOffline || deleteLoading}
               >
                  <Text style={styles.dangerLabel}>
                     {deleteLoading ? 'Deleting...' : 'Delete account'}
                  </Text>
               </Pressable>
            </View>
         </ScrollView>
      </SafeAreaView>
   );
}

function SettingRow({
   title,
   description,
   children,
   disabled,
}: {
   title: string;
   description: string;
   children: ReactNode;
   disabled?: boolean;
}) {
   return (
      <View style={[styles.settingRow, disabled && styles.settingDisabled]}>
         <View style={{ flex: 1 }}>
            <Text style={styles.settingTitle}>{title}</Text>
            <Text style={styles.settingDescription}>{description}</Text>
         </View>
         {children}
      </View>
   );
}

const styles = StyleSheet.create({
   safeArea: {
      flex: 1,
      backgroundColor: '#f6f7fb',
   },
   scroll: {
      padding: 16,
      gap: 14,
   },
   headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
   },
   badgeRow: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
   },
   title: {
      fontSize: 26,
      fontWeight: '800',
      color: palette.text,
   },
   subtitle: {
      fontSize: 14,
      color: palette.hint,
      marginTop: 2,
   },
   offlineBadge: {
      backgroundColor: '#e5e7eb',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: '#cbd5e1',
   },
   offlineText: {
      fontSize: 12,
      color: '#374151',
      fontWeight: '700',
   },
   warningCard: {
      backgroundColor: '#fef3c7',
      borderColor: '#f59e0b',
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: 12,
      padding: 12,
      gap: 4,
   },
   warningTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: '#92400e',
   },
   warningText: {
      fontSize: 13,
      color: '#92400e',
   },
   banner: {
      backgroundColor: '#ecfeff',
      borderColor: '#06b6d4',
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: 12,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
   },
   bannerTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: '#0f172a',
   },
   bannerText: {
      fontSize: 13,
      color: '#0ea5e9',
   },
   bannerDismiss: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: '#0ea5e9',
      borderRadius: 10,
   },
   bannerDismissText: {
      color: 'white',
      fontWeight: '700',
   },
   card: {
      backgroundColor: palette.cardBg,
      borderRadius: 16,
      padding: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: palette.border,
      gap: 12,
   },
   cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
   },
   cardTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: palette.text,
   },
   planRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
   },
   label: {
      fontSize: 12,
      textTransform: 'uppercase',
      color: palette.hint,
      letterSpacing: 0.5,
   },
   value: {
      fontSize: 16,
      fontWeight: '700',
      color: palette.text,
      marginTop: 2,
   },
   hint: {
      fontSize: 13,
      color: palette.hint,
      marginTop: 2,
   },
   metricsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
   },
   metric: {
      flex: 1,
      minWidth: '30%',
      backgroundColor: '#f8fafc',
      borderRadius: 12,
      padding: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: '#e5e7eb',
   },
   metricLabel: {
      fontSize: 12,
      color: palette.hint,
      marginBottom: 6,
   },
   metricValue: {
      fontSize: 18,
      fontWeight: '800',
      color: palette.text,
   },
   actionStack: {
      gap: 8,
   },
   primaryButton: {
      backgroundColor: '#111827',
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center',
   },
   primaryLabel: {
      color: 'white',
      fontWeight: '700',
      fontSize: 15,
   },
   secondaryButton: {
      backgroundColor: '#e5e7eb',
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center',
   },
   secondaryLabel: {
      color: '#111827',
      fontWeight: '700',
      fontSize: 15,
   },
   ghostButton: {
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: '#d1d5db',
   },
   ghostButtonText: {
      color: '#111827',
      fontWeight: '700',
      fontSize: 14,
   },
   dangerButton: {
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center',
      backgroundColor: '#fee2e2',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: '#ef4444',
   },
   dangerLabel: {
      color: '#b91c1c',
      fontWeight: '800',
      fontSize: 15,
   },
   buttonDisabled: {
      opacity: 0.5,
   },
   noteText: {
      fontSize: 12,
      color: '#334155',
   },
   settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
   },
   settingDisabled: {
      opacity: 0.6,
   },
   settingTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: palette.text,
   },
   settingDescription: {
      fontSize: 13,
      color: palette.hint,
      marginTop: 2,
   },
   feedbackBlock: {
      gap: 8,
   },
   input: {
      minHeight: 80,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: '#e5e7eb',
      borderRadius: 12,
      padding: 12,
      fontSize: 14,
      backgroundColor: '#f8fafc',
      textAlignVertical: 'top',
   },
});
