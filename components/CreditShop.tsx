import { ROUTE_LOGIN } from '@/components/constants';
import { useAuth } from '@/providers/AuthProvider';
import { useRevenueCat } from '@/providers/RevenueCatProvider';
import { router } from 'expo-router'; // Import router for redirection
import { useColorScheme } from 'nativewind';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { PurchasesPackage } from 'react-native-purchases';

type CreditShopProps = {
   style?: any;
   onSuccess?: () => void; // <--- 1. Add this prop definition
};

export default function CreditShop({ style, onSuccess }: CreditShopProps) {
   const { offerings, buyConsumable, refreshCustomerInfo } = useRevenueCat();
   const { refreshProfile, status } = useAuth(); // Grab status
   const [buyingPackage, setBuyingPackage] = useState<string | null>(null);
   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';

   const creditOffering = offerings?.all['credits'];
   const packages =
      creditOffering?.availablePackages.sort(
         (a, b) => a.product.price - b.product.price
      ) || [];

   const handleBuy = async (pkg: PurchasesPackage) => {
      if (status !== 'signedIn') {
         Alert.alert(
            'Account Required',
            'You need to be logged in to save your credits.',
            [
               { text: 'Cancel', style: 'cancel' },
               {
                  text: 'Log In / Sign Up',
                  onPress: () => router.push(ROUTE_LOGIN), // Or your auth route
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

         const pollDelays = [1000, 2000, 2000];

         for (const delay of pollDelays) {
            await new Promise((resolve) => setTimeout(resolve, delay));
            await refreshProfile();
         }

         Alert.alert('Success!', 'Credits added to your account.');

         if (onSuccess) {
            onSuccess();
         }
      } catch (e: any) {
         if (!e.userCancelled) {
            Alert.alert('Purchase Failed', e.message);
         }
      } finally {
         setBuyingPackage(null);
      }
   };

   if (!creditOffering)
      return <ActivityIndicator color={isDark ? '#0f172a' : 'white'} />;

   return (
      <View className="gap-4" style={style}>
         {packages.map((pkg) => {
            const isBuying = buyingPackage === pkg.identifier;
            const count = getCreditCount(pkg.identifier);

            return (
               <Pressable
                  key={pkg.identifier}
                  onPress={() => handleBuy(pkg)}
                  disabled={!!buyingPackage}
                  className={`flex-row items-center justify-between p-4 rounded-2xl border bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700`}
               >
                  <View>
                     <Text className="font-bold text-lg text-slate-900 dark:text-white">
                        {count} Extra Analysis
                     </Text>
                  </View>

                  <View className="bg-slate-900 dark:bg-white px-4 py-2 rounded-full">
                     {isBuying ? (
                        <ActivityIndicator
                           size="small"
                           color={isDark ? '#0f172a' : 'white'}
                        />
                     ) : (
                        <Text className="text-white dark:text-slate-900 font-bold">
                           {pkg.product.priceString}
                        </Text>
                     )}
                  </View>
               </Pressable>
            );
         })}
      </View>
   );
}

function getCreditCount(identifier: string) {
   switch (identifier) {
      case 'small':
         return 10;
      case 'medium':
         return 25;
      case 'large':
         return 50;
      default:
         return '?';
   }
}
