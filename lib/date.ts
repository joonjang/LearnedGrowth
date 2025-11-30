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
