import { CalendarCheck, CalendarDays, Dog, Flame } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { cx } from '../../utils';

type StreakCardHeaderProps = {
   streakCount: number;
   activeCount: number;
   isCurrentWeek: boolean;
   monthName: string;
   currentYear: number;
   encouragement?: string | null;
};

export function StreakCardHeader({
   streakCount,
   activeCount,
   isCurrentWeek,
   monthName,
   currentYear,
   encouragement,
}: StreakCardHeaderProps) {
   const hasStreak = streakCount > 0;

   const badgeClassName = cx(
      'flex-row items-center gap-1.5 px-2.5 py-1 rounded-full border',
      isCurrentWeek
         ? hasStreak
            ? // light orange tint + custom dark RGBA to match your previous look
              'bg-orange-50 border-orange-100 dark:bg-[rgba(124,45,18,0.2)] dark:border-[rgba(124,45,18,0.3)]'
            : 'bg-slate-50 border-slate-100 dark:bg-slate-800 dark:border-slate-700'
         : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700',
   );

   const badgeTextClassName = cx(
      'text-xs font-bold',
      isCurrentWeek
         ? hasStreak
            ? 'text-orange-700 dark:text-orange-400'
            : 'text-slate-400'
         : 'text-indigo-600 dark:text-indigo-300',
   );

   // Icon colors (lucide props)
   const leftIconColor = isCurrentWeek
      ? // Dog icon: light slate in dark, slate-500-ish in light (matches your previous hexes)
        '#64748b' // slate-500
      : '#64748b'; // slate-500

   const leftIconDarkColor = isCurrentWeek
      ? '#cbd5e1' // slate-300
      : '#94a3b8'; // slate-400

   return (
      <View className="px-5 pt-4 pb-2">
         <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-2">
               {isCurrentWeek ? (
                  <Dog
                     size={16}
                     color={leftIconColor}
                     className="dark:hidden"
                  />
               ) : (
                  <CalendarDays
                     size={16}
                     color={leftIconColor}
                     className="dark:hidden"
                  />
               )}

               {/* Dark-mode version of the icon */}
               {isCurrentWeek ? (
                  <Dog
                     size={16}
                     color={leftIconDarkColor}
                     className="hidden dark:flex"
                  />
               ) : (
                  <CalendarDays
                     size={16}
                     color={leftIconDarkColor}
                     className="hidden dark:flex"
                  />
               )}

               <Text className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  {isCurrentWeek ? 'Days of Growth' : 'Weekly Activity'}
               </Text>
            </View>

            <View className={badgeClassName}>
               {isCurrentWeek ? (
                  <Flame
                     size={14}
                     color={hasStreak ? '#f97316' : '#94a3b8'} // orange-500 / slate-400
                     fill={hasStreak ? '#f97316' : 'transparent'}
                  />
               ) : (
                  <CalendarCheck
                     size={14}
                     color={hasStreak ? '#4f46e5' : '#4f46e5'}
                  />
               )}

               <Text className={badgeTextClassName} numberOfLines={1}>
                  {isCurrentWeek
                     ? `${streakCount} Day Streak`
                     : `${activeCount}/7 Days Reframed`}
               </Text>
            </View>
         </View>

         <View className="mb-3 pl-0.5">
            <Text className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
               {monthName} {currentYear}
            </Text>

            {isCurrentWeek && encouragement && (
               <Text className="text-xs font-medium text-slate-600 dark:text-slate-300 italic">
                  {encouragement}
               </Text>
            )}
         </View>
      </View>
   );
}
