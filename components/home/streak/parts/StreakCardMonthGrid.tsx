import {
   CalendarDay,
   cx,
   Day,
   DayBucket,
   isFutureDate,
   toDateKey,
} from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { StyleProp, Text, View, ViewStyle } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';

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
   const { t } = useTranslation();
   const weekdayLabels = t('calendar.weekdays_short', {
      returnObjects: true,
   }) as string[];

   const getSeedDotClass = (isFilled: boolean) => {
      if (isFilled) return 'bg-orange-300';
      return 'bg-orange-600 dark:bg-orange-400';
   };

   // Helper to generate styles based on state
   const getDayStyles = (
      isCurrentMonth: boolean,
      isFuture: boolean,
      hasEntries: boolean,
      isFilled: boolean,
      isToday: boolean,
   ) => {
      // 1. HIDDEN (Not current month)
      if (!isCurrentMonth) {
         return {
            circle: 'bg-transparent border-transparent',
            text: 'text-transparent',
         };
      }

      // 2. FUTURE (Lighter text, No background)
      if (isFuture) {
         return {
            circle: 'bg-transparent border-transparent',
            text: 'text-slate-300 dark:text-slate-700',
         };
      }

      // 3. FILLED (Completed) -> Solid Purple
      if (isFilled) {
         return {
            circle: 'bg-indigo-600 border-transparent',
            text: 'text-white font-bold',
         };
      }

      // 4. TODAY (Special Handling - Purple Ring)
      if (isToday) {
         return {
            circle: cx(
               'border-2 border-indigo-500', // Reverted to Purple
               hasEntries
                  ? 'bg-slate-50 dark:bg-slate-800' // Grey BG if Incomplete
                  : 'bg-transparent', // Transparent if Empty
            ),
            text: 'text-indigo-700 dark:text-indigo-300 font-bold',
         };
      }

      // 5. INCOMPLETE (Past, Has Entries) -> Grey BG + Purple Ring
      if (hasEntries) {
         return {
            circle: 'border-2 border-indigo-500',
            text: 'text-slate-700 dark:text-slate-200 font-bold',
         };
      }

      // 6. EMPTY (Past, No Entries) -> Transparent, No Ring
      return {
         circle: 'bg-transparent border-transparent',
         text: 'text-slate-400 dark:text-slate-500 font-medium',
      };
   };

   return (
         <View className="px-5 pb-2">
         {/* Weekday Header */}
         <View className="flex-row justify-between mb-2">
            {weekdayLabels.map((label, idx) => (
               <View key={`${label}-${idx}`} className="flex-1 items-center">
                  <Text className="text-[10px] font-bold uppercase text-slate-400">
                     {label}
                  </Text>
               </View>
            ))}
         </View>

         {/* Calendar Grid */}
         <View className="flex-col">
            {monthRows.map((row, rowIndex) => {
               // --- RENDER ACTIVE WEEK ROW (Special Data Source) ---
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
                           const hasEntries = (bucket?.entries.length ?? 0) > 0;

                           const styles = getDayStyles(
                              isCurrentMonth,
                              isFuture,
                              hasEntries,
                              day.filled,
                              isToday,
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
                                    // Clickable if: Has entries OR is Today
                                    disabled={
                                       !isCurrentMonth ||
                                       isFuture ||
                                       (!hasEntries && !isToday)
                                    }
                                    style={dateCellPressStyle}
                                 >
                                    <View
                                       className={styles.circle}
                                       style={[
                                          dayCircleStyle,
                                          // Ensure border removal for ghost/empty past states (that aren't today)
                                          !isToday &&
                                             (!hasEntries ||
                                                isFuture ||
                                                !isCurrentMonth) && {
                                                borderWidth: 0,
                                             },
                                       ]}
                                    >
                                       {isCurrentMonth && (
                                          <>
                                             <Text
                                                className={`text-[11px] ${styles.text}`}
                                             >
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

               // --- RENDER STANDARD ROWS ---
               return (
                  <View
                     key={`month-row-${row[0]?.key ?? rowIndex}`}
                     className="flex-row justify-between"
                  >
                     {row.map((day) => {
                        const dayNum = day.date.getDate();
                        const isToday = day.key === todayKey;
                        const isFuture = isFutureDate(day.date);

                        const bucket = dayBuckets.get(day.key);
                        const hasIncomplete =
                           (bucket?.incomplete.length ?? 0) > 0;
                        const hasEntries = (bucket?.entries.length ?? 0) > 0;

                        const styles = getDayStyles(
                           day.isCurrentMonth,
                           isFuture,
                           hasEntries,
                           day.hasDisputes,
                           isToday,
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
                                 disabled={
                                    !day.isCurrentMonth ||
                                    isFuture ||
                                    (!hasEntries && !isToday)
                                 }
                                 style={dateCellPressStyle}
                              >
                                 <View
                                    className={styles.circle}
                                    style={[
                                       dayCircleStyle,
                                       !isToday &&
                                          (!hasEntries ||
                                             isFuture ||
                                             !day.isCurrentMonth) && {
                                             borderWidth: 0,
                                          },
                                    ]}
                                 >
                                    {day.isCurrentMonth && (
                                       <>
                                          <Text
                                             className={`text-[11px] ${styles.text}`}
                                          >
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
