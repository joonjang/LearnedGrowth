import { Ionicons } from '@expo/vector-icons';
import {
   BottomSheetBackdrop,
   BottomSheetBackdropProps,
   BottomSheetModal,
   BottomSheetView,
} from '@gorhom/bottom-sheet';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function FreeUserChoiceScreen() {
   const router = useRouter();
   const insets = useSafeAreaInsets();
   const { id } = useLocalSearchParams<{ id?: string | string[] }>();
   const entryId = Array.isArray(id) ? id[0] : id;
   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';
   const iconColor = isDark ? '#f8fafc' : '#0f172a'; // text vs text-inverse
   const sheetIndicator = isDark ? '#475569' : '#cbd5e1';

   const modalRef = useRef<BottomSheetModal>(null);
   const snapPoints = useMemo(() => ['48%'], []);

   const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
         <BottomSheetBackdrop
            {...props}
            appearsOnIndex={0}
            disappearsOnIndex={-1}
            pressBehavior="close"
            opacity={0.45}
         />
      ),
      []
   );

   const close = useCallback(() => {
      modalRef.current?.dismiss();
   }, []);

   useEffect(() => {
      const id = requestAnimationFrame(() => {
         modalRef.current?.present();
      });
      return () => cancelAnimationFrame(id);
   }, []);

   const goToAnalyze = () => {
      if (!entryId) {
         close();
         return;
      }
      router.replace(`/dispute/${entryId}?analyze=1`);
   };

   const goToSteps = () => {
      if (!entryId) {
         close();
         return;
      }
      
      router.replace(`/dispute/${entryId}`);
   };

   return (
      <View className="flex-1 bg-transparent">
         <BottomSheetModal
            ref={modalRef}
            snapPoints={snapPoints}
            index={0}
            enablePanDownToClose
            backdropComponent={renderBackdrop}
            handleIndicatorStyle={{ backgroundColor: sheetIndicator }}
            backgroundStyle={{
               backgroundColor: isDark ? '#0f172a' : '#ffffff',
               borderRadius: 24,
            }}
         >
            <BottomSheetView
               style={{
                  paddingHorizontal: 24,
                  paddingTop: 16,
                  paddingBottom: insets.bottom + 20,
               }}
            >
               <View className="flex-row items-start justify-between mb-3">
                  <View className="flex-1 mr-4">
                     <Text className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                        Free plan
                     </Text>
                     <Text className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                        How do you want to dispute?
                     </Text>
                     <Text className="text-base text-slate-600 dark:text-slate-300 mt-1">
                        Choose AI analysis or jump into the guided steps.
                     </Text>
                  </View>
               </View>

               <View className="gap-3">
                  <Pressable
                     onPress={goToAnalyze}
                     className="flex-row items-center justify-between rounded-2xl border border-amber-500 bg-amber-50 dark:bg-amber-500/10 py-4 px-4 active:opacity-90"
                  >
                     <View className="flex-1 pr-3">
                        <Text className="text-lg font-semibold text-amber-700 dark:text-amber-200">
                           Let AI analyze this
                        </Text>
                        <Text className="text-sm text-amber-800/80 dark:text-amber-100/80 mt-1">
                           Get an instant breakdown and suggestions before you
                           dispute.
                        </Text>
                     </View>
                     <Ionicons name="sparkles" size={22} color={iconColor} />
                  </Pressable>

                  <Pressable
                     onPress={goToSteps}
                     className="flex-row items-center justify-between rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 py-4 px-4 active:opacity-90"
                  >
                     <View className="flex-1 pr-3">
                        <Text className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                           Go to dispute steps
                        </Text>
                        <Text className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                           Work through the guided prompts without AI.
                        </Text>
                     </View>
                     <Ionicons
                        name="arrow-forward"
                        size={20}
                        color={iconColor}
                     />
                  </Pressable>
               </View>
            </BottomSheetView>
         </BottomSheetModal>
      </View>
   );
}
