import { getShadow } from '@/lib/shadow';
import { useColorScheme } from 'nativewind';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

type Props = {
   adversity: string;
   belief: string;
   consequence: string;
};

export default function EntryContextView({
   adversity,
   belief,
   consequence,
}: Props) {
   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';
   const { t } = useTranslation();
   const shadow = useMemo(
      () => getShadow({ isDark, preset: 'sm' }),
      [isDark]
   );
   return (
      <View className="self-stretch" style={{ marginVertical: 4 }}>
         <View className="rounded-xl self-stretch" style={[shadow.ios, shadow.android]}>
            <View className="bg-slate-100 dark:bg-slate-800 p-3 rounded-xl gap-2.5 border border-slate-200 dark:border-slate-700">
                  {/* Adversity */}
               <View className="gap-1">
                  <Text className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                     {t('abcde.adversity')}
                  </Text>
                  <Text className="text-sm text-slate-900 dark:text-slate-100">{adversity}</Text>
               </View>
               
               <View className="h-[1px] bg-slate-200 dark:bg-slate-700 my-0.5" />
               
               {/* Belief */}
               <View className="gap-1">
                  <Text className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                     {t('abcde.belief')}
                  </Text>
                  <Text className="text-sm text-slate-900 dark:text-slate-100">{belief}</Text>
               </View>
               
               {/* Consequence */}
               {/* {consequence && (
                  <>
                     <View className="h-[1px] bg-slate-200 dark:bg-slate-700 my-0.5" />
                     <View className="gap-1">
                        <Text className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                           {t('abcde.consequence')}
                        </Text>
                        <Text className="text-sm text-slate-900 dark:text-slate-100">{consequence}</Text>
                     </View>
                  </>
               )} */}
            </View>
         </View>
      </View>
   );
}
