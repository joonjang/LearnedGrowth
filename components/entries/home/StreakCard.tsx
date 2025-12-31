import React from 'react';
import { Text, View } from 'react-native';

type Day = {
  label: string;
  filled: boolean;
};

type StreakIcon = {
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  color: string;
};

type Props = {
  streakCount: number;
  days: Day[];
  icon: StreakIcon;
  shadowSm: any;
  rangeLabel?: string;
};

export default function StreakCard({
  streakCount,
  days,
  icon,
  shadowSm,
  rangeLabel = 'Mon - Sun',
}: Props) {
  const BadgeIcon = icon.Icon;

  return (
    <View
      className={`p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 ${shadowSm.className}`}
      style={[shadowSm.ios, shadowSm.android]}
    >
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center gap-3">
          <View className="w-10 h-10 rounded-full items-center justify-center bg-amber-50 dark:bg-slate-700">
            <BadgeIcon size={22} color={icon.color} />
          </View>
          <View>
            <Text className="text-sm font-semibold text-slate-900 dark:text-white">
              {streakCount} Day Streak
            </Text>
            <Text className="text-xs text-slate-500 dark:text-slate-400">
              Dispute days this week
            </Text>
          </View>
        </View>
        <Text className="text-[11px] font-semibold tracking-wide text-slate-500 dark:text-slate-400">
          {rangeLabel}
        </Text>
      </View>

      <View className="flex-row justify-between gap-2">
        {days.map((day, idx) => (
          <View key={`${day.label}-${idx}`} className="flex-1 items-center">
            <View
              className={`w-9 h-9 rounded-full items-center justify-center ${
                day.filled
                  ? 'bg-indigo-600'
                  : 'border border-slate-200 dark:border-slate-700 bg-transparent'
              }`}
            >
              <Text
                className={`text-[11px] font-semibold ${
                  day.filled
                    ? 'text-white'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {day.label}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
