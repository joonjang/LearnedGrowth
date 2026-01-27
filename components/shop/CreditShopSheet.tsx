import CreditShop from '@/components/shop/CreditShop';
import {
   bottomSheetBackgroundStyle,
   bottomSheetHandleIndicatorStyle,
} from '@/components/utils/bottomSheetStyles';
import {
   BOTTOM_SHEET_BACKDROP_OPACITY,
   BOTTOM_SHEET_BG_DARK,
   BOTTOM_SHEET_BG_LIGHT,
   BOTTOM_SHEET_CONTENT_PADDING,
} from '@/lib/styles';
import {
   BottomSheetBackdrop,
   BottomSheetBackdropProps,
   BottomSheetModal,
   BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import type { RefObject } from 'react';
import { useCallback } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
   sheetRef: RefObject<BottomSheetModal | null>;
   onDismiss: () => void;
   onSuccess: () => Promise<void>;
   isDark: boolean;
};

export function AiInsightCreditShopSheet({
   sheetRef,
   onDismiss,
   onSuccess,
   isDark,
}: Props) {
   const insets = useSafeAreaInsets();
   const theme = {
      bg: isDark ? BOTTOM_SHEET_BG_DARK : BOTTOM_SHEET_BG_LIGHT,
      text: isDark ? '#f8fafc' : '#0f172a',
      subText: isDark ? '#cbd5e1' : '#64748b',
   };

   const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
         <BottomSheetBackdrop
            {...props}
            appearsOnIndex={0}
            disappearsOnIndex={-1}
            opacity={BOTTOM_SHEET_BACKDROP_OPACITY}
            pressBehavior="close"
         />
      ),
      [],
   );

   return (
      <BottomSheetModal
         ref={sheetRef}
         onDismiss={onDismiss}
         index={0}
         enableDynamicSizing
         enablePanDownToClose
         handleIndicatorStyle={bottomSheetHandleIndicatorStyle(isDark)}
         backdropComponent={renderBackdrop}
         backgroundStyle={bottomSheetBackgroundStyle(isDark, theme.bg)}
      >
         <BottomSheetScrollView
            contentContainerStyle={{
               paddingHorizontal: BOTTOM_SHEET_CONTENT_PADDING,
               paddingTop: 12,
               paddingBottom: insets.bottom + 20,
            }}
            keyboardShouldPersistTaps="handled"
         >
            <View className="mb-4">
               <Text className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-1">
                  Credits
               </Text>
               <View className="flex-row items-center justify-between">
                  <Text
                     className="text-2xl font-bold"
                     style={{ color: theme.text }}
                  >
                     Refill AI credits
                  </Text>
               </View>
               <Text className="text-base" style={{ color: theme.subText }}>
                  Refill your credits to analyze more entries instantly.
               </Text>
            </View>
            <CreditShop onSuccess={onSuccess} />
         </BottomSheetScrollView>
      </BottomSheetModal>
   );
}
