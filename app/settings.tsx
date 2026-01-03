import RoundedCloseButton from '@/components/buttons/RoundedCloseButton';
import {
   FREE_MONTHLY_CREDITS,
   ROUTE_LOGIN
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
import { ChevronDown, ChevronUp, TriangleAlert, Zap } from 'lucide-react-native';
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
   KeyboardAvoidingView,
   LayoutAnimation,
   Linking,
   Modal,
   Platform,
   Pressable,
   ScrollView,
   StyleProp,
   Switch,
   Text,
   TextInput,
   View,
   ViewStyle,
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
   
   // Shadows
   const shadowSm = useMemo(() => getShadow({ isDark, preset: 'sm' }), [isDark]);
   const shadowClass = shadowSm.className;
   
   // Colors
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
   const [showDeleteModal, setShowDeleteModal] = useState(false);
   const [isShopOpen, setIsShopOpen] = useState(false);

   // --- Computed ---
   const isSignedIn = status === 'signedIn';
   const entitlementActive = isGrowthPlusActive;
   const hasGrowth = entitlementActive;
   const aiUsed = profile?.aiCallsUsed ?? 0;
   const extraCredits = profile?.extraAiCredits ?? 0;
   const monthlyRemaining = Math.max(FREE_MONTHLY_CREDITS - aiUsed, 0);
   const darkMode = theme === 'dark';

   const biometricUnavailable = !biometricInfo.hasHardware;
   const biometricNeedsEnroll = biometricInfo.hasHardware && !biometricInfo.isEnrolled;

   useFocusEffect(
      useCallback(() => {
         if (status !== 'signedIn') return;
         refreshProfileIfStale();
      }, [refreshProfileIfStale, status])
   );

   useEffect(() => {
      const unsubscribe = NetInfo.addEventListener((state) => {
         setIsOffline(!(state.isConnected && state.isInternetReachable));
      });
      return () => unsubscribe();
   }, []);

   useEffect(() => {
      AsyncStorage.getItem(STORAGE_KEYS.biometric)
         .then((val) => setBiometricEnabled(val === 'true'))
         .catch((err) => console.warn(err));
   }, []);

   const refreshBiometricInfo = useCallback(async () => {
      try {
         const hasHardware = await LocalAuthentication.hasHardwareAsync();
         const isEnrolled = hasHardware ? await LocalAuthentication.isEnrolledAsync() : false;
         setBiometricInfo({ hasHardware, isEnrolled });
         return { hasHardware, isEnrolled };
      } catch {
         const fallback = { hasHardware: false, isEnrolled: false };
         setBiometricInfo(fallback);
         return fallback;
      }
   }, []);

   useEffect(() => { refreshBiometricInfo(); }, [refreshBiometricInfo]);

   // --- Handlers ---
   const handleUpgrade = async () => {
      if (!isSignedIn) { router.push(ROUTE_LOGIN as any); return; }
      setBillingAction('upgrade');
      setBillingNote(null);
      try {
         const result = await showPaywall();
         if (result === PAYWALL_RESULT.PURCHASED) {
            setBillingNote('Growth Plus unlocked.');
            await refreshProfile();
         }
      } catch (err: any) {
         setBillingNote(err?.message ?? 'Unable to open paywall.');
      } finally {
         setBillingAction(null);
      }
   };

   const handleRestore = async () => {
      if (isOffline) { setBillingNote('Go online to restore purchases.'); return; }
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
         if (!MANAGE_SUBSCRIPTION_URL) throw new Error('Not supported.');
         await Linking.openURL(MANAGE_SUBSCRIPTION_URL);
      } catch (err: any) {
         Alert.alert('Manage subscription', err?.message);
      } finally {
         setBillingAction(null);
      }
   };

   const handleToggleBiometric = async (next: boolean) => {
      clearPrefError();
      const info = await refreshBiometricInfo();
      if (!info.hasHardware) return;
      if (!info.isEnrolled) {
         Alert.alert('Biometrics not set up', 'Please enable in device settings.');
         return;
      }
      if (next) {
         const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Enable lock' });
         if (!result.success) return;
      }
      setBiometricEnabled(next);
      AsyncStorage.setItem(STORAGE_KEYS.biometric, String(next));
      if (next && hapticsEnabled) triggerHaptic();
   };

   const handleManualRefresh = async () => {
      setIsRefreshing(true);
      await Promise.all([refreshCustomerInfo(), refreshProfile()]).finally(() => setIsRefreshing(false));
   };

   const toggleShop = () => {
      if (!isSignedIn) { router.push(ROUTE_LOGIN as any); return; }
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setIsShopOpen(!isShopOpen);
   };

   const performDeleteAccount = async (): Promise<boolean> => {
      if (isOffline) return false;
      try {
         const supabase = getSupabaseClient();
         const { error } = await supabase.functions.invoke('delete-account');
         if (error) throw new Error(error.message);
         
         await signOut();
         router.push(ROUTE_LOGIN);
         return true; 
      } catch (err: any) {
         Alert.alert('Delete account', err?.message ?? 'Delete failed.');
         return false; 
      }
   };

   const planLabel = useMemo(() => entitlementActive ? 'Growth Plus' : 'Free Plan', [entitlementActive]);
   const refillLabel = useMemo(() => {
      if (!profile?.aiCycleStart) return null;
      const date = new Date(profile.aiCycleStart);
      date.setMonth(date.getMonth() + 1);
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
   }, [profile?.aiCycleStart]);

   const isLoading = loadingProfile || rcLoading || isRefreshing;

   return (
      <View className="flex-1 bg-slate-50 dark:bg-slate-900">
         
         <DeleteConfirmationModal 
            visible={showDeleteModal} 
            onClose={() => setShowDeleteModal(false)}
            onConfirm={performDeleteAccount}
            isDark={isDark}
         />

         <ScrollView
            contentContainerStyle={{
               paddingTop: insets.top + 16,
               paddingBottom: insets.bottom + 40,
               paddingHorizontal: 16,
               gap: 16,
            }}
            showsVerticalScrollIndicator={false}
         >
             {/* HEADER */}
            <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1 mr-4">
                    <Text className="text-3xl font-extrabold text-slate-900 dark:text-slate-50">Settings</Text>
                    <Text numberOfLines={1} className="text-[15px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                        {user?.email ?? 'Not signed in'}
                    </Text>
                </View>
                <View className="mt-1">
                    <RoundedCloseButton onPress={() => router.back()} />
                </View>
            </View>

            {/* OFFLINE INDICATOR */}
            {isOffline && (
               <View className="bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 p-3 rounded-xl flex-row items-center gap-3">
                  <View className="w-2 h-2 rounded-full bg-amber-500" />
                  <Text className="text-sm font-bold text-amber-800 dark:text-amber-200">You are offline.</Text>
               </View>
            )}

            {!user && (
               <View className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 items-center gap-3 ${shadowClass}`} style={[shadowSm.ios, shadowSm.android]}>
                  <Text className="text-center text-slate-600 dark:text-slate-300">Sign in to sync data.</Text>
                  <Pressable className="w-full bg-slate-900 dark:bg-slate-100 py-3 rounded-xl items-center" onPress={() => router.push(ROUTE_LOGIN)}>
                     <Text className="text-white dark:text-slate-900 font-bold">Sign In</Text>
                  </Pressable>
               </View>
            )}

            {/* STATS */}
            {isSignedIn && !hasGrowth && (
               <View className="flex-row gap-3">
                  <StatCard
                     label="Monthly Credits"
                     value={String(monthlyRemaining)}
                     subtext={refillLabel ? `Resets ${refillLabel}` : 'Resets monthly'}
                     isLoading={isLoading}
                     icon={<Zap size={16} color="#fbbf24" fill="#fbbf24" />}
                     shadowClass={shadowClass}
                     shadowStyle={[shadowSm.ios, shadowSm.android]}
                  />
                  <StatCard
                     label="Extra Analysis"
                     value={String(extraCredits)}
                     subtext="Non-expiring"
                     isLoading={isLoading}
                     isHighlight
                     shadowClass={shadowClass}
                     shadowStyle={[shadowSm.ios, shadowSm.android]}
                  />
               </View>
            )}

            {/* SUBSCRIPTION CARD */}
            {isSignedIn && user && (
               <View className={`bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 ${shadowClass}`} style={[shadowSm.ios, shadowSm.android]}>
                  {/* Plan Status Header */}
                  <View className="p-4 border-b border-slate-100 dark:border-slate-800 flex-row justify-between items-center">
                     <View>
                        <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Current Plan</Text>
                        <Text className="text-lg font-extrabold text-slate-900 dark:text-slate-100">{planLabel}</Text>
                     </View>
                     <Pressable onPress={handleManualRefresh} disabled={isLoading} className={`p-2 bg-slate-50 dark:bg-slate-800 rounded-full border border-slate-100 dark:border-slate-700 ${isLoading ? 'opacity-50' : ''}`}>
                        {isLoading ? <ActivityIndicator size="small" color={loaderColor} /> : <Text className="text-xs text-slate-900 dark:text-slate-100">↻</Text>}
                     </Pressable>
                  </View>

                  <View className="p-4 gap-4 bg-slate-50/50 dark:bg-slate-800/20">
                     {!hasGrowth ? (
                        <>
                           <Pressable onPress={toggleShop} className="bg-green-600 active:bg-green-700 rounded-xl p-4 flex-row items-center justify-between shadow-sm shadow-green-200 dark:shadow-none">
                              <View className="flex-1 mr-2">
                                 <Text className="text-white font-bold text-[16px]">Unlock Growth Plus</Text>
                                 <Text className="text-green-100 text-xs mt-0.5">Unlimited analysis & more</Text>
                              </View>
                              {isShopOpen ? <ChevronUp size={20} color="white" /> : <ChevronDown size={20} color="white" />}
                           </Pressable>
                           {isShopOpen && (
                              <View className="pt-2">
                                 <CreditShop onUpgrade={handleUpgrade} onSuccess={() => LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)} />
                              </View>
                           )}
                        </>
                     ) : (
                        <Pressable onPress={handleManageSubscription} disabled={billingAction === 'manage'} className="flex-row items-center justify-between bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
                           <Text className="font-semibold text-slate-700 dark:text-slate-200">Manage Subscription</Text>
                           <ChevronRight size={18} color={iconColor} />
                        </Pressable>
                     )}

                     <Pressable onPress={handleRestore} disabled={billingAction === 'restore' || isOffline} className="self-center py-1">
                        <Text className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                           {billingAction === 'restore' ? 'Restoring purchases...' : 'Restore Purchases'}
                        </Text>
                     </Pressable>
                     
                     {(billingNote || rcError) && <Text className="text-xs text-center text-slate-600 dark:text-slate-400">{billingNote ?? rcError}</Text>}
                  </View>
               </View>
            )}

            {/* PREFERENCES */}
            <View className={`bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 gap-5 ${shadowClass}`} style={[shadowSm.ios, shadowSm.android]}>
               <Text className="text-lg font-extrabold text-slate-900 dark:text-slate-100">Preferences</Text>

               <SettingRow title="Dark Mode" description="Switch between light and dark theme.">
                  <Switch value={darkMode} onValueChange={(val) => setTheme(val ? 'dark' : 'light')} disabled={prefsLoading} thumbColor={switchThumbColor} trackColor={{ false: '#e2e8f0', true: '#16a34a' }} />
               </SettingRow>

               <SettingRow title="Haptic Feedback" description="Tactile vibrations on interaction.">
                  <Switch value={hapticsEnabled} onValueChange={setHapticsEnabled} disabled={prefsLoading || !hapticsAvailable} thumbColor={switchThumbColor} trackColor={{ false: '#e2e8f0', true: '#16a34a' }} />
               </SettingRow>

               <View>
                   <SettingRow title="Biometric Lock" description="Require FaceID/TouchID on launch." disabled={prefsLoading || biometricUnavailable}>
                      <Switch value={biometricEnabled} onValueChange={handleToggleBiometric} disabled={prefsLoading || biometricUnavailable || biometricNeedsEnroll} thumbColor={switchThumbColor} trackColor={{ false: '#e2e8f0', true: '#16a34a' }} />
                   </SettingRow>
                   {biometricUnavailable && (
                       <Text className="text-xs text-slate-400 mt-2 ml-1">* Biometric hardware not detected on this device.</Text>
                   )}
                   {biometricNeedsEnroll && (
                       <Pressable onPress={() => Linking.openSettings()}>
                           <Text className="text-xs text-amber-600 dark:text-amber-500 mt-2 ml-1 font-medium">* Biometrics not set up. Tap to open Settings.</Text>
                       </Pressable>
                   )}
               </View>
            </View>

            {/* ACCOUNT ACTIONS */}
            {isSignedIn && (
               <View className={`bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 ${shadowClass}`} style={[shadowSm.ios, shadowSm.android]}>
                  <Pressable className="flex-row justify-between items-center p-4 active:bg-slate-50 dark:active:bg-slate-800" onPress={() => setActionsCollapsed(!actionsCollapsed)}>
                     <Text className="text-lg font-extrabold text-slate-900 dark:text-slate-100">Account Actions</Text>
                     {actionsCollapsed ? <ChevronDown size={20} color={iconColor} /> : <ChevronUp size={20} color={iconColor} />}
                  </Pressable>

                  {!actionsCollapsed && (
                     <View className="p-4 pt-0 gap-3">
                        <Pressable onPress={() => Alert.alert('Sign out', 'Confirm?', [{ text: 'Cancel' }, { text: 'Sign Out', onPress: signOut }])} className="py-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 items-center">
                           <Text className="font-bold text-slate-700 dark:text-slate-200 text-[15px]">Sign Out</Text>
                        </Pressable>
                        
                        {/* DELETE BUTTON: Ghost Style, Standard Text Size, More Spacing */}
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
            <View className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden ${shadowClass}`} style={[shadowSm.ios, shadowSm.android]}>
                <View className="p-4">
                   <SendFeedback />
                </View>
            </View>

            <Text className="text-center text-xs text-slate-400 dark:text-slate-600 pb-4">Version 1.0.0</Text>
         </ScrollView>
      </View>
   );
}

