import { Entry } from "@/models/entry";

const fmtDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
const fmtTime = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });
const fmtDateParts = new Intl.DateTimeFormat('en-US', {
   weekday: 'short',
   month: 'short',
   day: 'numeric',
   year: 'numeric',
});

function toKey(d: Date): string {
   const y = d.getFullYear();
   const m = d.getMonth() + 1;
   const day = d.getDate();
   return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function formatDate(input: Date | string) {
  const d = input instanceof Date ? input : new Date(input);
  return Number.isNaN(d.getTime()) ? '' : fmtDate.format(d);
}

export function getDateParts(entry: Entry) {
  const d = new Date(entry.createdAt);
  if (Number.isNaN(d.getTime())) return { dateKey: 'invalid', dateLabel: '' };

  const dateKey = toKey(d);
  const now = new Date();
  const todayKey = toKey(now);
  const yesterdayKey = toKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));

  const dateLabel =
    dateKey === todayKey ? 'Today' :
    dateKey === yesterdayKey ? 'Yesterday' :
    fmtDate.format(d);

  return { dateKey, dateLabel };
}

export function getTimeLabel(entry: Entry) {
  const d = new Date(entry.createdAt);
  return Number.isNaN(d.getTime()) ? '' : fmtTime.format(d);
}

export function formatDateTimeWithWeekday(input: Date | string) {
   const d = input instanceof Date ? input : new Date(input);
   if (Number.isNaN(d.getTime())) return '';

   const parts = fmtDateParts.formatToParts(d);
   const findPart = (type: string) =>
      parts.find((p) => p.type === type)?.value ?? '';

   const time = fmtTime.format(d);
   const weekday = findPart('weekday');
   const month = findPart('month');
   const day = findPart('day');
   const year = findPart('year');

   const currentYear = String(new Date().getFullYear());
   const yearSuffix = year && year !== currentYear ? ` ${year}` : '';

   return `${time}, ${weekday}, ${month} ${day}${yearSuffix}`;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export type WeekOption = {
  key: string;
  label: string;
  rangeLabel: string;
  start: Date;
  end: Date;
  count: number;
};

export function getWeekStart(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const diffToSunday = start.getDay();
  start.setDate(start.getDate() - diffToSunday);
  return start;
}

export function formatIsoDate(date: Date) {
  return toKey(date);
}

export function getWeekKey(start: Date) {
  return formatIsoDate(start);
}

export function getWeekRangeLabel(start: Date) {
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return `${formatDate(start)} - ${formatDate(end)}`;
}

export function parseLocalIsoDate(isoDateString: string): Date | null {
  const parts = isoDateString.split('-').map(Number);
  if (parts.length !== 3) return null;
  const [year, month, day] = parts;
  return new Date(year, month - 1, day);
}

export function getWeekLabel(start: Date, now: Date) {
  const currentStart = getWeekStart(now);
  const diffTime = currentStart.getTime() - start.getTime();
  const diffWeeks = Math.round(diffTime / WEEK_MS);
  if (start.getTime() === currentStart.getTime()) return 'This Week';
  const lastStart = new Date(currentStart);
  lastStart.setDate(lastStart.getDate() - 7);
  if (start.getTime() === lastStart.getTime()) return 'Last Week';
  return `${Math.max(2, diffWeeks)} Weeks Ago`;
}

export function buildWeekOptions(entries: Entry[], now: Date): WeekOption[] {
  const weeks = new Map<string, WeekOption>();
  const currentStart = getWeekStart(now);
  const currentKey = getWeekKey(currentStart);
  weeks.set(currentKey, {
    key: currentKey,
    label: 'This Week',
    rangeLabel: getWeekRangeLabel(currentStart),
    start: currentStart,
    end: new Date(
      currentStart.getTime() + 6 * 24 * 60 * 60 * 1000 + 86399999,
    ),
    count: 0,
  });
  entries.forEach((entry) => {
    const created = new Date(entry.createdAt);
    if (Number.isNaN(created.getTime())) return;
    const weekStart = getWeekStart(created);
    const key = getWeekKey(weekStart);
    let week = weeks.get(key);
    if (!week) {
      const end = new Date(weekStart);
      end.setDate(weekStart.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      week = {
        key,
        label: getWeekLabel(weekStart, now),
        rangeLabel: getWeekRangeLabel(weekStart),
        start: weekStart,
        end,
        count: 0,
      };
      weeks.set(key, week);
    }
    week.count++;
  });
  return Array.from(weeks.values()).sort(
    (a, b) => b.start.getTime() - a.start.getTime(),
  );
}
