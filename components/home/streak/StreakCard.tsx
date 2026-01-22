import { BottomSheetModal } from '@gorhom/bottom-sheet';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
   LayoutAnimation,
   Pressable,
   StyleSheet,
   useColorScheme,
   useWindowDimensions,
   View,
} from 'react-native';

import { MONTHS } from '@/components/constants';
import type { Entry } from '@/models/entry';
import { StreakViewModel } from '../types';
import {
   buildMonthDays,
   buildMonthRows,
   CARD_PRESS_STYLE,
   findWeekRowIndex,
   getEncouragement,
   getSummaryText,
   parseDateKey,
   toDateKey,
} from '../utils';
import { DayDetailSheet } from './parts/DayDetailSheet';
import { StreakCardFooter } from './parts/StreakCardFooter';
import { StreakCardHeader } from './parts/StreakCardHeader';
import { StreakCardMonthGrid } from './parts/StreakCardMonthGrid';
import { StreakCardWeekStrip } from './parts/StreakCardWeekStrip';

const styles = StyleSheet.create({
   dayCircle: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
   },
});

type Props = {
   data: StreakViewModel;
   shadowSm: any;
   anchorDate?: Date;
   showEncouragement?: boolean;
   onDeleteEntry?: (entry: Entry) => void;
   isLoading?: boolean; // <--- New Prop
};

export default function StreakCard({
   data,
   shadowSm,
   anchorDate,
   showEncouragement = true,
   onDeleteEntry,
   isLoading = false, // <--- Default false
}: Props) {
   const { streakCount, days, dayBuckets, activeCount } = data;
   const isDark = useColorScheme() === 'dark';
   const [isExpanded, setIsExpanded] = useState(false);
   const [isPressed, setIsPressed] = useState(false);
   const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
   const sheetRef = useRef<BottomSheetModal>(null as any);
   const { height: windowHeight } = useWindowDimensions();
   const maxSheetHeight = useMemo(() => windowHeight * 0.75, [windowHeight]);

   const isCurrentWeek = showEncouragement;

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

   const encouragement = useMemo(
      () => (isCurrentWeek ? getEncouragement(streakCount) : null),
      [isCurrentWeek, streakCount],
   );

   const dayCircleStyle = styles.dayCircle;

   return (
      <>
         <Pressable
            disabled={isExpanded}
            onPress={toggleExpanded}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
         >
            <View
               className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700"
               style={[
                  shadowSm.ios,
                  shadowSm.android,
                  !isExpanded && isPressed && CARD_PRESS_STYLE.cardPressed,
               ]}
            >
               <Pressable disabled={!isExpanded} onPress={toggleExpanded}>
                  <StreakCardHeader
                     streakCount={streakCount}
                     activeCount={activeCount}
                     isCurrentWeek={isCurrentWeek}
                     monthName={monthName}
                     currentYear={currentYear}
                     encouragement={encouragement}
                     isDark={isDark}
                     isLoading={isLoading} // <--- Pass Loading State
                  />
               </Pressable>

               {!isExpanded ? (
                  <StreakCardWeekStrip
                     days={days}
                     todayKey={realTodayKey}
                     dayCircleStyle={dayCircleStyle}
                  />
               ) : (
                  <View>
                     <StreakCardMonthGrid
                        monthRows={monthRows}
                        weekRowIndex={weekRowIndex}
                        weekDays={days}
                        dayBuckets={dayBuckets}
                        todayKey={realTodayKey}
                        monthIndex={monthIndex}
                        dayCircleStyle={dayCircleStyle}
                        onDatePress={handleDatePress}
                     />
                  </View>
               )}

               <Pressable onPress={toggleExpanded}>
                  <StreakCardFooter isExpanded={isExpanded} isDark={isDark} />
               </Pressable>
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
