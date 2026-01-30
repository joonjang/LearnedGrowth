import LeftBackChevron from '@/components/buttons/LeftBackChevron';
import { ROUTE_LOGIN } from '@/components/constants';
import { AiInsightCreditShopSheet } from '@/components/shop/CreditShopSheet';
import SendFeedback from '@/components/utils/SendFeedback';
import { APP_VERSION } from '@/lib/appInfo';
import { getShadow } from '@/lib/shadow';
import {
   DISPUTE_BG_CLASS,
   DISPUTE_BORDER_CLASS,
   DISPUTE_CTA_CLASS,
   DISPUTE_TEXT_CLASS,
   PRIMARY_CTA_CLASS,
} from '@/lib/styles';
import { getSupabaseClient } from '@/lib/supabase';
import { useAppConfig } from '@/providers/AppConfigProvider';
import { useAuth } from '@/providers/AuthProvider';
import { usePreferences } from '@/providers/PreferencesProvider';
import { useRevenueCat } from '@/providers/RevenueCatProvider';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import NetInfo from '@react-native-community/netinfo';
import { router, useFocusEffect } from 'expo-router';
import {
   ChevronDown,
   ChevronUp,
   Cloud,
   ShieldCheck,
   Sprout,
   TicketPlus,
   TriangleAlert,
   Zap
} from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import {
   useCallback,
   useEffect,
   useMemo,
   useRef,
   useState,
   type ReactNode,
} from 'react';
import {
   ActivityIndicator,
   Alert,
   AppState,
   Linking,
   Modal,
   Platform,
   Pressable,
   StyleProp,
   Switch,
   Text,
   TextInput,
   TouchableWithoutFeedback,
   View,
   ViewStyle,
} from 'react-native';
import {
   KeyboardAwareScrollView,
   KeyboardController,
} from 'react-native-keyboard-controller';
import Animated, {
   useAnimatedStyle,
   useSharedValue,
   withRepeat,
   withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
   } = useAuth();
   const { aiConfig } = useAppConfig();
   const { freeMonthlyCredits } = aiConfig;

   const {
      loading: rcLoading,
      error: rcError,
      restorePurchases,
      isGrowthPlusActive,
      refreshCustomerInfo,
   } = useRevenueCat();

   const {
      loading: prefsLoading,
      hapticsEnabled,
      hapticsAvailable,
      theme,
      setHapticsEnabled,
      setTheme,
   } = usePreferences();

   const insets = useSafeAreaInsets();

   // --- Theme Logic ---
   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';
   const iconColor = isDark ? '#94a3b8' : '#64748b';

   // --- UNIFORM SHADOW LOGIC ---
   const shadowSm = useMemo(
      () => getShadow({ isDark, preset: 'sm' }),
      [isDark],
   );
   const shadowGreen = useMemo(
      () =>
         getShadow({
            isDark,
            preset: 'button',
            colorLight: '#bbf7d0',
         }),
      [isDark],
   );

   // Pre-calculate the styles to keep JSX clean
   const commonShadowStyle = useMemo(
      () => [shadowSm.ios, shadowSm.android],
      [shadowSm],
   );
   const greenShadowStyle = useMemo(
      () => [shadowGreen.ios, shadowGreen.android],
      [shadowGreen],
   );

   // Colors
   const switchThumbColor = isDark ? '#1e293b' : '#ffffff';

   // --- State ---
   const [isOffline, setIsOffline] = useState(false);
   const [billingNote, setBillingNote] = useState<string | null>(null);
   const [billingAction, setBillingAction] = useState<
      null | 'upgrade' | 'consumable' | 'restore' | 'manage'
   >(null);

   const [actionsCollapsed, setActionsCollapsed] = useState(true);
   const [showDeleteModal, setShowDeleteModal] = useState(false);
   const [couponExpanded, setCouponExpanded] = useState(false);
   const [couponCode, setCouponCode] = useState('');
   const [redeemingCoupon, setRedeemingCoupon] = useState(false);
   const [couponMessage, setCouponMessage] = useState<string | null>(null);
   const profileRef = useRef(profile);
   const creditShopSheetRef = useRef<BottomSheetModal | null>(null);
   const [nowTs, setNowTs] = useState(() => Date.now());
   const cycleAnchorRef = useRef<number | null>(null);

   useEffect(() => {
      if (!billingNote) return;
      const t = setTimeout(() => setBillingNote(null), 3000);
      return () => clearTimeout(t);
   }, [billingNote]);

   useEffect(() => {
      profileRef.current = profile;
   }, [profile]);

   useEffect(() => {
      if (!profile?.aiCycleExpiresAt) return;
      const interval = setInterval(() => setNowTs(Date.now()), 1000);
      return () => clearInterval(interval);
   }, [profile?.aiCycleExpiresAt]);

   // --- Computed ---
   const isSignedIn = status === 'signedIn';
   const entitlementActive = isGrowthPlusActive;
   const hasGrowth = entitlementActive;
   const aiUsed = profile?.aiCycleUsed ?? 0;
   const extraCredits = profile?.extraAiCredits ?? 0;
   const cycleRemaining = Math.max(freeMonthlyCredits - aiUsed, 0);
   const darkMode = theme === 'dark';

   const checkCreditsCycle = useCallback(() => {
      if (status !== 'signedIn') return;
      const currentProfile = profileRef.current;
      const aiUsed = currentProfile?.aiCycleUsed ?? 0;
      const remaining = Math.max(freeMonthlyCredits - aiUsed, 0);
      if (currentProfile && remaining < freeMonthlyCredits) {
         refreshProfile();
         return;
      }
      refreshProfileIfStale();
   }, [freeMonthlyCredits, refreshProfile, refreshProfileIfStale, status]);

   useFocusEffect(
      useCallback(() => {
         checkCreditsCycle();
         const subscription = AppState.addEventListener('change', (state) => {
            if (state === 'active') {
               checkCreditsCycle();
            }
         });
         return () => subscription.remove();
      }, [checkCreditsCycle]),
   );

   useEffect(() => {
      const unsubscribe = NetInfo.addEventListener((state) => {
         const connected = state.isConnected;
         const reachable = state.isInternetReachable;
         setIsOffline(connected === false || reachable === false);
      });
      return () => unsubscribe();
   }, []);

   // --- Handlers ---
   const handleRestore = async () => {
      if (isOffline) {
         setBillingNote('Go online to restore purchases.');
         return;
      }

      setBillingAction('restore');
      setBillingNote(null);

      try {
         const customerInfo = await restorePurchases();
         await refreshCustomerInfo();
         await refreshProfile();

         const hasActiveSubscription =
            customerInfo.activeSubscriptions.length > 0;

         if (hasActiveSubscription) {
            Alert.alert('Success', 'Your subscription has been restored.');
            setBillingNote(null);
         } else {
            Alert.alert(
               'No Subscriptions Found',
               "We couldn't find any active subscriptions for this account.",
            );
            setBillingNote(null);
         }
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
         if (!MANAGE_SUBSCRIPTION_URL) throw new Error('Not supported.');
         await Linking.openURL(MANAGE_SUBSCRIPTION_URL);
      } catch (err: any) {
         Alert.alert('Manage subscription', err?.message);
      } finally {
         setBillingAction(null);
      }
   };

   const formatCouponMessage = (msg: string) => {
      const cleaned = msg.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
      if (!cleaned) return 'Error.';
      const capitalized = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      return /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`;
   };

   useEffect(() => {
      if (!billingNote) return;
      const t = setTimeout(() => setBillingNote(null), 3000);
      return () => clearTimeout(t);
   }, [billingNote]);

   const handleRedeemCoupon = async () => {
      if (!isSignedIn || !user) {
         router.push(ROUTE_LOGIN as any);
         return;
      }
      if (!couponCode.trim()) return;
      if (isOffline) {
         setCouponMessage(formatCouponMessage('Go online to redeem a coupon'));
         return;
      }
      setRedeemingCoupon(true);
      setCouponMessage(null);
      try {
         const supabase = getSupabaseClient();
         const rpcName =
            process.env.EXPO_PUBLIC_SUPABASE_COUPON_RPC ?? 'redeem_coupon';
         const { error } = await supabase.rpc(rpcName, {
            code: couponCode.trim(),
         });
         if (error) throw new Error(error.message);
         setCouponMessage(formatCouponMessage('Coupon applied'));
         setCouponCode('');
         await refreshProfile();
      } catch (err: any) {
         setCouponMessage(formatCouponMessage(err?.message ?? 'Coupon failed'));
      } finally {
         setRedeemingCoupon(false);
      }
   };

   const openCreditShop = () => {
      if (!isSignedIn) {
         router.push(ROUTE_LOGIN as any);
         return;
      }
      creditShopSheetRef.current?.present();
   };

   const handleCreditShopSuccess = useCallback(async () => {
      creditShopSheetRef.current?.dismiss();
      try {
         await refreshCustomerInfo();
         await refreshProfile();
      } catch (err) {
         console.warn('Failed to refresh credits after purchase', err);
      }
   }, [refreshCustomerInfo, refreshProfile]);

   const performDeleteAccount = async (): Promise<boolean> => {
      if (isOffline) return false;

      try {
         const supabase = getSupabaseClient();

         // 1. Backend Delete
         const { error } = await supabase.functions.invoke('delete-account');
         if (error) throw new Error(error.message);

         // 2. Close the custom "Type delete to confirm" modal immediately
         setShowDeleteModal(false);

         // 3. Clear local session data (silently)
         try {
            await signOut();
         } catch (e) {
            console.log('Local signout cleanup error:', e);
         }

         // 4. Show Native Alert AND wait for user input
         // We ONLY navigate to login after they press "OK"
         Alert.alert(
            'Account Deleted',
            'Your account and data have been permanently removed from the server.',
            [
               {
                  text: 'OK',
                  style: 'default',
               },
            ],
            { cancelable: false }, // Prevent clicking outside to dismiss
         );

         return true;
      } catch (err: any) {
         Alert.alert('Delete account', err?.message ?? 'Delete failed.');
         return false;
      }
   };

   const planLabel = useMemo(
      () => (entitlementActive ? 'Growth Plus' : 'Free Plan'),
      [entitlementActive],
   );
   const nextResetAt = useMemo(() => {
      if (!profile?.aiCycleExpiresAt) return null;
      const expiresAt = new Date(profile.aiCycleExpiresAt);
      if (Number.isNaN(expiresAt.getTime())) return null;
      return expiresAt;
   }, [profile?.aiCycleExpiresAt]);
   const resetCountdown = useMemo(() => {
      if (!nextResetAt) return null;
      const diffMs = Math.max(0, nextResetAt.getTime() - nowTs);
      const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
      const days = Math.floor(totalSeconds / 86400);
      if (days >= 1) {
         const dayLabel = days === 1 ? 'day' : 'days';
         return `${days} ${dayLabel}`;
      }
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      if (hours >= 1) {
         return `${hours.toString().padStart(2, '0')}:${minutes
            .toString()
            .padStart(2, '0')}`;
      }
      return `${minutes.toString().padStart(2, '0')}:${seconds
         .toString()
         .padStart(2, '0')}`;
   }, [nextResetAt, nowTs]);
   const resetSubtext = useMemo(() => {
      if (!resetCountdown) return 'Resets soon';
      return `Resets in ${resetCountdown}`;
   }, [resetCountdown]);

   useEffect(() => {
      if (!isSignedIn || isOffline || !nextResetAt) return;
      const expiresAtMs = nextResetAt.getTime();
      if (Number.isNaN(expiresAtMs)) return;
      if (nowTs < expiresAtMs) return;
      if (cycleAnchorRef.current === expiresAtMs) return;
      cycleAnchorRef.current = expiresAtMs;
      refreshProfile();
   }, [isSignedIn, isOffline, nextResetAt, nowTs, refreshProfile]);

   const isLoading = loadingProfile || rcLoading;

   return (
      <View className="flex-1 bg-slate-50 dark:bg-slate-900">
         <DeleteConfirmationModal
            visible={showDeleteModal}
            onClose={() => setShowDeleteModal(false)}
            onConfirm={performDeleteAccount}
            isDark={isDark}
         />

         <KeyboardAwareScrollView
            bottomOffset={150}
            contentContainerStyle={{
               paddingTop: insets.top + 16,
               paddingBottom: insets.bottom + 40,
               paddingHorizontal: 16,
               gap: 16,
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
         >
            {/* HEADER */}
            <View className="flex-row items-start gap-2 mb-2">
               <LeftBackChevron isDark={isDark} />
               <View className="flex-1">
                  <Text className="text-3xl font-extrabold text-slate-900 dark:text-slate-50">
                     Settings
                  </Text>
                  <Text
                     numberOfLines={1}
                     className="text-[15px] font-medium text-slate-500 dark:text-slate-400 mt-0.5"
                  >
                     {user?.email ?? 'Not signed in'}
                  </Text>
               </View>
            </View>

            {/* OFFLINE INDICATOR */}
            {isOffline && (
               <View className="bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 p-3 rounded-xl flex-row items-center gap-3">
                  <View className="w-2 h-2 rounded-full bg-amber-500" />
                  <Text className="text-sm font-bold text-amber-800 dark:text-amber-200">
                     You are offline.
                  </Text>
               </View>
            )}

            {!user && (
               <View
                  className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-700"
                  style={commonShadowStyle}
               >
                  <View className="flex-row items-start gap-4 mb-4">
                     <View className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-900/30 items-center justify-center">
                        <Cloud size={24} color="#6366f1" />
                     </View>
                     <View className="flex-1">
                        <Text className="text-lg font-bold text-slate-900 dark:text-slate-100">
                           Save your progress
                        </Text>
                        <Text className="text-sm text-slate-500 dark:text-slate-400 leading-5 mt-1">
                           Sign in to back up your entries and sync across your
                           devices.
                        </Text>
                     </View>
                  </View>

                  <Pressable
                     className={`w-full h-[50px] items-center justify-center rounded-xl ${PRIMARY_CTA_CLASS}`}
                     onPress={() => router.push(ROUTE_LOGIN)}
                  >
                     <Text className="text-white font-bold text-[16px]">
                        Sign In / Create Account
                     </Text>
                  </Pressable>

                  <View className="flex-row items-center justify-center gap-1.5 mt-3 opacity-60">
                     <ShieldCheck
                        size={12}
                        color={isDark ? '#94a3b8' : '#64748b'}
                     />
                     <Text className="text-[11px] text-slate-500 dark:text-slate-400">
                        Your data is private and encrypted.
                     </Text>
                  </View>
               </View>
            )}

            {/* STATS */}
            {isSignedIn && !hasGrowth && (
               <View className="flex-row gap-3">
                  <StatCard
                     label="Cycle Credits"
                     value={`${cycleRemaining} / ${freeMonthlyCredits}`}
                     subtext={resetSubtext}
                     isLoading={isLoading}
                     icon={<Zap size={16} color="#fbbf24" fill="#fbbf24" />}
                     shadowStyle={commonShadowStyle}
                  />
                  <StatCard
                     label="Extra Analysis"
                     value={String(extraCredits)}
                     subtext="Non-expiring"
                     isLoading={isLoading}
                     isHighlight
                     shadowStyle={commonShadowStyle}
                  />
               </View>
            )}

            {/* SUBSCRIPTION CARD */}
            {isSignedIn && user && (
               <View
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700"
                  style={commonShadowStyle}
               >
                  {/* Plan Status Header */}
                  <View className="p-4">
                     <View className="flex-row justify-between items-center">
                        <View>
                           <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                              Current Plan
                           </Text>
                           <View className="flex-row items-center gap-2">
                              <Text className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                                 {planLabel}
                              </Text>
                              {hasGrowth && (
                                 <Sprout
                                    size={20}
                                    // Green-600 for light mode, Green-400 for dark mode
                                    color={isDark ? '#4ade80' : '#16a34a'}
                                 />
                              )}
                           </View>
                        </View>
                        {!hasGrowth && (
                           <Pressable
                              onPress={() => setCouponExpanded((v) => !v)}
                              className="p-2 bg-slate-50 dark:bg-slate-800 rounded-full border border-slate-100 dark:border-slate-700 active:opacity-80"
                           >
                              <TicketPlus size={18} color={iconColor} />
                           </Pressable>
                        )}
                     </View>
                     {!hasGrowth && couponExpanded && (
                        <View className="mt-3 flex-row items-center gap-2">
                           <TextInput
                              value={couponCode}
                              onChangeText={setCouponCode}
                              placeholder="Enter coupon"
                              placeholderTextColor={
                                 isDark ? '#94a3b8' : '#94a3b8'
                              }
                              className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                              autoCapitalize="none"
                              autoCorrect={false}
                           />
                           <Pressable
                              onPress={() => {
                                 KeyboardController.dismiss();
                                 handleRedeemCoupon();
                              }}
                              className="px-3 py-2 rounded-lg bg-slate-700 dark:bg-slate-600"
                           >
                              {redeemingCoupon ? (
                                 <ActivityIndicator
                                    size="small"
                                    color="white"
                                 />
                              ) : (
                                 <Text className="text-white font-semibold">
                                    Apply
                                 </Text>
                              )}
                           </Pressable>
                        </View>
                     )}
                     {!hasGrowth && couponExpanded && couponMessage ? (
                        <Text className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                           {couponMessage}
                        </Text>
                     ) : null}
                  </View>

                  <View className="p-4 gap-4 bg-slate-50/50 dark:bg-slate-800/20 rounded-b-2xl overflow-hidden">
                     {!hasGrowth ? (
                        <>
                           <Pressable
                              onPress={openCreditShop}
                              className={`rounded-xl p-4 items-center ${DISPUTE_CTA_CLASS}`}
                              style={greenShadowStyle}
                           >
                              <View className="w-full items-center">
                                 <Text className="text-white font-bold text-[16px] text-center">
                                    Get More Analysis
                                 </Text>
                              </View>
                           </Pressable>
                        </>
                     ) : (
                        <Pressable
                           onPress={handleManageSubscription}
                           disabled={billingAction === 'manage'}
                           className="items-center justify-center bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700"
                        >
                           <Text className="font-semibold text-slate-700 dark:text-slate-200">
                              Manage Subscription
                           </Text>
                        </Pressable>
                     )}

                     <Pressable
                        onPress={handleRestore}
                        disabled={billingAction === 'restore' || isOffline}
                        className="self-center py-1"
                     >
                        <Text className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                           {billingAction === 'restore'
                              ? 'Restoring purchases...'
                              : 'Restore Purchases'}
                        </Text>
                     </Pressable>
                     {(billingNote || rcError) && (
                        <Text className="text-xs text-center text-slate-600 dark:text-slate-400 mt-1">
                           {billingNote ?? rcError}
                        </Text>
                     )}
                  </View>
               </View>
            )}

            {/* PREFERENCES */}
            <View
               className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 gap-5"
               style={commonShadowStyle}
            >
               <Text className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                  Preferences
               </Text>

               <SettingRow
                  title="Dark Mode"
                  description="Switch between light and dark theme."
               >
                  <Switch
                     value={darkMode}
                     onValueChange={(val) => setTheme(val ? 'dark' : 'light')}
                     disabled={prefsLoading}
                     thumbColor={switchThumbColor}
                     trackColor={{ false: '#e2e8f0', true: '#16a34a' }}
                  />
               </SettingRow>

               <SettingRow
                  title="Haptic Feedback"
                  description="Tactile vibrations on interaction."
               >
                  <Switch
                     value={hapticsEnabled}
                     onValueChange={setHapticsEnabled}
                     disabled={prefsLoading || !hapticsAvailable}
                     thumbColor={switchThumbColor}
                     trackColor={{ false: '#e2e8f0', true: '#16a34a' }}
                  />
               </SettingRow>
            </View>

            {/* ACCOUNT ACTIONS */}
            {isSignedIn && (
               <View
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700"
                  style={commonShadowStyle}
               >
                  <Pressable
                     className="flex-row justify-between items-center p-4 active:bg-slate-50 dark:active:bg-slate-800"
                     onPress={() => setActionsCollapsed(!actionsCollapsed)}
                  >
                     <Text className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                        Account Actions
                     </Text>
                     {actionsCollapsed ? (
                        <ChevronDown size={20} color={iconColor} />
                     ) : (
                        <ChevronUp size={20} color={iconColor} />
                     )}
                  </Pressable>

                  {!actionsCollapsed && (
                     <View className="p-4 pt-0 gap-3">
                        <Pressable
                           onPress={() =>
                              Alert.alert('Sign out', 'Confirm?', [
                                 { text: 'Cancel' },
                                 { text: 'Sign Out', onPress: signOut },
                              ])
                           }
                           className="py-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 items-center"
                        >
                           <Text className="font-bold text-slate-700 dark:text-slate-200 text-[15px]">
                              Sign Out
                           </Text>
                        </Pressable>

                        <Pressable
                           onPress={() => setShowDeleteModal(true)}
                           className="mt-3 py-2 items-center active:opacity-60"
                        >
                           <Text className="font-semibold text-red-500 dark:text-red-400 text-[15px]">
                              Delete Account
                           </Text>
                        </Pressable>
                     </View>
                  )}
               </View>
            )}

            {/* FEEDBACK */}
            <View
               className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700"
               style={commonShadowStyle}
            >
               <View className="p-4">
                  <SendFeedback />
               </View>
            </View>

            <Text className="text-center text-xs text-slate-400 dark:text-slate-600 pb-4">
               Version {APP_VERSION}
            </Text>
         </KeyboardAwareScrollView>

         <AiInsightCreditShopSheet
            sheetRef={creditShopSheetRef}
            onDismiss={() => {}}
            onSuccess={handleCreditShopSuccess}
            isDark={isDark}
         />
      </View>
   );
}

// --- SUB COMPONENTS ---

function DeleteConfirmationModal({
   visible,
   onClose,
   onConfirm,
   isDark,
}: {
   visible: boolean;
   onClose: () => void;
   onConfirm: () => Promise<boolean>;
   isDark: boolean;
}) {
   const [confirmText, setConfirmText] = useState('');
   const [isLoading, setIsLoading] = useState(false);

   useEffect(() => {
      if (visible) {
         setConfirmText('');
         setIsLoading(false);
      }
   }, [visible]);

   const handleConfirm = async () => {
      setIsLoading(true);
      const success = await onConfirm();
      if (!success) {
         setIsLoading(false);
      }
   };

   const isMatch = confirmText.toLowerCase() === 'delete';

   return (
      <Modal
         visible={visible}
         transparent
         animationType="fade"
         onRequestClose={onClose}
      >
         <KeyboardAwareScrollView
            className="flex-1 bg-black/60"
            contentContainerStyle={{
               flexGrow: 1,
               justifyContent: 'center',
               alignItems: 'center',
               paddingHorizontal: 24,
            }}
            keyboardShouldPersistTaps="handled"
            bottomOffset={24}
         >
            <TouchableWithoutFeedback
               onPress={() => KeyboardController.dismiss()}
            >
               <View className="w-full bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 gap-4">
                  <View className="items-center gap-2">
                     <View className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 items-center justify-center">
                        <TriangleAlert size={24} color="#ef4444" />
                     </View>
                     <Text className="text-xl font-black text-slate-900 dark:text-white text-center">
                        Delete Account?
                     </Text>
                     <Text className="text-sm text-slate-500 dark:text-slate-400 text-center px-2">
                        This action is permanent. All your data will be wiped
                        immediately.
                     </Text>
                  </View>

                  <View className="gap-2">
                     <Text className="text-xs font-bold uppercase text-slate-400 ml-1">
                        Type &quot;delete&quot; to confirm
                     </Text>
                     <TextInput
                        className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-center font-bold text-slate-900 dark:text-white"
                        placeholder="delete"
                        placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
                        autoCapitalize="none"
                        value={confirmText}
                        onChangeText={setConfirmText}
                     />
                  </View>

                  <View className="flex-row gap-3 mt-2">
                     <Pressable
                        onPress={onClose}
                        disabled={isLoading}
                        className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl items-center"
                     >
                        <Text className="font-bold text-slate-700 dark:text-slate-300">
                           Cancel
                        </Text>
                     </Pressable>
                     <Pressable
                        onPress={handleConfirm}
                        disabled={!isMatch || isLoading}
                        className={`flex-1 py-3 rounded-xl items-center ${isMatch ? 'bg-red-600' : 'bg-slate-200 dark:bg-slate-800 opacity-50'}`}
                     >
                        {isLoading ? (
                           <ActivityIndicator color="white" size="small" />
                        ) : (
                           <Text
                              className={`font-bold ${isMatch ? 'text-white' : 'text-slate-400'}`}
                           >
                              Delete
                           </Text>
                        )}
                     </Pressable>
                  </View>
               </View>
            </TouchableWithoutFeedback>
         </KeyboardAwareScrollView>
      </Modal>
   );
}

function StatCard({
   label,
   value,
   subtext,
   isLoading,
   isHighlight,
   icon,
   shadowStyle,
}: {
   label: string;
   value: string;
   subtext: string;
   isLoading?: boolean;
   isHighlight?: boolean;
   icon?: ReactNode;
   shadowStyle?: StyleProp<ViewStyle>;
}) {
   const pulseOpacity = useSharedValue(0.6);
   const pulseStyle = useAnimatedStyle(() => ({
      opacity: pulseOpacity.value,
   }));

   useEffect(() => {
      if (!isLoading) {
         pulseOpacity.value = withTiming(1, { duration: 150 });
         return;
      }
      pulseOpacity.value = 0.6;
      pulseOpacity.value = withRepeat(
         withTiming(1, { duration: 700 }),
         -1,
         true,
      );
   }, [isLoading, pulseOpacity]);

   return (
      <View
         className={`flex-1 p-4 rounded-2xl border justify-between ${isHighlight ? `${DISPUTE_BG_CLASS} ${DISPUTE_BORDER_CLASS}` : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}
         style={shadowStyle}
      >
         <View className="flex-row justify-between items-start">
            <Text
               className={`text-xs font-bold uppercase tracking-wider mb-2 ${isHighlight ? DISPUTE_TEXT_CLASS : 'text-slate-400'}`}
            >
               {label}
            </Text>
            {icon}
         </View>
         <View>
            {isLoading ? (
               <Animated.View
                  className="h-8 w-16 bg-slate-100 dark:bg-slate-700 rounded"
                  style={pulseStyle}
               />
            ) : (
               <Text
                  className={`text-2xl font-black ${isHighlight ? DISPUTE_TEXT_CLASS : 'text-slate-900 dark:text-slate-100'}`}
               >
                  {value}
               </Text>
            )}
            <Text
               className={`text-[10px] mt-1 ${isHighlight ? `${DISPUTE_TEXT_CLASS} opacity-70` : 'text-slate-400'}`}
            >
               {subtext}
            </Text>
         </View>
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
         className={`flex-row items-center justify-between ${disabled ? 'opacity-50' : ''}`}
      >
         <View className="flex-1 mr-4">
            <Text className="text-[16px] font-bold text-slate-900 dark:text-slate-100">
               {title}
            </Text>
            <Text className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5 leading-5">
               {description}
            </Text>
         </View>
         {children}
      </View>
   );
}
