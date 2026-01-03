import RoundedCloseButton from '@/components/buttons/RoundedCloseButton';
import {
   BTN_HEIGHT,
   FREE_MONTHLY_CREDITS,
   ROUTE_LOGIN,
} from '@/components/constants';
import CreditShop from '@/components/CreditShop';
import SendFeedback from '@/components/SendFeedback';
import { getShadow } from '@/lib/shadow';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { usePreferences } from '@/providers/PreferencesProvider';
import { useRevenueCat } from '@/providers/RevenueCatProvider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as LocalAuthentication from 'expo-local-authentication';
import { router, useFocusEffect } from 'expo-router';
import { ChevronDown, ChevronRight } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
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
   LayoutAnimation,
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

const STORAGE_KEYS = {
   biometric: 'prefs:biometricLock',
} as const;

const MANAGE_SUBSCRIPTION_URL = Platform.select({
   ios: 'https://apps.apple.com/account/subscriptions',
   android: 'https://play.google.com/store/account/subscriptions',
   default: 'https://apps.apple.com/account/subscriptions',
});

export default function SettingsScreen() {
   const {
      status,
      user,
      profile,
      signOut,
      refreshProfile,
      refreshProfileIfStale,
      loadingProfile,
      isConfigured,
   } = useAuth();

   const {
      loading: rcLoading,
      error: rcError,
      showPaywall,
      restorePurchases,
      isGrowthPlusActive,
      refreshCustomerInfo,
   } = useRevenueCat();

   const {
      loading: prefsLoading,
      error: prefsError,
      hapticsEnabled,
      hapticsAvailable,
      triggerHaptic,
      theme,
      setHapticsEnabled,
      setTheme,
      clearError: clearPrefError,
   } = usePreferences();

   const insets = useSafeAreaInsets();

   // --- Theme Logic ---
   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';
   const iconColor = isDark ? '#94a3b8' : '#64748b';
   const loaderColor = isDark ? '#f8fafc' : '#0f172a';
   const shadowSm = useMemo(
      () => getShadow({ isDark, preset: 'sm' }),
      [isDark]
   );
   const shadowClass = shadowSm.className;

   const switchThumbColor = isDark ? '#1e293b' : '#ffffff';

   // --- State ---
   const [isRefreshing, setIsRefreshing] = useState(false);
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

   const isSignedIn = status === 'signedIn';
   const entitlementActive = isGrowthPlusActive;
   const hasGrowth = entitlementActive;
   const aiUsed = profile?.aiCallsUsed ?? 0;
   const extraCredits = profile?.extraAiCredits ?? 0;
   const monthlyRemaining = Math.max(FREE_MONTHLY_CREDITS - aiUsed, 0);
   const darkMode = theme === 'dark';

   const [isShopOpen, setIsShopOpen] = useState(false);

   useFocusEffect(
      useCallback(() => {
         if (status !== 'signedIn') return;
         refreshProfileIfStale();
      }, [refreshProfileIfStale, status])
   );

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
      } catch {
         const fallback = { hasHardware: false, isEnrolled: false };
         setBiometricInfo(fallback);
         return fallback;
      }
   }, []);

   useEffect(() => {
      refreshBiometricInfo();
   }, [refreshBiometricInfo]);

   const handleUpgrade = async () => {
      if (!isSignedIn) {
         router.push(ROUTE_LOGIN as any);
         return;
      }
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
         router.push(ROUTE_LOGIN);
      } catch (err: any) {
         Alert.alert('Delete account', err?.message ?? 'Delete failed.');
      } finally {
         setDeleteLoading(false);
      }
   };

   const handleManualRefresh = async () => {
      setIsRefreshing(true);
      try {
         await Promise.all([refreshCustomerInfo(), refreshProfile()]);
      } catch (e) {
         console.log('Refresh failed', e);
      } finally {
         setIsRefreshing(false);
      }
   };

   const isLoading = loadingProfile || rcLoading || isRefreshing;

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
      Alert.alert('Sign out', 'You will be signed out.', [
         { text: 'Cancel', style: 'cancel' },
         { text: 'Sign out', style: 'destructive', onPress: signOut },
      ]);

   const planLabel = useMemo(() => {
      if (entitlementActive) return 'Growth Plus (RevenueCat)';
      return 'Free';
   }, [entitlementActive]);

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

   const toggleShop = () => {
      if (!isSignedIn) {
         router.push(ROUTE_LOGIN as any);
         return;
      }
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setIsShopOpen(!isShopOpen);
   };

   const biometricUnavailable = !biometricInfo.hasHardware;
   const biometricNeedsEnroll =
      biometricInfo.hasHardware && !biometricInfo.isEnrolled;

   return (
      <View className="flex-1 bg-slate-50 dark:bg-slate-900">
         {/* ABSOLUTE CLOSE BUTTON (Static Top Right) */}
         <View 
            className="absolute right-4 z-50"
            style={{ top: insets.top + 16 }}
         >
            <RoundedCloseButton onPress={() => router.back()} />
         </View>

         <ScrollView
            contentContainerStyle={{
               paddingTop: insets.top + 16,
               paddingBottom: insets.bottom + 24,
               paddingHorizontal: 16,
               gap: 14,
            }}
            scrollIndicatorInsets={{
               top: insets.top + 40,
               bottom: insets.bottom,
            }}
            showsVerticalScrollIndicator={false}
         >
            {/* Header (Text Only, aligned with absolute button) */}
            <View className="flex-row justify-between items-center min-h-[44px] mb-2">
               <View className="flex-1 mr-12 justify-center">
                  <Text className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                     {user?.email ?? 'Not Logged In'}
                  </Text>
               </View>
               
               {/* Offline Badge */}
               <View className="flex-row gap-2 items-center">
                  {isOffline && (
                     <View className="bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-full border border-slate-200 dark:border-slate-700">
                        <Text className="text-xs font-bold text-slate-900 dark:text-slate-100">
                           Offline
                        </Text>
                     </View>
                  )}
               </View>
            </View>

            {/* Supabase Config Warning */}
            {!isConfigured && (
               <View
                  className={`bg-belief-bg border border-belief-border rounded-xl p-3 gap-1 ${shadowClass}`}
                  style={[shadowSm.ios, shadowSm.android]}
               >
                  <Text className="text-sm font-bold text-belief-text">
                     Supabase not configured
                  </Text>
               </View>
            )}

            {/* Not Logged In Banner */}
            {!user && (
               <View
                  className={`bg-slate-100 dark:bg-slate-800 border border-dispute-cta rounded-xl p-3 flex-row items-center gap-2.5 ${shadowClass}`}
                  style={[shadowSm.ios, shadowSm.android]}
               >
                  <View className="flex-1">
                     <Text className="text-[15px] font-bold text-slate-900 dark:text-slate-100">
                        Log in to back up your data.
                     </Text>
                  </View>
                  <Pressable
                     className={`mt-2 bg-dispute-cta py-2 px-3 rounded-lg self-start ${shadowClass}`}
                     style={[shadowSm.ios, shadowSm.android]}
                     onPress={() => router.push(ROUTE_LOGIN)}
                  >
                     <Text className="text-white font-bold text-sm">
                        Sign in
                     </Text>
                  </Pressable>
               </View>
            )}

            {/* Subscription Card */}
            {isSignedIn && user && (
               <View
                  className={`bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-700 gap-3 ${shadowClass}`}
                  style={[shadowSm.ios, shadowSm.android]}
               >
                  <View className="flex-row justify-between items-center">
                     <Text className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                        Subscription
                     </Text>
                     {isLoading && (
                        <ActivityIndicator size="small" color={loaderColor} />
                     )}
                  </View>

                  <View className="flex-row items-start gap-3">
                     <View className="flex-1">
                        <Text className="text-xs text-slate-500 dark:text-slate-400 tracking-wider">
                           Current plan
                        </Text>
                        <Text className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                           {planLabel}
                        </Text>
                     </View>
                     <Pressable
                        className={`w-10 h-10 rounded-full items-center justify-center border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 ${loadingProfile ? 'opacity-50' : ''}`}
                        onPress={handleManualRefresh}
                        disabled={isLoading}
                     >
                        <Text className="font-bold text-slate-900 dark:text-slate-100">
                           {loadingProfile ? '…' : '↻'}
                        </Text>
                     </Pressable>
                  </View>

                  {!hasGrowth && (
                     <>
                        <Text className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                           {refillLabel ? `Refills next on ${refillLabel}` : ''}
                        </Text>
                        <View className="flex-row flex-wrap gap-2.5">
                           {/* Monthly Uses Metric */}
                           <View
                              className={`flex-1 min-w-[30%] bg-zinc-50 dark:bg-slate-700 rounded-xl p-3 border border-slate-200 dark:border-slate-600 gap-1.5 ${shadowClass}`}
                              style={[shadowSm.ios, shadowSm.android]}
                           >
                              <Text className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                                 Monthly uses remaining
                              </Text>
                              <Text className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                                 {monthlyRemaining}
                              </Text>
                           </View>

                           {/* Extra Analysis Metric */}
                           <View
                              className={`flex-1 min-w-[30%] bg-zinc-50 dark:bg-slate-700 rounded-xl p-3 border border-slate-200 dark:border-slate-600 gap-1.5 ${shadowClass} `}
                              style={[shadowSm.ios, shadowSm.android]}
                           >
                              <Text className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                                 Extra Analysis
                              </Text>
                              <Text className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                                 {extraCredits}
                              </Text>
                           </View>
                        </View>
                     </>
                  )}
                  {!entitlementActive ? (
                     <View className="gap-3 pt-5">
                        {/* UNIFIED STORE CONTAINER */}
                        <View
                           className={`bg-white dark:bg-slate-800 rounded-2xl ${shadowClass}`}
                           style={[shadowSm.ios, shadowSm.android]}
                        >
                           <View className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
                              {/* HEADER / TOGGLE */}
                              <Pressable
                                 onPress={toggleShop}
                                 className={`relative flex-row items-center justify-center px-4 active:bg-slate-50 dark:active:bg-slate-700/50 ${BTN_HEIGHT}`}
                              >
                                 {/* Centered Title */}
                                 <Text className="text-[15px] font-bold text-slate-900 dark:text-white text-center">
                                    Unlock More Analysis
                                 </Text>

                                 {/* Absolute Right Chevron */}
                                 <View className="absolute right-4">
                                    {isShopOpen ? (
                                       <ChevronDown
                                          size={20}
                                          color={iconColor}
                                       />
                                    ) : (
                                       <ChevronRight
                                          size={20}
                                          color={iconColor}
                                       />
                                    )}
                                 </View>
                              </Pressable>

                              {/* THE SHOP CONTENT */}
                              {isShopOpen && (
                                 <View className="px-4 pb-6 pt-2">
                                    <View className="h-[1px] bg-slate-100 dark:bg-slate-700 mb-4" />

                                    <CreditShop
                                       onUpgrade={handleUpgrade}
                                       onSuccess={() => {
                                          LayoutAnimation.configureNext(
                                             LayoutAnimation.Presets
                                                .easeInEaseOut
                                          );
                                       }}
                                    />
                                 </View>
                              )}
                           </View>
                        </View>
                     </View>
                  ) : (
                     <View className="gap-3 pt-5">
                        <Pressable
                           className={`bg-slate-100 dark:bg-slate-800 rounded-xl items-center ${shadowClass} border border-slate-200 dark:border-slate-700 active:bg-slate-200 dark:active:bg-slate-700 ${BTN_HEIGHT} ${isOffline || billingAction === 'manage' ? 'opacity-50' : ''}`}
                           style={[shadowSm.ios, shadowSm.android]}
                           onPress={handleManageSubscription}
                           disabled={isOffline || billingAction !== null}
                        >
                           <Text className="text-slate-900 dark:text-slate-100 font-bold text-[15px]">
                              {billingAction === 'manage'
                                 ? 'Opening...'
                                 : 'Manage Subscription'}
                           </Text>
                        </Pressable>
                     </View>
                  )}

                  <Pressable
                     className={`rounded-xl bg-white dark:bg-slate-800 items-center ${shadowClass} border border-slate-200 dark:border-slate-700 active:bg-slate-100 dark:active:bg-slate-800 ${BTN_HEIGHT} ${isOffline || billingAction === 'restore' ? 'opacity-50' : ''}`}
                     style={[shadowSm.ios, shadowSm.android]}
                     onPress={handleRestore}
                     disabled={isOffline || billingAction !== null}
                  >
                     <Text className="text-slate-900 dark:text-slate-100 font-bold text-[15px]">
                        {billingAction === 'restore'
                           ? 'Restoring...'
                           : 'Restore Purchases'}
                     </Text>
                  </Pressable>

            {(billingNote || rcError) && (
               <Text className="text-xs text-slate-600 dark:text-slate-300">
                  {billingNote ?? `RevenueCat: ${rcError}`}
               </Text>
            )}
           </View>
         )}

         {/* Preferences Card */}
            <View
               className={`bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-700 gap-3 ${shadowClass}`}
               style={[shadowSm.ios, shadowSm.android]}
            >
               <View className="flex-row justify-between items-center">
                  <Text className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                     App preferences
                  </Text>
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
                     thumbColor={switchThumbColor}
                  />
               </SettingRow>
               {biometricUnavailable && (
                  <Text className="text-xs text-slate-600 dark:text-slate-300">
                     Biometric lock is not available on this device.
                  </Text>
               )}
               {biometricNeedsEnroll && (
                  <Text className="text-xs text-slate-600 dark:text-slate-300">
                     Add a fingerprint or face profile in system settings to
                     turn this on.
                  </Text>
               )}

               <SettingRow
                  title="Dark Mode"
                  description="Switch between light and dark surfaces."
               >
                  <Switch
                     value={darkMode}
                     onValueChange={handleToggleTheme}
                     disabled={prefsLoading}
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
                     thumbColor={switchThumbColor}
                  />
               </SettingRow>

               {prefsError && (
                  <Text className="text-xs text-slate-600 dark:text-slate-300">
                     {prefsError}
                  </Text>
               )}
            </View>

            {/* Account Actions Card */}
            {status === 'signedIn' && (
               <View
                  className={`bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-700 gap-3 ${shadowClass}`}
                  style={[shadowSm.ios, shadowSm.android]}
               >
                  <Pressable
                     className="flex-row justify-between items-center active:opacity-60"
                     onPress={() => setActionsCollapsed((c) => !c)}
                  >
                     <Text className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                        Account actions
                     </Text>
                     {actionsCollapsed ? (
                        <ChevronRight size={18} color={iconColor} />
                     ) : (
                        <ChevronDown size={18} color={iconColor} />
                     )}
                  </Pressable>

                  {!actionsCollapsed && (
                     <View className="gap-3 mt-1">
                        <Pressable
                           className={`rounded-xl bg-white dark:bg-slate-800 items-center border border-slate-200 dark:border-slate-700 ${shadowClass} active:bg-slate-100 dark:active:bg-slate-800 ${BTN_HEIGHT}`}
                           style={[shadowSm.ios, shadowSm.android]}
                           onPress={confirmSignOut}
                        >
                           <Text className="text-slate-900 dark:text-slate-100 font-bold text-[15px]">
                              Sign out
                           </Text>
                        </Pressable>

                        <Pressable
                           className={`rounded-xl items-center bg-belief-bg border border-belief-border ${shadowClass} active:opacity-80 ${BTN_HEIGHT} ${isOffline || deleteLoading ? 'opacity-50' : ''}`}
                           style={[shadowSm.ios, shadowSm.android]}
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
            <View
               className={`bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-700 ${shadowClass}`}
               style={[shadowSm.ios, shadowSm.android]}
            >
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
      <View
         className={`flex-row items-center gap-2 ${disabled ? 'opacity-60' : ''}`}
      >
         <View className="flex-1">
            <Text className="text-[15px] font-bold text-slate-900 dark:text-slate-100">
               {title}
            </Text>
            <Text className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
               {description}
            </Text>
         </View>
         {children}
      </View>
   );
}
