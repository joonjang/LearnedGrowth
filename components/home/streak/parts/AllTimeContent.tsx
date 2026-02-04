import { Infinity } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

export const AllTimeContent = ({
   totalEntries,
   monthStreak,
   isDark,
   isLoading,
}: {
   totalEntries: number;
   monthStreak: number;
   isDark: boolean;
   isLoading: boolean;
}) => {
   const { t } = useTranslation();
   const textColor = isDark ? 'text-slate-100' : 'text-slate-900';
   const labelColor = 'text-slate-400 dark:text-slate-500';

   if (isLoading) {
      return (
         <View className="p-5">
            <View className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
            <View className="h-12 w-full bg-slate-100 dark:bg-slate-800 rounded-xl" />
         </View>
      );
   }

   return (
      <View className="p-5 flex-row justify-between min-h-[110px]">
         {/* LEFT SECTION: Streak & Journey Visual */}
         <View className="flex-1 justify-between py-1">
            <View>
               <View className="flex-row items-center gap-2 mb-1">
                  <Infinity size={16} color={isDark ? '#cbd5e1' : '#64748b'} />
                  <Text className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                     {t('home.streak.all_time')}
                  </Text>
               </View>
               <Text className={`text-[10px] font-medium ${labelColor}`}>
                  {t('home.streak.rewiring')}
               </Text>
            </View>

            {/* Visual: The Journey Line */}
            <View className="mt-5 ">
               {/* Background Track Line */}
               <View className="h-[1px] w-4/5 bg-slate-100 dark:bg-slate-700 absolute top-2 left-0" />

               <View className="flex-row gap-3">
                  {[...Array(5)].map((_, i) => (
                     <View
                        key={i}
                        className={`w-4 h-4 rounded-full border-2 ${
                           i < monthStreak
                              ? 'bg-indigo-500 border-indigo-500'
                              : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'
                        }`}
                     />
                  ))}
               </View>

               <View className="flex-row items-baseline gap-1 mt-3">
                  <Text className={`text-sm font-black ${textColor}`}>
                     {monthStreak}
                  </Text>
                  <Text
                     className={`text-[9px] font-bold uppercase tracking-tighter ${labelColor}`}
                  >
                     {t('home.streak.month_streak')}
                  </Text>
               </View>
            </View>
         </View>

         {/* RIGHT SECTION: Vertical Hero Typography */}
         <View className="items-end justify-center pl-6 border-l border-slate-50 dark:border-slate-700/50">
            <Text
               className={`font-black ${textColor} tracking-tighter`}
               style={{ fontSize: 56, lineHeight: 56 }}
            >
               {totalEntries}
            </Text>
            <Text
               className={`text-[10px] font-bold uppercase tracking-[4px] ${labelColor} mr-1`}
            >
               {t('home.streak.entries')}
            </Text>
         </View>
      </View>
   );
};
