import { ROUTE_LOGIN } from '@/components/constants';
import { useAuth } from '@/providers/AuthProvider';
import { useRevenueCat } from '@/providers/RevenueCatProvider';
import { router } from 'expo-router';
import { Check, Crown, Leaf, Sprout } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useState } from 'react';
import {
   ActivityIndicator,
   Alert,
   Pressable,
   Text,
   View,
} from 'react-native';
import { PurchasesPackage } from 'react-native-purchases';

type Props = {
   onUpgrade?: () => void;
   onSuccess?: () => void;
};

export default function CreditShop({ onUpgrade, onSuccess }: Props) {
   const { offerings, buyConsumable, refreshCustomerInfo } = useRevenueCat();
   const { refreshProfile, status } = useAuth();
   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';

   const [buyingPackage, setBuyingPackage] = useState<string | null>(null);

   // 1. Get Consumables ('credits' offering)
   const creditOffering = offerings?.all['credits'];
   const packages =
      creditOffering?.availablePackages.sort(
         (a, b) => a.product.price - b.product.price
      ) || [];

   // 2. Get Subscription ('monthly' package from 'current' offering or specific one)
   // We look for the monthly package to get the real price string
   const monthlyPackage = offerings?.current?.availablePackages.find(
      (pkg) => pkg.identifier === '$rc_monthly' || pkg.packageType === 'MONTHLY'
   );
   const monthlyPrice = monthlyPackage?.product.priceString ?? '$9.99';

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

         const pollDelays = [1000, 2000, 3000];
         for (const delay of pollDelays) {
            await new Promise((resolve) => setTimeout(resolve, delay));
            await refreshProfile();
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

   // Loading State
   if (!creditOffering) {
      return (
         <View className="p-10 items-center justify-center">
            <ActivityIndicator color={isDark ? '#94a3b8' : '#64748b'} />
         </View>
      );
   }

   return (
      <View className="gap-6 pt-2">
         {/* 1. THE HERO: Monthly Subscription */}
         <View>
            <View className="flex-row items-center gap-2 mb-3">
               <Crown size={16} color={isDark ? '#fbbf24' : '#d97706'} />
               <Text className="text-xs font-bold uppercase text-amber-600 dark:text-amber-400 tracking-wider">
                  Recommended
               </Text>
            </View>

            <Pressable
               onPress={onUpgrade}
               className="relative overflow-hidden rounded-2xl border-2 active:opacity-95 border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 dark:border-emerald-400"
            >
               <View className="p-4">
                  <View className="flex-row items-center gap-3 mb-3">
                     <View className="p-2.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20">
                        <Sprout
                           size={20}
                           color={isDark ? '#34d399' : '#059669'}
                        />
                     </View>
                     <View>
                        <Text className="text-lg font-bold text-slate-900 dark:text-slate-100">
                           Growth Plus
                        </Text>
                        <Text className="text-xs text-emerald-700 dark:text-emerald-300 font-bold">
                           {monthlyPrice} / month
                        </Text>
                     </View>
                  </View>

                  <View className="gap-2 mb-4">
                     <FeatureRow text="Unlimited AI Analysis" />
                     <FeatureRow text="Deep Pattern Recognition" />
                  </View>

                  <View className="bg-emerald-600 dark:bg-emerald-500 rounded-xl py-3 items-center shadow-sm shadow-emerald-900/20">
                     <Text className="text-white font-bold text-sm">
                        Subscribe
                     </Text>
                  </View>
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
               {packages.map((pkg) => {
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
      </View>
   );
}

// Logic: Check Product ID explicitly
function getCreditCount(pkg: PurchasesPackage) {
   const productId = pkg.product.identifier;
   const identifier = pkg.identifier.toLowerCase();

   if (productId === 'prod092f097225' || productId === 'credit_small') return 5;
   if (productId === 'prod497e0e5d84' || productId === 'credit_medium') return 10;
   if (productId === 'prodff5774de6e' || productId === 'credit_large') return 15;

   if (identifier.includes('small') || identifier === '$rc_monthly') return 5;
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