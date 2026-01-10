import { Check, Flame } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';

type Day = {
  label: string;
  filled: boolean;
  date: Date;
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
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function StreakCard({
  streakCount,
  days,
  icon,
  shadowSm,
}: Props) {
  const today = new Date();
  const dateNum = today.getDate();
  const monthName = MONTHS[today.getMonth()];
  const currentYear = today.getFullYear();

  return (
    <View
      className="px-5 py-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800"
      style={[shadowSm.ios, shadowSm.android]}
    >
      {/* 1. Header: [Title] -- [Month] -- [Badge] */}
      <View className="flex-row items-center justify-between mb-5">
        
        {/* Left: New Title */}
        <Text className="text-sm font-bold text-slate-900 dark:text-slate-100">
           Your Rhythm
        </Text>

        {/* Center: Month (The anchor) */}
        <Text className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
           {monthName} {currentYear}
        </Text>

        {/* Right: Streak Badge */}
        <View className={`flex-row items-center gap-1.5 px-2.5 py-1 rounded-full border ${streakCount > 0 ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-900/30' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`}>
           <Flame size={14} color={streakCount > 0 ? "#f97316" : "#94a3b8"} fill={streakCount > 0 ? "#f97316" : "transparent"} />
           <Text className={`text-xs font-bold ${streakCount > 0 ? 'text-orange-700 dark:text-orange-400' : 'text-slate-400'}`}>
              {streakCount} Day Streak
           </Text>
        </View>
      </View>

      {/* 2. Timeline Strip */}
      <View className="flex-row justify-between mb-4">
        {days.map((day, idx) => {
          const dayNum = day.date.getDate();
          const isToday = dayNum === dateNum;

          return (
            <View
              key={`${day.label}-${idx}`}
              className="flex-1 items-center gap-2"
            >
              <Text
                className={`text-[10px] font-bold uppercase ${
                  isToday
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-400'
                }`}
              >
                {day.label}
              </Text>

              <View
                className={`w-8 h-8 rounded-full items-center justify-center ${
                  day.filled
                    ? 'bg-indigo-600 shadow-sm shadow-indigo-200 dark:shadow-none' // Filled
                    : isToday
                      ? 'bg-white dark:bg-slate-800 border-2 border-indigo-500' // Today (Empty)
                      : 'bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700' // Empty
                }`}
              >
                 {day.filled && <Check size={14} color="white" strokeWidth={3} />}
                {!day.filled && (
                   <Text
                     className={`text-[10px] font-bold ${
                       isToday
                         ? 'text-indigo-700 dark:text-indigo-300'
                         : 'text-slate-400 dark:text-slate-600'
                     }`}
                   >
                     {dayNum}
                   </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* 3. The Explicit Legend */}
      <View className="flex-row items-center justify-center gap-2 opacity-80 pt-3 border-t border-slate-100 dark:border-slate-800/50">
         <View className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
         <Text className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
            Tracks days with a <Text className="font-bold text-indigo-600 dark:text-indigo-400">completed reframe</Text>
         </Text>
      </View>
    </View>
  );
}