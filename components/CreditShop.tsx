import { ROUTE_LOGIN } from '@/components/constants';
import { useAuth } from '@/providers/AuthProvider';
import { useRevenueCat } from '@/providers/RevenueCatProvider';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Check, Crown, Infinity, Leaf, Sprout } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
   ActivityIndicator,
   Alert,
   Linking, // <--- Added for links
   Pressable,
   Text,
   View,
} from 'react-native';
import { PurchasesPackage } from 'react-native-purchases';
import { PAYWALL_RESULT } from 'react-native-purchases-ui';

type Props = {
   onUpgrade?: () => void;
   onSuccess?: () => void;
};

export default function CreditShop({ onUpgrade, onSuccess }: Props) {
   const { offerings, buyConsumable, refreshCustomerInfo, showPaywall, restorePurchases } =
      useRevenueCat();
   const { refreshProfile, status, profile } = useAuth();
   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';
   const isSignedIn = status === 'signedIn';

   const [buyingPackage, setBuyingPackage] = useState<string | null>(null);
   const profileRef = useRef(profile);

   useEffect(() => {
      profileRef.current = profile;
   }, [profile]);

   const handleUpgradePress = useCallback(async () => {
      if (onUpgrade) {
         onUpgrade();
         return;
      }

      try {
         const result = await showPaywall();
         if (result === PAYWALL_RESULT.PURCHASED) {
            await refreshProfile();
            if (onSuccess) onSuccess();
         }
      } catch (err: any) {
         Alert.alert(
            'Unable to open paywall',
            err?.message ?? 'Please try again.'
         );
      }
   }, [onSuccess, onUpgrade, refreshProfile, showPaywall]);

   const handleRestore = async () => {
      try {
         const customerInfo = await restorePurchases();
         // Update your auth profile to reflect the restored status
         await refreshProfile();

         if (customerInfo.activeSubscriptions.length > 0) {
            Alert.alert('Success', 'Your subscription has been restored.');
         } else {
            Alert.alert(
               'No Subscriptions',
               "We couldn't find any active subscriptions to restore."
            );
         }
      } catch (e: any) {
         Alert.alert('Restore Failed', e.message);
      }
   };

   // --- DATA PREP ---
   const creditOffering = offerings?.current;
   const allPackages =
      creditOffering?.availablePackages.sort(
         (a, b) => a.product.price - b.product.price
      ) || [];

   // 1. Find Monthly for the "Hero" section
   const monthlyPackage = allPackages.find(
      (pkg) => pkg.identifier === '$rc_monthly' || pkg.packageType === 'MONTHLY'
   );
   const monthlyPrice = monthlyPackage?.product.priceString;

   // 2. Filter ONLY credit packs for the "Grid" section
   // This fixes the "two extra items" bug
   const creditPackages = allPackages
      .filter((pkg) => pkg.identifier.includes('credit_'))
      .sort((a, b) => a.product.price - b.product.price);

   const handleBuy = async (pkg: PurchasesPackage) => {
      if (status !== 'signedIn') {
         Alert.alert(
            'Account Required',
            'You need to be logged in to save your credits.',
            [
               { text: 'Cancel', style: 'cancel' },
               {
                  text: 'Log In / Sign Up',
                  onPress: () => router.push(ROUTE_LOGIN),
               },
            ]
         );
         return;
      }

      if (buyingPackage) return;

      setBuyingPackage(pkg.identifier);
      try {
         await buyConsumable(pkg.product.identifier);
         await refreshCustomerInfo();

         // Polling logic to wait for database sync
         const startExtra = profileRef.current?.extraAiCredits ?? 0;
         const pollDelays = [600, 1200, 2000, 3200];
         for (const delay of pollDelays) {
            await refreshProfile();
            await new Promise((resolve) => setTimeout(resolve, delay));
            const latestExtra = profileRef.current?.extraAiCredits ?? 0;
            if (latestExtra > startExtra) break;
         }

         if (onSuccess) onSuccess();
      } catch (e: any) {
         if (!e.userCancelled) {
            Alert.alert('Purchase Failed', e.message);
         }
      } finally {
         setBuyingPackage(null);
      }
   };

   const openLink = async (url: string) => {
      try {
         // This opens the in-app browser modal
         await WebBrowser.openBrowserAsync(url, {
            presentationStyle:
               WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
            dismissButtonStyle: 'close',
            controlsColor: '#10b981', // Your emerald color
            toolbarColor: isDark ? '#0f172a' : '#ffffff', // Matches your theme
         });
      } catch (e) {
         // Fallback to standard browser if something goes wrong
         Linking.openURL(url).catch(() => {});
      }
   };

   // --- RENDER ---

   if (!isSignedIn) {
      return (
         <View className="p-6 items-center gap-3">
            <Text className="text-base font-semibold text-slate-900 dark:text-slate-100 text-center">
               Sign in to purchase credits or subscribe.
            </Text>
            <Pressable
               onPress={() => router.push(ROUTE_LOGIN)}
               className="px-4 py-2 rounded-full bg-emerald-600 active:bg-emerald-700"
            >
               <Text className="text-white font-bold">Log In / Sign Up</Text>
            </Pressable>
         </View>
      );
   }

   if (!creditOffering) {
      return (
         <View className="p-10 items-center justify-center">
            <ActivityIndicator color={isDark ? '#94a3b8' : '#64748b'} />
         </View>
      );
   }

   return (
      <View className="gap-6 pt-2 ">
         {/* Added pb-8 for spacing at bottom */}

         {/* 1. THE HERO: Monthly Subscription */}
         <View>
            <View className="flex-row items-center justify-between mb-3">
               <View className="flex-row items-center gap-2">
                  <Crown size={16} color={isDark ? '#fbbf24' : '#d97706'} />
                  <Text className="text-xs font-bold uppercase text-amber-600 dark:text-amber-400 tracking-wider">
                     Recommended
                  </Text>
               </View>
            </View>

            <Pressable
               onPress={handleUpgradePress}
               className="relative overflow-hidden rounded-2xl border-2 active:opacity-95 border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 dark:border-emerald-400"
            >
               <View className="p-4">
                  <View className="flex-row items-center gap-3 mb-4">
                     <View className="p-3 rounded-full bg-emerald-100 dark:bg-emerald-500/20">
                        <Sprout
                           size={24}
                           color={isDark ? '#34d399' : '#059669'}
                        />
                     </View>
                     <View className="flex-1">
                        <Text className="text-xl font-bold text-slate-900 dark:text-slate-100">
                           Growth Plus
                        </Text>
                        <Text className="text-sm text-slate-500 dark:text-slate-400">
                           Remove monthly limits
                        </Text>
                     </View>
                     <View className="items-end">
                        <Text className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                           {monthlyPrice}
                        </Text>
                        <Text className="text-[10px] text-slate-400 font-medium uppercase">
                           per month
                        </Text>
                     </View>
                  </View>

                  <View className="gap-2.5 mb-5 pl-1">
                     {/* Feature 1: The big seller */}
                     <View className="flex-row items-center gap-2">
                        <Infinity size={14} color="#10b981" />
                        <Text className="text-xs font-bold text-slate-700 dark:text-slate-200">
                           Unlimited AI Analysis
                        </Text>
                     </View>
                     {/* Feature 2: Accurate to ABCDE Method */}
                     <FeatureRow text="Explore Alternative Views" />
                     {/* Feature 3: Analytics */}
                     <FeatureRow text="Advanced Pattern Recognition" />
                  </View>

                  <View className="bg-emerald-600 dark:bg-emerald-500 rounded-xl py-3.5 items-center shadow-md shadow-emerald-900/20">
                     <Text className="text-white font-bold text-lg tracking-wide">
                        Continue
                     </Text>
                  </View>

                  <Text className="text-center text-[10px] text-slate-400 mt-2">
                     Cancel anytime in your settings.
                  </Text>
               </View>
            </Pressable>
         </View>

         {/* 2. THE GRID: One-time Refills */}
         <View>
            <View className="mb-3 px-1">
               <Text className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                  Get more analysis
               </Text>
            </View>

            <View className="flex-row gap-3">
               {/* FIX: Use creditPackages instead of packages */}
               {creditPackages.map((pkg) => {
                  const count = getCreditCount(pkg);
                  const isBuying = buyingPackage === pkg.identifier;

                  return (
                     <Pressable
                        key={pkg.identifier}
                        onPress={() => handleBuy(pkg)}
                        disabled={!!buyingPackage}
                        className={`
                           flex-1 rounded-xl border border-slate-200 dark:border-slate-700 
                           bg-white dark:bg-slate-800 p-2.5 items-center gap-1 
                           active:bg-slate-50 dark:active:bg-slate-700
                           ${isBuying ? 'opacity-50' : ''}
                        `}
                     >
                        {isBuying ? (
                           <View className="py-2">
                              <ActivityIndicator
                                 size="small"
                                 color={isDark ? '#e2e8f0' : '#0f172a'}
                              />
                           </View>
                        ) : (
                           <>
                              <Leaf
                                 size={18}
                                 color={isDark ? '#94a3b8' : '#64748b'}
                              />
                              <Text className="text-lg font-bold text-slate-900 dark:text-slate-100">
                                 {count}
                              </Text>
                              <Text className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                 {pkg.product.priceString}
                              </Text>
                           </>
                        )}
                     </Pressable>
                  );
               })}
            </View>
         </View>

         {/* 3. LEGAL FOOTER (Mandatory) */}
         <View className="mt-2 items-center">

            {/* Restore Button (Primary Secondary Action) */}
            <Pressable onPress={handleRestore}>
               <Text className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  Restore Purchases
               </Text>
            </Pressable>
            
            <View className="flex-row justify-center gap-4 mt-3">
               <Pressable
                  onPress={() => openLink('https://learnedgrowth.com/terms')}
               >
                  <Text className="text-xs text-slate-400 dark:text-slate-500 text-center">
                     Terms of Service
                  </Text>
               </Pressable>
               <Pressable
                  onPress={() => openLink('https://learnedgrowth.com/privacy')}
               >
                  <Text className="text-xs text-slate-400 dark:text-slate-500 text-center">
                     Privacy Policy
                  </Text>
               </Pressable>
            </View>
         </View>
      </View>
   );
}

// Logic: STRICT MATCHING
function getCreditCount(pkg: PurchasesPackage) {
   const identifier = pkg.identifier;

   if (identifier === 'credit_small') return 5;
   if (identifier === 'credit_medium') return 10;
   if (identifier === 'credit_large') return 15;

   if (identifier.includes('small')) return 5;
   if (identifier.includes('medium')) return 10;
   if (identifier.includes('large')) return 15;

   return 5;
}

function FeatureRow({ text }: { text: string }) {
   return (
      <View className="flex-row items-center gap-2">
         <Check size={12} color="#10b981" />
         <Text className="text-xs font-medium text-slate-600 dark:text-slate-300">
            {text}
         </Text>
      </View>
   );
}
