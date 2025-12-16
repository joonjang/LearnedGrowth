import { useAuth } from '@/providers/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import {
   BottomSheetBackdrop,
   BottomSheetBackdropProps,
   BottomSheetModal,
   BottomSheetView,
} from '@gorhom/bottom-sheet';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { useCallback, useEffect, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function FreeUserChoiceScreen() {
   const router = useRouter();
   const insets = useSafeAreaInsets();
   const modalRef = useRef<BottomSheetModal>(null);
   const { status } = useAuth();
   const { id } = useLocalSearchParams<{ id?: string | string[] }>();

   // Logic Helpers
   const entryId = Array.isArray(id) ? id[0] : id;
   const isSignedIn = status === 'signedIn';

   // --- CLEANUP 1: Centralized Theme ---
   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';

   const theme = {
      bg: isDark ? '#0f172a' : '#ffffff',
      text: isDark ? '#f8fafc' : '#0f172a',
      subText: isDark ? '#cbd5e1' : '#64748b',
      indicator: isDark ? '#475569' : '#cbd5e1',
      // Amber Card
      amberText: isDark ? '#fde68a' : '#b45309',
      amberSub: isDark ? 'rgba(254, 243, 199, 0.8)' : 'rgba(146, 64, 14, 0.8)',
      amberBorder: 'border-amber-500',
      amberBg: isDark ? 'bg-amber-500/10' : 'bg-amber-50',
      // Slate Card
      slateBorder: isDark ? 'border-slate-700' : 'border-slate-200',
      slateBg: isDark ? 'bg-slate-800' : 'bg-slate-50',
   };

   const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
         <BottomSheetBackdrop
            {...props}
            appearsOnIndex={0}
            disappearsOnIndex={-1}
            pressBehavior="close"
            opacity={0.5}
         />
      ),
      []
   );

   useEffect(() => {
      const id = requestAnimationFrame(() => {
         modalRef.current?.present();
      });
      return () => cancelAnimationFrame(id);
   }, []);

   // --- CLEANUP 2: Consolidated Navigation ---
   const handleChoice = (requiresAuth: boolean) => {
      if (!entryId) return modalRef.current?.dismiss();

      const path = requiresAuth
         ? `/dispute/${entryId}?analyze=1`
         : `/dispute/${entryId}`;

      if (requiresAuth && !isSignedIn) {
         router.replace({
            pathname: '/(modal)/login',
            params: { redirect: path },
         } as any);
      } else {
         router.replace(path);
      }
   };

   return (
      <BottomSheetModal
         ref={modalRef}
         // --- CHANGE 1: Enable Dynamic Sizing ---
         enableDynamicSizing={true}
         enablePanDownToClose
         backdropComponent={renderBackdrop}
         handleIndicatorStyle={{ backgroundColor: theme.indicator }}
         backgroundStyle={{ backgroundColor: theme.bg, borderRadius: 24 }}
      >
         <BottomSheetView
            style={{
               paddingHorizontal: 24,
               paddingTop: 16,
               paddingBottom: insets.bottom + 20,
            }}
         >
            {/* Header */}
            <View className="mb-6">
               <Text className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-1">
                  Free plan
               </Text>
               <Text
                  className="text-2xl font-bold mb-1"
                  style={{ color: theme.text }}
               >
                  How do you want to dispute?
               </Text>
               <Text className="text-base" style={{ color: theme.subText }}>
                  Choose AI analysis or jump into the guided steps.
               </Text>
            </View>

            {/* Action Cards */}
            <View className="gap-3">
               {/* AI Analysis Option */}
               <Pressable
                  onPress={() => handleChoice(true)}
                  className={`flex-row items-center justify-between rounded-2xl border ${theme.amberBorder} ${theme.amberBg} py-4 px-4 active:opacity-90`}
               >
                  <View className="flex-1 pr-3">
                     <Text
                        className="text-lg font-semibold"
                        style={{ color: theme.amberText }}
                     >
                        Let AI analyze this
                     </Text>
                     <Text
                        className="text-sm mt-1"
                        style={{ color: theme.amberSub }}
                     >
                        Get an instant breakdown and suggestions before you
                        dispute.
                     </Text>
                  </View>
                  <Ionicons name="sparkles" size={22} color={theme.text} />
               </Pressable>

               {/* Manual Steps Option */}
               <Pressable
                  onPress={() => handleChoice(false)}
                  className={`flex-row items-center justify-between rounded-2xl border ${theme.slateBorder} ${theme.slateBg} py-4 px-4 active:opacity-90`}
               >
                  <View className="flex-1 pr-3">
                     <Text
                        className="text-lg font-semibold"
                        style={{ color: theme.text }}
                     >
                        Go to dispute steps
                     </Text>
                     <Text
                        className="text-sm mt-1"
                        style={{ color: theme.subText }}
                     >
                        Work through the guided prompts without AI.
                     </Text>
                  </View>
                  <Ionicons name="arrow-forward" size={20} color={theme.text} />
               </Pressable>
            </View>
         </BottomSheetView>
      </BottomSheetModal>
   );
}
