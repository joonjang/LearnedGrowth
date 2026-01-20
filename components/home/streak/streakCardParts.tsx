import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { AlertCircle, Check, ChevronDown, ChevronUp, Dog, Flame } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Pressable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BOTTOM_SHEET_BG_DARK,
  BOTTOM_SHEET_BG_LIGHT,
  bottomSheetBackgroundStyle,
  bottomSheetHandleIndicatorStyle,
} from '@/components/bottomSheetStyles';
import {
  BOTTOM_SHEET_BACKDROP_OPACITY,
  BOTTOM_SHEET_CONTENT_PADDING,
} from '@/components/constants';
import EntryCard from '@/components/entries/entry/EntryCard';
import {
  COLORS,
  WEEKDAY_LABELS,
  isFutureDate,
  type CalendarDay,
  type Day,
} from '@/components/home/streak/streakCardUtils';
import type { Entry } from '@/models/entry';

const dateCellPressStyle = ({ pressed }: { pressed: boolean }) => ({
  opacity: pressed ? 0.6 : 1,
});

type StreakCardHeaderProps = {
  onPress: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  isDark: boolean;
  streakCount: number;
  badgeStyle: StyleProp<ViewStyle>;
  badgeTextStyle: StyleProp<TextStyle>;
  monthName: string;
  currentYear: number;
  encouragement: string;
};

type StreakCardWeekStripProps = {
  onPress: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  days: Day[];
  dateNum: number;
  isDark: boolean;
  filledShadowStyle?: StyleProp<ViewStyle>;
  dayCircleStyle: StyleProp<ViewStyle>;
};

type StreakCardMonthGridProps = {
  monthRows: CalendarDay[][];
  weekRowIndex: number;
  weekDays: Day[];
  dateNum: number;
  todayKey: string;
  monthIndex: number;
  isDark: boolean;
  filledShadowStyle?: StyleProp<ViewStyle>;
  dayCircleStyle: StyleProp<ViewStyle>;
  emptyRing: string;
  incompleteRing: string;
  todayRing: string;
  onDatePress: (date: Date, isCurrentMonth: boolean) => void;
};

type StreakCardFooterProps = {
  isExpanded: boolean;
  isDark: boolean;
  onToggle: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
};

type DayDetailSheetProps = {
  sheetRef: React.RefObject<BottomSheetModal>;
  onDismiss: () => void;
  isDark: boolean;
  maxSheetHeight: number;
  selectedDateLabel: string;
  summaryText: string;
  incompleteEntries: Entry[];
  completedEntries: Entry[];
  onDeleteEntry?: (entry: Entry) => void;
};

const getDisputeFillColor = (disputeCount: number) => {
  if (disputeCount >= 3) return COLORS.indigo700;
  if (disputeCount === 2) return COLORS.indigo500;
  return COLORS.indigo400;
};

export function StreakCardHeader({
  onPress,
  onPressIn,
  onPressOut,
  isDark,
  streakCount,
  badgeStyle,
  badgeTextStyle,
  monthName,
  currentYear,
  encouragement,
}: StreakCardHeaderProps) {
  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
      <View className="px-5 pt-4 pb-2">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center gap-2">
            <Dog size={16} color={isDark ? '#cbd5e1' : '#64748b'} />
            <Text className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Days of Growth
            </Text>
          </View>
          <View
            className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-full border"
            style={badgeStyle}
          >
            <Flame
              size={14}
              color={streakCount > 0 ? '#f97316' : '#94a3b8'}
              fill={streakCount > 0 ? '#f97316' : 'transparent'}
            />
            <Text className="text-xs font-bold" numberOfLines={1} style={badgeTextStyle}>
              {streakCount} Day Streak
            </Text>
          </View>
        </View>

        <View className="mb-3 pl-0.5">
          <Text className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
            {monthName} {currentYear}
          </Text>
          <Text className="text-xs font-medium text-slate-600 dark:text-slate-300 italic">
            {encouragement}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export function StreakCardWeekStrip({
  onPress,
  onPressIn,
  onPressOut,
  days,
  dateNum,
  isDark,
  filledShadowStyle,
  dayCircleStyle,
}: StreakCardWeekStripProps) {
  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
      <View className="px-5 pb-4">
        <View className="flex-row justify-between mb-3">
          {days.map((day, idx) => {
            const dayNum = day.date.getDate();
            const isToday = dayNum === dateNum;
            const isFuture = isFutureDate(day.date);

            return (
              <View key={`${day.label}-${idx}`} className="flex-1 items-center gap-1.5">
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
                          backgroundColor: isDark ? COLORS.slate800 : COLORS.white,
                          borderColor: COLORS.indigo500,
                          borderWidth: 2,
                        }
                      : {
                          backgroundColor: isDark ? COLORS.slate800 : COLORS.slate50,
                          borderColor: isDark ? COLORS.slate700 : COLORS.slate100,
                          borderWidth: 1,
                        },
                    day.filled && !isDark ? filledShadowStyle : null,
                  ]}
                >
                  {day.filled && !isFuture && (
                    <Check size={14} color="white" strokeWidth={3} />
                  )}
                  {!day.filled && (
                    <Text
                      className="text-[11px] font-bold"
                      style={{
                        color: isToday
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
                    )}
                  </View>
              </View>
            );
          })}
        </View>
      </View>
    </Pressable>
  );
}

