import type { ComponentType } from 'react';

import type { Entry } from '@/models/entry';

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

export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const COLORS = {
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
  orange300: '#fdba74',
  orange400: '#fb923c',
  orange600: '#ea580c',
  orange700: '#c2410c',
  orange900: '#7c2d12',
  white: '#ffffff',
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
  dayBuckets: Map<string, DayBucket>
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
  todayKey: string
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
