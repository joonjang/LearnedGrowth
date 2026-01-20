import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  LayoutAnimation,
  StyleSheet,
  useColorScheme,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  DayDetailSheet,
  StreakCardFooter,
  StreakCardHeader,
  StreakCardMonthGrid,
  StreakCardWeekStrip,
} from '@/components/home/streak/streakCardParts';
import {
  buildDayBuckets,
  buildMonthDays,
  buildMonthRows,
  COLORS,
  findWeekRowIndex,
  getEncouragement,
  getSummaryText,
  MONTHS,
  parseDateKey,
  toDateKey,
  type Day,
  type StreakIcon,
} from '@/components/home/streak/streakCardUtils';
import { getShadow } from '@/lib/shadow';
import type { Entry } from '@/models/entry';

type Props = {
  streakCount: number;
  days: Day[];
  icon: StreakIcon;
  shadowSm: any;
  entries: Entry[];
  onDeleteEntry?: (entry: Entry) => void;
};

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

export default function StreakCard({
  streakCount,
  days,
  icon: _icon,
  shadowSm,
  entries,
  onDeleteEntry,
}: Props) {
  const isDark = useColorScheme() === 'dark';
  const [monthAnchor] = useState(() => new Date());
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const sheetRef = useRef<BottomSheetModal>(null as any);
  const { height: windowHeight } = useWindowDimensions();
  const maxSheetHeight = useMemo(() => windowHeight * 0.75, [windowHeight]);

  const today = new Date();
  const dateNum = today.getDate();
  const monthIndex = monthAnchor.getMonth();
  const monthName = MONTHS[monthIndex];
  const currentYear = monthAnchor.getFullYear();
  const todayKey = toDateKey(today);

  const dayBuckets = useMemo(() => buildDayBuckets(entries), [entries]);
  const monthDays = useMemo(
    () => buildMonthDays(currentYear, monthIndex, dayBuckets),
    [currentYear, monthIndex, dayBuckets]
  );
  const monthRows = useMemo(() => buildMonthRows(monthDays), [monthDays]);
  const weekRowIndex = useMemo(
    () => findWeekRowIndex(monthDays, days, todayKey),
    [days, monthDays, todayKey]
  );

  const selectedBucket = useMemo(
    () => (selectedDayKey ? dayBuckets.get(selectedDayKey) ?? null : null),
    [dayBuckets, selectedDayKey]
  );
  const selectedDate = useMemo(
    () => (selectedDayKey ? parseDateKey(selectedDayKey) : null),
    [selectedDayKey]
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
    [selectedDate]
  );

  const completedEntries = selectedBucket?.completed ?? [];
  const incompleteEntries = selectedBucket?.incomplete ?? [];
  const summaryText = useMemo(
    () => getSummaryText(completedEntries.length),
    [completedEntries.length]
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

  const handleDatePress = useCallback((date: Date, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return;
    setSelectedDayKey(toDateKey(date));
    sheetRef.current?.present();
  }, []);

  const handleSheetDismiss = useCallback(() => {}, []);

  const badgeStyle = useMemo(
    () => ({
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
    }),
    [isDark, streakCount]
  );
  const badgeTextStyle = useMemo(
    () => ({
      color:
        streakCount > 0
          ? isDark
            ? COLORS.orange400
            : COLORS.orange700
          : COLORS.slate400,
    }),
    [isDark, streakCount]
  );
  const encouragement = useMemo(() => getEncouragement(streakCount), [streakCount]);

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
    [isDark]
  );
  const dayCircleStyle = styles.dayCircle;

  return (
    <View
      className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700"
      style={[shadowSm.ios, shadowSm.android, isPressed && styles.cardPressed]}
    >
      <StreakCardHeader
        onPress={toggleExpanded}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        isDark={isDark}
        streakCount={streakCount}
        badgeStyle={badgeStyle}
        badgeTextStyle={badgeTextStyle}
        monthName={monthName}
        currentYear={currentYear}
        encouragement={encouragement}
      />

      {!isExpanded ? (
        <StreakCardWeekStrip
          onPress={toggleExpanded}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          days={days}
          dateNum={dateNum}
          isDark={isDark}
          filledShadowStyle={filledShadowStyle}
          dayCircleStyle={dayCircleStyle}
        />
      ) : (
        <StreakCardMonthGrid
          monthRows={monthRows}
          weekRowIndex={weekRowIndex}
          weekDays={days}
          dateNum={dateNum}
          todayKey={todayKey}
          monthIndex={monthIndex}
          isDark={isDark}
          filledShadowStyle={filledShadowStyle}
          dayCircleStyle={dayCircleStyle}
          emptyRing={emptyRing}
          incompleteRing={incompleteRing}
          todayRing={todayRing}
          onDatePress={handleDatePress}
        />
      )}

      <StreakCardFooter
        isExpanded={isExpanded}
        isDark={isDark}
        onToggle={toggleExpanded}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      />

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
    </View>
  );
}
