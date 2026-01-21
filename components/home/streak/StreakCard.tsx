import {
  BottomSheetModal
} from '@gorhom/bottom-sheet';
import {
  CalendarCheck, // NEW ICON
  CalendarDays,
  Dog,
  Flame
} from 'lucide-react-native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  LayoutAnimation,
  StyleSheet,
  Text,
  useColorScheme,
  useWindowDimensions,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Pressable } from 'react-native-gesture-handler';

import {
  DayDetailSheet,
  StreakCardFooter,
} from '@/components/home/streak/streakCardParts';
import {
  buildDayBuckets,
  buildMonthDays,
  buildMonthRows,
  COLORS,
  findWeekRowIndex,
  getEncouragement,
  getSummaryText,
  isFutureDate,
  MONTHS,
  parseDateKey,
  toDateKey,
  WEEKDAY_LABELS,
  type CalendarDay,
  type Day,
  type DayBucket,
  type StreakIcon,
} from '@/components/home/streak/streakCardUtils';
import { getShadow } from '@/lib/shadow';
import type { Entry } from '@/models/entry';

const styles = StyleSheet.create({
   cardPressed: {
      transform: [{ scale: 0.985 }],
   },
   dayCircle: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
   },
});

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

// --- 1. WEEK STRIP ---
type StreakCardWeekStripProps = {
   days: Day[];
   todayKey: string;
   isDark: boolean;
   filledShadowStyle?: StyleProp<ViewStyle>;
   dayCircleStyle: StyleProp<ViewStyle>;
};

function StreakCardWeekStrip({
   days,
   todayKey,
   isDark,
   filledShadowStyle,
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

               return (
                  <View
                     key={`${day.label}-${idx}`}
                     className="flex-1 items-center gap-1.5"
                  >
                     <Text
                        className="text-[10px] font-bold uppercase"
                        style={{
                           color: isToday
                              ? isDark
                                 ? COLORS.indigo400
                                 : COLORS.indigo600
                              : COLORS.slate400,
                           opacity: isFuture ? 0.3 : 1,
                        }}
                     >
                        {day.label}
                     </Text>
                     <View
                        style={[
                           dayCircleStyle,
                           isFuture
                              ? {
                                   backgroundColor: 'transparent',
                                   borderColor: 'transparent',
                                   borderWidth: 0,
                                }
                              : day.filled
                                ? { backgroundColor: COLORS.indigo600 }
                                : isToday
                                  ? {
                                       backgroundColor: isDark
                                          ? COLORS.slate800
                                          : COLORS.white,
                                       borderColor: COLORS.indigo500,
                                       borderWidth: 2,
                                    }
                                  : {
                                       backgroundColor: isDark
                                          ? COLORS.slate800
                                          : COLORS.slate50,
                                       borderColor: isDark
                                          ? COLORS.slate700
                                          : COLORS.slate100,
                                       borderWidth: 1,
                                    },
                           day.filled && !isDark ? filledShadowStyle : null,
                        ]}
                     >
                        <Text
                           className="text-[11px] font-bold"
                           style={{
                              color: day.filled
                                 ? COLORS.white
                                 : isToday
                                   ? isDark
                                      ? COLORS.indigo300
                                      : COLORS.indigo700
                                   : isDark
                                     ? COLORS.slate600
                                     : COLORS.slate400,
                              opacity: isFuture ? 0.5 : 1,
                           }}
                        >
                           {dayNum}
                        </Text>
                     </View>
                  </View>
               );
            })}
         </View>
      </View>
   );
}

// --- 2. MONTH GRID ---
type StreakCardMonthGridProps = {
   monthRows: CalendarDay[][];
   weekRowIndex: number;
   weekDays: Day[];
   dayBuckets: Map<string, DayBucket>;
   todayKey: string;
   monthIndex: number;
   isDark: boolean;
   filledShadowStyle?: StyleProp<ViewStyle>;
   dayCircleStyle: StyleProp<ViewStyle>;
   emptyRing: string;
   todayRing: string;
   onDatePress: (date: Date, isCurrentMonth: boolean) => void;
};

