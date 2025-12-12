import SendFeedback from '@/components/SendFeedback';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { usePreferences } from '@/providers/PreferencesProvider';
import { useRevenueCat } from '@/providers/RevenueCatProvider';
// REMOVED: import { makeThemedStyles, useTheme } from '@/theme/theme';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as LocalAuthentication from 'expo-local-authentication';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind'; // <--- Added
import {
   useCallback,
   useEffect,
   useMemo,
   useState,
   type ReactNode,
} from 'react';
import {
   ActivityIndicator,
   Alert,
   Linking,
   Platform,
   Pressable,
   ScrollView,
   Switch,
   Text,
   View,
} from 'react-native';
import { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
   const insets = useSafeAreaInsets();
   
   // --- Theme Logic ---
   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';
   const iconColor = isDark ? '#94a3b8' : '#64748b'; // text-muted-icon
   const loaderColor = isDark ? '#f8fafc' : '#0f172a'; // text

   // Switch Colors (Must be raw hex)
   const switchTrackColor = {
      false: isDark ? '#475569' : '#cbd5e1', // border-strong
      true: isDark ? '#f8fafc' : '#0f172a',  // text
   };
   const switchThumbColor = isDark ? '#1e293b' : '#ffffff'; // card-bg

   // --- State ---
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
   const [actionsCollapsed, setActionsCollapsed] = useState(true);
   const [deleteLoading, setDeleteLoading] = useState(false);

   const plan = profile?.plan ?? 'free';
   const entitlementActive = isGrowthPlusActive;
   const hasGrowth = entitlementActive;
   const aiUsed = profile?.aiCallsUsed ?? 0;
   const extraCredits = profile?.extraAiCredits ?? 0;
   const monthlyRemaining = Math.max(FREE_MONTHLY_LIMIT - aiUsed, 0);
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
         .catch((err) =>
            console.warn('Failed to load biometric preference', err)
         );
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
            throw new Error(
               'Unable to open subscription settings on this device.'
            );
         }
         await Linking.openURL(MANAGE_SUBSCRIPTION_URL);
         setBillingNote('Opening subscription settings...');
      } catch (err: any) {
         setBillingNote(err?.message ?? 'Manage subscription failed.');
         Alert.alert(
            'Manage subscription',
            err?.message ?? 'Unable to open settings.'
         );
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

   const handleDeleteAccount = async () => {
      if (isOffline) return;
      setDeleteLoading(true);
      try {
         const supabase = getSupabaseClient();
         const { error } = await supabase.functions.invoke('delete-account');
         if (error) throw new Error(error.message);
         await signOut();
         router.push('/(modal)/login');
      } catch (err: any) {
         Alert.alert('Delete account', err?.message ?? 'Delete failed.');
      } finally {
         setDeleteLoading(false);
      }
   };

   const confirmDelete = () => {
      const warning = entitlementActive
         ? 'This will delete your account and synced data. Active subscriptions will NOT be canceled automatically.'
         : 'This will remove your account and synced data. This cannot be undone.';

      Alert.alert('Delete account', warning, [
         { text: 'Cancel', style: 'cancel' },
         {
            text: 'Delete',
            style: 'destructive',
            onPress: handleDeleteAccount,
         },
      ]);
   };

   const confirmSignOut = () =>
      Alert.alert(
         'Sign out',
         'You will be signed out.',
         [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign out', style: 'destructive', onPress: signOut },
         ]
      );

   const planLabel = useMemo(() => {
      if (entitlementActive) return 'Growth Plus (RevenueCat)';
      return plan === 'invested' ? 'Growth Plus (database only)' : 'Free';
   }, [entitlementActive, plan]);

   const refillLabel = useMemo(() => {
      if (!profile?.aiCycleStart) return null;
      const date = new Date(profile.aiCycleStart);
      const currentDay = date.getDate();
      date.setMonth(date.getMonth() + 1);
      if (date.getDate() !== currentDay) {
         date.setDate(0);
      }

      return date.toLocaleDateString(undefined, {
         month: 'short',
         day: 'numeric',
      });
   }, [profile?.aiCycleStart]);

   const biometricUnavailable = !biometricInfo.hasHardware;
   const biometricNeedsEnroll = biometricInfo.hasHardware && !biometricInfo.isEnrolled;

   return (
      <View className="flex-1 bg-background">
         <ScrollView
            contentContainerStyle={{
               paddingTop: insets.top + 8,
               paddingBottom: insets.bottom + 24,
               paddingHorizontal: 16,
               gap: 14
            }}
            scrollIndicatorInsets={{
               top: insets.top,
               bottom: insets.bottom,
            }}
            showsVerticalScrollIndicator={false}
         >
            {/* Header */}
            <View className="flex-row justify-between items-center">
               <View>
                  <Text className="text-2xl font-extrabold text-text">
                     {user?.email ?? 'Not Logged In'}
                  </Text>
               </View>
               <View className="flex-row gap-2 items-center">
                  {isOffline && (
                     <View className="bg-card-grey px-2.5 py-1.5 rounded-full border border-border">
                        <Text className="text-xs font-bold text-text">Offline</Text>
                     </View>
                  )}
               </View>
            </View>

            {/* Supabase Config Warning */}
            {!isConfigured && (
               <View className="bg-belief-bg border border-belief-border rounded-xl p-3 gap-1 shadow-sm">
                  <Text className="text-sm font-bold text-belief-text">
                     Supabase not configured
                  </Text>
                  <Text className="text-xs text-belief-text">
                     Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY to enable sync.
                  </Text>
               </View>
            )}

            {/* Not Logged In Banner */}
            {!user && (
               <View className="bg-card-grey border border-disputeCTA rounded-xl p-3 flex-row items-center gap-2.5 shadow-sm">
                  <View className="flex-1">
                     <Text className="text-[15px] font-bold text-text">
                        Your data is only on this phone.
                     </Text>
                     <Text className="text-xs text-text-subtle">
                        Sign in to back it up.
                     </Text>
                  </View>
                  <Pressable
                     className="mt-2 bg-disputeCTA py-2 px-3 rounded-lg self-start shadow-sm"
                     onPress={() => router.push('/(modal)/login')}
                  >
                     <Text className="text-ctaText font-bold text-sm">Sign in</Text>
                  </Pressable>
               </View>
            )}

            {/* Subscription Card */}
            {user && (
               <View className="bg-card-bg rounded-2xl p-3.5 border border-border gap-3 shadow-sm">
                  <View className="flex-row justify-between items-center">
                     <Text className="text-lg font-extrabold text-text">Subscription</Text>
                     {(loadingProfile || rcLoading) && (
                        <ActivityIndicator size="small" color={loaderColor} />
                     )}
                  </View>

                  <View className="flex-row items-start gap-3">
                     <View className="flex-1">
                        <Text className="text-xs text-hint tracking-wider">Current plan</Text>
                        <Text className="text-base font-bold text-text mt-0.5">{planLabel}</Text>
                     </View>
                     <Pressable
                        className={`w-10 h-10 rounded-full items-center justify-center border border-border bg-card-bg ${loadingProfile ? 'opacity-50' : ''}`}
                        onPress={refreshProfile}
                        disabled={loadingProfile}
                     >
                        <Text className="font-bold text-text">{loadingProfile ? '…' : '↻'}</Text>
                     </Pressable>
                  </View>

                  {!hasGrowth && (
                     <>
                        <Text className="text-xs text-hint mt-0.5">
                           {refillLabel ? `Refills next on ${refillLabel}` : ''}
                        </Text>
                        <View className="flex-row flex-wrap gap-2.5">
                           {/* Monthly Uses Metric */}
                           <View className="flex-1 min-w-[30%] bg-card-input rounded-xl p-3 border border-border gap-1.5 shadow-sm">
                              <Text className="text-xs text-hint mb-1">
                                 Monthly uses remaining
                              </Text>
                              <Text className="text-lg font-extrabold text-text">
                                 {monthlyRemaining}
                              </Text>
                           </View>
                           
                           {/* Extra Analysis Metric */}
                           <Pressable
                              className={`flex-1 min-w-[30%] bg-card-input rounded-xl p-3 border border-border gap-1.5 shadow-sm active:bg-card-grey ${billingAction === 'consumable' ? 'opacity-50' : ''}`}
                              onPress={handleBuyConsumable}
                              disabled={billingAction !== null}
                           >
                              <Text className="text-xs text-hint mb-1">
                                 Extra Analysis
                              </Text>
                              <Text className="text-lg font-extrabold text-text">
                                 {extraCredits}
                              </Text>
                              <View className="self-start px-2.5 py-1.5 rounded-lg border border-border bg-card-bg">
                                 <Text className="text-xs font-bold text-text">
                                    {billingAction === 'consumable' ? 'Adding...' : 'Add more'}
                                 </Text>
                              </View>
                           </Pressable>
                        </View>
                     </>
                  )}

                  {!entitlementActive ? (
                     <View className="gap-2">
                        <Pressable
                           className={`bg-disputeCTA py-3 rounded-xl items-center shadow-sm active:opacity-90 ${billingAction === 'upgrade' ? 'opacity-50' : ''}`}
                           onPress={handleUpgrade}
                           disabled={billingAction !== null}
                        >
                           <Text className="text-ctaText font-bold text-[15px]">
                              {billingAction === 'upgrade' ? 'Opening...' : 'Upgrade to Growth Plus'}
                           </Text>
                        </Pressable>
                     </View>
                  ) : (
                     <Pressable
                        className={`bg-card-grey py-3 rounded-xl items-center shadow-sm border border-border active:bg-border ${(isOffline || billingAction === 'manage') ? 'opacity-50' : ''}`}
                        onPress={handleManageSubscription}
                        disabled={isOffline || billingAction !== null}
                     >
                        <Text className="text-text font-bold text-[15px]">
                           {billingAction === 'manage' ? 'Opening...' : 'Manage Subscription'}
                        </Text>
                     </Pressable>
                  )}

                  <Pressable
                     className={`py-3 rounded-xl items-center border border-border shadow-sm active:bg-card-grey ${(isOffline || billingAction === 'restore') ? 'opacity-50' : ''}`}
                     onPress={handleRestore}
                     disabled={isOffline || billingAction !== null}
                  >
                     <Text className="text-text font-bold text-sm">
                        {billingAction === 'restore' ? 'Restoring...' : 'Restore Purchases'}
                     </Text>
                  </Pressable>

                  {(billingNote || rcError) && (
                     <Text className="text-xs text-text-subtle">
                        {billingNote ?? `RevenueCat: ${rcError}`}
                     </Text>
                  )}
               </View>
            )}

            {/* Preferences Card */}
            <View className="bg-card-bg rounded-2xl p-3.5 border border-border gap-3 shadow-sm">
               <View className="flex-row justify-between items-center">
                  <Text className="text-lg font-extrabold text-text">App preferences</Text>
                  {prefsLoading && (
                     <ActivityIndicator size="small" color={loaderColor} />
                  )}
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
                     trackColor={switchTrackColor}
                     thumbColor={switchThumbColor}
                  />
               </SettingRow>
               {biometricUnavailable && (
                  <Text className="text-xs text-text-subtle">
                     Biometric lock is not available on this device.
                  </Text>
               )}
               {biometricNeedsEnroll && (
                  <Text className="text-xs text-text-subtle">
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
                     trackColor={switchTrackColor}
                     thumbColor={switchThumbColor}
                  />
               </SettingRow>

               <SettingRow
                  title="Dark Mode"
                  description="Switch between light and dark surfaces."
               >
                  <Switch
                     value={darkMode}
                     onValueChange={handleToggleTheme}
                     disabled={prefsLoading}
                     trackColor={switchTrackColor}
                     thumbColor={switchThumbColor}
                  />
               </SettingRow>

               <SettingRow
                  title="Tactile Feedback"
                  description="Use haptics when finishing an entry."
               >
                  <Switch
                     value={hapticsEnabled}
                     onValueChange={handleToggleHaptics}
                     disabled={prefsLoading || !hapticsAvailable}
                     trackColor={switchTrackColor}
                     thumbColor={switchThumbColor}
                  />
               </SettingRow>

               {prefsError && <Text className="text-xs text-text-subtle">{prefsError}</Text>}
            </View>

            {/* Account Actions Card */}
            {status === 'signedIn' && (
               <View className="bg-card-bg rounded-2xl p-3.5 border border-border gap-3 shadow-sm">
                  <Pressable
                     className="flex-row justify-between items-center active:opacity-60"
                     onPress={() => setActionsCollapsed((c) => !c)}
                  >
                     <Text className="text-lg font-extrabold text-text">Account actions</Text>
                     <Ionicons
                        name={actionsCollapsed ? 'chevron-forward' : 'chevron-down'}
                        size={18}
                        color={iconColor}
                     />
                  </Pressable>

                  {!actionsCollapsed && (
                     <View className="gap-3 mt-1">
                        <Pressable
                           className="py-3 rounded-xl items-center border border-border shadow-sm active:bg-card-grey"
                           onPress={confirmSignOut}
                        >
                           <Text className="text-text font-bold text-sm">Sign out</Text>
                        </Pressable>

                        <Pressable
                           className={`py-3 rounded-xl items-center bg-belief-bg border border-belief-border shadow-sm active:opacity-80 ${(isOffline || deleteLoading) ? 'opacity-50' : ''}`}
                           onPress={confirmDelete}
                           disabled={isOffline || deleteLoading}
                        >
                           <Text className="text-belief-text font-extrabold text-[15px]">
                              {deleteLoading ? 'Deleting...' : 'Delete account'}
                           </Text>
                        </Pressable>
                     </View>
                  )}
               </View>
            )}

            {/* Feedback Card */}
            <View className="bg-card-bg rounded-2xl p-3.5 border border-border shadow-sm">
               <SendFeedback />
            </View>
            
         </ScrollView>
      </View>
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
      <View className={`flex-row items-center gap-2 ${disabled ? 'opacity-60' : ''}`}>
         <View className="flex-1">
            <Text className="text-[15px] font-bold text-text">{title}</Text>
            <Text className="text-[13px] text-hint mt-0.5">{description}</Text>
         </View>
         {children}
      </View>
   );
}