import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { WeekSummary } from './types';

type Props = {
   title: string;
   rangeLabel: string;
   summary: WeekSummary;
   isDark: boolean;
   paddingTop?: number;
};

export default function SectionHeader({
   title,
   rangeLabel,
   summary,
   isDark,
   paddingTop = 0,
}: Props) {
   const { t } = useTranslation();
   const count = summary?.entryCount ?? 0;
   const countLabel = t('entries.count_label', { count });

   return (
      <View
         className="relative z-10 w-full border-b border-slate-200/80 bg-slate-50/95 dark:border-slate-800/80 dark:bg-slate-900/95"
         style={{ paddingTop }}
      >
         <View className="flex-row items-center justify-between px-5 py-3">
            {/* Left Side: Title & Range */}
            <View className="flex-1 pr-4 gap-0.5">
               <Text className="text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                  {title}
               </Text>
               <Text className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  {rangeLabel}
               </Text>
            </View>

            {/* Right Side: Big Stat Layout */}
            {count > 0 && (
               <View className="flex-row items-baseline">
                  <Text className="text-2xl font-bold text-slate-700 dark:text-slate-200 mr-1.5">
                     {count}
                  </Text>
                  <Text className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                     {countLabel}
                  </Text>
               </View>
            )}
         </View>
      </View>
   );
}
