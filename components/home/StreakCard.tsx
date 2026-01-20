import { Check, Dog, Flame } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View, useColorScheme } from 'react-native';

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

// --- Colors & Styles ---
const COLORS = {
  indigo200: '#c7d2fe',
  indigo300: '#a5b4fc',
  indigo400: '#818cf8',
  indigo500: '#6366f1',
  indigo600: '#4f46e5',
  indigo700: '#4338ca',
  slate50: '#f8fafc',
  slate100: '#f1f5f9',
  slate400: '#94a3b8',
  slate600: '#475569',
  slate700: '#334155',
  slate800: '#1e293b',
  orange50: '#fff7ed',
  orange100: '#ffedd5',
  orange400: '#fb923c',
  orange700: '#c2410c',
  orange900: '#7c2d12',
  white: '#ffffff',
};

const styles = StyleSheet.create({
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filledShadow: {
    shadowColor: COLORS.indigo200,
    shadowOpacity: 0.6,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
});

export default function StreakCard({
  streakCount,
  days,
  icon,
  shadowSm,
}: Props) {
  const isDark = useColorScheme() === 'dark';
  const today = new Date();
  const dateNum = today.getDate();
  const monthName = MONTHS[today.getMonth()];
  const currentYear = today.getFullYear();

  // --- Badge Styles ---
  const badgeStyle = {
    backgroundColor: streakCount > 0
      ? isDark ? 'rgba(124, 45, 18, 0.2)' : COLORS.orange50
      : isDark ? COLORS.slate800 : COLORS.slate50,
    borderColor: streakCount > 0
      ? isDark ? 'rgba(124, 45, 18, 0.3)' : COLORS.orange100
      : isDark ? COLORS.slate700 : COLORS.slate100,
  };
  const badgeTextStyle = {
    color: streakCount > 0
      ? isDark ? COLORS.orange400 : COLORS.orange700
      : COLORS.slate400,
  };

  // --- Impactful Encouragement Logic ---
  const encouragement = useMemo(() => {
    if (streakCount === 0) return "Today is a fresh start.";
    if (streakCount <= 2) return "Small steps create big change.";
    if (streakCount <= 6) return "Keep going—consistency compounds.";
    if (streakCount <= 14) return "You are rewiring your mind.";
    return "Resilience is becoming your nature.";
  }, [streakCount]);

  return (
    <View
      className="px-5 py-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700"
      style={[shadowSm.ios, shadowSm.android]}
    >
      {/* 1. Header Row: Title & Badge */}
      <View className="flex-row items-center justify-between mb-3">
        {/* Left: Title */}
        <View className="flex-row items-center gap-2">
           <Dog size={16} color={isDark ? '#cbd5e1' : '#64748b'} />
           <Text className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
             Days of Growth
           </Text>
        </View>

        {/* Right: Streak Badge */}
        <View
          className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-full border"
          style={badgeStyle}
        >
           <Flame size={14} color={streakCount > 0 ? "#f97316" : "#94a3b8"} fill={streakCount > 0 ? "#f97316" : "transparent"} />
           <Text className="text-xs font-bold" numberOfLines={1} style={badgeTextStyle}>
              {streakCount} Day Streak
           </Text>
        </View>
      </View>

      {/* 2. Info Block (Date & Quote on separate lines) */}
      <View className="mb-5 pl-0.5">
        {/* Line 1: Date */}
        <Text className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
          {monthName} {currentYear}
        </Text>
        
        {/* Line 2: The Quote (Own line) */}
        <Text className="text-xs font-medium text-slate-600 dark:text-slate-300 italic">
          {encouragement}
        </Text>
      </View>

      {/* 3. Timeline Strip */}
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
                className="text-[10px] font-bold uppercase"
                style={{
                  color: isToday
                    ? isDark ? COLORS.indigo400 : COLORS.indigo600
                    : COLORS.slate400,
                }}
              >
                {day.label}
              </Text>

              <View
                style={[
                  styles.dayCircle,
                  day.filled
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
                  day.filled && !isDark ? styles.filledShadow : null,
                ]}
              >
                 {day.filled && <Check size={14} color="white" strokeWidth={3} />}
                {!day.filled && (
                   <Text
                     className="text-[10px] font-bold"
                     style={{
                       color: isToday
                         ? isDark ? COLORS.indigo300 : COLORS.indigo700
                         : isDark ? COLORS.slate600 : COLORS.slate400,
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

      {/* 4. Legend */}
      <View className="flex-row items-center justify-center gap-2 opacity-80 pt-3 border-t border-slate-100 dark:border-slate-800/50">
         <View className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
         <Text className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
            Tracks days with a <Text className="font-bold text-indigo-600 dark:text-indigo-400">completed reframe</Text>
         </Text>
      </View>
    </View>
  );
}
