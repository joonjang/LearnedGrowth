import { StyleProp, Text, View, ViewStyle } from 'react-native';
import { cx, Day, isFutureDate, toDateKey } from '../../utils';

type StreakCardWeekStripProps = {
   days: Day[];
   todayKey: string;
   dayCircleStyle: StyleProp<ViewStyle>;
};

export function StreakCardWeekStrip({
   days,
   todayKey,
   dayCircleStyle,
}: StreakCardWeekStripProps) {
   return (
      <View className="px-5 pb-4">
         <View className="flex-row justify-between mb-3">
            {days.map((day, idx) => {
               const dayNum = day.date.getDate();
               const dayKey = toDateKey(day.date);
               const isToday = dayKey === todayKey;
               const isFuture = isFutureDate(day.date);

               const labelClass = cx(
                  'text-[10px] font-bold uppercase',
                  isFuture ? 'opacity-30' : 'opacity-100',
                  isToday
                     ? 'text-indigo-600 dark:text-indigo-400'
                     : 'text-slate-400',
               );

               const circleClass = cx(
                  isFuture
                     ? 'bg-transparent border-transparent'
                     : day.filled
                       ? 'bg-indigo-600 border-transparent'
                       : isToday
                         ? 'bg-white dark:bg-slate-800 border-2 border-indigo-500'
                         : 'bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700',
               );

               const dayNumClass = cx(
                  'text-[11px] font-bold',
                  isFuture ? 'opacity-50' : 'opacity-100',
                  day.filled
                     ? 'text-white'
                     : isToday
                       ? 'text-indigo-700 dark:text-indigo-300'
                       : 'text-slate-400 dark:text-slate-600',
               );

               return (
                  <View
                     key={`${day.label}-${idx}`}
                     className="flex-1 items-center gap-1.5"
                  >
                     <Text className={labelClass}>{day.label}</Text>

                     <View
                        className={circleClass}
                        style={[
                           dayCircleStyle,
                           // preserve: future dates have no border width at all
                           isFuture ? { borderWidth: 0 } : null,
                        ]}
                     >
                        <Text className={dayNumClass}>{dayNum}</Text>
                     </View>
                  </View>
               );
            })}
         </View>
      </View>
   );
}
