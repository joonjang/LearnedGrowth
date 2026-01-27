import { CHEVRON_ICON_DARK, CHEVRON_ICON_LIGHT } from '@/lib/styles';
import { ChevronDown, ChevronUp, Pointer } from 'lucide-react-native';
import { Text, View } from 'react-native';

type StreakCardFooterProps = {
   isExpanded: boolean;
   isDark: boolean;
};

export function StreakCardFooter({
   isExpanded,
   isDark,
}: StreakCardFooterProps) {
   const chevronColor = isDark ? CHEVRON_ICON_DARK : CHEVRON_ICON_LIGHT;

   return (
      <>
         {/* NEW helper line */}
         {isExpanded && (
            <View className="mx-5 mb-2 flex-row items-center justify-center gap-2 opacity-80">
               <Pointer size={14} color={chevronColor} />
               <Text className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                  Tap a day for details
               </Text>
            </View>
         )}

         {/* existing legend */}
         <View className="mx-5 mb-3 flex-row items-center justify-center gap-2 opacity-80 pt-2 border-t border-slate-100 dark:border-slate-800/50">
            <View className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
            <Text className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
               Tracks days with a{' '}
               <Text className="font-bold text-indigo-600 dark:text-indigo-400">
                  completed reframe
               </Text>
            </Text>
         </View>

         <View className="items-center pb-1 -mt-1 w-full">
            {isExpanded ? (
               <ChevronUp size={16} color={chevronColor} />
            ) : (
               <ChevronDown size={16} color={chevronColor} />
            )}
         </View>
      </>
   );
}
