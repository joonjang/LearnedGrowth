import React from 'react';
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
   const count = summary?.entryCount ?? 0;
   const countLabel = count === 1 ? 'Entry' : 'Entries';

   return (
      <View
         className="relative z-10 w-full border-b border-slate-200/80 bg-slate-50/95 dark:border-slate-800/80 dark:bg-slate-900/95"
         style={{ paddingTop }}
      >
         <View className="flex-row items-center justify-between px-5 py-3">
            {/* Left Side: Title & Date */}
            <View className="flex-1 pr-4 gap-0.5">
               <Text className="text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                  {title}
               </Text>
               <Text className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  {rangeLabel}
               </Text>
            </View>

            {/* Right Side: Read-Only Text Stats (No Pill) */}
            {count > 0 && (
               <View className="flex-row items-baseline">
                  <Text className="text-sm font-bold text-slate-600 dark:text-slate-300 mr-1">
                     {count}
                  </Text>
                  <Text className="text-xs font-medium text-slate-400 dark:text-slate-500">
                     {countLabel}
                  </Text>
               </View>
            )}
         </View>
      </View>
   );
}
