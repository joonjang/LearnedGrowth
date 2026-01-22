import { StyleProp, Text, View, ViewStyle } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
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

               const containerClass = cx(
                  'items-center justify-center overflow-hidden', // Clips the fill
                  isFuture
                     ? 'bg-transparent border-transparent'
                     : isToday
                       ? 'bg-white dark:bg-slate-800 border-2 border-indigo-500'
                       : 'bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700',
               );

               const dayNumClass = cx(
                  'text-[11px] font-bold',
                  isFuture ? 'opacity-50' : 'opacity-100',
                  day.filled
                     ? 'text-white' // White text when filled
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
                        className={containerClass}
                        style={[
                           dayCircleStyle,
                           isFuture ? { borderWidth: 0 } : null,
                           // Remove border when filled so the color looks seamless
                           day.filled ? { borderWidth: 0 } : null,
                        ]}
                     >
                        {/* ANIMATED BACKGROUND FILL (Grows from center) */}
                        {day.filled && (
                           <Animated.View
                              entering={FadeIn.duration(400)
                                 .delay(idx * 50)
                                 .springify()}
                              className="absolute w-full h-full bg-indigo-600 rounded-full"
                           />
                        )}

                        {/* TEXT LAYER (Sits on top, does not grow) */}
                        <Text className={dayNumClass}>{dayNum}</Text>
                     </View>
                  </View>
               );
            })}
         </View>
      </View>
   );
}
