import SendFeedback from '@/components/SendFeedback';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { usePreferences } from '@/providers/PreferencesProvider';
import { useRevenueCat } from '@/providers/RevenueCatProvider';
import { makeThemedStyles, useTheme } from '@/theme/theme';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as LocalAuthentication from 'expo-local-authentication';
import { useRouter } from 'expo-router';
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
   StyleSheet,
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
   const [actionsCollapsed, setActionsCollapsed] = useState(true);

   const [deleteLoading, setDeleteLoading] = useState(false);

   const plan = profile?.plan ?? 'free';
   const entitlementActive = isGrowthPlusActive;
   const hasGrowth = entitlementActive;
   const aiUsed = profile?.aiCallsUsed ?? 0;
   const extraCredits = profile?.extraAiCredits ?? 0;
   const monthlyRemaining = Math.max(FREE_MONTHLY_LIMIT - aiUsed, 0);
   const darkMode = theme === 'dark';
   const { colors } = useTheme();
   const { styles, switchTrack, switchThumb } = useStyles();

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
         router.replace('/login');
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
      // robust next-month calculation
      const currentDay = date.getDate();
      date.setMonth(date.getMonth() + 1);
      if (date.getDate() !== currentDay) {
         // If day changed (e.g. Jan 31 -> Mar 2), set to last day of prev month (Feb 28)
         date.setDate(0);
      }

      return date.toLocaleDateString(undefined, {
         month: 'short',
         day: 'numeric',
      });
   }, [profile?.aiCycleStart]);
   const biometricUnavailable = !biometricInfo.hasHardware;
   const biometricNeedsEnroll =
      biometricInfo.hasHardware && !biometricInfo.isEnrolled;

   return (
      <View style={styles.safeArea}>
         <ScrollView
            contentContainerStyle={styles.scroll}
            contentInset={{ top: insets.top }}
            contentOffset={{ y: -insets.top, x: 0 }}
            showsVerticalScrollIndicator={false}
         >
            <View style={styles.headerRow}>
               <View>
                  <Text style={styles.title}>
                     {user?.email ?? 'Not Logged In'}
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
                  <Text style={styles.warningTitle}>
                     Supabase not configured
                  </Text>
                  <Text style={styles.warningText}>
                     Add EXPO_PUBLIC_SUPABASE_URL and
                     EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY to enable sync.
                  </Text>
               </View>
            )}

            {!user && (
               <View style={styles.banner}>
                  <View style={{ flex: 1 }}>
                     <Text style={styles.bannerTitle}>
                        Your data is only on this phone.
                     </Text>
                     <Text style={styles.bannerText}>
                        Sign in to back it up.
                     </Text>
                  </View>
                  <Pressable
                     style={styles.signInButton}
                     onPress={() => router.replace('/login')}
                  >
                     <Text style={styles.signInLabel}>Sign in</Text>
                  </Pressable>
               </View>
            )}

            {user && (
               <View style={styles.card}>
                  <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>Subscription</Text>
                  {(loadingProfile || rcLoading) && (
                     <ActivityIndicator size="small" color={colors.text} />
                  )}
               </View>

                  <View style={styles.planRow}>
                     <View style={{ flex: 1 }}>
                        <Text style={styles.label}>Current plan</Text>
                        <Text style={styles.value}>{planLabel}</Text>
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
                           {loadingProfile ? '…' : '↻'}
                        </Text>
                     </Pressable>
                  </View>

                  {!hasGrowth && (
                     <>
                        <Text style={styles.subtitle}>
                           {refillLabel ? `Refills next on ${refillLabel}` : ''}
                        </Text>
                        <View style={styles.metricsRow}>
                           <View style={styles.metric}>
                              <Text style={styles.metricLabel}>
                                 Monthly uses remaining
                              </Text>

                              <Text style={styles.metricValue}>
                                 {monthlyRemaining}
                              </Text>
                           </View>
                           <Pressable
                              style={[
                                 styles.metric,
                                 billingAction === 'consumable' &&
                                    styles.buttonDisabled,
                              ]}
                              onPress={handleBuyConsumable}
                              disabled={billingAction !== null}
                           >
                              <Text style={styles.metricLabel}>
                                 Extra Analysis
                              </Text>
                              <Text style={styles.metricValue}>
                                 {extraCredits}
                              </Text>
                              <Text style={styles.metricButtonLabel}>
                                 {billingAction === 'consumable'
                                    ? 'Adding...'
                                    : 'Add more'}
                              </Text>
                           </Pressable>
                        </View>
                     </>
                  )}

                  {!entitlementActive ? (
                     <View style={styles.actionStack}>
                        <Pressable
                           style={[
                              styles.primaryButton,
                              billingAction === 'upgrade' &&
                                 styles.buttonDisabled,
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
                        styles.restoreButton,
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
            )}

            <View style={styles.card}>
               <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>App preferences</Text>
                  {prefsLoading && (
                     <ActivityIndicator size="small" color={colors.text} />
                  )}
               </View>

               <SettingRow
                  title="Enable Biometric Lock"
                  description="Require Face ID / Touch ID on launch."
                  disabled={prefsLoading || biometricUnavailable}
                  styles={styles}
               >
                  <Switch
                     value={biometricEnabled}
                     onValueChange={handleToggleBiometric}
                     disabled={prefsLoading || biometricUnavailable}
                     trackColor={switchTrack}
                     thumbColor={switchThumb}
                  />
               </SettingRow>
               {biometricUnavailable && (
                  <Text style={styles.noteText}>
                     Biometric lock is not available on this device.
                  </Text>
               )}
               {biometricNeedsEnroll && (
                  <Text style={styles.noteText}>
                     Add a fingerprint or face profile in system settings to
                     turn this on.
                  </Text>
               )}

               <SettingRow
                  title="Show AI Analysis"
                  description="Hide or show AI insights in the UI."
                  styles={styles}
               >
                  <Switch
                     value={showAiAnalysis}
                     onValueChange={handleToggleAnalysis}
                     disabled={prefsLoading}
                     trackColor={switchTrack}
                     thumbColor={switchThumb}
                  />
               </SettingRow>

               <SettingRow
                  title="Dark Mode"
                  description="Switch between light and dark surfaces."
                  styles={styles}
               >
                  <Switch
                     value={darkMode}
                     onValueChange={handleToggleTheme}
                     disabled={prefsLoading}
                     trackColor={switchTrack}
                     thumbColor={switchThumb}
                  />
               </SettingRow>

               <SettingRow
                  title="Tactile Feedback"
                  description="Use haptics when finishing an entry."
                  styles={styles}
               >
                  <Switch
                     value={hapticsEnabled}
                     onValueChange={handleToggleHaptics}
                     disabled={prefsLoading || !hapticsAvailable}
                     trackColor={switchTrack}
                     thumbColor={switchThumb}
                  />
               </SettingRow>

               {prefsError && <Text style={styles.noteText}>{prefsError}</Text>}
            </View>

            {status === 'signedIn' && (
               <>
                  <View style={styles.card}>
                     <Pressable
                        style={styles.cardHeader}
                        onPress={() => setActionsCollapsed((c) => !c)}
                     >
                        <Text style={styles.cardTitle}>Account actions</Text>
                        <Ionicons
                           name={
                              actionsCollapsed
                                 ? 'chevron-forward'
                                 : 'chevron-down'
                           }
                           size={18}
                           color={colors.mutedIcon}
                        />
                     </Pressable>

                     {!actionsCollapsed && (
                        <>
                           <Pressable
                              style={styles.restoreButton}
                              onPress={confirmSignOut}
                           >
                              <Text style={styles.ghostButtonText}>
                                 Sign out
                              </Text>
                           </Pressable>

                           <Pressable
                              style={[
                                 styles.dangerButton,
                                 (isOffline || deleteLoading) &&
                                    styles.buttonDisabled,
                              ]}
                              onPress={confirmDelete}
                              disabled={isOffline || deleteLoading}
                           >
                              <Text style={styles.dangerLabel}>
                                 {deleteLoading
                                    ? 'Deleting...'
                                    : 'Delete account'}
                              </Text>
                           </Pressable>
                        </>
                     )}
                  </View>
               </>
            )}

            <View style={styles.card}>
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
   styles,
}: {
   title: string;
   description: string;
   children: ReactNode;
   disabled?: boolean;
   styles: ReturnType<typeof useStyles>['styles'];
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

const useStyles = makeThemedStyles(({ colors, typography, components, shadows }) => ({
   styles: StyleSheet.create({
      safeArea: {
         flex: 1,
         backgroundColor: colors.background,
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
         color: colors.text,
      },
      subtitle: {
         fontSize: 14,
         color: colors.hint,
         marginTop: 2,
      },
      offlineBadge: {
         backgroundColor: colors.cardGrey,
         paddingHorizontal: 10,
         paddingVertical: 6,
         borderRadius: 999,
         borderWidth: StyleSheet.hairlineWidth,
         borderColor: colors.border,
      },
      offlineText: {
         fontSize: 12,
         color: colors.text,
         fontWeight: '700',
      },
      warningCard: {
         backgroundColor: colors.accentBeliefBg,
         borderColor: colors.accentBeliefBorder,
         borderWidth: StyleSheet.hairlineWidth,
         borderRadius: 12,
         padding: 12,
         gap: 4,
         ...shadows.shadowSoft,
      },
      warningTitle: {
         fontSize: 14,
         fontWeight: '700',
         color: colors.accentBeliefText,
      },
      warningText: {
         fontSize: 13,
         color: colors.accentBeliefText,
      },
      banner: {
         backgroundColor: colors.cardGrey,
         borderColor: colors.disputeCTA,
         borderWidth: StyleSheet.hairlineWidth,
         borderRadius: 12,
         padding: 12,
         flexDirection: 'row',
         alignItems: 'center',
         gap: 10,
         ...shadows.shadowSoft,
      },
      bannerTitle: {
         fontSize: 15,
         fontWeight: '700',
         color: colors.text,
      },
      bannerText: {
         fontSize: 13,
         color: colors.textSubtle,
      },
      bannerDismiss: {
         paddingHorizontal: 10,
         paddingVertical: 6,
         backgroundColor: colors.disputeCTA,
         borderRadius: 10,
      },
      signInButton: {
         marginTop: 10,
         backgroundColor: colors.disputeCTA,
         paddingVertical: 8,
         paddingHorizontal: 12,
         borderRadius: 10,
         alignSelf: 'flex-start',
      },
      signInLabel: {
         color: colors.ctaText,
         fontWeight: '700',
         fontSize: 14,
      },
      bannerDismissText: {
         color: colors.ctaText,
         fontWeight: '700',
      },
      card: {
         backgroundColor: colors.cardBg,
         borderRadius: 16,
         padding: 14,
         borderWidth: StyleSheet.hairlineWidth,
         borderColor: colors.border,
         gap: 12,
         ...shadows.shadowSoft,
      },
      cardHeader: {
         flexDirection: 'row',
         justifyContent: 'space-between',
         alignItems: 'center',
      },
      cardTitle: {
         fontSize: 18,
         fontWeight: '800',
         color: colors.text,
      },
      planRow: {
         flexDirection: 'row',
         alignItems: 'flex-start',
         gap: 12,
      },
      label: {
         ...typography.caption,
         letterSpacing: 0.5,
      },
      value: {
         fontSize: 16,
         fontWeight: '700',
         color: colors.text,
         marginTop: 2,
      },
      hint: {
         fontSize: 13,
         color: colors.hint,
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
         backgroundColor: colors.cardInput,
         borderRadius: 12,
         padding: 12,
         borderWidth: StyleSheet.hairlineWidth,
         borderColor: colors.border,
         gap: 6,
         ...shadows.shadowSoft,
      },
      metricLabel: {
         fontSize: 12,
         color: colors.hint,
         marginBottom: 6,
      },
      metricValue: {
         fontSize: 18,
         fontWeight: '800',
         color: colors.text,
      },
      metricButton: {
         alignSelf: 'flex-start',
         paddingHorizontal: 10,
         paddingVertical: 6,
         borderRadius: 10,
         borderWidth: StyleSheet.hairlineWidth,
         borderColor: colors.border,
         backgroundColor: colors.cardBg,
      },
      metricButtonLabel: {
         fontSize: 12,
         fontWeight: '700',
         color: colors.text,
      },
      actionStack: {
         gap: 8,
      },
      primaryButton: {
         backgroundColor: colors.disputeCTA,
         paddingVertical: 12,
         borderRadius: 12,
         alignItems: 'center',
         ...shadows.shadowSoft,
      },
      primaryLabel: {
         color: colors.ctaText,
         fontWeight: '700',
         fontSize: 15,
      },
      secondaryButton: {
         backgroundColor: colors.cardGrey,
         paddingVertical: 12,
         borderRadius: 12,
         alignItems: 'center',
         ...shadows.shadowSoft,
      },
      secondaryLabel: {
         color: colors.text,
         fontWeight: '700',
         fontSize: 15,
      },
      ghostButton: {
         width: 40,
         height: 40,
         borderRadius: 20,
         alignItems: 'center',
         justifyContent: 'center',
         borderWidth: StyleSheet.hairlineWidth,
         borderColor: colors.border,
      },
      restoreButton: {
         paddingVertical: 12,
         borderRadius: 12,
         alignItems: 'center',
         borderWidth: StyleSheet.hairlineWidth,
         borderColor: colors.border,
         ...shadows.shadowSoft,
      },
      ghostButtonText: {
         color: colors.text,
         fontWeight: '700',
         fontSize: 14,
      },
      dangerButton: {
         paddingVertical: 12,
         borderRadius: 12,
         alignItems: 'center',
         backgroundColor: colors.accentBeliefBg,
         borderWidth: StyleSheet.hairlineWidth,
         borderColor: colors.accentBeliefBorder,
         marginTop: 12,
         ...shadows.shadowSoft,
      },
      dangerLabel: {
         color: colors.accentBeliefText,
         fontWeight: '800',
         fontSize: 15,
      },
      buttonDisabled: {
         opacity: 0.5,
      },
      noteText: {
         fontSize: 12,
         color: colors.textSubtle,
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
         color: colors.text,
      },
      settingDescription: {
         fontSize: 13,
         color: colors.hint,
         marginTop: 2,
      },
      input: {
         minHeight: 80,
         borderWidth: StyleSheet.hairlineWidth,
         borderColor: colors.border,
         borderRadius: 12,
         padding: 12,
         fontSize: 14,
         backgroundColor: colors.cardGrey,
         textAlignVertical: 'top',
         color: colors.text,
      },
   }),
   switchTrack: { true: colors.text, false: colors.borderStrong },
   switchThumb: colors.cardBg,
}));
