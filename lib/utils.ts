import { Entry } from '@/models/entry';
import { clsx, type ClassValue } from 'clsx';
import { HelpCircle, Scale, Sprout, Wind } from 'lucide-react-native';
import { ComponentType } from 'react';
import { StyleSheet } from 'react-native';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
   return twMerge(clsx(inputs));
}

export const getStyleFromScore = (score: number | null | undefined): string => {
   if (score === null || score === undefined) return 'Mixed';
   if (score >= 8) return 'Positive';
   if (score >= 6) return 'Constructive';
   if (score >= 4) return 'Balanced';
   if (score >= 2.5) return 'Mixed';
   return 'Critical';
};

export function isOptimistic(score: string | null): boolean {
   if (!score) return false;
   const s = score.toLowerCase();
   return (
      s.includes('optimis') ||
      s.includes('temporary') ||
      s.includes('specific') ||
      s.includes('external')
   );
}

export function getMoodConfig(score: number | null, isDark: boolean) {
   if (score === null) {
      return {
         Icon: HelpCircle,
         label: 'No Data',
         description: 'Add entries to see your outlook.',
         weekDescription: 'Add entries this week to see your outlook.',
         color: isDark ? '#94a3b8' : '#64748b',
         bg: isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(100, 116, 139, 0.1)',
      };
   }
   if (score >= 7.0) {
      return {
         Icon: Sprout,
         label: 'Seeing Possibilities',
         description:
            'You are focusing on a way forward and seeing the scope of your potential.',
         weekDescription:
            'This week you leaned into possibility and forward momentum.',
         color: isDark ? '#34d399' : '#059669',
         bg: isDark ? 'rgba(52, 211, 153, 0.15)' : 'rgba(5, 150, 105, 0.1)',
      };
   }
   if (score >= 4.0) {
      return {
         Icon: Scale,
         label: 'Grounded Reality',
         description:
            'You are seeing things as they are—a solid mix of good and bad.',
         weekDescription:
            'Your week balanced positives and challenges without swinging to extremes.',
         color: isDark ? '#fbbf24' : '#d97706',
         bg: isDark ? 'rgba(251, 191, 36, 0.15)' : 'rgba(217, 119, 6, 0.1)',
      };
   }
   return {
      Icon: Wind,
      label: 'Turning Inward',
      description: 'You are in a protective, introspective state right now.',
      weekDescription:
         'Your entries skewed towards internalizing challenges this week.',
      color: isDark ? '#a5b4fc' : '#6366f1',
      bg: isDark ? 'rgba(165, 180, 252, 0.15)' : 'rgba(99, 102, 241, 0.1)',
   };
}

// streak utils

export type Day = { label: string; filled: boolean; date: Date };
export type StreakIcon = {
   Icon: ComponentType<{ size?: number; color?: string }>;
   color: string;
};
export type DayBucket = {
   entries: Entry[];
   completed: Entry[];
   incomplete: Entry[];
   disputeCount: number;
};
export type CalendarDay = {
   key: string;
   date: Date;
   isCurrentMonth: boolean;
   entryCount: number;
   disputeCount: number;
   hasEntries: boolean;
   hasDisputes: boolean;
};

export const toDateKey = (date: Date) => {
   const year = date.getFullYear();
   const month = `${date.getMonth() + 1}`.padStart(2, '0');
   const day = `${date.getDate()}`.padStart(2, '0');
   return `${year}-${month}-${day}`;
};

export const parseDateKey = (key: string) => {
   const [year, month, day] = key.split('-').map((part) => Number(part));
   if (!year || !month || !day) return null;
   const date = new Date(year, month - 1, day);
   return Number.isNaN(date.getTime()) ? null : date;
};

const isNonEmpty = (value?: string | null) => {
   if (!value) return false;
   const trimmed = value.trim();
   if (!trimmed) return false;
   return trimmed !== 'Empty';
};

const isDisputeComplete = (entry: Entry) => isNonEmpty(entry.dispute);
const hasAdversity = (entry: Entry) => isNonEmpty(entry.adversity);

export const buildDayBuckets = (entries: Entry[]) => {
   const map = new Map<string, DayBucket>();
   entries.forEach((entry) => {
      const createdAt = new Date(entry.createdAt);
      if (Number.isNaN(createdAt.getTime())) return;
      const key = toDateKey(createdAt);
      const bucket = map.get(key) ?? {
         entries: [],
         completed: [],
         incomplete: [],
         disputeCount: 0,
      };
      bucket.entries.push(entry);
      if (isDisputeComplete(entry)) {
         bucket.completed.push(entry);
         bucket.disputeCount += 1;
      } else if (hasAdversity(entry)) {
         bucket.incomplete.push(entry);
      }
      map.set(key, bucket);
   });
   return map;
};

export const buildMonthDays = (
   currentYear: number,
   monthIndex: number,
   dayBuckets: Map<string, DayBucket>,
) => {
   const monthStart = new Date(currentYear, monthIndex, 1);
   const startWeekday = monthStart.getDay();
   const daysInMonth = new Date(currentYear, monthIndex + 1, 0).getDate();
   const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;

   return Array.from({ length: totalCells }, (_, idx) => {
      const date = new Date(currentYear, monthIndex, idx - startWeekday + 1);
      const key = toDateKey(date);
      const bucket = dayBuckets.get(key);
      const entryCount = bucket?.entries.length ?? 0;
      const disputeCount = bucket?.disputeCount ?? 0;

      return {
         key,
         date,
         isCurrentMonth: date.getMonth() === monthIndex,
         entryCount,
         disputeCount,
         hasEntries: entryCount > 0,
         hasDisputes: disputeCount > 0,
      };
   });
};

export const buildMonthRows = (monthDays: CalendarDay[]) => {
   const rows: CalendarDay[][] = [];
   for (let i = 0; i < monthDays.length; i += 7) {
      rows.push(monthDays.slice(i, i + 7));
   }
   return rows;
};

export const findWeekRowIndex = (
   monthDays: CalendarDay[],
   weekDays: Day[],
   todayKey: string,
) => {
   if (!monthDays.length) return -1;
   const weekStartKey = weekDays[0] ? toDateKey(weekDays[0].date) : todayKey;
   let index = monthDays.findIndex((day) => day.key === weekStartKey);
   if (index < 0) {
      index = monthDays.findIndex((day) => day.key === todayKey);
   }
   return index >= 0 ? Math.floor(index / 7) : -1;
};

export const getEncouragement = (streakCount: number) => {
   if (streakCount === 0) return 'Today is a fresh start.';
   if (streakCount <= 2) return 'Small steps create big change.';
   if (streakCount <= 6) return 'Keep going - consistency compounds.';
   if (streakCount <= 14) return 'You are rewiring your mind.';
   return 'Resilience is becoming your nature.';
};

export const getSummaryText = (completedCount: number) =>
   `${completedCount} ${completedCount === 1 ? 'thought' : 'thoughts'} reframed`;

export const isFutureDate = (date: Date) => {
   const today = new Date();
   today.setHours(0, 0, 0, 0);

   const target = new Date(date);
   target.setHours(0, 0, 0, 0);

   return target.getTime() > today.getTime();
};

export const cx = (...xs: ClassValue[]) => xs.filter(Boolean).join(' ');

export const CARD_PRESS_STYLE = StyleSheet.create({
   cardPressed: {
      transform: [{ scale: 0.985 }],
   },
});

export function getWeekStart(date: Date) {
   const start = new Date(date);
   start.setHours(0, 0, 0, 0);
   const diffToSunday = start.getDay();
   start.setDate(start.getDate() - diffToSunday);
   return start;
}
