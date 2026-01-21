import { WEEKDAY_LABELS } from '@/components/constants';
import { StyleProp, Text, View, ViewStyle } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';
import {
   CalendarDay,
   cx,
   Day,
   DayBucket,
   isFutureDate,
   toDateKey,
} from '../../utils';

const dateCellPressStyle = ({ pressed }: { pressed: boolean }) => ({
   opacity: pressed ? 0.6 : 1,
});

const seedDotBaseStyle: ViewStyle = {
   position: 'absolute',
   bottom: 2,
   width: 4,
   height: 4,
   borderRadius: 2,
};

type StreakCardMonthGridProps = {
   monthRows: CalendarDay[][];
   weekRowIndex: number;
   weekDays: Day[];
   dayBuckets: Map<string, DayBucket>;
   todayKey: string;
   monthIndex: number;
   dayCircleStyle: StyleProp<ViewStyle>;
   onDatePress: (date: Date, isCurrentMonth: boolean) => void;
};

export function StreakCardMonthGrid({
   monthRows,
   weekRowIndex,
   weekDays,
   dayBuckets,
   todayKey,
   monthIndex,
   dayCircleStyle,
   onDatePress,
}: StreakCardMonthGridProps) {
   const getSeedDotClass = (isFilled: boolean) => {
      if (isFilled) return 'bg-orange-300';
      return 'bg-orange-600 dark:bg-orange-400';
   };

   return (
      <View className="px-5 pb-4">
         <View className="flex-row justify-between mb-2">
            {WEEKDAY_LABELS.map((label, idx) => (
               <View key={`${label}-${idx}`} className="flex-1 items-center">
                  <Text className="text-[10px] font-bold uppercase text-slate-400">
                     {label}
                  </Text>
               </View>
            ))}
         </View>

         <View className="flex-col">
            {monthRows.map((row, rowIndex) => {
               // RENDER ACTIVE WEEK ROW
               if (rowIndex === weekRowIndex) {
                  return (
                     <View
                        key={`week-row-${rowIndex}`}
                        className="flex-row justify-between"
                     >
                        {weekDays.map((day, idx) => {
                           const dayNum = day.date.getDate();
                           const dayKey = toDateKey(day.date);
                           const isToday = dayKey === todayKey;
                           const isCurrentMonth =
                              day.date.getMonth() === monthIndex;
                           const isFuture = isFutureDate(day.date);

                           const bucket = dayBuckets.get(dayKey);
                           const hasIncomplete =
                              (bucket?.incomplete.length ?? 0) > 0;

                           const circleClass = cx(
                              // future / outside month
                              (isFuture || !isCurrentMonth) &&
                                 'bg-transparent border-transparent',

                              // filled
                              !isFuture &&
                                 day.filled &&
                                 'bg-indigo-600 border-transparent',

                              // today (not filled)
                              !isFuture &&
                                 !day.filled &&
                                 isToday &&
                                 'bg-white dark:bg-slate-800 border-2 border-indigo-500',

                              // normal (not filled)
                              !isFuture &&
                                 !day.filled &&
                                 !isToday &&
                                 'bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700',
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
                                 className="flex-1 items-center mb-2"
                              >
                                 <Pressable
                                    onPress={() =>
                                       onDatePress(day.date, isCurrentMonth)
                                    }
                                    disabled={!isCurrentMonth || isFuture}
                                    style={dateCellPressStyle}
                                 >
                                    <View
                                       className={circleClass}
                                       style={[
                                          dayCircleStyle,
                                          // preserve: truly no border width for future/outside-month
                                          isFuture || !isCurrentMonth
                                             ? { borderWidth: 0 }
                                             : null,
                                       ]}
                                    >
                                       {isCurrentMonth && (
                                          <>
                                             <Text className={dayNumClass}>
                                                {dayNum}
                                             </Text>

                                             {hasIncomplete && !isFuture && (
                                                <View
                                                   className={getSeedDotClass(
                                                      day.filled,
                                                   )}
                                                   style={seedDotBaseStyle}
                                                />
                                             )}
                                          </>
                                       )}
                                    </View>
                                 </Pressable>
                              </View>
                           );
                        })}
                     </View>
                  );
               }

               // RENDER OTHER ROWS
               return (
                  <View
                     key={`month-row-${row[0]?.key ?? rowIndex}`}
                     className="flex-row justify-between"
                  >
                     {row.map((day) => {
                        const dayNum = day.date.getDate();
                        const isToday = day.key === todayKey;
                        const bucket = dayBuckets.get(day.key);
                        const hasIncomplete =
                           (bucket?.incomplete.length ?? 0) > 0;
                        const isFuture = isFutureDate(day.date);

                        const circleClass = cx(
                           // not current month or future => blank
                           (!day.isCurrentMonth || isFuture) &&
                              'bg-transparent border-transparent',

                           // disputes => purple filled
                           day.isCurrentMonth &&
                              !isFuture &&
                              day.hasDisputes &&
                              'bg-indigo-600 border border-indigo-600',

                           // normal day => empty ring
                           day.isCurrentMonth &&
                              !isFuture &&
                              !day.hasDisputes &&
                              'bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700',

                           // today ring override (only when not disputes)
                           day.isCurrentMonth &&
                              !isFuture &&
                              !day.hasDisputes &&
                              isToday &&
                              'border-2 border-indigo-600 dark:border-indigo-400',
                        );

                        const textClass = cx(
                           'text-[11px] font-bold',
                           isFuture ? 'opacity-50' : 'opacity-100',
                           day.hasDisputes
                              ? 'text-white'
                              : 'text-slate-400 dark:text-slate-600',
                        );

                        return (
                           <View
                              key={day.key}
                              className="flex-1 items-center mb-2"
                           >
                              <Pressable
                                 onPress={() =>
                                    onDatePress(day.date, day.isCurrentMonth)
                                 }
                                 disabled={!day.isCurrentMonth || isFuture}
                                 style={dateCellPressStyle}
                              >
                                 <View
                                    className={circleClass}
                                    style={[
                                       dayCircleStyle,
                                       // preserve: no border width for future/outside month
                                       !day.isCurrentMonth || isFuture
                                          ? { borderWidth: 0 }
                                          : null,
                                    ]}
                                 >
                                    {day.isCurrentMonth && (
                                       <>
                                          <Text className={textClass}>
                                             {dayNum}
                                          </Text>

                                          {hasIncomplete && !isFuture && (
                                             <View
                                                className={getSeedDotClass(
                                                   day.hasDisputes,
                                                )}
                                                style={seedDotBaseStyle}
                                             />
                                          )}
                                       </>
                                    )}
                                 </View>
                              </Pressable>
                           </View>
                        );
                     })}
                  </View>
               );
            })}
         </View>
      </View>
   );
}