// --- SUB COMPONENTS ---

function DeleteConfirmationModal({ visible, onClose, onConfirm, isDark }: { visible: boolean; onClose: () => void; onConfirm: () => Promise<boolean>; isDark: boolean }) {
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
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-center items-center bg-black/60 px-6">
                <View className="w-full bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 gap-4">
                    <View className="items-center gap-2">
                        <View className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 items-center justify-center">
                            <TriangleAlert size={24} color="#ef4444" />
                        </View>
                        <Text className="text-xl font-black text-slate-900 dark:text-white text-center">Delete Account?</Text>
                        <Text className="text-sm text-slate-500 dark:text-slate-400 text-center px-2">
                            This action is permanent. All your data will be wiped immediately.
                        </Text>
                    </View>

                    <View className="gap-2">
                        <Text className="text-xs font-bold uppercase text-slate-400 ml-1">Type "delete" to confirm</Text>
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
                        <Pressable onPress={onClose} disabled={isLoading} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl items-center">
                            <Text className="font-bold text-slate-700 dark:text-slate-300">Cancel</Text>
                        </Pressable>
                        <Pressable 
                            onPress={handleConfirm} 
                            disabled={!isMatch || isLoading}
                            className={`flex-1 py-3 rounded-xl items-center ${isMatch ? 'bg-red-600' : 'bg-slate-200 dark:bg-slate-800 opacity-50'}`}
                        >
                            {isLoading ? <ActivityIndicator color="white" size="small" /> : <Text className={`font-bold ${isMatch ? 'text-white' : 'text-slate-400'}`}>Delete</Text>}
                        </Pressable>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

function StatCard({ label, value, subtext, isLoading, isHighlight, icon, shadowClass, shadowStyle }: { 
   label: string; 
   value: string; 
   subtext: string; 
   isLoading?: boolean; 
   isHighlight?: boolean;
   icon?: ReactNode;
   shadowClass?: string;
   shadowStyle?: StyleProp<ViewStyle>; 
}) {
   return (
      <View className={`flex-1 p-4 rounded-2xl border justify-between ${shadowClass ?? ''} ${isHighlight ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`} style={shadowStyle}>
         <View className="flex-row justify-between items-start">
             <Text className={`text-xs font-bold uppercase tracking-wider mb-2 ${isHighlight ? 'text-green-600 dark:text-green-400' : 'text-slate-400'}`}>{label}</Text>
             {icon}
         </View>
         <View>
            {isLoading ? <View className="h-8 w-16 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" /> : <Text className={`text-2xl font-black ${isHighlight ? 'text-green-700 dark:text-green-300' : 'text-slate-900 dark:text-slate-100'}`}>{value}</Text>}
            <Text className={`text-[10px] mt-1 ${isHighlight ? 'text-green-600/70 dark:text-green-300/60' : 'text-slate-400'}`}>{subtext}</Text>
         </View>
      </View>
   );
}

function SettingRow({ title, description, children, disabled }: { title: string; description: string; children: ReactNode; disabled?: boolean }) {
   return (
      <View className={`flex-row items-center justify-between ${disabled ? 'opacity-50' : ''}`}>
         <View className="flex-1 mr-4">
            <Text className="text-[16px] font-bold text-slate-900 dark:text-slate-100">{title}</Text>
            <Text className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5 leading-5">{description}</Text>
         </View>
         {children}
      </View>
   );
}