export function StreakCardMonthGrid({
  monthRows,
  weekRowIndex,
  weekDays,
  dateNum,
  todayKey,
  monthIndex,
  isDark,
  filledShadowStyle,
  dayCircleStyle,
  emptyRing,
  incompleteRing,
  todayRing,
  onDatePress,
}: StreakCardMonthGridProps) {
  return (
    <View className="px-5 pb-4">
      <View className="flex-row justify-between mb-2">
        {WEEKDAY_LABELS.map((label, idx) => (
          <View key={`${label}-${idx}`} className="flex-1 items-center">
            <Text className="text-[10px] font-bold uppercase" style={{ color: COLORS.slate400 }}>
              {label}
            </Text>
          </View>
        ))}
      </View>

      <View className="flex-col">
        {monthRows.map((row, rowIndex) => {
          if (rowIndex === weekRowIndex) {
            return (
              <View key={`week-row-${rowIndex}`} className="flex-row justify-between">
                {weekDays.map((day, idx) => {
                  const dayNum = day.date.getDate();
                  const isToday = dayNum === dateNum;
                  const isCurrentMonth = day.date.getMonth() === monthIndex;
                  const isFuture = isFutureDate(day.date);

                  return (
                    <View key={`${day.label}-${idx}`} className="flex-1 items-center mb-2">
                      <Pressable
                        onPress={() => onDatePress(day.date, isCurrentMonth)}
                        disabled={!isCurrentMonth || isFuture}
                        style={dateCellPressStyle}
                      >
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
                                  backgroundColor: isDark ? COLORS.slate800 : COLORS.white,
                                  borderColor: COLORS.indigo500,
                                  borderWidth: 2,
                                }
                              : {
                                  backgroundColor: isDark ? COLORS.slate800 : COLORS.slate50,
                                  borderColor: isDark ? COLORS.slate700 : COLORS.slate100,
                                  borderWidth: 1,
                                },
                            day.filled && !isDark ? filledShadowStyle : null,
                            !isCurrentMonth && { backgroundColor: 'transparent', borderWidth: 0 },
                          ]}
                        >
                          {isCurrentMonth &&
                            (day.filled && !isFuture ? (
                              <Check size={14} color="white" strokeWidth={3} />
                            ) : (
                              <Text
                                className="text-[11px] font-bold"
                                style={{
                                  color: isToday
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
                            ))}
                        </View>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            );
          }

          return (
            <View key={`month-row-${row[0]?.key ?? rowIndex}`} className="flex-row justify-between">
              {row.map((day) => {
                const dayNum = day.date.getDate();
                const isToday = day.key === todayKey;
                const isIncompleteOnly = day.hasEntries && !day.hasDisputes;
                const isFuture = isFutureDate(day.date);

                let circleStyle: ViewStyle = {
                  backgroundColor: isDark ? COLORS.slate800 : COLORS.slate50,
                  borderColor: emptyRing,
                  borderWidth: 1,
                };
                let textColor = isDark ? COLORS.slate600 : COLORS.slate400;

                if (day.hasDisputes) {
                  circleStyle = {
                    backgroundColor: getDisputeFillColor(day.disputeCount),
                    borderColor: getDisputeFillColor(day.disputeCount),
                    borderWidth: 1,
                  };
                  textColor = COLORS.white;
                } else if (isIncompleteOnly) {
                  circleStyle = {
                    backgroundColor: 'transparent',
                    borderColor: incompleteRing,
                    borderWidth: 2,
                  };
                  textColor = isDark ? COLORS.orange400 : COLORS.orange700;
                }

                if (isToday && !day.hasDisputes) {
                  circleStyle = { ...circleStyle, borderColor: todayRing };
                }

                if (isFuture) {
                  circleStyle = {
                    backgroundColor: 'transparent',
                    borderColor: 'transparent',
                    borderWidth: 0,
                  };
                  textColor = isDark ? COLORS.slate600 : COLORS.slate400;
                }

                return (
                  <View key={day.key} className="flex-1 items-center mb-2">
                    <Pressable
                      onPress={() => onDatePress(day.date, day.isCurrentMonth)}
                      disabled={!day.isCurrentMonth || isFuture}
                      style={dateCellPressStyle}
                    >
                      <View
                        style={[
                          dayCircleStyle,
                          circleStyle,
                          day.hasDisputes && !isDark ? filledShadowStyle : null,
                          !day.isCurrentMonth && {
                            backgroundColor: 'transparent',
                            borderWidth: 0,
                            borderColor: 'transparent',
                          },
                        ]}
                      >
                        {day.isCurrentMonth && (
                          <Text
                            className="text-[11px] font-bold"
                            style={{ color: textColor, opacity: isFuture ? 0.5 : 1 }}
                          >
                            {dayNum}
                          </Text>
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

export function StreakCardFooter({
  isExpanded,
  isDark,
  onToggle,
  onPressIn,
  onPressOut,
}: StreakCardFooterProps) {
  return (
    <Pressable onPress={onToggle} onPressIn={onPressIn} onPressOut={onPressOut}>
      <View className="mx-5 mb-3 flex-row items-center justify-center gap-2 opacity-80 pt-3 border-t border-slate-100 dark:border-slate-800/50">
        <View className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
        <Text className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
          Tracks days with a{' '}
          <Text className="font-bold text-indigo-600 dark:text-indigo-400">
            completed reframe
          </Text>
        </Text>
      </View>
      <View className="items-center pb-3 -mt-1 w-full">
        {isExpanded ? (
          <ChevronUp size={16} color={isDark ? '#94a3b8' : '#cbd5e1'} />
        ) : (
          <ChevronDown size={16} color={isDark ? '#94a3b8' : '#cbd5e1'} />
        )}
      </View>
    </Pressable>
  );
}

export function DayDetailSheet({
  sheetRef,
  onDismiss,
  isDark,
  maxSheetHeight,
  selectedDateLabel,
  summaryText,
  incompleteEntries,
  completedEntries,
  onDeleteEntry,
}: DayDetailSheetProps) {
  const insets = useSafeAreaInsets();
  const snapPoints = useMemo(() => ['75%'], []);
  const [openMenuEntryId, setOpenMenuEntryId] = useState<string | null>(null);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={BOTTOM_SHEET_BACKDROP_OPACITY}
        pressBehavior="close"
      />
    ),
    []
  );

  const handleToggleMenu = useCallback((entryId: string) => {
    setOpenMenuEntryId((current) => (current === entryId ? null : entryId));
  }, []);

  const handleCloseMenu = useCallback(() => {
    setOpenMenuEntryId(null);
  }, []);

  const handleDelete = useCallback(
    (entry: Entry) => {
      handleCloseMenu();
      onDeleteEntry?.(entry);
    },
    [handleCloseMenu, onDeleteEntry]
  );

  const handleNavigate = useCallback(
    (_entry: Entry) => {
      setOpenMenuEntryId(null);
      sheetRef.current?.dismiss();
    },
    [sheetRef]
  );

  const handleSheetDismiss = useCallback(() => {
    setOpenMenuEntryId(null);
    onDismiss();
  }, [onDismiss]);

  return (
    <BottomSheetModal
      ref={sheetRef}
      onDismiss={handleSheetDismiss}
      index={0}
      snapPoints={snapPoints}
      enableDynamicSizing
      maxDynamicContentSize={maxSheetHeight}
      enablePanDownToClose
      enableOverDrag={false}
      handleIndicatorStyle={bottomSheetHandleIndicatorStyle(isDark)}
      backdropComponent={renderBackdrop}
      backgroundStyle={bottomSheetBackgroundStyle(
        isDark,
        isDark ? BOTTOM_SHEET_BG_DARK : BOTTOM_SHEET_BG_LIGHT
      )}
    >
      <BottomSheetScrollView
        contentContainerStyle={{
          paddingHorizontal: BOTTOM_SHEET_CONTENT_PADDING,
          paddingTop: 12,
          paddingBottom: insets.bottom + 20,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-4">
          <Text className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">
            Daily Snapshot
          </Text>
          <Text className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {selectedDateLabel || ' '}
          </Text>
          <Text className="text-sm text-slate-500 dark:text-slate-400">
            {summaryText}
          </Text>
        </View>

        <View className="gap-6">
          {incompleteEntries.length > 0 && (
            <View>
              <View className="flex-row items-center gap-2 mb-2">
                <AlertCircle size={14} color={isDark ? '#fb923c' : '#c2410c'} />
                <Text className="text-xs font-bold uppercase tracking-widest text-orange-600 dark:text-orange-400">
                  Needs Attention
                </Text>
              </View>

              <View className="gap-3">
                {incompleteEntries.map((entry) => (
                  <View key={entry.id}>
                    <EntryCard
                      entry={entry}
                      isMenuOpen={openMenuEntryId === entry.id}
                      onToggleMenu={() => handleToggleMenu(entry.id)}
                      onCloseMenu={handleCloseMenu}
                      onDelete={handleDelete}
                      onNavigate={handleNavigate}
                    />
                  </View>
                ))}
              </View>
            </View>
          )}

          {completedEntries.length > 0 && (
            <View>
              <Text className="text-xs font-bold uppercase tracking-widest text-emerald-500 dark:text-emerald-300 mb-2">
                Thoughts Reframed
              </Text>
              <View className="gap-3">
                {completedEntries.map((entry) => (
                  <EntryCard
                    key={entry.id}
                    entry={entry}
                    isMenuOpen={openMenuEntryId === entry.id}
                    onToggleMenu={() => handleToggleMenu(entry.id)}
                    onCloseMenu={handleCloseMenu}
                    onDelete={handleDelete}
                    onNavigate={handleNavigate}
                  />
                ))}
              </View>
            </View>
          )}
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}