function StreakCardMonthGrid({
   monthRows,
   weekRowIndex,
   weekDays,
   dayBuckets,
   todayKey,
   monthIndex,
   isDark,
   filledShadowStyle,
   dayCircleStyle,
   emptyRing,
   todayRing,
   onDatePress,
}: StreakCardMonthGridProps) {
   const getSeedDotColor = (isFilled: boolean) => {
      if (isFilled) return COLORS.orange300;
      return isDark ? COLORS.orange400 : COLORS.orange600;
   };

   return (
      <View className="px-5 pb-4">
         <View className="flex-row justify-between mb-2">
            {WEEKDAY_LABELS.map((label, idx) => (
               <View key={`${label}-${idx}`} className="flex-1 items-center">
                  <Text
                     className="text-[10px] font-bold uppercase"
                     style={{ color: COLORS.slate400 }}
                  >
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
                                       style={[
                                          dayCircleStyle,
                                          isFuture
                                             ? {
                                                  backgroundColor:
                                                     'transparent',
                                                  borderColor: 'transparent',
                                                  borderWidth: 0,
                                               }
                                             : day.filled
                                               ? {
                                                    backgroundColor:
                                                       COLORS.indigo600,
                                                 }
                                               : isToday
                                                 ? {
                                                      backgroundColor: isDark
                                                         ? COLORS.slate800
                                                         : COLORS.white,
                                                      borderColor:
                                                         COLORS.indigo500,
                                                      borderWidth: 2,
                                                   }
                                                 : {
                                                      backgroundColor: isDark
                                                         ? COLORS.slate800
                                                         : COLORS.slate50,
                                                      borderColor: isDark
                                                         ? COLORS.slate700
                                                         : COLORS.slate100,
                                                      borderWidth: 1,
                                                   },
                                          day.filled && !isDark
                                             ? filledShadowStyle
                                             : null,
                                          !isCurrentMonth && {
                                             backgroundColor: 'transparent',
                                             borderWidth: 0,
                                          },
                                       ]}
                                    >
                                       {isCurrentMonth && (
                                          <>
                                             <Text
                                                className="text-[11px] font-bold"
                                                style={{
                                                   color: day.filled
                                                      ? COLORS.white
                                                      : isToday
                                                        ? isDark
                                                           ? COLORS.indigo300
                                                           : COLORS.indigo700
                                                        : isDark
                                                          ? COLORS.slate600
                                                          : COLORS.slate400,
                                                   opacity: isFuture ? 0.5 : 1,
                                                }}
                                             >
                                                {dayNum}
                                             </Text>
                                             {hasIncomplete && !isFuture && (
                                                <View
                                                   style={[
                                                      seedDotBaseStyle,
                                                      {
                                                         backgroundColor:
                                                            getSeedDotColor(
                                                               day.filled,
                                                            ),
                                                      },
                                                   ]}
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

                        let circleStyle: ViewStyle = {
                           backgroundColor: isDark
                              ? COLORS.slate800
                              : COLORS.slate50,
                           borderColor: emptyRing,
                           borderWidth: 1,
                        };
                        let textColor = isDark
                           ? COLORS.slate600
                           : COLORS.slate400;

                        if (day.hasDisputes) {
                           // REMOVED HEATMAP LOGIC
                           // Now just uses single purple color
                           circleStyle = {
                              backgroundColor: COLORS.indigo600,
                              borderColor: COLORS.indigo600,
                              borderWidth: 1,
                           };
                           textColor = COLORS.white;
                        }
                        if (isToday && !day.hasDisputes) {
                           circleStyle = {
                              ...circleStyle,
                              borderColor: todayRing,
                              borderWidth: 2,
                           };
                        }

                        if (isFuture) {
                           circleStyle = {
                              backgroundColor: 'transparent',
                              borderColor: 'transparent',
                              borderWidth: 0,
                           };
                           textColor = isDark
                              ? COLORS.slate600
                              : COLORS.slate400;
                        }

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
                                    style={[
                                       dayCircleStyle,
                                       circleStyle,
                                       day.hasDisputes && !isDark
                                          ? filledShadowStyle
                                          : null,
                                       !day.isCurrentMonth && {
                                          backgroundColor: 'transparent',
                                          borderWidth: 0,
                                          borderColor: 'transparent',
                                       },
                                    ]}
                                 >
                                    {day.isCurrentMonth && (
                                       <>
                                          <Text
                                             className="text-[11px] font-bold"
                                             style={{
                                                color: textColor,
                                                opacity: isFuture ? 0.5 : 1,
                                             }}
                                          >
                                             {dayNum}
                                          </Text>
                                          {hasIncomplete && !isFuture && (
                                             <View
                                                style={[
                                                   seedDotBaseStyle,
                                                   {
                                                      backgroundColor:
                                                         getSeedDotColor(
                                                            day.hasDisputes,
                                                         ),
                                                   },
                                                ]}
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

// --- HEADER ---
function StreakCardHeader({
   isDark,
   streakCount,
   activeCount,
   isCurrentWeek,
   badgeStyle,
   badgeTextStyle,
   monthName,
   currentYear,
   encouragement,
}: {
   isDark: boolean;
   streakCount: number;
   activeCount: number;
   isCurrentWeek: boolean;
   badgeStyle: StyleProp<ViewStyle>;
   badgeTextStyle: StyleProp<TextStyle>;
   monthName: string;
   currentYear: number;
   encouragement?: string | null;
}) {
   return (
      <View className="px-5 pt-4 pb-2">
         <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-2">
               {isCurrentWeek ? (
                  <Dog size={16} color={isDark ? '#cbd5e1' : '#64748b'} />
               ) : (
                  <CalendarDays
                     size={16}
                     color={isDark ? '#94a3b8' : '#64748b'}
                  />
               )}
               <Text className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  {isCurrentWeek ? 'Days of Growth' : 'Weekly Activity'}
               </Text>
            </View>

            <View
               className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-full border"
               style={badgeStyle}
            >
               {isCurrentWeek ? (
                  <Flame
                     size={14}
                     color={streakCount > 0 ? '#f97316' : '#94a3b8'}
                     fill={streakCount > 0 ? '#f97316' : 'transparent'}
                  />
               ) : (
                  <CalendarCheck // CHANGED ICON
                     size={14}
                     color={isDark ? '#818cf8' : '#4f46e5'}
                  />
               )}
               <Text
                  className="text-xs font-bold"
                  numberOfLines={1}
                  style={badgeTextStyle}
               >
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

// --- MAIN COMPONENT ---
type Props = {
   streakCount: number;
   days: Day[];
   icon: StreakIcon;
   shadowSm: any;
   entries: Entry[];
   anchorDate?: Date;
   showEncouragement?: boolean;
   onDeleteEntry?: (entry: Entry) => void;
};

export default function StreakCard({
   streakCount,
   days,
   icon: _icon,
   shadowSm,
   entries,
   anchorDate,
   showEncouragement = true,
   onDeleteEntry,
}: Props) {
   const isDark = useColorScheme() === 'dark';
   const [isExpanded, setIsExpanded] = useState(false);
   const [isPressed, setIsPressed] = useState(false);
   const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
   const sheetRef = useRef<BottomSheetModal>(null as any);
   const { height: windowHeight } = useWindowDimensions();
   const maxSheetHeight = useMemo(() => windowHeight * 0.75, [windowHeight]);

   const isCurrentWeek = showEncouragement;
   const activeCount = useMemo(
      () => days.filter((d) => d.filled).length,
      [days],
   );

   const referenceDate = useMemo(
      () => (anchorDate ? new Date(anchorDate) : new Date()),
      [anchorDate],
   );

   const realToday = useMemo(() => new Date(), []);
   const realTodayKey = toDateKey(realToday);

   const monthIndex = referenceDate.getMonth();
   const monthName = MONTHS[monthIndex];
   const currentYear = referenceDate.getFullYear();
   const referenceKey = toDateKey(referenceDate);

   const dayBuckets = useMemo(() => buildDayBuckets(entries), [entries]);
   const monthDays = useMemo(
      () => buildMonthDays(currentYear, monthIndex, dayBuckets),
      [currentYear, monthIndex, dayBuckets],
   );
   const monthRows = useMemo(() => buildMonthRows(monthDays), [monthDays]);

   const weekRowIndex = useMemo(
      () => findWeekRowIndex(monthDays, days, referenceKey),
      [days, monthDays, referenceKey],
   );

   const selectedBucket = useMemo(
      () => (selectedDayKey ? (dayBuckets.get(selectedDayKey) ?? null) : null),
      [dayBuckets, selectedDayKey],
   );
   const selectedDate = useMemo(
      () => (selectedDayKey ? parseDateKey(selectedDayKey) : null),
      [selectedDayKey],
   );
   const selectedDateLabel = useMemo(
      () =>
         selectedDate
            ? selectedDate.toLocaleDateString('en-US', {
                 weekday: 'long',
                 month: 'short',
                 day: 'numeric',
              })
            : '',
      [selectedDate],
   );

   const completedEntries = selectedBucket?.completed ?? [];
   const incompleteEntries = selectedBucket?.incomplete ?? [];
   const summaryText = useMemo(
      () => getSummaryText(completedEntries.length),
      [completedEntries.length],
   );

   const toggleExpanded = useCallback(() => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setIsExpanded((prev) => !prev);
   }, []);

   const handlePressIn = useCallback(() => {
      setIsPressed(true);
   }, []);

   const handlePressOut = useCallback(() => {
      setIsPressed(false);
   }, []);

   const handleDatePress = useCallback(
      (date: Date, isCurrentMonth: boolean) => {
         if (!isCurrentMonth) return;
         setSelectedDayKey(toDateKey(date));
         sheetRef.current?.present();
      },
      [],
   );

   const handleSheetDismiss = useCallback(() => {}, []);

   const badgeStyle = useMemo(() => {
      if (isCurrentWeek) {
         return {
            backgroundColor:
               streakCount > 0
                  ? isDark
                     ? 'rgba(124, 45, 18, 0.2)'
                     : COLORS.orange50
                  : isDark
                    ? COLORS.slate800
                    : COLORS.slate50,
            borderColor:
               streakCount > 0
                  ? isDark
                     ? 'rgba(124, 45, 18, 0.3)'
                     : COLORS.orange100
                  : isDark
                    ? COLORS.slate700
                    : COLORS.slate100,
         };
      } else {
         return {
            backgroundColor: isDark ? COLORS.slate800 : COLORS.slate50,
            borderColor: isDark ? COLORS.slate700 : COLORS.slate200,
         };
      }
   }, [isCurrentWeek, isDark, streakCount]);

   const badgeTextStyle = useMemo(() => {
      if (isCurrentWeek) {
         return {
            color:
               streakCount > 0
                  ? isDark
                     ? COLORS.orange400
                     : COLORS.orange700
                  : COLORS.slate400,
         };
      } else {
         return {
            color: isDark ? COLORS.indigo300 : COLORS.indigo600,
         };
      }
   }, [isCurrentWeek, isDark, streakCount]);

   const encouragement = useMemo(
      () => (isCurrentWeek ? getEncouragement(streakCount) : null),
      [isCurrentWeek, streakCount],
   );

   const incompleteRing = isDark ? COLORS.orange400 : COLORS.orange700;
   const emptyRing = isDark ? COLORS.slate700 : COLORS.slate100;
   const todayRing = isDark ? COLORS.indigo400 : COLORS.indigo600;
   const filledShadowStyle = useMemo(
      () =>
         getShadow({
            isDark,
            preset: 'sm',
            colorLight: COLORS.indigo200,
            androidElevation: 0,
         }).style,
      [isDark],
   );
   const dayCircleStyle = styles.dayCircle;

   return (
      <>
         <Pressable
            onPress={toggleExpanded}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
         >
            <View
               className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700"
               style={[
                  shadowSm.ios,
                  shadowSm.android,
                  isPressed && styles.cardPressed,
               ]}
            >
               <StreakCardHeader
                  isDark={isDark}
                  streakCount={streakCount}
                  activeCount={activeCount}
                  isCurrentWeek={isCurrentWeek}
                  badgeStyle={badgeStyle}
                  badgeTextStyle={badgeTextStyle}
                  monthName={monthName}
                  currentYear={currentYear}
                  encouragement={encouragement}
               />

               {!isExpanded ? (
                  <StreakCardWeekStrip
                     days={days}
                     todayKey={realTodayKey}
                     isDark={isDark}
                     filledShadowStyle={filledShadowStyle}
                     dayCircleStyle={dayCircleStyle}
                  />
               ) : (
                  <StreakCardMonthGrid
                     monthRows={monthRows}
                     weekRowIndex={weekRowIndex}
                     weekDays={days}
                     dayBuckets={dayBuckets}
                     todayKey={realTodayKey}
                     monthIndex={monthIndex}
                     isDark={isDark}
                     filledShadowStyle={filledShadowStyle}
                     dayCircleStyle={dayCircleStyle}
                     emptyRing={emptyRing}
                     todayRing={todayRing}
                     onDatePress={handleDatePress}
                  />
               )}

               <StreakCardFooter isExpanded={isExpanded} isDark={isDark} />
            </View>
         </Pressable>

         <DayDetailSheet
            sheetRef={sheetRef}
            onDismiss={handleSheetDismiss}
            isDark={isDark}
            maxSheetHeight={maxSheetHeight}
            selectedDateLabel={selectedDateLabel}
            summaryText={summaryText}
            incompleteEntries={incompleteEntries}
            completedEntries={completedEntries}
            onDeleteEntry={onDeleteEntry}
         />
      </>
   );
}
