import { ROUTE_LOGIN } from '@/components/constants';
import { getShadow } from '@/lib/shadow';
import { useAuth } from '@/providers/AuthProvider';
import { useRevenueCat } from '@/providers/RevenueCatProvider';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Check, Crown, Infinity, Sprout } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
   ActivityIndicator,
   Alert,
   Linking,
   Pressable,
   Text,
   View,
} from 'react-native';
import { PurchasesPackage } from 'react-native-purchases';
import { PAYWALL_RESULT } from 'react-native-purchases-ui';

// --- HELPER COMPONENT: CONSUMABLE CARD ---
const CreditPackCard = ({
   pkg,
   count,
   isBuying,
   onBuy,
   isDark,
}: {
   pkg: PurchasesPackage;
   count: number;
   isBuying: boolean;
   onBuy: () => void;
   isDark: boolean;
}) => {
   return (
      <Pressable
         onPress={onBuy}
         disabled={isBuying}
         className={`
          flex-1 rounded-2xl border bg-white dark:bg-slate-800 p-3 justify-between min-h-[110px]
          ${isBuying ? 'opacity-50' : 'opacity-100'}
          border-slate-200 dark:border-slate-700
       `}
      >
         {/* Top: Count & Label (Centered) */}
         <View className="items-center justify-center flex-1 gap-0.5 mt-1">
            <Text className="text-2xl font-black text-slate-900 dark:text-white">
               {count}
            </Text>
            <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
               Credits
            </Text>
         </View>

         {/* Bottom: Price Button */}
         <View className="w-full py-2 rounded-lg mt-3 items-center bg-slate-100 dark:bg-slate-700/50">
            {isBuying ? (
               <ActivityIndicator
                  size={14}
                  color={isDark ? 'white' : 'black'}
               />
            ) : (
               <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {pkg.product.priceString}
               </Text>
            )}
         </View>
      </Pressable>
   );
};

// --- MAIN COMPONENT ---

type Props = {
   onUpgrade?: () => void;
   onSuccess?: () => void;
};

export default function CreditShop({ onUpgrade, onSuccess }: Props) {
   const {
      offerings,
      buyConsumable,
      refreshCustomerInfo,
      showPaywall,
      restorePurchases,
   } = useRevenueCat();
   const { refreshProfile, status, profile } = useAuth();
   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';
   const isSignedIn = status === 'signedIn';
   const continueShadow = useMemo(
      () => getShadow({ isDark, preset: 'button', colorLight: '#064e3b' }),
      [isDark],
   );

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
            err?.message ?? 'Please try again.',
         );
      }
   }, [onSuccess, onUpgrade, refreshProfile, showPaywall]);

   const handleRestore = async () => {
      try {
         const customerInfo = await restorePurchases();
         await refreshProfile();

         if (customerInfo.activeSubscriptions.length > 0) {
            Alert.alert('Success', 'Your subscription has been restored.');
         } else {
            Alert.alert(
               'No Subscriptions',
               "We couldn't find any active subscriptions to restore.",
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
         (a, b) => a.product.price - b.product.price,
      ) || [];

   // 1. Find Monthly for the "Hero" section
   const monthlyPackage = allPackages.find(
      (pkg) =>
         pkg.identifier === '$rc_monthly' || pkg.packageType === 'MONTHLY',
   );
   const monthlyPrice = monthlyPackage?.product.priceString;

   // 2. Filter ONLY credit packs for the "Grid" section
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
            ],
         );
         return;
      }

      if (buyingPackage) return;

      setBuyingPackage(pkg.identifier);
      try {
         await buyConsumable(pkg.product.identifier);
         await refreshCustomerInfo();

         // Polling logic
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
         await WebBrowser.openBrowserAsync(url, {
            presentationStyle:
               WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
            dismissButtonStyle: 'close',
            controlsColor: '#10b981',
            toolbarColor: isDark ? '#0f172a' : '#ffffff',
         });
      } catch {
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
               className="px-4 py-2 rounded-full bg-emerald-600 dark:bg-emerald-500 active:bg-emerald-700 dark:active:bg-emerald-600"
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
      <View className="gap-8 pt-2">
         {/* 1. THE HERO: Monthly Subscription (Your Original Design) */}
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
                     <View className="flex-row items-center gap-2">
                        <Infinity size={14} color="#10b981" />
                        <Text className="text-xs font-bold text-slate-700 dark:text-slate-200">
                           Unlimited AI Analysis
                        </Text>
                     </View>
                     <FeatureRow text="Explore Alternative Views" />
                     <FeatureRow text="Advanced Pattern Recognition" />
                  </View>

                  <View
                     className="bg-emerald-600 dark:bg-emerald-500 rounded-xl py-3.5 items-center"
                     style={[continueShadow.ios, continueShadow.android]}
                  >
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

         {/* 2. THE GRID: One-time Refills (Merged Design: Vertical Cards, No Icon, No Badge) */}
         <View>
            <View className="mb-3 px-1">
               <Text className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                  Get more analysis
               </Text>
            </View>

            <View className="flex-row gap-3">
               {creditPackages.map((pkg) => {
                  const count = getCreditCount(pkg);
                  const isBuying = buyingPackage === pkg.identifier;

                  return (
                     <CreditPackCard
                        key={pkg.identifier}
                        pkg={pkg}
                        count={count}
                        isBuying={isBuying}
                        onBuy={() => handleBuy(pkg)}
                        isDark={isDark}
                     />
                  );
               })}
            </View>
         </View>

         {/* 3. LEGAL FOOTER */}
         <View className="mt-2 items-center">
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
